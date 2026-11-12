import { $, $$, h, brl, date, dateTime, ago, LABELS, labelTag, stops, toast, copyText, loadAirports, apLabel, airportInput, countryName } from "./common.js";
import { columns, priceHistory, hbars } from "./charts.js";

/* ---------- Sessão e API ---------- */
const TK = "meridia_admin_token";
const getToken = () => { try { return sessionStorage.getItem(TK) || ""; } catch { return window.__tk || ""; } };
const setToken = t => { try { sessionStorage.setItem(TK, t); } catch { window.__tk = t; } };

async function api(path, opts = {}) {
  const r = await fetch("/api/admin" + path, { ...opts, headers: { "content-type": "application/json", authorization: `Bearer ${getToken()}` } });
  const b = await r.json().catch(() => ({}));
  if (r.status === 401) { showLogin(); throw new Error(b.error || "Sessão expirada."); }
  if (!r.ok) throw new Error(b.error || `Erro ${r.status}`);
  return b;
}
const post = (p, b) => api(p, { method: "POST", body: JSON.stringify(b ?? {}) });
const patch = (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b ?? {}) });
const del = p => api(p, { method: "DELETE" });

function showLogin() { $("#app").hidden = true; $("#login").hidden = false; $("#login-token").focus(); }
async function tryEnter() {
  try { await api("/integrations"); $("#login").hidden = true; $("#app").hidden = false; route(); }
  catch { showLogin(); }
}
$("#login-form").addEventListener("submit", e => { e.preventDefault(); setToken($("#login-token").value.trim()); tryEnter(); });
$("#logout").addEventListener("click", () => { setToken(""); showLogin(); });

