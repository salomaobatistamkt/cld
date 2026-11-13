import { $, h, brl, date, dateTime, ago, labelTag, stops, toast, loadAirports, countryName, norm, apLabel, airportInput } from "./common.js";
import { createGlobe } from "./globe.js";

const api = async (path, opts = {}) => {
  const r = await fetch("/api/public" + path, { headers: { "content-type": "application/json" }, ...opts });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || `Erro ${r.status}`);
  return b;
};

const MERCOSUL = ["BR", "AR", "UY", "PY", "CL", "BO", "PE", "CO"];
const sel = { country: null, region: null, city: null, airport: null };
let AP, globe, originFilter = null;

/* ---------- Seleção hierárquica: país → estado → cidade → aeroporto ---------- */
function crumbs() {
  const items = [["Planeta", () => { Object.assign(sel, { country: null, region: null, city: null, airport: null }); globe.reset(); setOrigin(null); render(); }]];
  if (sel.country) items.push([countryName(sel.country), () => { Object.assign(sel, { region: null, city: null, airport: null }); globe.selectCountry(sel.country); setOrigin(null); render(); }]);
  if (sel.region) items.push([regionName(sel.region), () => { Object.assign(sel, { city: null, airport: null }); globe.selectRegion(sel.region); setOrigin(null); render(); }]);
  if (sel.city) items.push([sel.city, () => { sel.airport = null; setOrigin(null); render(); }]);
  if (sel.airport) items.push([sel.airport.i, () => {}]);
  $("#crumbs").replaceChildren(...items.map(([t, fn]) => h("li", {}, h("button", { type: "button", onclick: fn }, t))));
}
const regionName = r => AP.list.find(a => a.r === r)?.rn ?? r;

function render() {
  crumbs();
  const f = norm($("#pick-filter").value);
  const list = $("#pick-list");
  const rows = [];
  if (!sel.country) {
    $("#pick-filter").placeholder = "Filtrar países";
    const counts = {};
    for (const a of AP.list) counts[a.k] = (counts[a.k] || 0) + 1;
    const all = Object.keys(counts).map(k => ({ k, n: countryName(k) })).filter(c => norm(c.n).includes(f)).sort((a, b) => a.n.localeCompare(b.n, "pt"));
    const top = all.filter(c => MERCOSUL.includes(c.k)).sort((a, b) => MERCOSUL.indexOf(a.k) - MERCOSUL.indexOf(b.k));
    if (top.length && !f) rows.push(h("div", { class: "pick-group" }, "América do Sul"), ...top.map(c => pickBtn(c.n, `${counts[c.k]} aeroportos`, () => chooseCountry(c.k))), h("div", { class: "pick-group" }, "Todos os países"));
    rows.push(...all.map(c => pickBtn(c.n, `${counts[c.k]} aeroportos`, () => chooseCountry(c.k))));
  } else if (!sel.region) {
    $("#pick-filter").placeholder = "Filtrar estados ou regiões";
    const regs = {};
    for (const a of AP.list) if (a.k === sel.country) (regs[a.r] ||= { r: a.r, n: a.rn, c: 0 }).c++;
    Object.values(regs).filter(r => norm(r.n).includes(f)).sort((a, b) => a.n.localeCompare(b.n, "pt"))
      .forEach(r => rows.push(pickBtn(r.n, `${r.c} aeroporto${r.c > 1 ? "s" : ""}`, () => { sel.region = r.r; $("#pick-filter").value = ""; globe.selectRegion(r.r); render(); })));
  } else if (!sel.city) {
    $("#pick-filter").placeholder = "Filtrar cidades";
    const cities = {};
    for (const a of AP.list) if (a.r === sel.region) (cities[a.c || a.n] ||= []).push(a);
    Object.entries(cities).filter(([c]) => norm(c).includes(f)).sort((a, b) => a[0].localeCompare(b[0], "pt"))
      .forEach(([c, aps]) => rows.push(pickBtn(c, aps.map(a => a.i).join(" · "), () => {
        sel.city = c; $("#pick-filter").value = "";
        if (aps.length === 1) chooseAirport(aps[0]); else render();
      })));
  } else {
    $("#pick-filter").placeholder = "Filtrar aeroportos";
    AP.list.filter(a => a.r === sel.region && (a.c || a.n) === sel.city).forEach(a =>
      rows.push(pickBtn(h("span", {}, h("span", { class: "code" }, a.i), a.n), a.t === "L" ? "grande porte" : "médio porte", () => chooseAirport(a))));
  }
  list.replaceChildren(...(rows.length ? rows : [h("div", { class: "empty" }, "Nada encontrado com esse filtro.")]));
}

