// Globo interativo leve: Canvas 2D + projeção ortográfica (d3-geo). Sem WebGL, roda em celular modesto.
// Evolução prevista: MapLibre GL (projeção globe + tiles vetoriais) quando precisarmos de ruas e bairros.
/* global d3, topojson */
import { loadAirports } from "./common.js";

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function createGlobe(canvas, { onCountry, onAirport } = {}) {
  const [topo, ap] = await Promise.all([fetch("/data/countries-110m.json").then(r => r.json()), loadAirports()]);
  const countries = topojson.feature(topo, topo.objects.countries).features;
  const borders = topojson.mesh(topo, topo.objects.countries, (a, b) => a !== b);
  const graticule = d3.geoGraticule10();
  const ctx = canvas.getContext("2d");
  const projection = d3.geoOrthographic().clipAngle(90).rotate([50, 12]);
  const path = d3.geoPath(projection, ctx);

  const state = { country: null, hover: null, airport: null, airports: [], arcs: [], zoom: 1 };
  let W = 0, H = 0, base = 0, dpr = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    base = Math.min(W, H) / 2 - 8;
    projection.translate([W / 2, H / 2]).scale(base * state.zoom);
    draw();
  }

  function draw() {
    const c = { ocean: css("--ocean"), land: css("--land"), hover: css("--land-hover"), line: css("--bg"), grid: css("--grid"),
      accent: css("--accent"), amber: css("--amber"), fg: css("--fg"), surface: css("--surface") };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = c.ocean; ctx.fill();
    ctx.beginPath(); path(graticule); ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.stroke();
    for (const f of countries) {
      ctx.beginPath(); path(f);
      ctx.fillStyle = f === state.country ? c.accent : f === state.hover ? c.hover : c.land;
      ctx.fill();
    }
    ctx.beginPath(); path(borders); ctx.strokeStyle = c.line; ctx.lineWidth = 0.6; ctx.stroke();

    // Rotas (arcos de grande círculo) a partir do aeroporto selecionado
    if (state.airport && state.arcs.length) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = c.amber; ctx.globalAlpha = 0.9;
      for (const d of state.arcs) {
        ctx.beginPath(); path({ type: "LineString", coordinates: [[state.airport.lo, state.airport.la], [d.lo, d.la]] }); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const d of state.arcs) dot(d, 3.5, c.amber, c.surface);
    }
    // Aeroportos do país selecionado
    for (const a of state.airports) dot(a, a.t === "L" ? 4 : 3, a === state.airport ? c.amber : c.fg, c.surface);
    if (state.airport) dot(state.airport, 6, c.amber, c.surface);
    ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.stroke();
  }

  function visible(a) {
    const r = projection.rotate();
    return d3.geoDistance([a.lo, a.la], [-r[0], -r[1]]) < Math.PI / 2 - 0.02;
  }
  function dot(a, r, fill, ring) {
    if (!visible(a)) return;
    const [x, y] = projection([a.lo, a.la]);
    ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fillStyle = ring; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }

  // Animação de rotação até um ponto
  let anim = 0;
  function flyTo(lon, lat, zoom = state.zoom) {
    cancelAnimationFrame(anim);
    const r0 = projection.rotate(), r1 = [-lon, -lat, 0];
    const z0 = state.zoom;
    if (reduced) { projection.rotate(r1); state.zoom = zoom; projection.scale(base * zoom); draw(); return; }
    const ip = d3.geoInterpolate([-r0[0], -r0[1]], [lon, lat]);
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const [x, y] = ip(e);
      projection.rotate([-x, -y, 0]);
      state.zoom = z0 + (zoom - z0) * e; projection.scale(base * state.zoom);
      draw();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }

  // Interação: arrastar gira, roda/pinça aproxima, clique seleciona
  let drag = null, moved = false;
  const pointers = new Map();
  canvas.addEventListener("pointerdown", e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
    drag = { x: e.clientX, y: e.clientY, r: projection.rotate() }; moved = false; cancelAnimationFrame(anim);
  });
  canvas.addEventListener("pointermove", e => {
    if (pointers.size === 2 && pointers.has(e.pointerId)) {
      const pts = [...pointers.values()], d0 = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      pointers.set(e.pointerId, [e.offsetX, e.offsetY]);
      const p2 = [...pointers.values()], d1 = Math.hypot(p2[0][0] - p2[1][0], p2[0][1] - p2[1][1]);
      if (d0 > 0) setZoom(state.zoom * (d1 / d0));
      moved = true; return;
    }
    if (drag && (e.buttons || e.pointerType === "touch")) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      const k = 0.25 / state.zoom;
      projection.rotate([drag.r[0] + dx * k, Math.max(-80, Math.min(80, drag.r[1] - dy * k)), 0]);
      draw(); return;
    }
    const f = hit(e.offsetX, e.offsetY);
    if (f !== state.hover) { state.hover = f; canvas.style.cursor = f ? "pointer" : "grab"; draw(); }
  });
  const up = e => {
    pointers.delete(e.pointerId);
    if (!moved && drag) click(e.offsetX, e.offsetY);
    drag = null;
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", e => { pointers.delete(e.pointerId); drag = null; });
  canvas.addEventListener("pointerleave", () => { if (state.hover) { state.hover = null; draw(); } });
  canvas.addEventListener("wheel", e => { e.preventDefault(); setZoom(state.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });

  function setZoom(z) { state.zoom = Math.max(0.9, Math.min(12, z)); projection.scale(base * state.zoom); draw(); }

  function hit(x, y) {
    const ll = projection.invert([x, y]);
    if (!ll || Number.isNaN(ll[0])) return null;
    const r = projection.rotate();
    if (d3.geoDistance(ll, [-r[0], -r[1]]) > Math.PI / 2) return null;
    return countries.find(f => d3.geoContains(f, ll)) || null;
  }

  function click(x, y) {
    // Primeiro tenta aeroporto (alvo de toque de 14 px), depois país
    let best = null, bd = 14;
    for (const a of state.airports) {
      if (!visible(a)) continue;
      const [px, py] = projection([a.lo, a.la]); const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) { selectAirport(best); onAirport?.(best); return; }
    const f = hit(x, y);
    if (f) { const iso = ap.featToIso[f.id]; if (iso) { selectCountry(iso); onCountry?.(iso); } }
  }

  function featureOf(iso) { return countries.find(f => ap.featToIso[f.id] === iso) || null; }

  function selectCountry(iso, fly = true) {
    state.country = featureOf(iso);
    state.airports = ap.list.filter(a => a.k === iso);
    state.airport = null; state.arcs = [];
    if (fly) {
      const f = state.country;
      if (f) {
        const [lon, lat] = d3.geoCentroid(f);
        const [[x0, y0], [x1, y1]] = d3.geoBounds(f);
        const span = Math.max(Math.abs(x1 - x0) > 180 ? 360 - Math.abs(x1 - x0) : Math.abs(x1 - x0), y1 - y0);
        flyTo(lon, lat, Math.max(1, Math.min(6, 70 / Math.max(span, 6))));
      } else if (state.airports.length) {
        const a = state.airports[0]; flyTo(a.lo, a.la, 4);
      }
    } else draw();
  }

  function selectRegion(region) {
    const list = state.airports.filter(a => a.r === region);
    if (!list.length) return;
    const lon = list.reduce((s, a) => s + a.lo, 0) / list.length, lat = list.reduce((s, a) => s + a.la, 0) / list.length;
    flyTo(lon, lat, Math.max(state.zoom, 4));
  }

  function selectAirport(a) {
    if (!state.country || ap.featToIso[state.country.id] !== a.k) {
      state.country = featureOf(a.k); state.airports = ap.list.filter(x => x.k === a.k);
    }
    state.airport = a;
    flyTo(a.lo, a.la, Math.max(state.zoom, 3.5));
  }

  function setArcs(iatas) {
    state.arcs = iatas.map(i => ap.byIata.get(i)).filter(Boolean);
    if (state.arcs.length && state.airport && state.zoom > 2.5) {
      // Afasta para caber os destinos
      const far = Math.max(...state.arcs.map(d => d3.geoDistance([state.airport.lo, state.airport.la], [d.lo, d.la])));
      flyTo(state.airport.lo, state.airport.la, Math.max(1, Math.min(state.zoom, 1.6 / Math.max(far, 0.3))));
    } else draw();
  }

  function reset() { state.country = null; state.airport = null; state.airports = []; state.arcs = []; flyTo(-50, -12, 1); }

  new ResizeObserver(resize).observe(canvas);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  resize();
  flyTo(-55, -15, 1.25);

  return { selectCountry, selectRegion, selectAirport, setArcs, reset, zoom: f => setZoom(state.zoom * f) };
}