/* ---------- Componentes ---------- */
let AP;
const city = i => AP?.byIata.get(i)?.c || i;
const routeTxt = (o, d) => `${city(o)} → ${city(d)}`;
const table = (cols, rows, empty = "Nada por aqui ainda.") => h("div", { class: "tbl" }, h("table", {},
  h("thead", {}, h("tr", {}, ...cols.map(c => h("th", { class: c.startsWith("#") ? "num" : "" }, c.replace(/^#/, ""))))),
  h("tbody", {}, ...(rows.length ? rows.map(r => r.nodeType ? r : h("tr", {}, ...r.map((c, i) => h("td", { class: cols[i]?.startsWith("#") ? "num" : "" }, c))))
    : [h("tr", {}, h("td", { colspan: cols.length, class: "empty" }, empty))]))));
const head = (title, desc, ...acts) => h("div", { class: "vh" }, h("div", {}, h("h1", {}, title), desc ? h("p", {}, desc) : null), h("div", { class: "actions" }, ...acts));
const sec = (title, sub, ...kids) => h("section", { class: "sec" }, h("h2", {}, title, sub ? h("small", {}, sub) : null), ...kids);
const btn = (label, fn, cls = "") => h("button", { class: `btn sm ${cls}`, type: "button", onclick: async e => { const b = e.currentTarget; b.disabled = true; try { await fn(b); } catch (err) { toast(err.message, true); } finally { b.disabled = false; } } }, label);
const STATUS = {
  nova: "info", aprovada: "ok", publicada: "ok", rejeitada: "neutral", expirada: "neutral", desatualizada: "bad",
  aguardando_aprovacao: "warn", aprovado: "ok", enviado: "ok", falhou: "bad", bloqueado: "neutral", rejeitado: "neutral",
  ativo: "ok", pendente: "warn", inativo: "neutral", confirmada: "ok", paga: "ok", cancelada: "neutral",
};
const STATUS_TXT = { aguardando_aprovacao: "aguardando aprovação" };
const pill = s => h("span", { class: `pill ${STATUS[s] ?? "neutral"}` }, STATUS_TXT[s] ?? s);
const sampleMark = o => o.is_sample ? h("span", { class: "sample" }, "exemplo") : null;
const field = (label, input, cls = "") => h("label", { class: `f ${cls}` }, label, input);
const inp = (id, attrs = {}) => h("input", { id, ...attrs });
const sel = (id, opts, value) => h("select", { id }, ...opts.map(([v, t]) => h("option", { value: v, selected: String(v) === String(value) }, t)));
const CH_TYPES = [["telegram", "Telegram"], ["whatsapp_canal", "Canal do WhatsApp (manual)"], ["whatsapp_api", "WhatsApp API oficial"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["email", "E-mail"], ["site", "Site"]];
const TPL = [["classico", "Clássico"], ["direto", "Direto"], ["roteiro", "Roteiro"], ["alerta", "Alerta de preço"]];
const LABEL_OPTS = [["", "qualquer"], ["competitivo", "Preço competitivo ou melhor"], ["boa", "Boa oportunidade ou melhor"], ["excelente", "Excelente ou melhor"], ["imperdivel", "Só achado imperdível"]];

/* ---------- Roteamento por hash ---------- */
const VIEWS = {};
async function route() {
  const v = (location.hash.slice(1) || "visao-geral").split("-op")[0];
  const fn = VIEWS[v] || VIEWS["visao-geral"];
  $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  const view = $("#view");
  view.replaceChildren(h("p", { class: "muted" }, "Carregando…"));
  try { const el = await fn(); view.replaceChildren(el); }
  catch (e) { view.replaceChildren(h("div", { class: "notice bad" }, e.message)); }
  updateBadge();
}
window.addEventListener("hashchange", () => { if (!$("#app").hidden) route(); });
async function updateBadge() {
  try { const { items } = await api("/posts?status=aguardando_aprovacao"); $("#c-pub").textContent = items.length || ""; } catch {}
}

/* ---------- Visão geral ---------- */
VIEWS["visao-geral"] = async () => {
  const d = await api("/overview");
  const k = d.kpi;
  const last30 = n => { const out = []; for (let i = n - 1; i >= 0; i--) { const t = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); out.push(t); } return out; };
  const series = rows => { const m = Object.fromEntries(rows.map(r => [r.d, r.n])); return last30(30).map(d => ({ label: d.slice(8, 10) + "/" + d.slice(5, 7), value: m[d] || 0 })); };
  const kpi = (lbl, val, sub, alert) => h("div", { class: `kpi ${alert ? "alert" : ""}` }, h("small", {}, lbl), h("b", {}, val), sub ? h("span", {}, sub) : null);
  return h("div", {},
    head("Visão geral", "Operação de descoberta, publicação e conversão. Números somam tudo que está no banco.",
      btn("Rodar pipeline agora", async () => { const r = await post("/jobs/pipeline"); toast(`Coleta: ${r.collect.reason ?? r.collect.saved + " preços"} · ${r.detect.created} oportunidades · ${r.compose.created} rascunhos`); route(); }, "primary")),
    k.sample_rows ? h("div", { class: "notice amber sample-banner" }, `Há ${k.sample_rows} preços de EXEMPLO no banco (modo demonstração). Eles nunca são publicados. Remova em Integrações e automações quando conectar a fonte real.`) : null,
    h("div", { class: "kpis" },
      kpi("Oportunidades", k.opportunities, "encontradas no total"),
      kpi("Aprovadas", k.approved, "ativas no site e canais"),
      kpi("Posts enviados", k.posts_sent),
      kpi("Posts pendentes", k.posts_pending, "aguardando aprovação ou envio"),
      kpi("Cliques", k.clicks_30d, "últimos 30 dias"),
      kpi("Conversões", k.conversions, "confirmadas pelos parceiros"),
      kpi("Comissão a receber", brl(k.commission_pending_cents)),
      kpi("Comissão recebida", brl(k.commission_paid_cents)),
      kpi("Pesquisas no site", k.searches_30d, "últimos 30 dias"),
      kpi("Rotas monitoradas", k.routes_active, "ativas"),
      kpi("Preços registrados", k.observations.toLocaleString("pt-BR"), "histórico total"),
      kpi("Erros", k.errors_24h, "integrações, últimas 24 h", k.errors_24h > 0)),
    h("div", { class: "grid2 sec" },
      h("div", { class: "panel" }, h("h3", {}, "Cliques por dia", h("span", {}, "30 dias")), columns(series(d.clicksByDay))),
      h("div", { class: "panel" }, h("h3", {}, "Oportunidades encontradas por dia", h("span", {}, "30 dias")), columns(series(d.oppsByDay)))),
    h("div", { class: "grid2 sec" },
      h("div", { class: "panel" }, h("h3", {}, "Oportunidades por classificação"),
        hbars(["imperdivel", "excelente", "boa", "competitivo", "dados_insuficientes"].map(l => ({ label: LABELS[l], value: d.byLabel.find(x => x.k === l)?.n || 0 })))),
      h("div", { class: "panel" }, h("h3", {}, "Destinos mais procurados", h("span", {}, "pesquisas + oportunidades, 30 dias")),
        hbars(d.topDest.map(t => ({ label: `${city(t.k)} (${t.k})`, value: t.n }))))),
    sec("Desempenho por canal", null, table(["Canal", "Tipo", "#Posts enviados", "#Cliques 30d"], d.byChannel.map(c => [c.name, c.type, c.sent, c.clicks]), "Nenhum canal cadastrado.")),
    sec("Desempenho por parceiro", null, table(["Parceiro", "Categoria", "Status", "#Cliques", "#Conversões", "#Comissão"], d.byPartner.map(p => [p.name, p.kind, pill(p.status), p.clicks, p.conversions, brl(p.commission_cents)]))),
    sec("Integrações", null, integList(d.integrations)),
    sec("Atividade recente", null, logTable(d.recent)));
};

function integList(items) {
  return h("div", { class: "integ" }, ...items.map(i => h("div", {}, h("b", {}, i.name), h("span", {}, pill(i.mode === "real" ? "ativo" : "pendente")), h("span", { class: "small" }, i.detail))));
}
const logTable = rows => table(["Quando", "Tipo", "Nível", "Mensagem"], rows.map(l => [h("span", { class: "mono small", title: dateTime(l.at) }, ago(l.at)), l.kind, h("span", { class: `pill ${l.level === "erro" ? "bad" : l.level === "aviso" ? "warn" : "neutral"}` }, l.level), l.message]));

/* ---------- Oportunidades ---------- */
let oppFilter = "";
VIEWS.oportunidades = async () => {
  const { items } = await api(`/opportunities${oppFilter ? `?status=${oppFilter}` : ""}`);
  const chips = ["", "nova", "aprovada", "publicada", "desatualizada", "expirada", "rejeitada"].map(s =>
    h("button", { class: `chip ${oppFilter === s ? "on" : ""}`, type: "button", onclick: () => { oppFilter = s; route(); } }, s || "todas"));
  const rows = [];
  for (const o of items) {
    const detail = h("tr", { hidden: true }, h("td", { colspan: 11 }, h("div", { class: "opp-detail" })));
    rows.push(h("tr", {},
      h("td", {}, labelTag(o.score_label), " ", sampleMark(o)),
      h("td", { style: "min-width:170px" }, h("b", {}, routeTxt(o.origin, o.destination)), h("br"), h("span", { class: "mono small muted" }, `${o.origin}-${o.destination} · ${stops(o.transfers)}`)),
      h("td", { class: "mono small" }, date(o.depart_date), h("br"), o.return_date ? date(o.return_date) : "só ida"),
      h("td", { class: "num" }, o.trip_days ?? "—"),
      h("td", { class: "num" }, brl(o.price_cents), h("br"), h("small", { class: "muted" }, o.fare_type === "ida_volta" ? "ida e volta" : "trecho")),
      h("td", { class: "num" }, o.median_cents ? brl(o.median_cents) : "—", h("br"), h("small", { class: "muted" }, o.savings_pct != null ? `${o.savings_pct > 0 ? "−" : "+"}${Math.abs(Math.round(o.savings_pct))}%` : "")),
      h("td", { class: "num" }, o.sample_size, h("br"), h("small", { class: "muted" }, o.percentile != null ? `p${Math.round(o.percentile)}` : "")),
      h("td", {}, o.partner_name || o.source),
      h("td", {}, pill(o.status)),
      h("td", { class: "small mono", style: "white-space:nowrap", title: dateTime(o.observed_at) }, ago(o.last_verified_at || o.observed_at)),
      h("td", {}, h("div", { class: "actions" },
        btn("Detalhes", async () => { detail.hidden = !detail.hidden; if (!detail.hidden) await oppDetail(o, $(".opp-detail", detail)); }, "ghost"),
        o.status === "nova" || o.status === "desatualizada" ? btn("Aprovar", async () => { await patch(`/opportunities/${o.id}`, { status: "aprovada" }); toast("Oferta aprovada: aparece no site."); route(); }) : null,
        ["nova", "aprovada"].includes(o.status) ? btn("Rejeitar", async () => { await patch(`/opportunities/${o.id}`, { status: "rejeitada" }); route(); }, "danger") : null))));
    rows.push(detail);
  }
  return h("div", {},
    head("Oportunidades", "Preços pontuados contra o histórico da rota. Aprovar publica no site; os canais dependem da fila de Publicações.",
      btn("Detectar agora", async () => { const r = await post("/jobs/detect"); toast(`${r.analyzed} preços analisados, ${r.created} novas oportunidades.`); route(); }),
      btn("Reverificar vencidas", async () => { const r = await post("/jobs/verify"); toast(`${r.checked} reconsultadas, ${r.confirmed} confirmadas.`); route(); })),
    manualOppForm(),
    h("div", { class: "filters sec" }, ...chips),
    table(["Classificação", "Rota", "Datas", "#Dias", "#Preço", "#Mediana", "#Amostra", "Fonte", "Status", "Visto", ""], rows, "Nenhuma oportunidade com esse filtro."));
};

async function oppDetail(o, box) {
  box.replaceChildren(h("p", { class: "muted" }, "Carregando histórico…"));
  const hist = await api(`/opportunities/${o.id}/history`);
  const checksBox = h("div", {});
  box.replaceChildren(h("div", { class: "grid2" },
    h("div", { class: "panel" }, h("h3", {}, "Histórico da rota", h("span", {}, `${hist.points.length} consultas · linha = preço desta oferta`)), priceHistory(hist.points, o.price_cents)),
    h("div", { class: "panel" }, h("h3", {}, "Controle de qualidade"),
      h("p", { class: "small muted" }, "Reconsulta a fonte e confere datas, permanência, duplicidade e link antes de publicar."),
      btn("Verificar agora", async () => {
        const r = await post(`/opportunities/${o.id}/verify`);
        checksBox.replaceChildren(h("div", { class: "checks" }, ...r.checks.map(c => h("div", {}, h("span", { class: c.ok ? "y" : "n" }, c.ok ? "✓" : "✕"), h("span", {}, c.item), h("span", { class: "muted" }, c.detail)))),
          h("p", { class: "small" }, r.ok ? "Oferta confirmada." : "Oferta NÃO confirmada: não divulgar como ativa."));
      }, "primary"),
      o.source === "manual" && !o.is_sample ? btn("Conferi no site: preço continua igual", async () => { await post(`/opportunities/${o.id}/verify`, { manual_confirm: true }); toast("Confirmação manual registrada."); route(); }) : null,
      checksBox,
      h("p", { class: "small muted" }, `Visto em ${dateTime(o.observed_at)} · última verificação ${o.last_verified_at ? dateTime(o.last_verified_at) : "nunca"} · ${o.clicks} cliques`),
      o.deeplink ? h("p", { class: "small" }, h("a", { href: o.deeplink, target: "_blank", rel: "noopener" }, "Abrir no parceiro")) : null)));
}

function manualOppForm() {
  const f = h("form", { class: "form-grid", autocomplete: "off" },
    field("Origem", h("span", {}, inp("mo-o", { required: true, placeholder: "ex.: Natal" }))),
    field("Destino", h("span", {}, inp("mo-d", { required: true, placeholder: "ex.: São Paulo" }))),
    field("Ida", inp("mo-dep", { type: "date", required: true })),
    field("Volta (vazio = só ida)", inp("mo-ret", { type: "date" })),
    field("Preço encontrado (R$)", inp("mo-p", { type: "number", min: 1, step: "0.01", required: true })),
    field("Taxas", sel("mo-tax", [["", "não sei"], ["1", "incluídas"], ["0", "não incluídas"]])),
    field("Conexões", inp("mo-tr", { type: "number", min: 0, max: 4 })),
    field("Companhia", inp("mo-al", { placeholder: "opcional" })),
    field("Link onde o preço foi visto", inp("mo-link", { type: "url", required: true, placeholder: "https://…" }), "span2"),
    field("Visto em", inp("mo-at", { type: "datetime-local" })),
    h("div", {}, h("button", { class: "btn primary", type: "submit" }, "Cadastrar e pontuar")));
  const det = h("details", { class: "add" }, h("summary", {}, "Cadastrar oportunidade manualmente"),
    h("p", { class: "small muted" }, "Use quando você mesmo encontrou o preço num site parceiro. Fica registrado com fonte “manual” e entra no histórico."), f);
  queueMicrotask(() => {
    const o = airportInput($("#mo-o", f)), d = airportInput($("#mo-d", f));
    f.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const at = $("#mo-at", f).value;
        const r = await post("/opportunities", { origin: o.get(), destination: d.get(), depart_date: $("#mo-dep", f).value, return_date: $("#mo-ret", f).value || null,
          price: $("#mo-p", f).value, includes_taxes: $("#mo-tax", f).value === "" ? null : $("#mo-tax", f).value === "1", transfers: $("#mo-tr", f).value,
          airline: $("#mo-al", f).value, source_link: $("#mo-link", f).value, observed_at: at ? new Date(at).toISOString().replace(/\.\d{3}Z/, "Z") : undefined });
        toast(`Cadastrada: ${r.label_text}${r.score.sampleSize < 30 ? ` (só ${r.score.sampleSize} preços no histórico)` : ""}.`); route();
      } catch (err) { toast(err.message, true); }
    });
  });
  return det;
}

/* ---------- Publicações (fila de aprovação) ---------- */
let postFilter = "";
VIEWS.publicacoes = async () => {
  const { items } = await api(`/posts${postFilter ? `?status=${postFilter}` : ""}`);
  const chips = [["aguardando_aprovacao", "aguardando"], ["aprovado", "aprovados"], ["enviado", "enviados"], ["falhou", "com falha"], ["bloqueado", "bloqueados"], ["rejeitado", "rejeitados"], ["", "todos"]]
    .map(([s, t]) => h("button", { class: `chip ${postFilter === s ? "on" : ""}`, type: "button", onclick: () => { postFilter = s; route(); } }, t));
  return h("div", {},
    head("Publicações", "Nada é enviado sem aprovação. Telegram sai automático depois de aprovado; WhatsApp e Instagram são copiados e colados, e você marca como publicado.",
      btn("Montar rascunhos", async () => { const r = await post("/jobs/compose"); toast(`${r.created} rascunhos criados.`); route(); }),
      btn("Enviar aprovados agora", async () => { const r = await post("/jobs/dispatch"); toast(`${r.sent} enviados · ${r.manual} aguardam publicação manual · ${r.skipped} adiados.`); route(); }, "primary")),
    h("div", { class: "filters" }, ...chips),
    h("div", { class: "queue" }, ...(items.length ? items.map(postItem) : [h("div", { class: "empty panel" }, "Nenhuma publicação com esse status.")])));
};

function postItem(p) {
  const bubble = h("div", { class: "bubble" }, p.body);
  let editing = false;
  const auto = p.channel_type === "telegram";
  return h("div", { class: "qitem" },
    h("div", { class: "meta" },
      h("div", {}, pill(p.status), " ", p.is_sample ? h("span", { class: "sample" }, "dado de exemplo") : null),
      h("b", {}, routeTxt(p.origin, p.destination), " · ", brl(p.price_cents)),
      h("span", {}, labelTag(p.score_label)),
      h("span", { class: "muted" }, `Canal: ${p.channel_name} (${p.channel_type})`),
      h("span", { class: "muted small" }, `Link rastreável: /r/${p.code} · criado ${ago(p.created_at)}${p.sent_at ? " · enviado " + ago(p.sent_at) : ""}`),
      p.error ? h("div", { class: "notice bad small" }, p.error) : null,
      h("div", { class: "actions" },
        p.status === "aguardando_aprovacao" ? btn("Aprovar", async () => { await patch(`/posts/${p.id}`, { status: "aprovado" }); toast(auto ? "Aprovado: será enviado no próximo envio." : "Aprovado: copie e publique, depois marque como publicado."); route(); }, "primary") : null,
        ["aguardando_aprovacao", "aprovado", "falhou"].includes(p.status) ? btn("Rejeitar", async () => { await patch(`/posts/${p.id}`, { status: "rejeitado" }); route(); }, "danger") : null,
        btn("Editar texto", async b => {
          editing = !editing; bubble.contentEditable = editing ? "true" : "false"; b.textContent = editing ? "Salvar texto" : "Editar texto";
          if (editing) bubble.focus(); else { await patch(`/posts/${p.id}`, { body: bubble.innerText }); toast("Texto salvo."); }
        }),
        btn("Copiar", () => copyText(bubble.innerText.replace(/<\/?b>/g, ""))),
        p.status === "aprovado" && !auto ? btn("Marcar como publicado", async () => { await post(`/posts/${p.id}/sent`); toast("Marcado como publicado."); route(); }) : null)),
    bubble);
}

/* ---------- Gerador de posts ---------- */
VIEWS.gerador = async () => {
  const [{ items: opps }, { items: chans }] = await Promise.all([api("/opportunities"), api("/channels")]);
  const preview = h("div", { class: "bubble" }, "Escolha uma oportunidade.");
  const oppSel = sel("g-opp", opps.map(o => [o.id, `${o.is_sample ? "[exemplo] " : ""}${o.origin}→${o.destination} · ${date(o.depart_date)} · ${brl(o.price_cents)} · ${LABELS[o.score_label]}`]));
  const typeSel = sel("g-type", CH_TYPES);
  const tplSel = sel("g-tpl", TPL);
  const chanSel = sel("g-chan", chans.filter(c => c.active).map(c => [c.id, `${c.name} (${c.type})`]));
  const phoneBar = h("div", { class: "bar" }, h("span", {}, "Pré-visualização"), h("span", { id: "g-len" }, ""));
  async function refresh() {
    if (!oppSel.value) return;
    const r = await post("/posts/preview", { opportunity_id: +oppSel.value, channel_type: typeSel.value, template: tplSel.value });
    preview.textContent = r.text; $("#g-len").textContent = `${r.text.length} caracteres`;
  }
  [oppSel, typeSel, tplSel].forEach(s => s.addEventListener("change", refresh));
  queueMicrotask(refresh);
  return h("div", {},
    head("Gerador de posts", "Veja como cada oferta fica em cada canal e modelo. Os modelos variam a estrutura para as postagens não ficarem iguais."),
    h("div", { class: "gen" },
      h("div", { class: "panel" }, h("div", { class: "form-grid" },
        field("Oportunidade", oppSel, "span4"), field("Formato do canal", typeSel, "span2"), field("Modelo", tplSel, "span2")),
        h("div", { class: "sec" }, h("p", { class: "small muted" }, "Gostou? Crie o rascunho para um canal: ele entra na fila de aprovação com link rastreável próprio."),
          h("div", { class: "form-grid" }, field("Canal", chanSel, "span2"),
            h("div", {}, btn("Criar rascunho", async () => {
              if (!chanSel.value) throw new Error("Cadastre um canal primeiro.");
              const r = await post("/posts", { opportunity_id: +oppSel.value, channel_id: +chanSel.value, template: tplSel.value });
              toast(r.status === "bloqueado" ? "Rascunho criado, mas BLOQUEADO: usa dado de exemplo." : "Rascunho na fila de aprovação.");
              updateBadge();
            }, "primary"))))),
      h("div", { class: "phone" }, phoneBar, preview)));
};

/* ---------- Rotas monitoradas ---------- */
VIEWS.rotas = async () => {
  const { items } = await api("/routes");
  const f = h("form", { class: "form-grid", autocomplete: "off" },
    field("Origens (códigos IATA separados por vírgula)", inp("r-o", { placeholder: "NAT, REC, FOR", required: true }), "span2"),
    field("Destinos (códigos IATA)", inp("r-d", { placeholder: "GRU, EZE, LIS", required: true }), "span2"),
    field("Buscar código", h("span", {}, inp("r-find", { placeholder: "digite a cidade" })), "span2"),
    field("Meses à frente", inp("r-m", { type: "number", min: 1, max: 12, value: 6 })),
    field("Prioridade", sel("r-p", [[1, "alta"], [2, "normal"], [3, "baixa"]], 2)),
    h("fieldset", { class: "span4", style: "border:0;padding:0;margin:0;display:flex;gap:14px;flex-wrap:wrap;align-items:center" },
      h("legend", { class: "small muted", style: "margin-bottom:6px" }, "Durações da viagem a monitorar (dias)"),
      ...[2, 3, 7, 10, 15, 20, 30].map(n => h("label", { class: "check" }, h("input", { type: "checkbox", value: n, checked: [2, 7, 10, 15, 20, 30].includes(n), class: "r-len" }), n === 2 ? "fim de semana" : `${n}`)),
      h("label", { class: "check" }, h("input", { type: "checkbox", id: "r-ow" }), "só ida")),
    h("div", {}, h("button", { class: "btn primary", type: "submit" }, "Cadastrar rotas")));
  queueMicrotask(() => {
    airportInput($("#r-find", f), a => { const t = $("#r-o", f).value.trim() ? $("#r-d", f) : $("#r-o", f); t.value = [t.value, a.i].filter(Boolean).join(", "); $("#r-find", f).value = ""; });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      try {
        const split = s => s.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
        const r = await post("/routes", { origins: split($("#r-o", f).value), destinations: split($("#r-d", f).value), months_ahead: +$("#r-m", f).value,
          priority: +$("#r-p", f).value, one_way: $("#r-ow", f).checked, trip_lengths: $$(".r-len", f).filter(x => x.checked).map(x => +x.value) });
        toast(`${r.created} rota(s) cadastrada(s)${r.skipped ? `, ${r.skipped} já existiam` : ""}.`); route();
      } catch (err) { toast(err.message, true); }
    });
  });
  return h("div", {},
    head("Rotas monitoradas", "Cada origem × destino é consultada periodicamente para todos os meses da janela. O teto de chamadas por execução protege os limites da API.",
      btn("Coletar agora", async () => { const r = await post("/jobs/collect"); toast(r.ok ? `${r.calls} consultas, ${r.saved} preços gravados.` : `Coleta não executada: ${r.reason}.`, !r.ok); route(); }, "primary")),
    h("details", { class: "add", open: !items.length }, h("summary", {}, "Cadastrar rotas"), f),
    sec("Rotas", `${items.length} cadastradas`, table(["Rota", "Durações", "#Meses", "Prioridade", "#Preços", "#Menor 30d", "Última coleta", "Ativa", ""],
      items.map(r => [
        h("span", {}, h("b", {}, routeTxt(r.origin, r.destination)), h("br"), h("span", { class: "mono small muted" }, `${r.origin}-${r.destination}${r.one_way ? " · só ida" : ""}`)),
        h("span", { class: "mono small" }, JSON.parse(r.trip_lengths).join(", ")), r.months_ahead, ["", "alta", "normal", "baixa"][r.priority],
        r.observations, brl(r.min_30d), r.last_collected_at ? ago(r.last_collected_at) : "nunca",
        h("input", { type: "checkbox", checked: !!r.active, "aria-label": "Ativa", onchange: async e => { await patch(`/routes/${r.id}`, { active: e.target.checked ? 1 : 0 }); toast(e.target.checked ? "Rota ativada." : "Rota pausada."); } }),
        btn("Excluir", async () => { await del(`/routes/${r.id}`); route(); }, "danger ghost"),
      ]), "Nenhuma rota cadastrada. Cadastre acima ou use o modo demonstração.")));
};

