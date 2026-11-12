# Meridia · plataforma (MVP)

> **Meridia** é o nome provisório. Troque em *Painel → Ajustes → Nome da marca* e nos arquivos `public/index.html` e `public/admin/index.html` quando o nome final for escolhido.

Central de descoberta e distribuição de achados de viagem, com site público (globo interativo, pesquisa, planejamento e cadastro) e painel administrativo (oportunidades, fila de aprovação, gerador de posts, rotas, canais, parceiros, comercial, automações).

## O que já funciona e o que está pendente

| Parte | Situação |
|---|---|
| Site público: globo (país → estado → cidade → aeroporto), achados, pesquisa, planejamento, cadastro com consentimento | ✅ Funciona |
| Painel: visão geral, oportunidades, publicações, gerador, rotas, canais, parceiros, comercial, interessados, automações, atividade, ajustes | ✅ Funciona |
| Motor de pontuação por percentil do histórico, com amostra mínima | ✅ Funciona (testado) |
| Controle de qualidade, expiração, duplicidade, links rastreáveis, registro de cliques | ✅ Funciona |
| Gerador de posts: 4 modelos × 7 formatos de canal, com avisos obrigatórios | ✅ Funciona (testado) |
| Cadastro manual de oportunidade (preço que você mesmo encontrou) | ✅ Funciona |
| **Preços reais automáticos (Travelpayouts / Aviasales Data API)** | ⏳ **Código pronto, aguardando seu token** |
| Envio automático para Telegram | ⏳ Código pronto, aguardando token do bot |
| Hospedagem e carro | ⏳ Por link de afiliado; aguardando seus IDs de afiliado |
| Ônibus, Duffel, WhatsApp API | ⏳ Pendentes (sem integração autorizada ainda) |

Enquanto a fonte real não está conectada, o **modo demonstração** gera preços sintéticos. Eles ficam marcados como *exemplo* em todas as telas, saem com aviso no texto dos posts e **são bloqueados para envio**.

## Rodar localmente

```bash
cd plataforma
npm install
npm run db:migrate        # cria o banco D1 local
npm run dev               # http://localhost:8787  (painel em /admin, token: dev-admin)
npm test                  # testes do motor de pontuação, DDD, posts e regras de canal
```

Para testar sem fonte real: *Painel → Integrações e automações → Gerar dados de exemplo*.

## Estrutura

```
plataforma/
  src/                    Worker (API) em TypeScript com Hono
    index.ts              rotas, link rastreável /r/:code, agendador opcional
    routes/public.ts      API do site: achados, pesquisa, planejamento, cadastro
    routes/admin.ts       API do painel e jobs chamados pelo n8n
    adapters/             fornecedores (um arquivo por fonte, contrato único)
    lib/scoring.ts        classificação por percentil do histórico
    lib/jobs.ts           coleta, detecção, verificação, expiração, montagem, envio
    lib/posts.ts          modelos de publicação por canal
    lib/ddd.ts            DDD → UF (só indicação)
  migrations/             esquema do banco (D1 / SQLite)
  public/                 site e painel (HTML, CSS e JS sem etapa de build)
    data/                 aeroportos (OurAirports) e polígonos dos países
  n8n/                    fluxos prontos para importar no n8n
  docs/                   documentação do projeto
  tests/                  testes automáticos
```

## Documentos

1. [Decisões tomadas e pendentes](docs/01-decisoes.md)
2. [Arquitetura](docs/02-arquitetura.md)
3. [Modelo de dados](docs/03-modelo-de-dados.md)
4. [API](docs/04-api.md)
5. [Integrações: como conectar cada fornecedor](docs/05-integracoes.md)
6. [Automações com n8n](docs/06-automacoes-n8n.md)
7. [Regras de negócio e conformidade](docs/07-regras-de-negocio.md)
8. [Roteiro por fases e checklist do MVP](docs/08-roadmap.md)
9. [Marca e design](docs/09-marca-e-design.md)
10. [Publicar na Cloudflare](docs/10-deploy-cloudflare.md)