const pickBtn = (label, meta, fn) => h("button", { class: "pick", type: "button", role: "listitem", onclick: fn }, h("span", {}, label), h("small", {}, meta));

function chooseCountry(iso) {
  Object.assign(sel, { country: iso, region: null, city: null, airport: null });
  $("#pick-filter").value = "";
  globe.selectCountry(iso);
  setOrigin(null);
  // Países com uma só região pulam direto para cidades
  const regs = new Set(AP.list.filter(a => a.k === iso).map(a => a.r));
  if (regs.size === 1) sel.region = [...regs][0];
  render();
}

function chooseAirport(a) {
  Object.assign(sel, { country: a.k, region: a.r, city: a.c || a.n, airport: a });
  globe.selectAirport(a);
  render();
  setOrigin(a);
}

async function setOrigin(a) {
  const box = $("#origin-cta");
  originFilter = a?.i ?? null;
  if (!a) { box.hidden = true; globe?.setArcs([]); loadBoard(); return; }
  box.hidden = false;
  box.replaceChildren(
    h("span", { class: "eyebrow" }, "Origem escolhida"),
    h("b", {}, `${a.c || a.n} · ${a.i}`),
    h("span", { class: "small muted" }, a.n),
    h("div", { class: "row" },
      h("a", { class: "btn primary sm", href: "#achados" }, "Ver achados saindo daqui"),
      h("button", { class: "btn sm", type: "button", onclick: () => { searchO.set(a.i); $("#s-dest").focus(); location.hash = "pesquisar"; } }, "Pesquisar para um destino"),
      h("button", { class: "btn sm", type: "button", onclick: () => { planO.set(a.i); location.hash = "planejar"; } }, "Planejar viagem")));
  searchO.set(a.i); planO.set(a.i); subA.set(a.i);
  await loadBoard();
}

/* ---------- Painel de achados ---------- */
async function loadBoard() {
  const board = $("#board");
  $("#achados-filter").textContent = originFilter ? `Saindo de ${apLabel(AP.byIata.get(originFilter))}` : "Todas as origens";
  try {
    const { items } = await api(`/opportunities?limit=30${originFilter ? `&origin=${originFilter}` : ""}`);
    if (originFilter) globe.setArcs([...new Set(items.map(i => i.destination))]);
    const head = h("div", { class: "dep head", role: "row" }, ...["Classificação", "Rota", "Datas", "Duração", "Preço", ""].map(t => h("span", { role: "columnheader" }, t)));
    if (!items.length) {
      board.replaceChildren(head, h("div", { class: "empty" }, originFilter
        ? "Nenhum achado publicado saindo desse aeroporto agora. Cadastre-se em Receber ofertas para ser avisado."
        : "Nenhum achado publicado ainda. As ofertas aparecem aqui depois de verificadas e aprovadas no painel."));
      return;
    }
    board.replaceChildren(head, ...items.map(o => {
      const oa = AP.byIata.get(o.origin), da = AP.byIata.get(o.destination);
      return h("div", { class: "dep", role: "row", id: `oferta-${o.id}` },
        h("div", {}, labelTag(o.score_label), o.is_sample ? h("div", {}, h("span", { class: "sample" }, "dado de exemplo")) : null),
        h("div", { class: "route" }, `${oa?.c || o.origin} → ${da?.c || o.destination}`, h("small", {}, h("span", { class: "codes" }, `${o.origin} ${o.destination}`), " · ", stops(o.transfers))),
        h("div", { class: "mono" }, `${date(o.depart_date)}${o.return_date ? " – " + date(o.return_date) : " · só ida"}`),
        h("div", { class: "mono" }, o.trip_days ? `${o.trip_days} dias` : "—"),
        h("div", { class: "price" }, brl(o.price_cents),
          h("small", {}, o.fare_type === "ida_volta" ? "ida e volta" : "por trecho"),
          h("small", {}, o.savings_pct > 0 ? `${Math.round(o.savings_pct)}% abaixo da mediana` : ""),
          h("small", { class: "seen", title: dateTime(o.observed_at) }, `visto ${ago(o.observed_at)}`)),
        h("div", {}, h("button", { class: "btn sm", type: "button", onclick: () => { planO.set(o.origin); planD.set(o.destination); $("#p-depart").value = o.depart_date; $("#p-ret").value = o.return_date || ""; location.hash = "planejar"; } }, "Montar viagem")));
    }));
  } catch (e) { board.replaceChildren(h("div", { class: "empty" }, e.message)); }
}