/* ---------- Canais ---------- */
VIEWS.canais = async () => {
  const { items } = await api("/channels");
  let editing = null;
  const f = h("form", { class: "form-grid", autocomplete: "off" },
    field("Nome do canal", inp("c-name", { required: true, placeholder: "Achados saindo do RN" }), "span2"),
    field("Tipo", sel("c-type", CH_TYPES)),
    field("Destino técnico", inp("c-ref", { placeholder: "@canal ou chat_id (Telegram)" })),
    field("Origens (IATA)", inp("c-orig", { placeholder: "NAT, MCZ" })),
    field("Estados de origem", inp("c-reg", { placeholder: "BR-RN, BR-PA" })),
    field("Internacional", sel("c-intl", [["", "tanto faz"], ["1", "só internacionais"], ["0", "só nacionais"]])),
    field("Preço máximo (R$)", inp("c-max", { type: "number", min: 0 })),
    field("Classificação mínima", sel("c-min", LABEL_OPTS, "boa")),
    field("Dias mínimos", inp("c-mind", { type: "number", min: 0 })),
    field("Dias máximos", inp("c-maxd", { type: "number", min: 0 })),
    field("Partida em até (dias)", inp("c-ahead", { type: "number", min: 0, placeholder: "última hora: 21" })),
    field("Modelo de post", sel("c-tpl", TPL)),
    field("Máx. posts por dia", inp("c-perday", { type: "number", min: 1, value: 6 })),
    field("Silêncio a partir de (h)", inp("c-qs", { type: "number", min: 0, max: 23, value: 22 })),
    field("Silêncio até (h)", inp("c-qe", { type: "number", min: 0, max: 23, value: 8 })),
    field("Participantes (se informado)", inp("c-mem", { type: "number", min: 0 })),
    h("div", { class: "actions span4" }, h("button", { class: "btn primary", type: "submit", id: "c-submit" }, "Cadastrar canal"),
      h("button", { class: "btn", type: "button", id: "c-cancel", hidden: true, onclick: () => { editing = null; f.reset(); $("#c-submit", f).textContent = "Cadastrar canal"; $("#c-cancel", f).hidden = true; } }, "Cancelar edição")));
  const split = s => s.split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const rules = {};
    const o = split($("#c-orig", f).value), r = split($("#c-reg", f).value);
    if (o.length) rules.origins = o; if (r.length) rules.origin_regions = r;
    if ($("#c-intl", f).value !== "") rules.international = $("#c-intl", f).value === "1";
    for (const [k, id] of [["max_price", "#c-max"], ["min_days", "#c-mind"], ["max_days", "#c-maxd"], ["max_days_ahead", "#c-ahead"]]) if ($(id, f).value) rules[k] = +$(id, f).value;
    if ($("#c-min", f).value) rules.min_label = $("#c-min", f).value;
    const b = { name: $("#c-name", f).value, type: $("#c-type", f).value, target_ref: $("#c-ref", f).value, rules, template: $("#c-tpl", f).value,
      max_per_day: +$("#c-perday", f).value, quiet_start: +$("#c-qs", f).value, quiet_end: +$("#c-qe", f).value, members_count: $("#c-mem", f).value || null };
    try {
      if (editing) await patch(`/channels/${editing}`, b); else await post("/channels", b);
      toast(editing ? "Canal atualizado." : "Canal cadastrado."); route();
    } catch (err) { toast(err.message, true); }
  });
  const fill = c => {
    const r = JSON.parse(c.rules || "{}"); editing = c.id;
    $("#c-name", f).value = c.name; $("#c-type", f).value = c.type; $("#c-ref", f).value = c.target_ref || "";
    $("#c-orig", f).value = (r.origins || []).join(", "); $("#c-reg", f).value = (r.origin_regions || []).join(", ");
    $("#c-intl", f).value = r.international == null ? "" : r.international ? "1" : "0"; $("#c-max", f).value = r.max_price || "";
    $("#c-min", f).value = r.min_label || ""; $("#c-mind", f).value = r.min_days || ""; $("#c-maxd", f).value = r.max_days || ""; $("#c-ahead", f).value = r.max_days_ahead || "";
    $("#c-tpl", f).value = c.template; $("#c-perday", f).value = c.max_per_day; $("#c-qs", f).value = c.quiet_start; $("#c-qe", f).value = c.quiet_end; $("#c-mem", f).value = c.members_count || "";
    $("#c-submit", f).textContent = "Salvar canal"; $("#c-cancel", f).hidden = false; f.closest("details").open = true; f.scrollIntoView({ behavior: "smooth" });
  };
  const rulesTxt = r => {
    const x = JSON.parse(r || "{}"), out = [];
    if (x.origins) out.push(`origens ${x.origins.join(", ")}`);
    if (x.origin_regions) out.push(`estados ${x.origin_regions.map(s => s.replace("BR-", "")).join(", ")}`);
    if (x.international != null) out.push(x.international ? "internacionais" : "nacionais");
    if (x.max_price) out.push(`até R$ ${x.max_price}`);
    if (x.min_label) out.push(`≥ ${LABELS[x.min_label].toLowerCase()}`);
    if (x.min_days || x.max_days) out.push(`${x.min_days ?? 0}–${x.max_days ?? "∞"} dias`);
    if (x.max_days_ahead) out.push(`partida em até ${x.max_days_ahead} dias`);
    return out.join(" · ") || "todas as ofertas";
  };
  return h("div", {},
    head("Canais de distribuição", "Cada canal tem suas regras: quais origens, tipos e faixas de oferta recebe, quantos posts por dia e em que horário fica em silêncio."),
    h("div", { class: "notice small" }, "WhatsApp: só por meios oficiais. Canal do WhatsApp funciona por publicação assistida (copiar e colar). Envio automático por API exige conta comercial aprovada pela Meta e consentimento de cada pessoa. Ferramentas não oficiais não são suportadas por risco de banimento."),
    h("details", { class: "add sec", open: !items.length }, h("summary", {}, "Cadastrar ou editar canal"), f),
    sec("Canais", null, table(["Canal", "Tipo", "Regras", "Modelo", "#Máx/dia", "#Enviados", "#Pendentes", "#Cliques", "Ativo", ""], items.map(c => [
      h("b", {}, c.name), c.type, h("span", { class: "small" }, rulesTxt(c.rules)), c.template, c.max_per_day, c.sent, c.pending, c.clicks,
      h("input", { type: "checkbox", checked: !!c.active, "aria-label": "Ativo", onchange: async e => { await patch(`/channels/${c.id}`, { active: e.target.checked ? 1 : 0 }); } }),
      btn("Editar", () => fill(c), "ghost"),
    ]), "Nenhum canal cadastrado.")));
};

