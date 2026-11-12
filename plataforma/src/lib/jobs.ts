// Jobs do pipeline. Podem ser disparados pelo n8n (HTTP), pelo cron do Worker ou pelo painel.
//   collect  → consulta as rotas monitoradas e grava observações
//   detect   → pontua observações recentes e cria oportunidades
//   verify   → reconsulta oportunidades antes de publicar; marca desatualizadas
//   expire   → expira ofertas vencidas
//   compose  → cria rascunhos de posts por canal conforme as regras do canal
//   dispatch → envia posts aprovados respeitando limites e horário de silêncio
import type { Env, Settings } from "./util";
import { addDays, addHours, log, nowIso, num, randomCode, daysBetween } from "./util";
import { flightAdapters } from "../adapters";
import type { FlightQuote } from "../adapters/types";
import { historyFor, scorePrice, LABEL_RANK, Label } from "./scoring";
import { renderPost, ChannelType, Template } from "./posts";
import { cityOf, airports } from "./geo";
import { sendTelegram } from "./telegram";

type Route = { id: number; origin: string; destination: string; trip_lengths: string; months_ahead: number; one_way: number };

export async function insertObservation(db: D1Database, q: FlightQuote & { is_sample?: number; trip_days?: number | null }, routeId: number | null) {
  const trip = q.trip_days ?? (q.return_date ? daysBetween(q.depart_date, q.return_date) : null);
  const r = await db.prepare(`INSERT INTO price_observations
    (route_id, origin, destination, depart_date, return_date, trip_days, price_cents, currency, fare_type, includes_taxes, airline, transfers, source, source_link, is_sample, observed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    routeId, q.origin, q.destination, q.depart_date, q.return_date, trip, q.price_cents, q.currency ?? "BRL", q.fare_type,
    q.includes_taxes, q.airline, q.transfers, q.source, q.source_link, q.is_sample ?? 0, q.observed_at,
  ).run();
  return r.meta.last_row_id as number;
}

/** Coleta: para cada rota ativa, consulta os próximos meses (ida e volta por mês). Respeita um teto de chamadas por execução. */
export async function collect(env: Env, maxCalls = 40) {
  const db = env.DB;
  const adapters = flightAdapters(env).filter(a => a.status().configured);
  if (!adapters.length) {
    await log(db, "job", "Coleta não executada: nenhuma fonte de voos configurada (Travelpayouts pendente).", "aviso", "collect");
    return { ok: false, reason: "nenhuma fonte configurada", calls: 0, saved: 0 };
  }
  const { results: routes } = await db.prepare(
    "SELECT * FROM monitored_routes WHERE active = 1 ORDER BY priority ASC, COALESCE(last_collected_at,'') ASC").all<Route>();
  let calls = 0, saved = 0, errors = 0;
  const today = new Date();
  for (const r of routes) {
    for (let m = 0; m < r.months_ahead && calls < maxCalls; m++) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + m, 1));
      const month = d.toISOString().slice(0, 7);
      for (const a of adapters) {
        calls++;
        try {
          const quotes = await a.search({ origin: r.origin, destination: r.destination, depart: month, ret: r.one_way ? undefined : month, limit: 30 });
          for (const q of quotes) { await insertObservation(db, q, r.id); saved++; }
        } catch (e) {
          errors++;
          await log(db, "integracao", `${a.id} ${r.origin}-${r.destination} ${month}: ${(e as Error).message}`, "erro", a.id);
        }
      }
    }
    await db.prepare("UPDATE monitored_routes SET last_collected_at = ? WHERE id = ?").bind(nowIso(), r.id).run();
    if (calls >= maxCalls) break;
  }
  await log(db, "job", `Coleta: ${calls} consultas, ${saved} preços gravados, ${errors} erros.`, errors ? "aviso" : "info", "collect");
  return { ok: true, calls, saved, errors };
}

/** Detecção: pontua observações das últimas N horas e cria oportunidades a partir do rótulo mínimo. */
export async function detect(env: Env, s: Settings, sinceHours = 24, minLabel: Label = "competitivo") {
  const db = env.DB;
  const since = addHours(nowIso(), -sinceHours);
  const today = new Date().toISOString().slice(0, 10);
  const { results } = await db.prepare(
    `SELECT * FROM price_observations WHERE observed_at >= ? AND depart_date > ? ORDER BY observed_at DESC LIMIT 500`)
    .bind(since, today).all<any>();
  const tp = (await db.prepare("SELECT id FROM partners WHERE name = 'Aviasales'").first<{ id: number }>())?.id ?? null;
  let created = 0;
  for (const o of results) {
    const hist = await historyFor(db, s, { origin: o.origin, destination: o.destination, fare_type: o.fare_type, trip_days: o.trip_days, exclude_id: o.id, is_sample: o.is_sample });
    const sc = scorePrice(o.price_cents, hist, s);
    if (LABEL_RANK[sc.label] < LABEL_RANK[minLabel]) continue;
    const r = await db.prepare(`INSERT OR IGNORE INTO opportunities
      (observation_id, partner_id, origin, destination, depart_date, return_date, trip_days, price_cents, currency, fare_type, includes_taxes,
       airline, transfers, source, is_sample, score_label, percentile, median_cents, sample_size, savings_pct, deeplink, observed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      o.id, o.source === "travelpayouts" ? tp : null, o.origin, o.destination, o.depart_date, o.return_date, o.trip_days, o.price_cents,
      o.currency, o.fare_type, o.includes_taxes, o.airline, o.transfers, o.source, o.is_sample, sc.label, sc.percentile,
      sc.medianCents, sc.sampleSize, sc.savingsPct, o.source_link, o.observed_at).run();
    if (r.meta.changes) created++;
  }
  await log(db, "job", `Detecção: ${results.length} preços analisados, ${created} oportunidades novas.`, "info", "detect");
  return { analyzed: results.length, created };
}

