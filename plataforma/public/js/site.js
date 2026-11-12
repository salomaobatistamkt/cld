// Site público: uma pergunta por vez, palavras simples, nada escondido.
import { $, $$, h, loadAirports, countryName, norm } from "./common.js";

const api = async (path, opts = {}) => {
  const r = await fetch("/api/public" + path, { headers: { "content-type": "application/json" }, ...opts });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || "Não conseguimos carregar agora. Tente de novo em alguns minutos.");
  return b;
};

/* ---------- Cidades mais procuradas (uma cidade pode ter mais de um aeroporto) ---------- */
const POPULAR = [
  { name: "Natal", uf: "RN", codes: ["NAT"] },
  { name: "Fortaleza", uf: "CE", codes: ["FOR"] },
  { name: "Recife", uf: "PE", codes: ["REC"] },
  { name: "Salvador", uf: "BA", codes: ["SSA"] },
  { name: "Belém", uf: "PA", codes: ["BEL"] },
  { name: "Manaus", uf: "AM", codes: ["MAO"] },
  { name: "São Paulo", uf: "SP", codes: ["GRU", "CGH", "VCP"] },
  { name: "Rio de Janeiro", uf: "RJ", codes: ["GIG", "SDU"] },
  { name: "Brasília", uf: "DF", codes: ["BSB"] },
  { name: "Belo Horizonte", uf: "MG", codes: ["CNF", "PLU"] },
  { name: "Porto Alegre", uf: "RS", codes: ["POA"] },
  { name: "Curitiba", uf: "PR", codes: ["CWB"] },
];

const STATE = { city: null, scope: "", when: "" };
const KEY = "meridia_city";
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  del() { try { localStorage.removeItem(KEY); } catch {} },
};

/* ---------- Textos simples ---------- */
const BADGE = {
  imperdivel: "Preço raríssimo",
  excelente: "Muito barato",
  boa: "Barato",
  competitivo: "Bom preço",
};
const money = c => "R$ " + Math.round(c / 100).toLocaleString("pt-BR");
const longDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).replace(".", "");
const fullDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const stopsTxt = n => n == null ? null : n === 0 ? "Voo direto, sem parada" : n === 1 ? "1 parada no caminho" : `${n} paradas no caminho`;
function seenTxt(iso) {
  const t = new Date(iso), now = new Date();
  const hm = t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const d = t.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), today = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const y = new Date(now.getTime() - 86400000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return d === today ? `hoje às ${hm}` : d === y ? `ontem às ${hm}` : `em ${d} às ${hm}`;
}
const savingTxt = o => o.savings_pct > 0 ? `${Math.round(o.savings_pct)}% mais barato que o normal para essa viagem` : null;

/* ---------- Passo 1: escolher a cidade ---------- */
function renderCityGrid() {
  $("#city-grid").replaceChildren(...POPULAR.map(c => h("button", { type: "button", class: "city-btn", onclick: () => chooseCity(c) }, c.name, h("small", {}, c.uf))));
}

