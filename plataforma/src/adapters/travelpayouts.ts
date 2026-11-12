// Travelpayouts · Aviasales Data API (v3 prices_for_dates)
// Documentação: https://support.travelpayouts.com/hc/en-us/articles/203956163
// Os preços vêm do cache de buscas reais dos últimos dias: são "preços vistos", não garantidos.
import type { FlightAdapter, FlightQuery, FlightQuote, AdapterStatus } from "./types";
import type { Env } from "../lib/util";
import { nowIso } from "../lib/util";

const ENDPOINT = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

type TPItem = {
  origin: string; destination: string;
  origin_airport?: string; destination_airport?: string;
  price: number; airline?: string; flight_number?: string | number;
  departure_at: string; return_at?: string;
  transfers?: number; return_transfers?: number;
  link?: string;
};

export function travelpayouts(env: Env): FlightAdapter {
  const token = env.TRAVELPAYOUTS_TOKEN;
  const marker = env.TRAVELPAYOUTS_MARKER;

  const status = (): AdapterStatus => ({
    id: "travelpayouts",
    name: "Travelpayouts · Aviasales Data API",
    kind: "voo",
    configured: Boolean(token),
    mode: token ? "real" : "pendente",
    detail: token
      ? (marker ? "Token e marker configurados." : "Token configurado. Falta TRAVELPAYOUTS_MARKER para os links renderem comissão.")
      : "Pendente: cadastre-se na Travelpayouts, conecte o programa Aviasales e configure TRAVELPAYOUTS_TOKEN e TRAVELPAYOUTS_MARKER.",
  });

  async function search(q: FlightQuery): Promise<FlightQuote[]> {
    if (!token) throw new Error("Fonte Travelpayouts pendente: TRAVELPAYOUTS_TOKEN não configurado.");
    const p = new URLSearchParams({
      origin: q.origin, destination: q.destination,
      departure_at: q.depart, currency: "brl", sorting: "price",
      unique: "false", limit: String(q.limit ?? 30), page: "1",
      one_way: q.ret ? "false" : "true",
    });
    if (q.ret) p.set("return_at", q.ret);
    const res = await fetch(`${ENDPOINT}?${p}`, { headers: { "X-Access-Token": token, "Accept-Encoding": "gzip" } });
    if (!res.ok) throw new Error(`Travelpayouts respondeu ${res.status}`);
    const body = await res.json() as { success?: boolean; data?: TPItem[]; error?: string };
    if (body.success === false) throw new Error(`Travelpayouts: ${body.error ?? "erro desconhecido"}`);
    const seen = nowIso();
    return (body.data ?? []).map((it): FlightQuote => {
      const link = it.link ? `https://www.aviasales.com${it.link}${marker ? (it.link.includes("?") ? "&" : "?") + "marker=" + encodeURIComponent(marker) : ""}` : null;
      return {
        origin: it.origin_airport || it.origin,
        destination: it.destination_airport || it.destination,
        depart_date: it.departure_at.slice(0, 10),
        return_date: it.return_at ? it.return_at.slice(0, 10) : null,
        price_cents: Math.round(it.price * 100),
        currency: "BRL",
        fare_type: it.return_at ? "ida_volta" : "trecho",
        includes_taxes: null,
        airline: it.airline ?? null,
        transfers: it.transfers ?? null,
        source: "travelpayouts",
        source_link: link,
        // A API não informa o instante exato em que o preço foi visto; registramos o momento da consulta
        // e tratamos o dado como cache recente (2–7 dias, segundo a documentação).
        observed_at: seen,
      };
    });
  }

  return { id: "travelpayouts", status, search };
}
