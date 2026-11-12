import { Hono } from "hono";
import type { Env } from "../lib/util";
import { daysBetween, isDate, isIata, loadSettings, log, nowIso, brl } from "../lib/util";
import { integrationStatus } from "../adapters";
import { collect, detect, verifyOpportunity, verifyPending, expire, compose, composeFor, dispatch, insertObservation, markManualSent } from "../lib/jobs";
import { historyFor, scorePrice, LABEL_TEXT } from "../lib/scoring";
import { renderPost, TEMPLATES, Template } from "../lib/posts";
import { sampleObservations } from "../lib/demo";
import { cityOf } from "../lib/geo";

export const admin = new Hono<{ Bindings: Env }>();

// Autenticação simples por token (MVP). Em produção: Cloudflare Access na frente de /admin e /api/admin.
admin.use("*", async (c, next) => {
  const token = c.env.ADMIN_TOKEN;
  if (!token) return c.json({ error: "ADMIN_TOKEN não configurado no servidor." }, 503);
  const got = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (got !== token) return c.json({ error: "Acesso negado. Informe o token do painel." }, 401);
  await next();
});

const body = async (c: any) => (await c.req.json().catch(() => ({}))) as any;

/* ---------- Visão geral ---------- */
admin.get("/overview", async c => {
  const db = c.env.DB;
  const one = async (sql: string, ...b: unknown[]) => ((await db.prepare(sql).bind(...b).first<any>()) ?? {});
  const all = async (sql: string, ...b: unknown[]) => (await db.prepare(sql).bind(...b).all<any>()).results;
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const kpi = {
    opportunities: (await one("SELECT COUNT(*) n FROM opportunities")).n,
    approved: (await one("SELECT COUNT(*) n FROM opportunities WHERE status IN ('aprovada','publicada')")).n,
    posts_sent: (await one("SELECT COUNT(*) n FROM posts WHERE status = 'enviado'")).n,
    posts_pending: (await one("SELECT COUNT(*) n FROM posts WHERE status IN ('aguardando_aprovacao','aprovado')")).n,
    clicks_30d: (await one("SELECT COUNT(*) n FROM clicks WHERE at >= ?", since30)).n,
    conversions: (await one("SELECT COUNT(*) n FROM conversions WHERE status IN ('confirmada','paga')")).n,
    commission_pending_cents: (await one("SELECT COALESCE(SUM(commission_cents),0) v FROM conversions WHERE status IN ('pendente','confirmada')")).v,
    commission_paid_cents: (await one("SELECT COALESCE(SUM(commission_cents),0) v FROM conversions WHERE status = 'paga'")).v,
    searches_30d: (await one("SELECT COUNT(*) n FROM searches WHERE at >= ?", since30)).n,
    routes_active: (await one("SELECT COUNT(*) n FROM monitored_routes WHERE active = 1")).n,
    observations: (await one("SELECT COUNT(*) n FROM price_observations")).n,
    subscribers: (await one("SELECT COUNT(*) n FROM subscribers WHERE consent_marketing = 1")).n,
    sample_rows: (await one("SELECT COUNT(*) n FROM price_observations WHERE is_sample = 1")).n,
    errors_24h: (await one("SELECT COUNT(*) n FROM activity_log WHERE level = 'erro' AND at >= ?", new Date(Date.now() - 86_400_000).toISOString())).n,
  };
  const clicksByDay = await all("SELECT substr(at,1,10) d, COUNT(*) n FROM clicks WHERE at >= ? GROUP BY d ORDER BY d", since30);
  const oppsByDay = await all("SELECT substr(created_at,1,10) d, COUNT(*) n FROM opportunities WHERE created_at >= ? GROUP BY d ORDER BY d", since30);
  const byLabel = await all("SELECT score_label k, COUNT(*) n FROM opportunities GROUP BY k");
  const topDest = await all(`SELECT destination k, COUNT(*) n FROM (
      SELECT destination FROM searches WHERE at >= ? UNION ALL SELECT destination FROM opportunities WHERE created_at >= ?) GROUP BY k ORDER BY n DESC LIMIT 8`, since30, since30);
  const byChannel = await all(`SELECT c.id, c.name, c.type,
      (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id AND p.status='enviado') sent,
      (SELECT COUNT(*) FROM clicks k JOIN tracked_links l ON l.id = k.link_id WHERE l.channel_id = c.id AND k.at >= ?) clicks
     FROM channels c ORDER BY clicks DESC`, since30);
  const byPartner = await all(`SELECT p.id, p.name, p.kind, p.status,
      (SELECT COUNT(*) FROM clicks k JOIN tracked_links l ON l.id = k.link_id WHERE l.partner_id = p.id) clicks,
      (SELECT COUNT(*) FROM conversions v WHERE v.partner_id = p.id AND v.status IN ('confirmada','paga')) conversions,
      (SELECT COALESCE(SUM(commission_cents),0) FROM conversions v WHERE v.partner_id = p.id AND v.status != 'cancelada') commission_cents
     FROM partners p ORDER BY commission_cents DESC, clicks DESC`);
  const recent = await all("SELECT * FROM activity_log ORDER BY id DESC LIMIT 12");
  return c.json({ kpi, clicksByDay, oppsByDay, byLabel, topDest, byChannel, byPartner, recent, integrations: integrationStatus(c.env) });
});

