# 03 · Modelo de dados

Banco relacional (D1/SQLite). Datas em ISO-8601 UTC; dinheiro em **centavos**; listas e regras em JSON. Esquema completo em `migrations/0001_init.sql`.

| Tabela | Guarda | Campos-chave |
|---|---|---|
| `settings` | Parâmetros editáveis no painel | amostra mínima, percentis, validade, tolerâncias, marca |
| `partners` | Parceiros e afiliados | categoria, rede, status, `link_template`, `affiliate_id` |
| `monitored_routes` | Rotas consultadas periodicamente | origem, destino, durações, meses à frente, prioridade |
| `price_observations` | **Histórico de preços** (o ativo do negócio) | rota, datas, preço, tipo de tarifa, taxas, fonte, `is_sample`, `observed_at` |
| `opportunities` | Preços que viraram oferta | rótulo, percentil, mediana, amostra, economia, status, validade |
| `channels` | Canais de distribuição | tipo, regras (JSON), modelo, limite diário, silêncio |
| `posts` | Publicações por oferta × canal | texto, status, aprovação, envio, erro |
| `tracked_links` | Links rastreáveis | código, oferta, canal, parceiro, destino |
| `clicks` | Cliques | link, data, país, origem |
| `conversions` | Reservas e comissões informadas pelos parceiros | referência, valor, comissão, status, fonte |
| `subscribers` | Interessados (LGPD) | contato, DDD, **região inferida** × **região informada**, interesses, consentimento |
| `searches` | Pesquisas feitas no site | rota, datas, resultados, fonte |
| `activity_log` | Jobs, ações do painel e erros | tipo, nível, mensagem |

## Ciclo de vida

**Oportunidade:** `nova` → `aprovada` → `publicada` → `expirada`. Desvios: `rejeitada` ou `desatualizada` (reverificação falhou).

**Post:** `aguardando_aprovacao` → `aprovado` → `enviado`. Desvios: `rejeitado`, `falhou` (erro da plataforma) ou `bloqueado` (dado de exemplo).

## Regras de integridade

- Uma oportunidade é única por rota, datas, preço e fonte (evita duplicadas).
- Um post é único por oportunidade × canal.
- Dados de exemplo (`is_sample = 1`) nunca entram no histórico de dados reais: a pontuação só compara exemplo com exemplo e real com real.