/* ---------- Parceiros ---------- */
VIEWS.parceiros = async () => {
  const { items } = await api("/partners");
  const rows = items.map(p => {
    const st = sel(`p-st-${p.id}`, [["pendente", "pendente"], ["ativo", "ativo"], ["inativo", "inativo"]], p.status);
    const aid = inp(`p-aid-${p.id}`, { value: p.affiliate_id || "", placeholder: "ID / marker" });
    const tpl = inp(`p-tpl-${p.id}`, { value: p.link_template || "", placeholder: "https://…{AFFILIATE_ID}…" });
    const com = inp(`p-com-${p.id}`, { value: p.commission_note || "" });
    return h("tr", {},
      h("td", {}, h("b", {}, p.name), h("br"), h("span", { class: "small muted" }, `${p.kind} · ${p.network ?? "direto"}`)),
      h("td", {}, st), h("td", {}, aid), h("td", { style: "min-width:260px" }, tpl), h("td", {}, com),
      h("td", { class: "small muted", style: "max-width:260px" }, p.notes),
      h("td", {}, btn("Salvar", async () => { await patch(`/partners/${p.id}`, { status: st.value, affiliate_id: aid.value, link_template: tpl.value, commission_note: com.value }); toast("Parceiro salvo."); })));
  });
  const f = h("form", { class: "form-grid" },
    field("Nome", inp("np-n", { required: true })), field("Categoria", sel("np-k", [["voo", "voo"], ["hospedagem", "hospedagem"], ["carro", "carro"], ["onibus", "ônibus"], ["passeio", "passeio"], ["seguro", "seguro viagem"], ["esim", "eSIM"], ["outro", "outro"]])),
    field("Rede", inp("np-net", { placeholder: "Awin, Travelpayouts, direto…" })), h("div", {}, h("button", { class: "btn primary", type: "submit" }, "Adicionar")));
  f.addEventListener("submit", async e => { e.preventDefault(); try { await post("/partners", { name: $("#np-n", f).value, kind: $("#np-k", f).value, network: $("#np-net", f).value }); route(); } catch (err) { toast(err.message, true); } });
  return h("div", {},
    head("Parceiros e afiliados", "Um parceiro só gera links quando está ativo e tem ID de afiliado. Variáveis do modelo: {AFFILIATE_ID}, {CITY}, {IATA}, {CHECKIN}, {CHECKOUT}."),
    table(["Parceiro", "Status", "ID de afiliado", "Modelo de link", "Comissão", "Observações", ""], rows),
    h("details", { class: "add sec" }, h("summary", {}, "Adicionar parceiro"), f));
};

