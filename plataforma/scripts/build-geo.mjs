// Gera public/data/airports.json e public/data/countries-110m.json
// Fonte: OurAirports (domínio público) — https://ourairports.com/data/
// Polígonos: world-atlas (Natural Earth, domínio público)
// Uso: npm run build:geo   (precisa de acesso a raw.githubusercontent.com)
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";

const BASE = "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/";

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const get = async (f) => { const r = await fetch(BASE + f); if (!r.ok) throw new Error(f + " " + r.status); return parseCSV(await r.text()); };

const [airports, regions] = await Promise.all([get("airports.csv"), get("regions.csv")]);
const regionName = Object.fromEntries(regions.map(r => [r.code, r.name]));

const keep = airports.filter(a =>
  a.iata_code && a.iata_code.length === 3 &&
  a.scheduled_service === "yes" &&
  (a.type === "large_airport" || a.type === "medium_airport"));

const out = keep.map(a => ({
  i: a.iata_code,
  n: a.name,
  c: a.municipality || "",
  r: a.iso_region,
  rn: regionName[a.iso_region] || a.iso_region,
  k: a.iso_country,
  la: +(+a.latitude_deg).toFixed(4),
  lo: +(+a.longitude_deg).toFixed(4),
  t: a.type === "large_airport" ? "L" : "M",
})).sort((x, y) => x.i.localeCompare(y.i));

// Mapeia id numérico do polígono (world-atlas) -> ISO alfa-2, pela maioria dos aeroportos contidos
const topo = JSON.parse(await readFile(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url)));
const fc = feature(topo, topo.objects.countries);
const featToIso = {};
for (const f of fc.features) {
  const count = {};
  for (const a of out) if (geoContains(f, [a.lo, a.la])) count[a.k] = (count[a.k] || 0) + 1;
  const best = Object.entries(count).sort((x, y) => y[1] - x[1])[0];
  if (best) featToIso[f.id] = best[0];
}

await writeFile(new URL("../public/data/airports.json", import.meta.url), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), source: "OurAirports (domínio público)", airports: out, featToIso }));
await copyFile(new URL("../node_modules/world-atlas/countries-110m.json", import.meta.url), new URL("../public/data/countries-110m.json", import.meta.url));
console.log(`aeroportos: ${out.length} · polígonos mapeados: ${Object.keys(featToIso).length}/${fc.features.length}`);
