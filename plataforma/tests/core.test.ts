import { test } from "node:test";
import assert from "node:assert/strict";
import { scorePrice, median } from "../src/lib/scoring";
import { dddFromPhone, regionFromDdd } from "../src/lib/ddd";
import { renderPost } from "../src/lib/posts";
import { matchesRules } from "../src/lib/jobs";

const S = { min_sample: "30", pct_imperdivel: "5", pct_excelente: "15", pct_boa: "30", pct_competitivo: "50" };
const hist = Array.from({ length: 100 }, (_, i) => 50000 + i * 1000); // R$ 500 a R$ 1.490

test("sem amostra mínima não há selo", () => {
  const r = scorePrice(10000, hist.slice(0, 29), S);
  assert.equal(r.label, "dados_insuficientes");
  assert.equal(r.percentile, null);
});
test("faixas por percentil", () => {
  assert.equal(scorePrice(50000, hist, S).label, "imperdivel");   // p1
  assert.equal(scorePrice(60000, hist, S).label, "excelente");    // p11
  assert.equal(scorePrice(75000, hist, S).label, "boa");          // p26
  assert.equal(scorePrice(95000, hist, S).label, "competitivo");  // p46
  assert.equal(scorePrice(120000, hist, S).label, "comum");
});
test("economia é calculada sobre a mediana", () => {
  assert.equal(median([1, 3, 5]), 3);
  const r = scorePrice(49500, hist, S);
  assert.equal(r.medianCents, 99500);
  assert.ok(r.savingsPct! > 50 && r.savingsPct! < 51);
});
test("DDD é só indicação de UF", () => {
  assert.equal(dddFromPhone("+55 (84) 99999-0000"), "84");
  assert.equal(regionFromDdd("84"), "BR-RN");
  assert.equal(regionFromDdd(dddFromPhone("91 98888-7777")), "BR-PA");
  assert.equal(regionFromDdd(dddFromPhone("(85) 3333-4444")), "BR-CE");
  assert.equal(dddFromPhone("(20) 9999-9999"), null);
});
const base = {
  origin: "NAT", originCity: "Natal", destination: "GRU", destinationCity: "São Paulo", depart_date: "2027-03-15", return_date: "2027-04-05",
  trip_days: 21, price_cents: 38900, fare_type: "ida_volta", includes_taxes: null, airline: null, transfers: 1, score_label: "boa" as const,
  savings_pct: 22, median_cents: 49900, observed_at: "2026-11-12T17:32:00Z", is_sample: 0, link: "https://x/r/abc",
};
test("post traz informações obrigatórias", () => {
  for (const tpl of ["classico", "direto", "roteiro", "alerta"] as const) {
    const t = renderPost(base, "whatsapp_canal", tpl);
    assert.match(t, /ida e volta/);
    assert.match(t, /taxas a confirmar/);
    assert.match(t, /Preço visto em consulta de 12\/11\/2026 14:32/);
    assert.match(t, /Link de afiliado/);
  }
});
test("dado de exemplo é marcado e Instagram não leva link clicável", () => {
  assert.match(renderPost({ ...base, is_sample: 1 }, "telegram", "classico"), /^⚠️ DADO DE EXEMPLO/);
  assert.doesNotMatch(renderPost(base, "instagram", "direto"), /https:\/\/x\/r\/abc/);
});
test("regras de canal", () => {
  const o = { origin: "NAT", price_cents: 38900, score_label: "boa", trip_days: 21, depart_date: "2099-01-01" };
  assert.equal(matchesRules(o, JSON.stringify({ origin_regions: ["BR-RN"] }), "BR-RN", "BR", "BR"), true);
  assert.equal(matchesRules(o, JSON.stringify({ origin_regions: ["BR-PA"] }), "BR-RN", "BR", "BR"), false);
  assert.equal(matchesRules(o, JSON.stringify({ international: true }), "BR-RN", "BR", "BR"), false);
  assert.equal(matchesRules(o, JSON.stringify({ max_price: 300 }), "BR-RN", "BR", "BR"), false);
  assert.equal(matchesRules(o, JSON.stringify({ min_label: "excelente" }), "BR-RN", "BR", "BR"), false);
});