/* ---------- Comercial ---------- */
VIEWS.comercial = async () => {
  const [ov, { items: conv }, { items: partners }] = await Promise.all([api("/overview"), api("/conversions"), api("/partners")]);
  const f = h("form", { class: "form-grid" },
    field("Parceiro", sel("cv-p", partners.map(p => [p.id, p.name]))), field("Referência do parceiro", inp("cv-ref", { required: true })),
    field("Valor da venda (R$)", inp("cv-a", { type: "number", step: "0.01" })), field("Comissão (R$)", inp("cv-c", { type: "number", step: "0.01" })),
    field("Status", sel("cv-s", [["pendente", "pendente"], ["confirmada", "confirmada"], ["paga", "paga"], ["cancelada", "cancelada"]])),
    field("Data", inp("cv-d", { type: "date", required: true })), h("div", {}, h("button", { class: "btn primary", type: "submit" }, "Registrar")));
  f.addEventListener("submit", async e => { e.preventDefault(); try { await post("/conversions", { partner_id: +$("#cv-p", f).value, external_ref: $("#cv-ref", f).value, amount: $("#cv-a", f).value || null, commission: $("#cv-c", f).value || null, status: $("#cv-s", f).value, occurred_at: $("#cv-d", f).value }); toast("Conversão registrada."); route(); } catch (err) { toast(err.message, true); } });
  const csv = h("textarea", { id: "cv-csv", rows: 5, placeholder: "parceiro_id;referencia;valor;comissao;status;data\n2;BK-1234;1200.00;48.00;confirmada;2026-11-10" });
  const imp = h("div", {}, csv, h("div", { class: "actions", style: "margin-top:8px" }, btn("Importar", async () => {
    const rows = csv.value.trim().split(/\n/).filter(l => l && !/^parceiro/i.test(l)).map(l => { const [partner_id, external_ref, amount, commission, status, occurred_at] = l.split(/[;\t]/).map(s => s.trim()); return { partner_id: +partner_id, external_ref, amount, commission, status, occurred_at }; });
    const r = await post("/conversions", { rows }); toast(`${r.saved} linhas importadas.`); route();
  }, "primary")));
  const k = ov.kpi;
  return h("div", {},
    head("Comercial", "Cliques vêm dos links rastreáveis. Reservas e comissões só existem quando o parceiro informa (relatório, importação ou API)."),
    h("div", { class: "kpis" },
      ...[["Cliques 30 dias", k.clicks_30d], ["Conversões confirmadas", k.conversions], ["Comissão a receber", brl(k.commission_pending_cents)], ["Comissão recebida", brl(k.commission_paid_cents)]]
        .map(([l, v]) => h("div", { class: "kpi" }, h("small", {}, l), h("b", {}, v)))),
    sec("Receita por parceiro", null, table(["Parceiro", "Status", "#Cliques", "#Conversões", "#Comissão"], ov.byPartner.map(p => [p.name, pill(p.status), p.clicks, p.conversions, brl(p.commission_cents)]))),
    h("div", { class: "grid2 sec" },
      h("details", { class: "add" }, h("summary", {}, "Registrar conversão"), f),
      h("details", { class: "add" }, h("summary", {}, "Importar relatório do parceiro (CSV)"), imp)),
    sec("Conversões", null, table(["Data", "Parceiro", "Referência", "#Venda", "#Comissão", "Status", "Origem"], conv.map(c => [date(c.occurred_at), c.partner_name, c.external_ref, brl(c.amount_cents), brl(c.commission_cents), pill(c.status), c.source]), "Nenhuma conversão registrada.")));
};

