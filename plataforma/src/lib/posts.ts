// Gerador de publicações. Cada canal tem um formato; cada modelo tem uma estrutura própria,
// para que as postagens não fiquem todas iguais. Informações obrigatórias (CDC art. 31):
// tipo de tarifa, situação das taxas, data e hora da consulta, aviso de variação e de link de afiliado.
import { LABEL_TEXT, Label } from "./scoring";
import { brl, fmtDate, fmtDateTime } from "./util";

export type PostInput = {
  origin: string; originCity: string;
  destination: string; destinationCity: string;
  depart_date: string; return_date: string | null; trip_days: number | null;
  price_cents: number; fare_type: string; includes_taxes: number | null;
  airline: string | null; transfers: number | null;
  score_label: Label; savings_pct: number | null; median_cents: number | null;
  observed_at: string; is_sample: number;
  link: string;
};

export type ChannelType = "telegram" | "whatsapp_canal" | "whatsapp_api" | "instagram" | "facebook" | "email" | "site";
export type Template = "classico" | "direto" | "roteiro" | "alerta";
export const TEMPLATES: Template[] = ["classico", "direto", "roteiro", "alerta"];

const fareText = (p: PostInput) => (p.fare_type === "ida_volta" ? "ida e volta" : "por trecho (só ida)");
const taxText = (p: PostInput) =>
  p.includes_taxes === 1 ? "com taxas" : p.includes_taxes === 0 ? "sem taxas" : "taxas a confirmar no parceiro";
const stopsText = (p: PostInput) =>
  p.transfers == null ? null : p.transfers === 0 ? "voo direto" : p.transfers === 1 ? "1 conexão" : `${p.transfers} conexões`;
const refText = (p: PostInput) =>
  p.savings_pct != null && p.median_cents != null && p.savings_pct > 0
    ? `${Math.round(p.savings_pct)}% abaixo da mediana da rota (${brl(p.median_cents)})`
    : null;

function bold(t: string, ch: ChannelType) {
  if (ch === "telegram") return `<b>${esc(t)}</b>`;
  if (ch.startsWith("whatsapp")) return `*${t}*`;
  return t;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function footer(p: PostInput, ch: ChannelType) {
  const lines = [
    `Preço visto em consulta de ${fmtDateTime(p.observed_at)} (horário de Brasília).`,
    "Valores e disponibilidade podem mudar. Confira as condições antes de reservar.",
    "Link de afiliado: podemos receber comissão, sem custo extra para você.",
  ];
  return ch === "telegram" ? lines.map(esc).join("\n") : lines.join("\n");
}

function linkLine(p: PostInput, ch: ChannelType) {
  if (ch === "instagram") return "🔎 Link na bio · procure pela rota " + p.origin + "-" + p.destination;
  return "🔎 Detalhes e reserva: " + p.link;
}

export function renderPost(p: PostInput, ch: ChannelType, tpl: Template): string {
  const route = `${p.originCity} (${p.origin}) → ${p.destinationCity} (${p.destination})`;
  const dates = p.return_date
    ? `Ida ${fmtDate(p.depart_date)} · Volta ${fmtDate(p.return_date)}`
    : `Ida ${fmtDate(p.depart_date)}`;
  const label = p.score_label === "dados_insuficientes" ? "Oferta encontrada" : LABEL_TEXT[p.score_label];
  const ref = refText(p);
  const details = [stopsText(p), p.airline ? `cia. ${p.airline}` : null].filter(Boolean).join(" · ");
  const price = `${brl(p.price_cents)} ${fareText(p)}, ${taxText(p)}`;
  const e = (s: string) => (ch === "telegram" ? esc(s) : s);

  let body: string[];
  switch (tpl) {
    case "direto":
      body = [
        bold(`${p.origin} → ${p.destination} por ${brl(p.price_cents)}`, ch),
        e(`${p.originCity} para ${p.destinationCity}, ${fareText(p)}, ${taxText(p)}.`),
        e(dates + (p.trip_days ? ` (${p.trip_days} dias)` : "")),
        ref ? e(ref) : "",
        "",
        e(linkLine(p, ch)),
      ];
      break;
    case "roteiro":
      body = [
        bold(`Roteiro de ${p.trip_days ?? "?"} dias em ${p.destinationCity}`, ch),
        e(`Saindo de ${p.originCity}`),
        "",
        e(`✈️ Passagem: ${price}`),
        e(`📅 ${dates}`),
        details ? e(`🧭 ${details}`) : "",
        e("🏨 Hospedagem e 🚗 carro: consulte opções para as mesmas datas no link."),
        "",
        e(linkLine(p, ch)),
      ];
      break;
    case "alerta":
      body = [
        bold(`🔔 Alerta de preço · ${label}`, ch),
        e(route),
        e(`${brl(p.price_cents)} · ${fareText(p)}, ${taxText(p)}`),
        ref ? e(`Referência: ${ref}`) : e("Ainda sem histórico suficiente para comparar."),
        e(dates),
        "",
        e(linkLine(p, ch)),
      ];
      break;
    default: // classico
      body = [
        bold(`✈️ ${label.toUpperCase()}`, ch),
        "",
        e(`📍 ${route}`),
        e(`📅 ${dates}`),
        p.trip_days ? e(`🗓️ ${p.trip_days} dias de viagem`) : "",
        "",
        e(`💰 ${price}`),
        details ? e(`   ${details}`) : "",
        ref ? e(`   ${ref}`) : "",
        "",
        e("🏨 Também dá para ver hospedagem para o período."),
        e(linkLine(p, ch)),
      ];
  }

  const text = [...body.filter((l, i, a) => !(l === "" && a[i - 1] === "")), "", footer(p, ch)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (p.is_sample) {
    const warn = "⚠️ DADO DE EXEMPLO · NÃO É UM PREÇO REAL · NÃO PUBLICAR";
    return `${ch === "telegram" ? esc(warn) : warn}\n\n${text}`;
  }
  return text;
}
