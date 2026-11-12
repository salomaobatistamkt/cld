// Gráficos SVG de série única, com tooltip. Cores vêm dos tokens do tema (CSS), nunca fixas.
import { h } from "./common.js";

const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function tipLayer(wrap) {
  const tip = h("div", { class: "tip", hidden: true });
  wrap.append(tip);
  return {
    show(x, y, text) { tip.hidden = false; tip.textContent = text; tip.style.left = x + "px"; tip.style.top = y + "px"; },
    hide() { tip.hidden = true; },
  };
}

/** Colunas verticais (contagens por dia). data: [{label, value, tip}] */
export function columns(data, { height = 180, fmt = v => v } = {}) {
  const wrap = h("div", { class: "chart" });
  if (!data.length) { wrap.append(h("div", { class: "empty" }, "Sem dados no período.")); return wrap; }
  const W = 600, H = height, L = 34, B = 22, T = 8;
  const max = Math.max(4, niceMax(Math.max(...data.map(d => d.value))));
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
  for (let i = 0; i <= 4; i++) {
    const y = T + (H - T - B) * (1 - i / 4);
    svg.append(s("line", { class: "gl", x1: L, x2: W, y1: y, y2: y }));
    const t = s("text", { class: "ax", x: L - 6, y: y + 3.5, "text-anchor": "end" }); t.textContent = fmt(Math.round(max * i / 4)); svg.append(t);
  }
  const bw = (W - L) / data.length, gap = Math.min(4, bw * 0.25);
  const tip = tipLayer(wrap);
  data.forEach((d, i) => {
    const bh = ((H - T - B) * d.value) / max, x = L + i * bw + gap / 2, y = H - B - bh;
    const r = Math.min(4, (bw - gap) / 2, bh);
    const bar = s("path", { class: "bar", d: bh > 0 ? `M${x},${H - B} V${y + r} q0,-${r} ${r},-${r} H${x + bw - gap - r} q${r},0 ${r},${r} V${H - B} Z` : "" });
    svg.append(bar);
    const hit = s("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" });
    hit.addEventListener("mousemove", () => { bar.classList.add("hl"); const rc = svg.getBoundingClientRect(); tip.show((x + (bw - gap) / 2) / W * rc.width, y / H * rc.height, d.tip ?? `${d.label}: ${fmt(d.value)}`); });
    hit.addEventListener("mouseleave", () => { bar.classList.remove("hl"); tip.hide(); });
    svg.append(hit);
  });
  const every = Math.ceil(data.length / 8);
  data.forEach((d, i) => { if (i % every) return; const t = s("text", { class: "ax", x: L + i * bw + bw / 2, y: H - 6, "text-anchor": "middle" }); t.textContent = d.label; svg.append(t); });
  wrap.prepend(svg);
  return wrap;
}

/** Histórico de preços: pontos ao longo do tempo + linha de referência (preço da oferta). */
export function priceHistory(points, refCents, { height = 220 } = {}) {
  const wrap = h("div", { class: "chart" });
  if (!points.length) { wrap.append(h("div", { class: "empty" }, "Sem histórico.")); return wrap; }
  const W = 600, H = height, L = 52, B = 22, T = 10, R = 8;
  const xs = points.map(p => Date.parse(p.observed_at)), ys = points.map(p => p.price_cents / 100);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
  const yMax = niceMax(Math.max(...ys, refCents / 100) * 1.05), yMin = 0;
  const X = t => L + ((t - x0) / Math.max(1, x1 - x0)) * (W - L - R);
  const Y = v => T + (H - T - B) * (1 - (v - yMin) / (yMax - yMin));
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Histórico de preços da rota" });
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yMax - yMin) * i / 4, y = Y(v);
    svg.append(s("line", { class: "gl", x1: L, x2: W - R, y1: y, y2: y }));
    const t = s("text", { class: "ax", x: L - 6, y: y + 3.5, "text-anchor": "end" }); t.textContent = "R$ " + Math.round(v).toLocaleString("pt-BR"); svg.append(t);
  }
  const tip = tipLayer(wrap);
  points.forEach((p, i) => {
    const c = s("circle", { class: "pt", cx: X(xs[i]), cy: Y(ys[i]), r: 4, "fill-opacity": 0.55 });
    c.addEventListener("mousemove", () => { const rc = svg.getBoundingClientRect(); tip.show(X(xs[i]) / W * rc.width, Y(ys[i]) / H * rc.height, `R$ ${Math.round(ys[i]).toLocaleString("pt-BR")} · ida ${p.depart_date.split("-").reverse().join("/")} · ${p.trip_days ?? "-"} dias`); });
    c.addEventListener("mouseleave", tip.hide);
    svg.append(c);
  });
  const ry = Y(refCents / 100);
  svg.append(s("line", { class: "ref", x1: L, x2: W - R, y1: ry, y2: ry }));
  const lt = s("text", { class: "ax", x: W - R, y: ry - 6, "text-anchor": "end" }); lt.textContent = "preço da oferta"; svg.append(lt);
  const fmtD = t => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  [[x0, "start"], [x1, "end"]].forEach(([t, a]) => { const e = s("text", { class: "ax", x: X(t), y: H - 6, "text-anchor": a }); e.textContent = fmtD(t); svg.append(e); });
  wrap.prepend(svg);
  return wrap;
}

/** Barras horizontais com rótulo e valor. */
export function hbars(rows, fmt = v => v) {
  if (!rows.length) return h("div", { class: "empty" }, "Sem dados.");
  const max = Math.max(...rows.map(r => r.value), 1);
  return h("div", { class: "hbars" }, ...rows.map(r => h("div", { class: "hbar", title: `${r.label}: ${fmt(r.value)}` },
    h("span", {}, r.label), h("div", { class: "track" }, h("div", { class: "fill", style: `width:${(r.value / max) * 100}%` })), h("span", { class: "v" }, fmt(r.value)))));
}