/* ---------- Interessados ---------- */
VIEWS.interessados = async () => {
  const { items } = await api("/subscribers");
  const reg = r => r ? (AP.list.find(a => a.r === r)?.rn ?? r) : "—";
  return h("div", {},
    head("Interessados", "Pessoas que pediram para receber ofertas, com o registro do consentimento (LGPD). A região pelo DDD é só uma indicação."),
    table(["Cadastro", "Nome", "Contato", "Região pelo DDD", "Região informada", "Aeroporto", "Interesses", "Consentimento"], items.map(s => [
      date(s.created_at), s.name || "—", h("span", { class: "small" }, [s.phone, s.email].filter(Boolean).join(" · ")),
      s.inferred_region ? h("span", {}, reg(s.inferred_region), " ", h("span", { class: "pill neutral" }, "indicação")) : "—",
      reg(s.region), s.home_airport ? apLabel(AP.byIata.get(s.home_airport)) : "—",
      h("span", { class: "small" }, (() => { try { const i = JSON.parse(s.interests); return [i.destinations, i.max_price ? `até R$ ${i.max_price}` : null].filter(Boolean).join(" · ") || "—"; } catch { return "—"; } })()),
      s.consent_marketing ? h("span", { class: "small", title: s.consent_text }, `sim · ${dateTime(s.consent_at)} · ${s.consent_channel}`) : pill("pendente"),
    ]), "Ninguém cadastrado ainda. O formulário fica no site, em Receber ofertas."));
};