let AP = null, sugg = [], active = -1;
async function onType() {
  const input = $("#city-input"), list = $("#city-results");
  const q = norm(input.value.trim());
  if (q.length < 2) { list.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
  AP ||= await loadAirports();
  // Agrupa aeroportos por cidade para mostrar "São Paulo" uma vez só
  const groups = new Map();
  for (const a of AP.list) {
    const city = a.c || a.n;
    if (!(norm(city).startsWith(q) || norm(city).includes(" " + q) || a.i.toLowerCase() === q)) continue;
    const k = city + "|" + a.r;
    if (!groups.has(k)) groups.set(k, { name: city, uf: a.r.startsWith("BR-") ? a.r.slice(3) : null, region: a.rn, country: a.k, codes: [], big: false });
    const g = groups.get(k); g.codes.push(a.i); if (a.t === "L") g.big = true;
  }
  sugg = [...groups.values()].sort((x, y) => (y.country === "BR") - (x.country === "BR") || y.big - x.big || x.name.localeCompare(y.name, "pt")).slice(0, 7);
  active = -1;
  list.replaceChildren(...(sugg.length ? sugg.map((g, i) => h("li", { role: "option", id: `opt-${i}`, "aria-selected": "false", onmousedown: e => { e.preventDefault(); chooseCity(g); } },
    h("b", {}, g.name), h("span", {}, g.country === "BR" ? `${g.region}, Brasil` : `${g.region}, ${countryName(g.country)}`)))
    : [h("li", { "aria-disabled": "true" }, h("b", {}, "Não achamos essa cidade"), h("span", {}, "Confira se está escrita certinho, ou toque numa cidade abaixo."))]));
  list.hidden = false; input.setAttribute("aria-expanded", "true");
}
function onKey(e) {
  const list = $("#city-results");
  if (list.hidden || !sugg.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault(); active = (active + (e.key === "ArrowDown" ? 1 : -1) + sugg.length) % sugg.length;
    $$("li", list).forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
    $("#city-input").setAttribute("aria-activedescendant", `opt-${active}`);
  } else if (e.key === "Enter") { e.preventDefault(); chooseCity(sugg[Math.max(0, active)]); }
  else if (e.key === "Escape") list.hidden = true;
}

function chooseCity(c) {
  STATE.city = { name: c.name, uf: c.uf ?? null, codes: c.codes };
  store.set(STATE.city);
  $("#city-results").hidden = true;
  $("#city-input").value = "";
  $("#city-pick").hidden = true;
  $("#chosen").hidden = false;
  $("#chosen-name").textContent = c.uf ? `${c.name} (${c.uf})` : c.name;
  $("#u-city").value ||= c.name;
  $("#resultados").hidden = false;
  loadOffers().then(() => $("#resultados").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
}
function changeCity() {
  STATE.city = null; store.del();
  $("#chosen").hidden = true; $("#city-pick").hidden = false; $("#resultados").hidden = true;
  $("#city-input").focus();
}

/* ---------- Passo 2: promoções ---------- */
async function loadOffers() {
  const box = $("#offers"), count = $("#count");
  $("#t-res").textContent = `Promoções saindo de ${STATE.city.name}`;
  count.textContent = "Procurando…";
  const p = new URLSearchParams({ origin: STATE.city.codes.join(","), limit: "30" });
  if (STATE.scope) p.set("scope", STATE.scope);
  if (STATE.when) { const d = new Date(Date.now() + Number(STATE.when) * 86400000); p.set("before", d.toISOString().slice(0, 10)); }
  try {
    const { items } = await api("/opportunities?" + p);
    if (!items.length) {
      count.textContent = "Nenhuma promoção agora.";
      box.replaceChildren(h("div", { class: "empty-box" },
        h("h3", {}, STATE.scope || STATE.when ? "Nenhuma promoção com essa escolha agora" : `Ainda não há promoção saindo de ${STATE.city.name} hoje`),
        h("p", {}, "Os preços mudam todos os dias. Deixe seu WhatsApp e avisamos quando aparecer passagem barata saindo da sua cidade."),
        h("div", { class: "actions" },
          h("a", { class: "btn-big", href: "#avisos" }, "Quero ser avisado"),
          STATE.scope || STATE.when ? h("button", { class: "btn-big ghost", type: "button", onclick: () => { resetFilters(); loadOffers(); } }, "Ver todas as promoções") : null)));
      return;
    }
    count.textContent = items.length === 1 ? "Encontramos 1 passagem em promoção." : `Encontramos ${items.length} passagens em promoção.`;
    box.replaceChildren(...items.map(offerCard));
  } catch (e) {
    count.textContent = "";
    box.replaceChildren(h("div", { class: "empty-box" }, h("h3", {}, "Não conseguimos carregar as promoções"), h("p", {}, e.message),
      h("div", { class: "actions" }, h("button", { class: "btn-big", type: "button", onclick: loadOffers }, "Tentar de novo"))));
  }
}
function resetFilters() {
  STATE.scope = ""; STATE.when = "";
  $$('input[name="scope"]').forEach(i => (i.checked = i.value === ""));
  $$('input[name="when"]').forEach(i => (i.checked = i.value === ""));
}

function offerCard(o) {
  const intl = o.destination_country && o.destination_country !== o.origin_country;
  const badge = BADGE[o.score_label];
  return h("article", { class: "offer", "aria-labelledby": `of-${o.id}` },
    badge ? h("span", { class: "badge" }, "★ ", badge) : h("span", { class: "badge plain" }, "Promoção encontrada"),
    h("h3", { id: `of-${o.id}` }, `${o.origin_city} → ${o.destination_city}`, h("small", {}, intl ? countryName(o.destination_country) : o.destination_region_name || "Brasil")),
    h("div", {}, h("div", { class: "price" }, money(o.price_cents)), h("div", { class: "price-note" }, o.fare_type === "ida_volta" ? "ida e volta, por pessoa" : "só ida, por pessoa")),
    savingTxt(o) ? h("p", { style: "margin:0;font-weight:700" }, savingTxt(o)) : null,
    h("ul", { class: "facts" },
      h("li", {}, h("b", {}, "Ida:"), longDate(o.depart_date)),
      o.return_date ? h("li", {}, h("b", {}, "Volta:"), `${longDate(o.return_date)} · ${o.trip_days} dias`) : null,
      stopsTxt(o.transfers) ? h("li", {}, stopsTxt(o.transfers)) : null),
    h("p", { class: "seen", style: "margin:0" }, `Preço visto ${seenTxt(o.observed_at)}. `, o.is_sample ? h("span", { class: "sample" }, "EXEMPLO") : null),
    h("button", { class: "btn-big", type: "button", onclick: () => openOffer(o) }, "Ver detalhes"));
}

/* ---------- Detalhes: como comprar + quanto custa a viagem toda ---------- */
function openOffer(o) {
  const dlg = $("#offer-dlg"), body = $("#dlg-body");
  const state = { people: 1, hotel: 0 };
  const nights = o.trip_days || 0;
  const total = h("div", { class: "calc-total calc-row" });
  const rows = h("div", { class: "calc" });
  const ppl = h("output", { "aria-live": "polite" }, "1");
  function recalc() {
    ppl.textContent = String(state.people);
    const fly = o.price_cents * state.people, hotel = state.hotel * 100 * nights;
    rows.replaceChildren(
      h("div", { class: "calc-row" }, h("span", {}, `Passagens (${state.people} ${state.people > 1 ? "pessoas" : "pessoa"})`), h("b", {}, money(fly))),
      state.hotel ? h("div", { class: "calc-row" }, h("span", {}, `Hotel (${nights} noites × R$ ${state.hotel})`), h("b", {}, money(hotel))) : null);
    total.replaceChildren(h("span", {}, "Total estimado"), h("span", {}, money(fly + hotel)));
  }
  const hotelBtns = [0, 150, 250, 400].map(v => h("label", {}, h("input", { type: "radio", name: "hotel", value: v, checked: v === 0, onchange: () => { state.hotel = v; recalc(); } }), h("span", {}, v ? `R$ ${v} por noite` : "Sem hotel")));
  const canBuy = o.has_link && !o.is_sample;
  const buy = canBuy
    ? h("a", { class: "btn-big", href: "#", target: "_blank", rel: "noopener sponsored", onclick: () => { fetch(`/api/public/go/${o.id}`).catch(() => {}); } }, "Ir para o site do parceiro e comprar")
    : h("button", { class: "btn-big", type: "button", disabled: true }, o.is_sample ? "Compra indisponível: oferta de exemplo" : "Compra indisponível no momento");
  if (canBuy) api(`/opportunities/${o.id}`).then(d => { if (d.deeplink) buy.href = d.deeplink; }).catch(() => {});

  body.replaceChildren(
    h("div", { class: "sheet-head" }, h("h2", { id: "dlg-title" }, `${o.origin_city} → ${o.destination_city}`), h("button", { class: "btn-close", type: "button", "data-close": "" }, "Fechar")),
    o.is_sample ? h("p", { class: "notice-simple" }, "Esta é uma oferta de EXEMPLO, só para mostrar como o site funciona. O preço não é real.") : null,
    h("div", { class: "box" },
      h("div", { class: "price" }, money(o.price_cents)),
      h("p", { style: "margin:6px 0 0" }, o.fare_type === "ida_volta" ? "Ida e volta, por pessoa." : "Só ida, por pessoa.", " ", o.includes_taxes === 1 ? "Com taxas incluídas." : "Confira as taxas no site do parceiro."),
      savingTxt(o) ? h("p", { style: "margin:6px 0 0;font-weight:700" }, savingTxt(o) + ".") : null),
    h("ul", { class: "facts" },
      h("li", {}, h("b", {}, "Ida:"), fullDate(o.depart_date)),
      o.return_date ? h("li", {}, h("b", {}, "Volta:"), fullDate(o.return_date)) : null,
      o.trip_days ? h("li", {}, h("b", {}, "Tempo:"), `${o.trip_days} dias de viagem`) : null,
      stopsTxt(o.transfers) ? h("li", {}, h("b", {}, "Voo:"), stopsTxt(o.transfers)) : null),
    h("div", { class: "box" }, h("h3", {}, "Quanto custa a viagem toda?"),
      h("div", { class: "calc-row" }, h("span", {}, "Quantas pessoas vão?"),
        h("span", { class: "stepper" },
          h("button", { type: "button", "aria-label": "Uma pessoa a menos", onclick: () => { state.people = Math.max(1, state.people - 1); recalc(); } }, "−"), ppl,
          h("button", { type: "button", "aria-label": "Uma pessoa a mais", onclick: () => { state.people = Math.min(9, state.people + 1); recalc(); } }, "+"))),
      nights ? h("p", { style: "margin:12px 0 6px;font-weight:700" }, "Quanto quer gastar de hotel por noite?") : null,
      nights ? h("div", { class: "hotel-opts seg", role: "radiogroup", "aria-label": "Hotel por noite" }, ...hotelBtns) : null,
      h("div", { style: "margin-top:12px" }, rows), total,
      h("p", { class: "seen", style: "margin:8px 0 0" }, "É uma conta aproximada. O preço final é o que aparece no site do parceiro.")),
    h("div", { class: "box" }, h("h3", {}, "Como comprar"),
      h("ol", { class: "steps" },
        h("li", {}, "Toque no botão abaixo."),
        h("li", {}, "Você vai para o site do parceiro, que vende a passagem."),
        h("li", {}, "Confira o preço e as datas lá antes de pagar."))),
    buy,
    h("p", { class: "seen", style: "margin:0" }, `Preço visto ${seenTxt(o.observed_at)}. Preços de passagem mudam rápido.`));
  recalc();
  dlg.showModal();
}

/* ---------- Mapa (opcional, carregado só quando pedem) ---------- */
let globe = null;
function loadScript(src) { return new Promise((ok, err) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = err; document.head.append(s); }); }
async function openMap() {
  const dlg = $("#map-dlg");
  dlg.showModal();
  if (globe) return;
  $("#map-list").replaceChildren(h("p", {}, "Carregando o mapa…"));
  const v = n => new URL(`../vendor/${n}`, import.meta.url).href;
  await loadScript(v("d3-array.min.js")); await loadScript(v("d3-geo.min.js")); await loadScript(v("topojson-client.min.js"));
  AP ||= await loadAirports();
  const { createGlobe } = await import("./globe.js");
  globe = await createGlobe($("#globe"), {
    onCountry: iso => showCountry(iso),
    onAirport: a => pickAirport(a),
  });
  $("#z-in").onclick = () => globe.zoom(1.4);
  $("#z-out").onclick = () => globe.zoom(1 / 1.4);
  showCountry("BR");
  globe.selectCountry("BR");
}
function showCountry(iso) {
  const groups = new Map();
  for (const a of AP.list) if (a.k === iso) {
    const k = (a.c || a.n) + "|" + a.r;
    if (!groups.has(k)) groups.set(k, { name: a.c || a.n, uf: a.r.startsWith("BR-") ? a.r.slice(3) : null, region: a.rn, codes: [], big: false });
    const g = groups.get(k); g.codes.push(a.i); if (a.t === "L") g.big = true;
  }
  const list = [...groups.values()].sort((x, y) => y.big - x.big || x.name.localeCompare(y.name, "pt"));
  $("#map-help").textContent = `${countryName(iso)}: escolha a cidade de onde você vai sair.`;
  $("#map-list").replaceChildren(...list.map(g => h("button", { type: "button", class: "city-btn", onclick: () => { $("#map-dlg").close(); chooseCity(g); } }, g.name, h("small", {}, g.region))));
}
function pickAirport(a) { $("#map-dlg").close(); chooseCity({ name: a.c || a.n, uf: a.r.startsWith("BR-") ? a.r.slice(3) : null, codes: [a.i] }); }

/* ---------- Avisos por WhatsApp ---------- */
async function onSub(e) {
  e.preventDefault();
  const msg = $("#sub-msg");
  msg.className = "form-msg";
  const phone = $("#u-phone").value.trim();
  if (phone.replace(/\D/g, "").length < 10) { msg.classList.add("err"); msg.textContent = "Escreva seu WhatsApp com DDD, por exemplo (84) 99999-9999."; $("#u-phone").focus(); return; }
  if (!$("#u-consent").checked) { msg.classList.add("err"); msg.textContent = "Para receber, marque a caixinha dizendo que aceita."; $("#u-consent").focus(); return; }
  try {
    await api("/subscribe", { method: "POST", body: JSON.stringify({
      name: $("#u-name").value.trim(), phone, city: $("#u-city").value.trim(),
      home_airport: STATE.city?.codes?.[0] ?? null, consent: true, channel: "site" }) });
    msg.classList.add("ok"); msg.textContent = "Pronto! Você vai receber as promoções no seu WhatsApp.";
    e.target.reset();
  } catch (err) { msg.classList.add("err"); msg.textContent = err.message; }
}

/* ---------- Letra maior ---------- */
function setBig(on) {
  document.documentElement.classList.toggle("big", on);
  $("#font-btn").setAttribute("aria-pressed", String(on));
  try { localStorage.setItem("meridia_big", on ? "1" : "0"); } catch {}
}

/* ---------- Início ---------- */
renderCityGrid();
$("#city-input").addEventListener("input", onType);
$("#city-input").addEventListener("keydown", onKey);
$("#city-input").addEventListener("blur", () => setTimeout(() => ($("#city-results").hidden = true), 150));
$("#change-city").addEventListener("click", changeCity);
$("#open-map").addEventListener("click", openMap);
$("#sub-form").addEventListener("submit", onSub);
$("#font-btn").addEventListener("click", () => setBig(!document.documentElement.classList.contains("big")));
$$('input[name="scope"]').forEach(i => i.addEventListener("change", () => { STATE.scope = i.value; loadOffers(); }));
$$('input[name="when"]').forEach(i => i.addEventListener("change", () => { STATE.when = i.value; loadOffers(); }));
document.addEventListener("click", e => { const d = e.target.closest("[data-close]"); if (d) d.closest("dialog").close(); });
$$("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
try { if (localStorage.getItem("meridia_big") === "1") setBig(true); } catch {}
const saved = store.get();
if (saved) chooseCity(saved);