/* ---------- Pesquisa ---------- */
let searchO, searchD, planO, planD, subA;
async function onSearch(e) {
  e.preventDefault();
  const out = $("#search-out");
  const body = { origin: searchO.get(), destination: searchD.get(), depart: $("#s-depart").value, ret: $("#s-ret").value || undefined };
  if (!body.origin || !body.destination) return toast("Escolha origem e destino na lista de sugestões.", true);
  out.replaceChildren(h("p", { class: "muted" }, "Consultando…"));
  try {
    const r = await api("/search", { method: "POST", body: JSON.stringify(body) });
    const parts = [h("p", { class: "small muted" }, `Consulta feita em ${dateTime(r.queried_at)} (horário de Brasília).`)];
    if (r.source_status !== "real") parts.push(h("div", { class: `notice ${r.source_status === "erro" ? "bad" : "amber"}` }, r.message || "Fonte indisponível."));
    if (r.results.length) parts.push(table(["", "Ida", "Volta", "Conexões", "Cia.", "Preço", ""], r.results.map(q => [
      labelTag(q.score_label), date(q.depart_date), date(q.return_date), stops(q.transfers), q.airline || "—",
      h("span", { class: "num" }, brl(q.price_cents), h("br"), h("small", { class: "muted" }, q.fare_type === "ida_volta" ? "ida e volta" : "trecho")),
      q.source_link ? h("a", { class: "btn sm", href: q.source_link, target: "_blank", rel: "noopener sponsored" }, "Ver no parceiro") : "—",
    ])));
    else if (r.source_status === "real") parts.push(h("div", { class: "notice" }, "A fonte não retornou voos para essas datas. Tente datas próximas."));
    if (r.history.length) parts.push(h("h3", { style: "font-size:16px;margin-top:8px" }, "Preços já registrados para datas próximas (±3 dias)"),
      table(["Ida", "Volta", "Preço", "Fonte", "Visto em"], r.history.map(o => [date(o.depart_date), date(o.return_date),
        h("span", { class: "num" }, brl(o.price_cents)), o.is_sample ? h("span", { class: "sample" }, "exemplo") : o.source, dateTime(o.observed_at)])));
    out.replaceChildren(h("div", { class: "out" }, ...parts));
  } catch (err) { out.replaceChildren(h("div", { class: "notice bad" }, err.message)); }
}

function table(cols, rows) {
  return h("div", { class: "tbl" }, h("table", {}, h("thead", {}, h("tr", {}, ...cols.map(c => h("th", {}, c)))),
    h("tbody", {}, ...rows.map(r => h("tr", {}, ...r.map(c => h("td", {}, c)))))));
}

