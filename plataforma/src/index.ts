import { Hono } from "hono";
import type { Env } from "./lib/util";
import { loadSettings } from "./lib/util";
import { pub } from "./routes/public";
import { admin } from "./routes/admin";
import { collect, detect, expire, compose, verifyPending } from "./lib/jobs";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/public", pub);
app.route("/api/admin", admin);

/** Link rastreável: registra o clique e redireciona para o parceiro. */
app.get("/r/:code", async c => {
  const link = await c.env.DB.prepare("SELECT id, target_url FROM tracked_links WHERE code = ?").bind(c.req.param("code")).first<{ id: number; target_url: string }>();
  if (!link) return c.text("Link não encontrado ou expirado.", 404);
  const country = (c.req.raw as any).cf?.country ?? null;
  await c.env.DB.prepare("INSERT INTO clicks (link_id, country, referrer) VALUES (?,?,?)")
    .bind(link.id, country, (c.req.header("referer") ?? "").slice(0, 200) || null).run();
  return c.redirect(link.target_url, 302);
});

app.get("/api/health", c => c.json({ ok: true }));
app.notFound(c => (c.req.path.startsWith("/api/") ? c.json({ error: "Rota não encontrada." }, 404) : c.env.ASSETS.fetch(c.req.raw)));
app.onError((e, c) => c.json({ error: e.message }, 500));

export default {
  fetch: app.fetch,
  // Agendamento nativo opcional (ative [triggers] no wrangler.toml). O n8n pode fazer o mesmo via /api/admin/jobs/*.
  async scheduled(_e: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      const s = await loadSettings(env.DB);
      await collect(env);
      await detect(env, s);
      await verifyPending(env, s);
      await expire(env);
      await compose(env, s);
    })());
  },
};
