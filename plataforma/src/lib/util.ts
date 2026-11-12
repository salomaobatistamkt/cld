export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV?: string;
  ADMIN_TOKEN?: string;
  TRAVELPAYOUTS_TOKEN?: string;
  TRAVELPAYOUTS_MARKER?: string;
  TELEGRAM_BOT_TOKEN?: string;
};

export const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export const addHours = (iso: string, h: number) =>
  new Date(new Date(iso).getTime() + h * 3600_000).toISOString().replace(/\.\d{3}Z$/, "Z");

export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86_400_000);

export const addDays = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

export const brl = (cents: number) =>
  "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDate = (d: string) => d.split("-").reverse().join("/");

export const fmtDateTime = (iso: string) => {
  // Exibição em horário de Brasília (UTC-3, sem horário de verão desde 2019)
  const t = new Date(Date.parse(iso) - 3 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getUTCDate())}/${p(t.getUTCMonth() + 1)}/${t.getUTCFullYear()} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
};

export type Settings = Record<string, string>;

export async function loadSettings(db: D1Database): Promise<Settings> {
  const { results } = await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  return Object.fromEntries(results.map(r => [r.key, r.value]));
}

export const num = (s: Settings, k: string, d: number) => {
  const v = Number(s[k]);
  return Number.isFinite(v) ? v : d;
};

export async function log(db: D1Database, kind: string, message: string, level: "info" | "aviso" | "erro" = "info", source?: string) {
  await db.prepare("INSERT INTO activity_log (kind, source, level, message) VALUES (?,?,?,?)")
    .bind(kind, source ?? null, level, message.slice(0, 1000)).run();
}

export function randomCode(len = 7) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, b => chars[b % chars.length]).join("");
}

export const isIata = (s: unknown): s is string => typeof s === "string" && /^[A-Z]{3}$/.test(s);
export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