/** Verificação: reconsulta a fonte. Sem confirmação dentro da tolerância → "desatualizada". Exemplo nunca é verificado. */
export async function verifyOpportunity(env: Env, s: Settings, id: number) {
  const db = env.DB;
  const o = await db.prepare("SELECT * FROM opportunities WHERE id = ?").bind(id).first<any>();
  if (!o) return { ok: false, reason: "não encontrada" };
  const checks: { item: string; ok: boolean; detail: string }[] = [];
  const today = new Date().toISOString().slice(0, 10);
  checks.push({ item: "Data de ida no futuro", ok: o.depart_date > today, detail: o.depart_date });
  checks.push({ item: "Volta depois da ida", ok: !o.return_date || o.return_date > o.depart_date, detail: o.return_date ?? "só ida" });
  checks.push({ item: "Permanência correta", ok: !o.return_date || daysBetween(o.depart_date, o.return_date) === o.trip_days, detail: `${o.trip_days ?? "-"} dias` });
  const ap = await airports(env);
  checks.push({ item: "Origem e destino válidos", ok: ap.has(o.origin) && ap.has(o.destination) && o.origin !== o.destination, detail: `${o.origin} → ${o.destination}` });
  const dup = await db.prepare(`SELECT COUNT(*) n FROM opportunities WHERE id != ? AND origin = ? AND destination = ? AND depart_date = ?
     AND COALESCE(return_date,'') = COALESCE(?,'') AND status IN ('aprovada','publicada')`).bind(id, o.origin, o.destination, o.depart_date, o.return_date).first<{ n: number }>();
  checks.push({ item: "Sem duplicidade publicada", ok: (dup?.n ?? 0) === 0, detail: dup?.n ? `${dup.n} oferta(s) igual(is) ativa(s)` : "ok" });
  checks.push({ item: "Link do parceiro presente", ok: Boolean(o.deeplink), detail: o.deeplink ? "ok" : "sem link do parceiro" });

  let priceOk = false, priceDetail = "";
  if (o.is_sample) {
    priceDetail = "Dado de exemplo: não existe preço real para confirmar.";
  } else {
    const adapters = flightAdapters(env).filter(a => a.status().configured && a.id === o.source);
    if (!adapters.length) priceDetail = `Fonte ${o.source} indisponível para reconsulta.`;
    else {
      try {
        const quotes = await adapters[0].search({ origin: o.origin, destination: o.destination, depart: o.depart_date, ret: o.return_date ?? undefined, limit: 10 });
        const tol = num(s, "price_tolerance_pct", 3) / 100;
        const best = quotes.filter(q => q.depart_date === o.depart_date && (q.return_date ?? null) === (o.return_date ?? null))
          .sort((a, b) => a.price_cents - b.price_cents)[0];
        if (!best) priceDetail = "A fonte não retornou mais esse voo nessas datas.";
        else if (best.price_cents <= o.price_cents * (1 + tol)) {
          priceOk = true;
          priceDetail = `Confirmado na fonte: ${(best.price_cents / 100).toFixed(0)}`;
          await db.prepare("UPDATE opportunities SET last_verified_at = ?, observed_at = ?, price_cents = MIN(price_cents, ?), deeplink = COALESCE(?, deeplink) WHERE id = ?")
            .bind(nowIso(), best.observed_at, best.price_cents, best.source_link, id).run();
        } else priceDetail = `Preço subiu para ${(best.price_cents / 100).toFixed(0)}.`;
      } catch (e) { priceDetail = (e as Error).message; }
    }
  }
  checks.push({ item: "Preço ainda disponível", ok: priceOk, detail: priceDetail });

  const allOk = checks.every(c => c.ok);
  if (!allOk && !o.is_sample && ["nova", "aprovada", "publicada"].includes(o.status) && !priceOk) {
    await db.prepare("UPDATE opportunities SET status = 'desatualizada' WHERE id = ?").bind(id).run();
  }
  return { ok: allOk, checks };
}