/* ---------- Rotas monitoradas ---------- */
admin.get("/routes", async c => {
  const { results } = await c.env.DB.prepare(`SELECT r.*,
      (SELECT COUNT(*) FROM price_observations o WHERE o.origin = r.origin AND o.destination = r.destination) observations,
      (SELECT MIN(price_cents) FROM price_observations o WHERE o.origin = r.origin AND o.destination = r.destination AND o.observed_at >= ?) min_30d
     FROM monitored_routes r ORDER BY r.priority, r.origin, r.destination`).bind(new Date(Date.now() - 30 * 86_400_000).toISOString()).all();
  return c.json({ items: results });
});

admin.post("/routes", async c => {
  const b = await body(c);
  const pairs: [string, string][] = [];
  const origins = [].concat(b.origin ?? b.origins ?? []).map((x: string) => String(x).toUpperCase());
  const dests = [].concat(b.destination ?? b.destinations ?? []).map((x: string) => String(x).toUpperCase());
  for (const o of origins) for (const d of dests) if (isIata(o) && isIata(d) && o !== d) pairs.push([o, d]);
  if (!pairs.length) return c.json({ error: "Informe ao menos uma origem e um destino válidos (códigos IATA)." }, 400);
  const lengths = Array.isArray(b.trip_lengths) && b.trip_lengths.length ? b.trip_lengths.map(Number).filter((n: number) => n > 0 && n < 120) : [2, 7, 10, 15, 20, 30];
  let created = 0;
  for (const [o, d] of pairs) {
    const r = await c.env.DB.prepare(`INSERT OR IGNORE INTO monitored_routes (origin, destination, trip_lengths, months_ahead, one_way, priority) VALUES (?,?,?,?,?,?)`)
      .bind(o, d, JSON.stringify(lengths), Math.max(1, Math.min(12, Number(b.months_ahead ?? 6))), b.one_way ? 1 : 0, Number(b.priority ?? 2)).run();
    created += r.meta.changes;
  }
  await log(c.env.DB, "admin", `${created} rota(s) cadastrada(s).`);
  return c.json({ ok: true, created, skipped: pairs.length - created });
});

admin.patch("/routes/:id", async c => {
  const b = await body(c);
  const fields: string[] = [], vals: unknown[] = [];
  for (const k of ["active", "priority", "months_ahead", "one_way"]) if (k in b) { fields.push(`${k} = ?`); vals.push(Number(b[k])); }
  if (Array.isArray(b.trip_lengths)) { fields.push("trip_lengths = ?"); vals.push(JSON.stringify(b.trip_lengths.map(Number))); }
  if (!fields.length) return c.json({ error: "Nada para alterar." }, 400);
  await c.env.DB.prepare(`UPDATE monitored_routes SET ${fields.join(", ")} WHERE id = ?`).bind(...vals, c.req.param("id")).run();
  return c.json({ ok: true });
});

