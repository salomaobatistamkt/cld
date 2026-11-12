// Modo demonstração: gera observações SINTÉTICAS para testar o fluxo sem fonte real configurada.
// Tudo que sai daqui tem is_sample = 1, aparece com selo "DADO DE EXEMPLO" e é bloqueado para envio.
import { addDays, nowIso } from "./util";

function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Gera N observações de exemplo de uma rota, espalhadas nos últimos 120 dias. */
export function sampleObservations(origin: string, destination: string, tripLengths: number[], n = 200) {
  const rnd = prng(hash(origin + destination));
  const base = 35000 + Math.floor(rnd() * 140000); // R$ 350 a R$ 1.750 de referência fictícia
  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  for (let k = 0; k < n; k++) {
    const trip = tripLengths[Math.floor(rnd() * tripLengths.length)];
    const depart = addDays(today, 20 + Math.floor(rnd() * 150));
    const noise = 0.7 + rnd() * 0.75;
    const observed = new Date(Date.now() - Math.floor(rnd() * 120) * 86_400_000 - Math.floor(rnd() * 86_400_000));
    out.push({
      origin, destination, depart_date: depart, return_date: addDays(depart, trip), trip_days: trip,
      price_cents: Math.round((base * noise) / 100) * 100,
      fare_type: "ida_volta", includes_taxes: null, airline: null,
      transfers: Math.floor(rnd() * 3), source: "exemplo", source_link: null, is_sample: 1,
      observed_at: observed.toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
  }
  // Uma observação "de hoje" bem abaixo da média, para o fluxo de achado aparecer na demonstração.
  const depart = addDays(today, 45);
  out.push({
    origin, destination, depart_date: depart, return_date: addDays(depart, tripLengths[0]), trip_days: tripLengths[0],
    price_cents: Math.round((base * 0.66) / 100) * 100, fare_type: "ida_volta", includes_taxes: null, airline: null,
    transfers: 1, source: "exemplo", source_link: null, is_sample: 1, observed_at: nowIso(),
  });
  return out;
}
