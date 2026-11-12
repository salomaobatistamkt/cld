import { Hono } from "hono";
import type { Env } from "../lib/util";
import { addDays, daysBetween, isDate, isIata, loadSettings, log, nowIso, brl } from "../lib/util";
import { flightAdapters, integrationStatus } from "../adapters";
import { insertObservation } from "../lib/jobs";
import { historyFor, scorePrice, LABEL_TEXT } from "../lib/scoring";
import { dddFromPhone, regionFromDdd } from "../lib/ddd";
import { airports } from "../lib/geo";

export const pub = new Hono<{ Bindings: Env }>();

pub.get("/status", async c => {
  const s = await loadSettings(c.env.DB);
  return c.json({ brand: s.brand_name, integrations: integrationStatus(c.env), now: nowIso() });
});

pub.get("/opportunities", async c => {
  const origin = c.req.query("origin");
  const region = c.req.query("region");
  const limit = Math.min(Number(c.req.query("limit") ?? 24), 100);
  const { results } = await c.env.DB.prepare(
    `SELECT id, origin, destination, depart_date, return_date, trip_days, price_cents, fare_type, includes_taxes, airline, transfers,
            source, is_sample, score_label, percentile, median_cents, sample_size, savings_pct, observed_at, last_verified_at, status
     FROM opportunities WHERE status IN ('aprovada','publicada') ${origin ? "AND origin = ?" : ""}
     ORDER BY CASE score_label WHEN 'imperdivel' THEN 0 WHEN 'excelente' THEN 1 WHEN 'boa' THEN 2 ELSE 3 END, created_at DESC LIMIT ?`)
    .bind(...(origin ? [origin, limit * 3] : [limit * 3])).all<any>();
  let rows = results;
  if (region) {
    const ap = await airports(c.env);
    rows = rows.filter(r => ap.get(r.origin)?.r === region);
  }
  return c.json({ items: rows.slice(0, limit).map(r => ({ ...r, label_text: LABEL_TEXT[r.score_label as keyof typeof LABEL_TEXT] })) });
});

pub.get("/opportunities/:id", async c => {
  const o = await c.env.DB.prepare("SELECT * FROM opportunities WHERE id = ? AND status IN ('aprovada','publicada')").bind(c.req.param("id")).first<any>();
  if (!o) return c.json({ error: "Oferta não encontrada ou não está mais ativa." }, 404);
  return c.json({ ...o, label_text: LABEL_TEXT[o.score_label as keyof typeof LABEL_TEXT] });
});

