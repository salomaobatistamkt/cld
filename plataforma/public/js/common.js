// Utilitários compartilhados entre site e painel.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}

export const brl = c => c == null ? "—" : "R$ " + Math.round(c / 100).toLocaleString("pt-BR");
export const date = d => d ? d.slice(0, 10).split("-").reverse().join("/") : "—";
export function dateTime(iso) {
  if (!iso) return "—";
  const t = new Date(iso);
  return t.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
export function ago(iso) {
  if (!iso) return "—";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 48) return `há ${hh} h`;
  return `há ${Math.round(hh / 24)} dias`;
}

export const LABELS = {
  imperdivel: "Achado imperdível", excelente: "Excelente oportunidade", boa: "Boa oportunidade",
  competitivo: "Preço competitivo", comum: "Preço comum", dados_insuficientes: "Sem histórico suficiente",
};
export const labelTag = l => h("span", { class: `tag ${l}` }, LABELS[l] ?? l);
export const stops = n => n == null ? "—" : n === 0 ? "direto" : n === 1 ? "1 conexão" : `${n} conexões`;

export function toast(msg, err = false) {
  let box = document.getElementById("toast");
  if (!box) { box = h("div", { id: "toast", role: "status", "aria-live": "polite" }); document.body.append(box); }
  const el = h("div", { class: err ? "err" : "" }, msg);
  box.append(el);
  setTimeout(() => el.remove(), err ? 6000 : 3200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast("Texto copiado."); }
  catch { toast("Não foi possível copiar automaticamente. Selecione o texto e copie.", true); }
}

/* ---------- Aeroportos ---------- */
let AP = null;
export async function loadAirports() {
  if (AP) return AP;
  const d = await (await fetch("/data/airports.json")).json();
  const byIata = new Map(d.airports.map(a => [a.i, a]));
  AP = { list: d.airports, byIata, featToIso: d.featToIso };
  return AP;
}
const regionNames = (() => { try { return new Intl.DisplayNames(["pt-BR"], { type: "region" }); } catch { return null; } })();
export const countryName = iso => { try { return regionNames?.of(iso) ?? iso; } catch { return iso; } };
export const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const apLabel = a => a ? `${a.c || a.n} (${a.i})` : "";

/** Campo de aeroporto com autocompletar: aceita cidade, nome ou código IATA. */
export function airportInput(input, onPick) {
  const wrap = input.parentElement;
  wrap.style.position = "relative";
  const list = h("div", { class: "ac", role: "listbox", hidden: true });
  wrap.append(list);
  let items = [], idx = -1;
  const close = () => { list.hidden = true; idx = -1; };
  const pick = a => { input.value = apLabel(a); input.dataset.iata = a.i; close(); onPick?.(a); };
  input.addEventListener("input", async () => {
    delete input.dataset.iata;
    const q = norm(input.value.trim());
    if (q.length < 2) return close();
    const { list: all } = await loadAirports();
    const up = input.value.trim().toUpperCase();
    items = all.filter(a => a.i === up || norm(a.c).includes(q) || norm(a.n).includes(q))
      .sort((x, y) => (y.i === up) - (x.i === up) || (x.t === "L" ? -1 : 1) - (y.t === "L" ? -1 : 1)).slice(0, 8);
    list.replaceChildren(...items.map((a, i) => h("div", { class: "ac-item", role: "option", "data-i": i, onmousedown: e => { e.preventDefault(); pick(a); } },
      h("b", { class: "mono" }, a.i), h("span", {}, `${a.c || a.n}`), h("small", { class: "muted" }, `${a.rn} · ${countryName(a.k)}`))));
    list.hidden = !items.length;
  });
  input.addEventListener("keydown", e => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); idx = (idx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      $$(".ac-item", list).forEach((el, i) => el.classList.toggle("on", i === idx));
    } else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(items[idx]); }
    else if (e.key === "Escape") close();
  });
  input.addEventListener("blur", () => setTimeout(close, 120));
  return {
    set: async iata => { const { byIata } = await loadAirports(); const a = byIata.get(iata); if (a) { input.value = apLabel(a); input.dataset.iata = a.i; } },
    get: () => input.dataset.iata || (/^[A-Za-z]{3}$/.test(input.value.trim()) ? input.value.trim().toUpperCase() : ""),
  };
}