/* ---------- Planejamento ---------- */
async function onPlan(e) {
  e.preventDefault();
  const out = $("#plan-out");
  const body = { origin: planO.get(), destination: planD.get(), depart: $("#p-depart").value, ret: $("#p-ret").value,
    travelers: +$("#p-trav").value || 1, hotel_daily_estimate: +$("#p-hotel").value || 0, car_daily_estimate: +$("#p-car").value || 0 };
  if (!body.origin || !body.destination) return toast("Escolha origem e destino na lista de sugestões.", true);
  try {
    const r = await api("/plan", { method: "POST", body: JSON.stringify(body) });
    const basis = { consulta: ["consultado", "ok"], exemplo: ["exemplo", "warn"], estimativa_usuario: ["sua estimativa", "info"], sem_dado: ["sem dado", "neutral"], pendente: ["pendente", "neutral"] };
    out.replaceChildren(h("div", { class: "out" },
      h("p", { class: "small muted" }, `${r.destination_name} · ${r.nights} noites · ${r.travelers} pessoa(s) · consulta em ${dateTime(r.queried_at)}`),
      table(["Item", "Base", "Unitário", "Total", "Observação"], r.items.map(i => [
        i.label, h("span", { class: `pill ${basis[i.basis][1]}` }, basis[i.basis][0]),
        h("span", { class: "num" }, brl(i.unit_cents)), h("span", { class: "num" }, brl(i.total_cents)),
        h("span", { class: "small" }, i.note, i.link?.url ? [" ", h("a", { href: i.link.url, target: "_blank", rel: "noopener sponsored" }, `Consultar na ${i.link.partner}`)] : i.link ? ` Parceiro ${i.link.partner ?? ""} pendente de cadastro.` : ""),
      ])),
      h("div", { class: "plan-total" }, h("span", {}, h("b", { style: "font-family:var(--f-display);font-size:16px" }, "Custo estimado"), h("br"), h("span", { class: "small muted" }, r.total_note)), h("b", {}, r.total_text ?? "—"))));
  } catch (err) { out.replaceChildren(h("div", { class: "notice bad" }, err.message)); }
}

/* ---------- Cadastro com consentimento ---------- */
async function onSub(e) {
  e.preventDefault();
  try {
    const r = await api("/subscribe", { method: "POST", body: JSON.stringify({
      name: $("#u-name").value, phone: $("#u-phone").value, email: $("#u-email").value, home_airport: subA.get() || null,
      interests: { destinations: $("#u-dests").value, max_price: +$("#u-max").value || null }, consent: $("#u-consent").checked, channel: "site" }) });
    $("#sub-msg").textContent = r.inferred_region
      ? `Cadastro feito. Pelo DDD, sugerimos ofertas de ${regionName(r.inferred_region)}; é só uma indicação e você pode mudar.`
      : "Cadastro feito.";
    e.target.reset();
  } catch (err) { toast(err.message, true); }
}

/* ---------- Início ---------- */
(async function init() {
  AP = await loadAirports();
  searchO = airportInput($("#s-origin")); searchD = airportInput($("#s-dest"));
  planO = airportInput($("#p-origin")); planD = airportInput($("#p-dest"));
  subA = airportInput($("#u-airport"));
  const t = new Date(); t.setDate(t.getDate() + 30);
  $("#s-depart").value = t.toISOString().slice(0, 10);
  $("#pick-filter").addEventListener("input", render);
  $("#search-form").addEventListener("submit", onSearch);
  $("#plan-form").addEventListener("submit", onPlan);
  $("#sub-form").addEventListener("submit", onSub);
  globe = await createGlobe($("#globe"), {
    onCountry: iso => chooseCountry(iso),
    onAirport: a => chooseAirport(a),
  });
  $("#z-in").onclick = () => globe.zoom(1.4);
  $("#z-out").onclick = () => globe.zoom(1 / 1.4);
  $("#z-reset").onclick = () => { Object.assign(sel, { country: null, region: null, city: null, airport: null }); globe.reset(); setOrigin(null); render(); };
  render();
  loadBoard();
})();
