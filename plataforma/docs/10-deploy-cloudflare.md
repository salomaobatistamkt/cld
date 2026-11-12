# 10 · Publicar na Cloudflare

Pré-requisitos: conta Cloudflare com o domínio; Node 18+ no computador.

```bash
cd plataforma
npm install
npx wrangler login

# 1. Banco
npx wrangler d1 create meridia
#   copie o database_id exibido para wrangler.toml
npm run db:migrate:remote

# 2. Segredos
npx wrangler secret put ADMIN_TOKEN            # gere um token longo e aleatório
npx wrangler secret put TRAVELPAYOUTS_TOKEN
npx wrangler secret put TRAVELPAYOUTS_MARKER
npx wrangler secret put TELEGRAM_BOT_TOKEN     # opcional

# 3. Publicar
npm run deploy
```

## Depois de publicar

1. **Domínio:** em *Workers → meridia → Settings → Domains & Routes*, adicione o seu domínio.
2. **Endereço público:** em *Painel → Ajustes*, troque *Endereço público do site* pela URL final (os links rastreáveis usam esse valor).
3. **Proteger o painel com Cloudflare Access:** em *Zero Trust → Access → Applications*, crie uma aplicação self-hosted para `SEU-DOMINIO/admin*` e `SEU-DOMINIO/api/admin*`, liberando só o seu e-mail.

   O n8n precisa passar pelo Access: crie um **Service Token** e adicione os cabeçalhos `CF-Access-Client-Id` e `CF-Access-Client-Secret` às requisições HTTP do n8n.
4. **Agendador nativo (opcional, reserva do n8n):** descomente `[triggers]` no `wrangler.toml` e publique de novo.

## Custos esperados

| Item | Custo |
|---|---|
| Workers pago | US$ 5/mês; inclui D1 e requisições suficientes para o MVP |
| Domínio | conforme o registrador |