export async function verifyPending(env: Env, s: Settings) {
  const maxAge = num(s, "verify_max_age_hours", 6);
  const cutoff = addHours(nowIso(), -maxAge);
  const { results } = await env.DB.prepare(
    `SELECT id FROM opportunities WHERE is_sample = 0 AND status IN ('nova','aprovada','publicada') AND COALESCE(last_verified_at, observed_at) < ? LIMIT 30`)
    .bind(cutoff).all<{ id: number }>();
  let okCount = 0;
  for (const r of results) if ((await verifyOpportunity(env, s, r.id)).ok) okCount++;
  await log(env.DB, "job", `Verificação: ${results.length} ofertas reconsultadas, ${okCount} confirmadas.`, "info", "verify");
  return { checked: results.length, confirmed: okCount };
}

export async function expire(env: Env) {
  const now = nowIso(), today = now.slice(0, 10);
  const r1 = await env.DB.prepare(`UPDATE opportunities SET status = 'expirada'
     WHERE status IN ('nova','aprovada','publicada','desatualizada') AND (depart_date <= ? OR (expires_at IS NOT NULL AND expires_at < ?))`).bind(today, now).run();
  if (r1.meta.changes) await log(env.DB, "job", `Expiração: ${r1.meta.changes} ofertas expiradas.`, "info", "expire");
  return { expired: r1.meta.changes };
}

type Channel = { id: number; name: string; type: ChannelType; target_ref: string | null; rules: string; template: Template; max_per_day: number; quiet_start: number; quiet_end: number; active: number };

export function matchesRules(o: any, rulesJson: string, originRegion: string | null, destCountry: string | null, originCountry: string | null) {
  let r: any = {};
  try { r = JSON.parse(rulesJson || "{}"); } catch { /* regras inválidas = sem filtro */ }
  if (r.origins?.length && !r.origins.includes(o.origin)) return false;
  if (r.origin_regions?.length && !r.origin_regions.includes(originRegion)) return false;
  if (r.international === true && destCountry === originCountry) return false;
  if (r.international === false && destCountry !== originCountry) return false;
  if (r.max_price && o.price_cents > r.max_price * 100) return false;
  if (r.min_label && LABEL_RANK[o.score_label as Label] < LABEL_RANK[r.min_label as Label]) return false;
  if (r.min_days && (o.trip_days ?? 0) < r.min_days) return false;
  if (r.max_days && (o.trip_days ?? 999) > r.max_days) return false;
  if (r.max_days_ahead && daysBetween(new Date().toISOString().slice(0, 10), o.depart_date) > r.max_days_ahead) return false;
  return true;
}

