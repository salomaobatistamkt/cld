# 04 · API

Base: `https://SEU-DOMINIO`. Respostas em JSON; erros como `{ "error": "mensagem" }`.

## Pública (`/api/public`)

| Método | Caminho | Uso |
|---|---|---|
| GET | `/status` | Marca e situação das integrações |
| GET | `/opportunities?origin=NAT&region=BR-RN&limit=24` | Achados aprovados ou publicados |
| GET | `/opportunities/:id` | Um achado ativo |
| POST | `/search` `{origin, destination, depart, ret?}` | Pesquisa na fonte real (quando configurada) + histórico de ±3 dias |
| POST | `/plan` `{origin, destination, depart, ret, travelers, hotel_daily_estimate?, car_daily_estimate?}` | Viagem completa com custo por item e base de cada valor |
| POST | `/subscribe` `{name?, phone?, email?, home_airport?, interests, consent: true}` | Cadastro; sem `consent: true` é recusado |
| GET | `/r/:code` | Link rastreável (registra clique e redireciona) |

## Painel (`/api/admin`, exige `Authorization: Bearer <ADMIN_TOKEN>`)

| Método | Caminho | Uso |
|---|---|---|
| GET | `/overview` | Indicadores, séries de 30 dias, canais, parceiros, atividade |
| GET · POST · PATCH · DELETE | `/routes`, `/routes/:id` | Rotas monitoradas (POST aceita várias origens × destinos) |
| GET · POST | `/opportunities` | Lista (filtro `?status=`) e cadastro manual |
| PATCH | `/opportunities/:id` `{status}` | Aprovar, rejeitar etc. Aprovação exige consulta recente |
| POST | `/opportunities/:id/verify` | Controle de qualidade; `{manual_confirm: true}` para ofertas manuais |
| GET | `/opportunities/:id/history` | Pontos do histórico da rota |
| GET · POST · PATCH · DELETE | `/channels`, `/channels/:id` | Canais e regras |
| GET · POST | `/posts` | Fila; criar rascunho para um canal |
| POST | `/posts/preview` | Texto do post sem gravar |
| PATCH | `/posts/:id` `{status?, body?}` | Aprovar, rejeitar, editar texto |
| POST | `/posts/:id/sent` | Marcar publicação assistida como feita |
| GET · POST · PATCH | `/partners`, `/partners/:id` | Parceiros e afiliados |
| GET · POST | `/conversions` | Conversões (POST aceita `{rows: [...]}` para importação) |
| GET | `/subscribers`, `/logs`, `/integrations` | Consulta |
| GET · PATCH | `/settings` | Parâmetros |
| POST | `/jobs/{collect, detect, verify, expire, compose, dispatch, pipeline}` | Jobs do pipeline (n8n) |
| GET | `/report` | Resumo de 24 h em texto |
| POST · DELETE | `/demo/seed`, `/demo` | Gerar e remover dados de exemplo |