/** Pesquisa de passagens. Fonte real quando configurada; senão informa que está pendente e mostra o histórico gravado. */
pub.post("/search", async c => {
  const b = await c.req.json().catch(() => ({})) as any;
  const origin = String(b.origin ?? "").toUpperCase(), destination = String(b.destination ?? "").toUpperCase();
  if (!isIata(origin) || !isIata(destination) || origin === destination) return c.json({ error: "Escolha aeroportos de origem e destino diferentes." }, 400);
  if (!isDate(b.depart)) return c.json({ error: "Informe a data de ida." }, 400);
  if (b.ret && (!isDate(b.ret) || b.ret <= b.depart)) return c.json({ error: "A volta precisa ser depois da ida." }, 400);
  const db = c.env.DB, s = await loadSettings(db);
  const adapters = flightAdapters(c.env).filter(a => a.status().configured);
  let live: any[] = [], liveError: string | null = null;
  if (adapters.length) {
    for (const a of adapters) {
      try {
        const quotes = await a.search({ origin, destination, depart: b.depart, ret: b.ret || undefined, limit: 20 });
        for (const q of quotes) {
          const id = await insertObservation(db, q, null);
          const hist = await historyFor(db, s, { origin, destination, fare_type: q.fare_type, trip_days: q.return_date ? daysBetween(q.depart_date, q.return_date) : null, exclude_id: id, is_sample: 0 });
          const sc = scorePrice(q.price_cents, hist, s);
          live.push({ ...q, score_label: sc.label, label_text: LABEL_TEXT[sc.label], savings_pct: sc.savingsPct, median_cents: sc.medianCents, sample_size: sc.sampleSize });
        }
      } catch (e) { liveError = (e as Error).message; await log(db, "integracao", `Busca ${origin}-${destination}: ${liveError}`, "erro", a.id); }
    }
  }
  // Exato nas datas pedidas primeiro, depois datas próximas (±3 dias), ordenado por preço
  live.sort((x, y) => (Number(x.depart_date !== b.depart) - Number(y.depart_date !== b.depart)) || x.price_cents - y.price_cents);
  const { results: stored } = await db.prepare(
    `SELECT origin, destination, depart_date, return_date, trip_days, price_cents, fare_type, source, is_sample, observed_at
     FROM price_observations WHERE origin = ? AND destination = ? AND depart_date BETWEEN ? AND ? ORDER BY price_cents ASC LIMIT 20`)
    .bind(origin, destination, addDays(b.depart, -3), addDays(b.depart, 3)).all<any>();
  await db.prepare("INSERT INTO searches (origin, destination, depart_date, return_date, results, source) VALUES (?,?,?,?,?,?)")
    .bind(origin, destination, b.depart, b.ret ?? null, live.length, adapters.length ? "real" : "pendente").run();
  return c.json({
    queried_at: nowIso(),
    source_status: adapters.length ? (liveError ? "erro" : "real") : "pendente",
    message: adapters.length ? liveError : "A fonte de preços em tempo de consulta ainda não está conectada (Travelpayouts pendente). Abaixo, apenas preços já gravados no histórico.",
    results: live,
    history: stored,
  });
});