admin.delete("/routes/:id", async c => {
  await c.env.DB.prepare("DELETE FROM monitored_routes WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

/* ---------- Oportunidades ---------- */
admin.get("/opportunities", async c => {
  const status = c.req.query("status");
  const { results } = await c.env.DB.prepare(
    `SELECT o.*, p.name partner_name,
      (SELECT COUNT(*) FROM clicks k JOIN tracked_links l ON l.id = k.link_id WHERE l.opportunity_id = o.id) clicks
     FROM opportunities o LEFT JOIN partners p ON p.id = o.partner_id
     ${status ? "WHERE o.status = ?" : ""} ORDER BY o.created_at DESC, o.id DESC LIMIT 200`).bind(...(status ? [status] : [])).all<any>();
  return c.json({ items: results.map(r => ({ ...r, label_text: LABEL_TEXT[r.score_label as keyof typeof LABEL_TEXT] })) });
});

/** Cadastro manual de oportunidade: o preço vem de uma consulta sua e fica registrado com fonte "manual". */
admin.post("/opportunities", async c => {
  const b = await body(c);
  const origin = String(b.origin ?? "").toUpperCase(), destination = String(b.destination ?? "").toUpperCase();
  if (!isIata(origin) || !isIata(destination) || origin === destination) return c.json({ error: "Origem e destino inválidos." }, 400);
  if (!isDate(b.depart_date) || (b.return_date && (!isDate(b.return_date) || b.return_date <= b.depart_date))) return c.json({ error: "Datas inválidas." }, 400);
  const price = Math.round(Number(b.price) * 100);
  if (!(price > 0)) return c.json({ error: "Informe o preço encontrado." }, 400);
  if (!b.source_link) return c.json({ error: "Informe o link onde o preço foi encontrado (necessário para verificação)." }, 400);
  const db = c.env.DB, s = await loadSettings(db);
  const fare = b.return_date ? "ida_volta" : "trecho";
  const trip = b.return_date ? daysBetween(b.depart_date, b.return_date) : null;
  const obsId = await insertObservation(db, {
    origin, destination, depart_date: b.depart_date, return_date: b.return_date || null, price_cents: price, currency: "BRL", fare_type: fare,
    includes_taxes: b.includes_taxes === true ? 1 : b.includes_taxes === false ? 0 : null, airline: b.airline || null,
    transfers: b.transfers === "" || b.transfers == null ? null : Number(b.transfers), source: "manual", source_link: b.source_link, observed_at: b.observed_at || nowIso(),
  }, null);
  const hist = await historyFor(db, s, { origin, destination, fare_type: fare, trip_days: trip, exclude_id: obsId, is_sample: 0 });
  const sc = scorePrice(price, hist, s);
  const r = await db.prepare(`INSERT OR IGNORE INTO opportunities (observation_id, partner_id, origin, destination, depart_date, return_date, trip_days, price_cents,
      fare_type, includes_taxes, airline, transfers, source, score_label, percentile, median_cents, sample_size, savings_pct, deeplink, observed_at, last_verified_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'manual',?,?,?,?,?,?,?,?)`).bind(
    obsId, b.partner_id || null, origin, destination, b.depart_date, b.return_date || null, trip, price, fare,
    b.includes_taxes === true ? 1 : b.includes_taxes === false ? 0 : null, b.airline || null, b.transfers == null || b.transfers === "" ? null : Number(b.transfers),
    sc.label, sc.percentile, sc.medianCents, sc.sampleSize, sc.savingsPct, b.source_link, b.observed_at || nowIso(), b.observed_at || nowIso()).run();
  await log(db, "admin", `Oportunidade manual ${origin}-${destination} ${brl(price)} (${LABEL_TEXT[sc.label]}).`);
  return c.json({ ok: true, id: r.meta.last_row_id, score: sc, label_text: LABEL_TEXT[sc.label] });
});

admin.patch("/opportunities/:id", async c => {
  const b = await body(c);
  const allowed = ["nova", "aprovada", "rejeitada", "expirada", "desatualizada", "publicada"];
  if (!allowed.includes(b.status)) return c.json({ error: "Status inválido." }, 400);
  const id = Number(c.req.param("id"));
  if (b.status === "aprovada") {
    const o = await c.env.DB.prepare("SELECT is_sample, observed_at, last_verified_at FROM opportunities WHERE id = ?").bind(id).first<any>();
    const s = await loadSettings(c.env.DB);
    const age = (Date.now() - Date.parse(o?.last_verified_at || o?.observed_at)) / 3600_000;
    if (o && !o.is_sample && age > Number(s.verify_max_age_hours || 6))
      return c.json({ error: `Consulta com ${Math.round(age)} h. Verifique a oferta antes de aprovar.` }, 409);
  }
  await c.env.DB.prepare("UPDATE opportunities SET status = ? WHERE id = ?").bind(b.status, id).run();
  return c.json({ ok: true });
});

admin.post("/opportunities/:id/verify", async c => {
  const s = await loadSettings(c.env.DB);
  const b = await body(c);
  if (b.manual_confirm === true) {
    // Fonte manual não tem API: quem confirma é você, olhando o site do parceiro. Fica registrado no log.
    const o = await c.env.DB.prepare("SELECT source, is_sample FROM opportunities WHERE id = ?").bind(c.req.param("id")).first<any>();
    if (!o || o.source !== "manual" || o.is_sample) return c.json({ error: "Confirmação manual só vale para ofertas cadastradas manualmente." }, 400);
    await c.env.DB.prepare("UPDATE opportunities SET last_verified_at = ?, status = CASE WHEN status = 'desatualizada' THEN 'nova' ELSE status END WHERE id = ?").bind(nowIso(), c.req.param("id")).run();
    await log(c.env.DB, "admin", `Oferta ${c.req.param("id")} confirmada manualmente no site do parceiro.`);
    return c.json({ ok: true, manual: true });
  }
  return c.json(await verifyOpportunity(c.env, s, Number(c.req.param("id"))));
});

admin.get("/opportunities/:id/history", async c => {
  const o = await c.env.DB.prepare("SELECT * FROM opportunities WHERE id = ?").bind(c.req.param("id")).first<any>();
  if (!o) return c.json({ error: "não encontrada" }, 404);
  const { results } = await c.env.DB.prepare(`SELECT price_cents, observed_at, depart_date, trip_days FROM price_observations
     WHERE origin = ? AND destination = ? AND fare_type = ? AND is_sample = ? ORDER BY observed_at`).bind(o.origin, o.destination, o.fare_type, o.is_sample).all();
  return c.json({ opportunity: o, points: results });
});

/* ---------- Canais ---------- */
admin.get("/channels", async c => {
  const { results } = await c.env.DB.prepare(`SELECT c.*,
     (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id AND p.status = 'enviado') sent,
     (SELECT COUNT(*) FROM posts p WHERE p.channel_id = c.id AND p.status IN ('aguardando_aprovacao','aprovado')) pending,
     (SELECT COUNT(*) FROM clicks k JOIN tracked_links l ON l.id = k.link_id WHERE l.channel_id = c.id) clicks
    FROM channels c ORDER BY c.id`).all();
  return c.json({ items: results, templates: TEMPLATES });
});

const channelFields = ["name", "type", "target_ref", "rules", "template", "max_per_day", "quiet_start", "quiet_end", "members_count", "active"];
admin.post("/channels", async c => {
  const b = await body(c);
  if (!b.name || !b.type) return c.json({ error: "Informe nome e tipo do canal." }, 400);
  const rules = typeof b.rules === "string" ? b.rules : JSON.stringify(b.rules ?? {});
  try { JSON.parse(rules); } catch { return c.json({ error: "Regras inválidas." }, 400); }
  const r = await c.env.DB.prepare(`INSERT INTO channels (name, type, target_ref, rules, template, max_per_day, quiet_start, quiet_end, members_count, active)
     VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(b.name, b.type, b.target_ref || null, rules, b.template || "classico", Number(b.max_per_day ?? 6),
    Number(b.quiet_start ?? 22), Number(b.quiet_end ?? 8), b.members_count ? Number(b.members_count) : null, b.active === false ? 0 : 1).run();
  return c.json({ ok: true, id: r.meta.last_row_id });
});

admin.patch("/channels/:id", async c => {
  const b = await body(c);
  if (b.rules && typeof b.rules !== "string") b.rules = JSON.stringify(b.rules);
  const keys = channelFields.filter(k => k in b);
  if (!keys.length) return c.json({ error: "Nada para alterar." }, 400);
  await c.env.DB.prepare(`UPDATE channels SET ${keys.map(k => `${k} = ?`).join(", ")} WHERE id = ?`)
    .bind(...keys.map(k => (typeof b[k] === "boolean" ? Number(b[k]) : b[k] === "" ? null : b[k])), c.req.param("id")).run();
  return c.json({ ok: true });
});

admin.delete("/channels/:id", async c => {
  await c.env.DB.prepare("UPDATE channels SET active = 0 WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});

/* ---------- Publicações ---------- */
admin.get("/posts", async c => {
  const status = c.req.query("status");
  const { results } = await c.env.DB.prepare(`SELECT p.*, c.name channel_name, c.type channel_type, o.origin, o.destination, o.price_cents, o.score_label, o.is_sample, l.code
     FROM posts p JOIN channels c ON c.id = p.channel_id JOIN opportunities o ON o.id = p.opportunity_id LEFT JOIN tracked_links l ON l.id = p.link_id
     ${status ? "WHERE p.status = ?" : ""} ORDER BY p.id DESC LIMIT 200`).bind(...(status ? [status] : [])).all();
  return c.json({ items: results });
});

/** Pré-visualização sem gravar: escolha oferta, canal (ou tipo de canal) e modelo. */
admin.post("/posts/preview", async c => {
  const b = await body(c);
  const db = c.env.DB, s = await loadSettings(db);
  const o = await db.prepare("SELECT * FROM opportunities WHERE id = ?").bind(b.opportunity_id).first<any>();
  if (!o) return c.json({ error: "Escolha uma oportunidade." }, 400);
  const type = b.channel_type || "telegram";
  const tpl: Template = TEMPLATES.includes(b.template) ? b.template : "classico";
  const text = renderPost({
    origin: o.origin, originCity: await cityOf(c.env, o.origin), destination: o.destination, destinationCity: await cityOf(c.env, o.destination),
    depart_date: o.depart_date, return_date: o.return_date, trip_days: o.trip_days, price_cents: o.price_cents, fare_type: o.fare_type,
    includes_taxes: o.includes_taxes, airline: o.airline, transfers: o.transfers, score_label: o.score_label, savings_pct: o.savings_pct,
    median_cents: o.median_cents, observed_at: o.observed_at, is_sample: o.is_sample, link: `${s.site_url}/r/xxxxxxx`,
  }, type, tpl);
  return c.json({ text, channel_type: type, template: tpl });
});

admin.post("/posts", async c => {
  const b = await body(c);
  const s = await loadSettings(c.env.DB);
  const ch = await c.env.DB.prepare("SELECT * FROM channels WHERE id = ?").bind(b.channel_id).first<any>();
  if (!ch) return c.json({ error: "Canal não encontrado." }, 400);
  try { return c.json({ ok: true, ...(await composeFor(c.env, s, Number(b.opportunity_id), ch, b.template)) }); }
  catch (e) { return c.json({ error: (e as Error).message }, 400); }
});

admin.patch("/posts/:id", async c => {
  const b = await body(c);
  const id = Number(c.req.param("id"));
  const p = await c.env.DB.prepare("SELECT p.*, o.is_sample FROM posts p JOIN opportunities o ON o.id = p.opportunity_id WHERE p.id = ?").bind(id).first<any>();
  if (!p) return c.json({ error: "Post não encontrado." }, 404);
  if (typeof b.body === "string" && b.body.trim()) await c.env.DB.prepare("UPDATE posts SET body = ? WHERE id = ?").bind(b.body, id).run();
  if (b.status === "aprovado") {
    if (p.is_sample) return c.json({ error: "Este post usa DADO DE EXEMPLO e não pode ser aprovado para envio." }, 409);
    await c.env.DB.prepare("UPDATE posts SET status = 'aprovado', approved_at = ? WHERE id = ?").bind(nowIso(), id).run();
    await c.env.DB.prepare("UPDATE opportunities SET status = 'aprovada' WHERE id = ? AND status = 'nova'").bind(p.opportunity_id).run();
  } else if (b.status === "rejeitado") {
    await c.env.DB.prepare("UPDATE posts SET status = 'rejeitado' WHERE id = ?").bind(id).run();
  }
  return c.json({ ok: true });
});

admin.post("/posts/:id/sent", async c => {
  try { await markManualSent(c.env, await loadSettings(c.env.DB), Number(c.req.param("id"))); return c.json({ ok: true }); }
  catch (e) { return c.json({ error: (e as Error).message }, 409); }
});

/* ---------- Parceiros ---------- */
admin.get("/partners", async c => c.json({ items: (await c.env.DB.prepare("SELECT * FROM partners ORDER BY kind, name").all()).results }));

const partnerFields = ["name", "kind", "network", "status", "link_template", "affiliate_id", "commission_note", "notes"];
admin.post("/partners", async c => {
  const b = await body(c);
  if (!b.name || !b.kind) return c.json({ error: "Informe nome e categoria." }, 400);
  const r = await c.env.DB.prepare(`INSERT INTO partners (${partnerFields.join(",")}) VALUES (${partnerFields.map(() => "?").join(",")})`)
    .bind(...partnerFields.map(k => b[k] ?? (k === "status" ? "pendente" : null))).run();
  return c.json({ ok: true, id: r.meta.last_row_id });
});
admin.patch("/partners/:id", async c => {
  const b = await body(c);
  const keys = partnerFields.filter(k => k in b);
  if (!keys.length) return c.json({ error: "Nada para alterar." }, 400);
  await c.env.DB.prepare(`UPDATE partners SET ${keys.map(k => `${k} = ?`).join(", ")} WHERE id = ?`).bind(...keys.map(k => b[k] === "" ? null : b[k]), c.req.param("id")).run();
  return c.json({ ok: true });
});

/* ---------- Comercial: conversões e comissões ---------- */
admin.get("/conversions", async c => c.json({ items: (await c.env.DB.prepare(
  "SELECT v.*, p.name partner_name FROM conversions v LEFT JOIN partners p ON p.id = v.partner_id ORDER BY occurred_at DESC LIMIT 300").all()).results }));

admin.post("/conversions", async c => {
  const b = await body(c);
  const rows = Array.isArray(b.rows) ? b.rows : [b];
  let n = 0;
  for (const r of rows) {
    if (!r.partner_id || !isDate(String(r.occurred_at ?? "").slice(0, 10))) continue;
    const res = await c.env.DB.prepare(`INSERT INTO conversions (partner_id, link_id, external_ref, amount_cents, commission_cents, status, source, occurred_at)
       VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(partner_id, external_ref) DO UPDATE SET status = excluded.status, commission_cents = excluded.commission_cents, amount_cents = excluded.amount_cents`)
      .bind(r.partner_id, r.link_id ?? null, r.external_ref ?? null, r.amount != null ? Math.round(Number(r.amount) * 100) : null,
        r.commission != null ? Math.round(Number(r.commission) * 100) : null, r.status ?? "pendente", rows.length > 1 ? "importacao" : "manual", r.occurred_at).run();
    n += res.meta.changes;
  }
  return c.json({ ok: true, saved: n });
});

/* ---------- Interessados, configurações, logs, integrações ---------- */
admin.get("/subscribers", async c => c.json({ items: (await c.env.DB.prepare("SELECT * FROM subscribers ORDER BY id DESC LIMIT 500").all()).results }));

admin.get("/settings", async c => c.json(await loadSettings(c.env.DB)));
admin.patch("/settings", async c => {
  const b = await body(c);
  for (const [k, v] of Object.entries(b)) await c.env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(k, String(v)).run();
  await log(c.env.DB, "admin", `Configurações alteradas: ${Object.keys(b).join(", ")}`);
  return c.json({ ok: true });
});

admin.get("/logs", async c => c.json({ items: (await c.env.DB.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 300").all()).results }));
admin.get("/integrations", c => c.json({ items: integrationStatus(c.env) }));

/* ---------- Jobs (n8n chama estes endpoints) ---------- */
admin.post("/jobs/:name", async c => {
  const s = await loadSettings(c.env.DB);
  const name = c.req.param("name");
  const b = await body(c);
  try {
    switch (name) {
      case "collect": return c.json(await collect(c.env, Number(b.max_calls ?? 40)));
      case "detect": return c.json(await detect(c.env, s, Number(b.since_hours ?? 24), b.min_label ?? "competitivo"));
      case "verify": return c.json(await verifyPending(c.env, s));
      case "expire": return c.json(await expire(c.env));
      case "compose": return c.json(await compose(c.env, s));
      case "dispatch": return c.json(await dispatch(c.env, s));
      case "pipeline": {
        const out: Record<string, unknown> = {};
        out.collect = await collect(c.env, Number(b.max_calls ?? 40));
        out.detect = await detect(c.env, s);
        out.expire = await expire(c.env);
        out.compose = await compose(c.env, s);
        return c.json(out);
      }
      default: return c.json({ error: "Job desconhecido." }, 404);
    }
  } catch (e) {
    await log(c.env.DB, "erro", `Job ${name}: ${(e as Error).message}`, "erro", name);
    return c.json({ error: (e as Error).message }, 500);
  }
});

/** Relatório em texto (para o n8n mandar por Telegram/e-mail). */
admin.get("/report", async c => {
  const db = c.env.DB;
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const q = async (sql: string) => ((await db.prepare(sql).bind(since).first<any>()) ?? { n: 0 }).n;
  const text = [
    `Resumo das últimas 24 h`,
    `Oportunidades novas: ${await q("SELECT COUNT(*) n FROM opportunities WHERE created_at >= ?")}`,
    `Posts enviados: ${await q("SELECT COUNT(*) n FROM posts WHERE sent_at >= ?")}`,
    `Cliques: ${await q("SELECT COUNT(*) n FROM clicks WHERE at >= ?")}`,
    `Pesquisas no site: ${await q("SELECT COUNT(*) n FROM searches WHERE at >= ?")}`,
    `Erros de integração: ${await q("SELECT COUNT(*) n FROM activity_log WHERE level = 'erro' AND at >= ?")}`,
  ].join("\n");
  return c.json({ text });
});

/* ---------- Modo demonstração ---------- */
admin.post("/demo/seed", async c => {
  const db = c.env.DB;
  const routes: [string, string][] = [["NAT", "GRU"], ["BEL", "BSB"], ["FOR", "GIG"], ["REC", "EZE"], ["GRU", "SCL"], ["NAT", "LIS"]];
  for (const [o, d] of routes)
    await db.prepare("INSERT OR IGNORE INTO monitored_routes (origin, destination) VALUES (?, ?)").bind(o, d).run();
  let n = 0;
  for (const [o, d] of routes) {
    const route = await db.prepare("SELECT id FROM monitored_routes WHERE origin = ? AND destination = ?").bind(o, d).first<{ id: number }>();
    for (const obs of sampleObservations(o, d, [7, 10, 15, 21])) { await insertObservation(db, obs as any, route?.id ?? null); n++; }
  }
  const chans = [
    ["Achados saindo do Pará (exemplo)", "telegram", { origin_regions: ["BR-PA"], min_label: "boa" }],
    ["Achados saindo do RN (exemplo)", "whatsapp_canal", { origin_regions: ["BR-RN"], min_label: "boa" }],
    ["Passagens internacionais (exemplo)", "telegram", { international: true, min_label: "boa" }],
    ["Viagens econômicas (exemplo)", "instagram", { max_price: 600 }],
  ] as const;
  for (const [name, type, rules] of chans) {
    const ex = await db.prepare("SELECT id FROM channels WHERE name = ?").bind(name).first();
    if (!ex) await db.prepare("INSERT INTO channels (name, type, rules, template) VALUES (?,?,?,?)").bind(name, type, JSON.stringify(rules), type === "instagram" ? "direto" : "classico").run();
  }
  const s = await loadSettings(db);
  const det = await detect(c.env, s, 24, "competitivo");
  const comp = await compose(c.env, s);
  await log(db, "admin", `Modo demonstração: ${n} preços de EXEMPLO gerados.`, "aviso", "demo");
  return c.json({ ok: true, observations: n, opportunities: det.created, posts: comp.created });
});

admin.delete("/demo", async c => {
  const db = c.env.DB;
  await db.batch([
    db.prepare("DELETE FROM clicks WHERE link_id IN (SELECT l.id FROM tracked_links l JOIN opportunities o ON o.id = l.opportunity_id WHERE o.is_sample = 1)"),
    db.prepare("DELETE FROM posts WHERE opportunity_id IN (SELECT id FROM opportunities WHERE is_sample = 1)"),
    db.prepare("DELETE FROM tracked_links WHERE opportunity_id IN (SELECT id FROM opportunities WHERE is_sample = 1)"),
    db.prepare("DELETE FROM opportunities WHERE is_sample = 1"),
    db.prepare("DELETE FROM price_observations WHERE is_sample = 1"),
    db.prepare("DELETE FROM channels WHERE name LIKE '%(exemplo)'"),
  ]);
  await log(db, "admin", "Dados de exemplo removidos.", "info", "demo");
  return c.json({ ok: true });
});
