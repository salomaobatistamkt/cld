import type { Env } from "./util";

export type Airport = { i: string; n: string; c: string; r: string; rn: string; k: string; la: number; lo: number; t: string };

let cache: Map<string, Airport> | null = null;

export async function airports(env: Env): Promise<Map<string, Airport>> {
  if (cache) return cache;
  const res = await env.ASSETS.fetch(new Request("https://assets.local/data/airports.json"));
  const data = await res.json() as { airports: Airport[] };
  cache = new Map(data.airports.map(a => [a.i, a]));
  return cache;
}

export async function cityOf(env: Env, iata: string) {
  const a = (await airports(env)).get(iata);
  return a ? (a.c || a.n) : iata;
}