/** Planejamento completo: passagem (dado real quando houver) + hospedagem e carro (link do parceiro e estimativa informada). */
pub.post("/plan", async c => {
  const b = await c.req.json().catch(() => ({})) as any;
  const origin = String(b.origin ?? "").toUpperCase(), destination = String(b.destination ?? "").toUpperCase();
  if (!isIata(origin) || !isIata(destination) || !isDate(b.depart) || !isDate(b.ret) || b.ret <= b.depart)
    return c.json({ error: "Informe origem, destino, ida e volta válidas." }, 400);
  const travelers = Math.max(1, Math.min(9, Number(b.travelers ?? 1)));
  const nights = daysBetween(b.depart, b.ret);
  const db = c.env.DB;
  const ap = await airports(c.env);
  const dest = ap.get(destination);

  // Passagem: menor preço gravado nos últimos 7 dias para datas exatas; senão, nada (não inventamos).
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const flight = await db.prepare(`SELECT * FROM price_observations WHERE origin = ? AND destination = ? AND depart_date = ? AND return_date = ?
      AND observed_at >= ? ORDER BY is_sample ASC, price_cents ASC LIMIT 1`).bind(origin, destination, b.depart, b.ret, since).first<any>();

  const partners = (await db.prepare("SELECT * FROM partners").all<any>()).results;
  const linkFrom = (kind: string) => {
    const p = partners.find(x => x.kind === kind && x.status === "ativo" && x.link_template && x.affiliate_id);
    if (!p) return { partner: partners.find(x => x.kind === kind)?.name ?? null, url: null, status: "pendente" };
    const url = p.link_template.replace("{AFFILIATE_ID}", encodeURIComponent(p.affiliate_id))
      .replace("{CITY}", encodeURIComponent(dest?.c ?? destination)).replace("{CHECKIN}", b.depart).replace("{CHECKOUT}", b.ret)
      .replace("{IATA}", destination);
    return { partner: p.name, url, status: "ativo" };
  };

  const hotelDaily = Number(b.hotel_daily_estimate) > 0 ? Math.round(Number(b.hotel_daily_estimate) * 100) : null;
  const carDaily = Number(b.car_daily_estimate) > 0 ? Math.round(Number(b.car_daily_estimate) * 100) : null;
  const items = [
    {
      kind: "passagem", label: "Passagem aérea (por pessoa)",
      unit_cents: flight?.price_cents ?? null, total_cents: flight ? flight.price_cents * travelers : null,
      basis: flight ? (flight.is_sample ? "exemplo" : "consulta") : "sem_dado",
      note: flight
        ? `${flight.is_sample ? "DADO DE EXEMPLO. " : ""}Preço visto em ${flight.observed_at} na fonte ${flight.source}. Não garantido.`
        : "Nenhum preço registrado para essas datas nos últimos 7 dias. Faça uma pesquisa de passagens para consultar.",
    },
    {
      kind: "hospedagem", label: `Hospedagem (${nights} noites)`,
      unit_cents: hotelDaily, total_cents: hotelDaily ? hotelDaily * nights : null,
      basis: hotelDaily ? "estimativa_usuario" : "sem_dado",
      note: hotelDaily ? "Estimativa informada por você, não é cotação." : "Integração de preços de hospedagem pendente. Use o link do parceiro para consultar.",
      link: linkFrom("hospedagem"),
    },
    {
      kind: "carro", label: `Locação de carro (${nights} diárias)`,
      unit_cents: carDaily, total_cents: carDaily ? carDaily * nights : null,
      basis: carDaily ? "estimativa_usuario" : "sem_dado",
      note: carDaily ? "Estimativa informada por você, não é cotação." : "Integração de locadoras pendente. Use o link do parceiro.",
      link: linkFrom("carro"),
    },
    {
      kind: "onibus", label: "Transporte rodoviário", unit_cents: null, total_cents: null, basis: "pendente",
      note: "Módulo pendente: nenhuma integração rodoviária autorizada ainda.",
    },
  ];
  const known = items.filter(i => i.total_cents != null);
  const total = known.reduce((a, i) => a + (i.total_cents as number), 0);
  return c.json({
    queried_at: nowIso(), origin, destination, destination_name: dest ? `${dest.c}, ${dest.rn}` : destination,
    depart: b.depart, ret: b.ret, nights, travelers, items,
    total_cents: known.length ? total : null,
    total_note: known.length < items.length
      ? `Total parcial: soma só os itens com valor (${known.map(k => k.kind).join(", ") || "nenhum"}). Os demais estão pendentes.`
      : "Soma de preços consultados e estimativas. Não é um preço garantido.",
    total_text: known.length ? brl(total) : null,
  });
});

/** Cadastro de interessados (LGPD): consentimento explícito é obrigatório. DDD vira só uma indicação. */
pub.post("/subscribe", async c => {
  const b = await c.req.json().catch(() => ({})) as any;
  if (b.consent !== true) return c.json({ error: "Para receber ofertas, marque a autorização de contato." }, 400);
  if (!b.phone && !b.email) return c.json({ error: "Informe telefone ou e-mail." }, 400);
  const ddd = b.phone ? dddFromPhone(String(b.phone)) : null;
  const consentText = "Autorizo o envio de ofertas de viagem pelos canais escolhidos. Posso cancelar a qualquer momento.";
  await c.env.DB.prepare(`INSERT INTO subscribers (name, phone, email, ddd, inferred_region, region, city, home_airport, interests, consent_marketing, consent_at, consent_text, consent_channel)
     VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?)`).bind(
    b.name ?? null, b.phone ?? null, b.email ?? null, ddd, regionFromDdd(ddd), b.region ?? null, b.city ?? null,
    isIata(b.home_airport) ? b.home_airport : null, JSON.stringify(b.interests ?? {}), nowIso(), consentText, b.channel ?? "site").run();
  return c.json({ ok: true, inferred_region: regionFromDdd(ddd), note: "A região sugerida pelo DDD é só uma indicação. Você pode trocar a qualquer momento." });
});