/** Cria (ou recria) o rascunho de uma oportunidade para um canal. Gera o link rastreável. */
export async function composeFor(env: Env, s: Settings, oppId: number, ch: Channel, overrideTemplate?: Template) {
  const db = env.DB;
  const o = await db.prepare("SELECT * FROM opportunities WHERE id = ?").bind(oppId).first<any>();
  if (!o) throw new Error("oportunidade não encontrada");
  let link = await db.prepare("SELECT * FROM tracked_links WHERE opportunity_id = ? AND channel_id = ?").bind(oppId, ch.id).first<any>();
  if (!link) {
    const code = randomCode();
    const target = o.deeplink || `${s.site_url}/#oferta-${oppId}`;
    const r = await db.prepare("INSERT INTO tracked_links (code, opportunity_id, channel_id, partner_id, target_url) VALUES (?,?,?,?,?)")
      .bind(code, oppId, ch.id, o.partner_id, target).run();
    link = { id: r.meta.last_row_id, code };
  }
  const body = renderPost({
    origin: o.origin, originCity: await cityOf(env, o.origin), destination: o.destination, destinationCity: await cityOf(env, o.destination),
    depart_date: o.depart_date, return_date: o.return_date, trip_days: o.trip_days, price_cents: o.price_cents, fare_type: o.fare_type,
    includes_taxes: o.includes_taxes, airline: o.airline, transfers: o.transfers, score_label: o.score_label, savings_pct: o.savings_pct,
    median_cents: o.median_cents, observed_at: o.observed_at, is_sample: o.is_sample, link: `${s.site_url}/r/${link.code}`,
  }, ch.type, overrideTemplate ?? ch.template);
  const status = o.is_sample ? "bloqueado" : "aguardando_aprovacao";
  await db.prepare(`INSERT INTO posts (opportunity_id, channel_id, link_id, body, status) VALUES (?,?,?,?,?)
     ON CONFLICT(opportunity_id, channel_id) DO UPDATE SET body = excluded.body,
       status = CASE WHEN posts.status IN ('enviado') THEN posts.status ELSE excluded.status END`)
    .bind(oppId, ch.id, link.id, body, status).run();
  return { body, status, code: link.code };
}

export async function compose(env: Env, s: Settings) {
  const db = env.DB;
  const { results: opps } = await db.prepare("SELECT * FROM opportunities WHERE status IN ('nova','aprovada') ORDER BY created_at DESC LIMIT 100").all<any>();
  const { results: chans } = await db.prepare("SELECT * FROM channels WHERE active = 1").all<Channel>();
  const ap = await airports(env);
  let created = 0;
  for (const o of opps) {
    const oa = ap.get(o.origin), da = ap.get(o.destination);
    for (const ch of chans) {
      if (!matchesRules(o, ch.rules, oa?.r ?? null, da?.k ?? null, oa?.k ?? null)) continue;
      const exists = await db.prepare("SELECT id FROM posts WHERE opportunity_id = ? AND channel_id = ?").bind(o.id, ch.id).first();
      if (exists) continue;
      await composeFor(env, s, o.id, ch);
      created++;
    }
  }
  await log(db, "job", `Montagem: ${created} rascunhos criados.`, "info", "compose");
  return { created };
}

