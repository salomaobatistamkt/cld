// Pontuação de oportunidades por percentil do histórico da mesma rota.
// Regra: sem amostra mínima, NÃO há rótulo de oferta ("dados_insuficientes").
import { Settings, num } from "./util";

export type Label = "imperdivel" | "excelente" | "boa" | "competitivo" | "comum" | "dados_insuficientes";

export const LABEL_TEXT: Record<Label, string> = {
  imperdivel: "Achado imperdível",
  excelente: "Excelente oportunidade",
  boa: "Boa oportunidade",
  competitivo: "Preço competitivo",
  comum: "Preço comum",
  dados_insuficientes: "Dados insuficientes",
};

export const LABEL_RANK: Record<Label, number> = {
  imperdivel: 4, excelente: 3, boa: 2, competitivo: 1, comum: 0, dados_insuficientes: -1,
};

export type Score = {
  label: Label;
  percentile: number | null; // % do histórico que é MAIS BARATO ou igual a este preço
  medianCents: number | null;
  sampleSize: number;
  savingsPct: number | null;  // economia em relação à mediana
};

export function median(sorted: number[]) {
  const n = sorted.length;
  if (!n) return null;
  return n % 2 ? sorted[(n - 1) / 2] : Math.round((sorted[n / 2 - 1] + sorted[n / 2]) / 2);
}

/** history: preços (centavos) de observações comparáveis, SEM incluir a própria observação. */
export function scorePrice(priceCents: number, history: number[], s: Settings): Score {
  const minSample = num(s, "min_sample", 30);
  const sorted = [...history].sort((a, b) => a - b);
  const sampleSize = sorted.length;
  const med = median(sorted);
  if (sampleSize < minSample || med === null) {
    return { label: "dados_insuficientes", percentile: null, medianCents: med, sampleSize, savingsPct: null };
  }
  const atOrBelow = sorted.filter(p => p <= priceCents).length;
  const percentile = Math.round((atOrBelow / sampleSize) * 1000) / 10;
  const savingsPct = Math.round(((med - priceCents) / med) * 1000) / 10;
  let label: Label = "comum";
  if (percentile <= num(s, "pct_imperdivel", 5)) label = "imperdivel";
  else if (percentile <= num(s, "pct_excelente", 15)) label = "excelente";
  else if (percentile <= num(s, "pct_boa", 30)) label = "boa";
  else if (percentile <= num(s, "pct_competitivo", 50)) label = "competitivo";
  return { label, percentile, medianCents: med, sampleSize, savingsPct };
}

/** Busca o histórico comparável no banco: mesma rota, mesmo tipo de tarifa, duração parecida, janela de N dias. */
export async function historyFor(
  db: D1Database, s: Settings,
  o: { origin: string; destination: string; fare_type: string; trip_days: number | null; exclude_id?: number; is_sample: number },
) {
  const tol = num(s, "trip_days_tolerance", 2);
  const days = num(s, "history_days", 180);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  let sql = `SELECT price_cents FROM price_observations
     WHERE origin = ? AND destination = ? AND fare_type = ? AND observed_at >= ? AND is_sample = ? AND id != ?`;
  const binds: unknown[] = [o.origin, o.destination, o.fare_type, since, o.is_sample, o.exclude_id ?? -1];
  if (o.trip_days != null) {
    sql += " AND trip_days BETWEEN ? AND ?";
    binds.push(o.trip_days - tol, o.trip_days + tol);
  }
  const { results } = await db.prepare(sql).bind(...binds).all<{ price_cents: number }>();
  return results.map(r => r.price_cents);
}
