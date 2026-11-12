// Versão navegável: roda o MESMO Worker (src/index.ts) dentro do navegador.
// O banco D1 é substituído por SQLite em WebAssembly (sql.js) e os dados ficam só neste navegador.
// Serve para demonstrar e testar o fluxo sem servidor. Produção continua sendo Cloudflare Workers + D1.
import worker from "../src/index";
// @ts-ignore — texto do arquivo de migração embutido pelo esbuild
import MIGRATION from "../migrations/0001_init.sql";

declare const initSqlJs: (o: { locateFile: (f: string) => string }) => Promise<any>;

const ROOT: string = (document.currentScript as HTMLScriptElement | null)?.dataset.root ?? "./";
const KEY = "meridia_demo_db_v1";
const origFetch = window.fetch.bind(window);

const toAsset = (path: string) => ROOT + path.replace(/^\//, "");

let SQL: any, db: any;

function b64(u8: Uint8Array) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s: string) { const b = atob(s), u8 = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i); return u8; }
function save() { try { localStorage.setItem(KEY, b64(db.export())); } catch { /* armazenamento indisponível: segue só na memória */ } }

const norm = (v: unknown) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

class Stmt {
  params: unknown[] = [];
  constructor(public sql: string) {}
  bind(...p: unknown[]) { this.params = p.map(norm); return this; }
  private rows() {
    const st = db.prepare(this.sql);
    try { st.bind(this.params); const out: any[] = []; while (st.step()) out.push(st.getAsObject()); return out; }
    finally { st.free(); }
  }
  async all() { return { results: this.rows(), success: true, meta: {} }; }
  async first(col?: string) { const r = this.rows()[0] ?? null; return col && r ? r[col] : r; }
  async run() {
    db.run(this.sql, this.params);
    const changes = db.getRowsModified();
    const id = db.exec("SELECT last_insert_rowid() AS id")[0]?.values[0][0] ?? 0;
    return { success: true, meta: { changes, last_row_id: id } };
  }
}
const D1 = {
  prepare: (sql: string) => new Stmt(sql),
  batch: async (stmts: Stmt[]) => { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  exec: async (sql: string) => { db.exec(sql); return { count: 0 }; },
};

const env: any = {
  DB: D1,
  ASSETS: { fetch: (req: Request) => origFetch(toAsset(new URL(req.url).pathname)) },
  APP_ENV: "navegador",
  ADMIN_TOKEN: "dev-admin",
};
const ctx: any = { waitUntil: (p: Promise<unknown>) => p, passThroughOnException() {} };

async function boot() {
  SQL = await initSqlJs({ locateFile: f => toAsset("vendor/" + f) });
  let saved: string | null = null;
  try { saved = localStorage.getItem(KEY); } catch {}
  if (saved) { db = new SQL.Database(unb64(saved)); return; }
  db = new SQL.Database();
  db.exec(MIGRATION);
  db.run("UPDATE settings SET value = 'https://seu-dominio.com.br' WHERE key = 'site_url'");
  // Primeira visita: carrega a demonstração para haver o que navegar.
  const call = (method: string, path: string, body?: unknown) => worker.fetch(new Request("https://meridia.local" + path, {
    method, headers: { authorization: "Bearer dev-admin", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }), env, ctx);
  await call("POST", "/api/admin/demo/seed");
  const opps = db.exec("SELECT id FROM opportunities WHERE score_label IN ('imperdivel','excelente','boa','competitivo') ORDER BY id")[0]?.values ?? [];
  for (const [id] of opps) await call("PATCH", `/api/admin/opportunities/${id}`, { status: "aprovada" });
  save();
}
const ready = boot();

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const path = url.startsWith("/") ? url : (() => { try { const u = new URL(url); return u.origin === location.origin ? u.pathname + u.search : null; } catch { return null; } })();
  if (path && (path.startsWith("/api/") || path.startsWith("/r/"))) {
    await ready;
    const res = await worker.fetch(new Request("https://meridia.local" + path, init), env, ctx);
    if ((init?.method ?? "GET") !== "GET") save();
    return res;
  }
  if (url.startsWith("/")) return origFetch(toAsset(url), init);
  return origFetch(input as any, init);
};

(window as any).meridiaReset = () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); };