/** Envio: só posts APROVADOS, de ofertas não-exemplo, dentro do limite diário e fora do horário de silêncio. */
export async function dispatch(env: Env, s: Settings) {
  const db = env.DB;
  const hourBR = (new Date().getUTCHours() + 21) % 24;
  const { results } = await db.prepare(`SELECT p.*, c.type, c.target_ref, c.max_per_day, c.quiet_start, c.quiet_end, c.name AS channel_name,
       o.is_sample, o.status AS opp_status
     FROM posts p JOIN channels c ON c.id = p.channel_id JOIN opportunities o ON o.id = p.opportunity_id
     WHERE p.status = 'aprovado' AND c.active = 1 ORDER BY p.approved_at ASC LIMIT 50`).all<any>();
  let sent = 0, manual = 0, skipped = 0;
  for (const p of results) {
    if (p.is_sample) { await db.prepare("UPDATE posts SET status='bloqueado', error='dado de exemplo' WHERE id=?").bind(p.id).run(); skipped++; continue; }
    if (!["nova", "aprovada", "publicada"].includes(p.opp_status)) { skipped++; continue; }
    const quiet = p.quiet_start > p.quiet_end ? (hourBR >= p.quiet_start || hourBR < p.quiet_end) : (hourBR >= p.quiet_start && hourBR < p.quiet_end);
    if (quiet) { skipped++; continue; }
    const today = nowIso().slice(0, 10);
    const cnt = await db.prepare("SELECT COUNT(*) n FROM posts WHERE channel_id = ? AND status = 'enviado' AND sent_at >= ?").bind(p.channel_id, today).first<{ n: number }>();
    if ((cnt?.n ?? 0) >= p.max_per_day) { skipped++; continue; }

    if (p.type === "telegram") {
      if (!env.TELEGRAM_BOT_TOKEN || !p.target_ref) {
        await db.prepare("UPDATE posts SET status='falhou', error=? WHERE id=?").bind("Telegram pendente: configure TELEGRAM_BOT_TOKEN e o chat_id do canal.", p.id).run();
        continue;
      }
      const r = await sendTelegram(env.TELEGRAM_BOT_TOKEN, p.target_ref, p.body);
      if (r.ok) {
        await db.prepare("UPDATE posts SET status='enviado', sent_at=?, error=NULL WHERE id=?").bind(nowIso(), p.id).run(); sent++;
      } else {
        await db.prepare("UPDATE posts SET status='falhou', error=? WHERE id=?").bind(r.error, p.id).run();
        await log(db, "integracao", `Telegram (${p.channel_name}): ${r.error}`, "erro", "telegram");
        continue;
      }
    } else {
      // WhatsApp canal, Instagram etc.: publicação assistida (copiar e colar) até haver API oficial liberada.
      manual++;
      continue;
    }
    const ttl = num(s, "offer_ttl_hours", 48);
    await db.prepare("UPDATE opportunities SET status='publicada', expires_at = COALESCE(expires_at, ?) WHERE id=?").bind(addHours(nowIso(), ttl), p.opportunity_id).run();
  }
  await log(db, "job", `Envio: ${sent} enviados, ${manual} aguardando publicação manual, ${skipped} adiados ou bloqueados.`, "info", "dispatch");
  return { sent, manual, skipped };
}

export async function markManualSent(env: Env, s: Settings, postId: number) {
  const p = await env.DB.prepare("SELECT p.*, o.is_sample FROM posts p JOIN opportunities o ON o.id = p.opportunity_id WHERE p.id = ?").bind(postId).first<any>();
  if (!p) throw new Error("post não encontrado");
  if (p.is_sample) throw new Error("Post de dado de exemplo não pode ser publicado.");
  if (p.status !== "aprovado") throw new Error("Aprove o post antes de marcar como publicado.");
  await env.DB.prepare("UPDATE posts SET status='enviado', sent_at=? WHERE id=?").bind(nowIso(), postId).run();
  await env.DB.prepare("UPDATE opportunities SET status='publicada', expires_at = COALESCE(expires_at, ?) WHERE id=?")
    .bind(addHours(nowIso(), num(s, "offer_ttl_hours", 48)), p.opportunity_id).run();
}

export { addDays };