/* ---------- Integrações e automações ---------- */
VIEWS.automacoes = async () => {
  const { items } = await api("/integrations");
  const out = h("pre", { class: "bubble", style: "min-height:60px" }, "Resultado dos jobs aparece aqui.");
  const job = (name, label, desc) => h("tr", {}, h("td", {}, h("b", {}, label), h("br"), h("span", { class: "small muted" }, desc)), h("td", { class: "mono small" }, `POST /api/admin/jobs/${name}`),
    h("td", {}, btn("Executar", async () => { out.textContent = "Executando…"; out.textContent = JSON.stringify(await post(`/jobs/${name}`), null, 2); })));
  const origin = location.origin;
  return h("div", {},
    head("Integrações e automações", "O n8n orquestra chamando estes endpoints com o token do painel. Os mesmos jobs podem rodar pelo agendador do próprio Cloudflare."),
    sec("Fontes de dados e parceiros", null, integList(items)),
    sec("Jobs do pipeline", "ordem sugerida no n8n: coletar → detectar → verificar → expirar → montar → (aprovação) → enviar", h("div", { class: "grid2" },
      table(["Job", "Endpoint", ""], [
        job("collect", "Coletar preços", "Consulta as rotas monitoradas na fonte real."),
        job("detect", "Detectar oportunidades", "Pontua preços recentes contra o histórico."),
        job("verify", "Reverificar", "Reconsulta ofertas antigas; marca desatualizadas."),
        job("expire", "Expirar", "Tira do ar ofertas vencidas ou com partida passada."),
        job("compose", "Montar rascunhos", "Cria posts por canal conforme as regras."),
        job("dispatch", "Enviar aprovados", "Envia o que foi aprovado, com limites e silêncio."),
      ]), out)),
    sec("Chamada pelo n8n", null, h("pre", { class: "bubble" },
      `Nó HTTP Request\n  Método: POST\n  URL: ${origin}/api/admin/jobs/pipeline\n  Header: Authorization = Bearer <ADMIN_TOKEN>\n\nRelatório diário (texto pronto para Telegram/e-mail):\n  GET ${origin}/api/admin/report\n\nFluxos prontos para importar: plataforma/n8n/*.json`)),
    sec("Modo demonstração", "dados sintéticos para testar o fluxo sem a fonte real", h("div", { class: "panel" },
      h("p", { class: "small" }, "Gera 6 rotas, ~1.200 preços de EXEMPLO e 4 canais de exemplo, depois roda detecção e montagem. Tudo fica marcado como exemplo, aparece com selo e é bloqueado para envio."),
      h("div", { class: "actions" },
        btn("Gerar dados de exemplo", async () => { const r = await post("/demo/seed"); toast(`${r.observations} preços de exemplo · ${r.opportunities} oportunidades · ${r.posts} rascunhos.`); }, "primary"),
        btn("Remover dados de exemplo", async () => { await del("/demo"); toast("Dados de exemplo removidos."); }, "danger")))));
};

/* ---------- Atividade ---------- */
VIEWS.atividade = async () => {
  const { items } = await api("/logs");
  return h("div", {}, head("Atividade e erros", "Execuções de jobs, ações no painel e falhas de integração."), logTable(items));
};

/* ---------- Ajustes ---------- */
VIEWS.ajustes = async () => {
  const s = await api("/settings");
  const defs = [
    ["min_sample", "Amostra mínima para classificar", "Abaixo disso, nenhuma oferta recebe selo."],
    ["history_days", "Janela do histórico (dias)", ""],
    ["trip_days_tolerance", "Tolerância de duração (± dias)", "Viagens de 7 e 9 dias contam como comparáveis com tolerância 2."],
    ["pct_imperdivel", "Achado imperdível: até o percentil", ""],
    ["pct_excelente", "Excelente: até o percentil", ""],
    ["pct_boa", "Boa oportunidade: até o percentil", ""],
    ["pct_competitivo", "Preço competitivo: até o percentil", ""],
    ["verify_max_age_hours", "Consulta vira desatualizada após (h)", "Ofertas mais velhas que isso não podem ser aprovadas sem reverificar."],
    ["price_tolerance_pct", "Variação aceita na reverificação (%)", ""],
    ["offer_ttl_hours", "Validade de oferta publicada (h)", ""],
    ["brand_name", "Nome da marca", "Provisório até a escolha final."],
    ["site_url", "Endereço público do site", "Usado nos links rastreáveis dos posts."],
  ];
  const f = h("form", { class: "form-grid" }, ...defs.map(([k, l, help]) => h("label", { class: "f span2" }, l, h("input", { id: `st-${k}`, value: s[k] ?? "" }), help ? h("small", { class: "muted" }, help) : null)),
    h("div", { class: "span4" }, h("button", { class: "btn primary", type: "submit" }, "Salvar ajustes")));
  f.addEventListener("submit", async e => { e.preventDefault(); const b = {}; for (const [k] of defs) b[k] = $(`#st-${k}`, f).value; try { await patch("/settings", b); toast("Ajustes salvos."); } catch (err) { toast(err.message, true); } });
  return h("div", {}, head("Ajustes", "Parâmetros do motor de pontuação, da verificação e da marca."), f);
};

/* ---------- Início ---------- */
(async () => {
  AP = await loadAirports();
  if (getToken()) tryEnter(); else showLogin();
})();
