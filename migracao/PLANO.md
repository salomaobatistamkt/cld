# Plano de migração VPS (Hostinger) → servidor de casa

Regra geral: nada é desligado ou apagado na VPS sem confirmação do Salomão.
Apps parados (exited) na VPS ficam fora.

## Ordem

| # | Sistema | Dados para migrar | Acesso público | Cuidado especial |
|---|---|---|---|---|
| 1 | Financeiro Família | volume `/app/data` (JSON + backups) | confirmar no inventário | — |
| 2 | Konext Gestão (dashboard clientes/entregas) | confirmar no inventário | confirmar | — |
| 3 | Dueto CaCau (repo eliz) | confirmar no inventário | provável (clientes) | — |
| 4 | Konan | volume `dados` (memória SQLite); `modelos-cerebro` pode baixar de novo | não | — |
| 5 | CRM (crm.kntbr.com) | Supabase (fica na nuvem) + volumes WAHA (`waha-data`, `waha-media`) | sim | sessão WhatsApp: nunca rodar VPS e casa ao mesmo tempo |
| 6 | n8n | Postgres do n8n + volume `/home/node/.n8n` | sim (webhooks) | `N8N_ENCRYPTION_KEY` idêntica, senão as credenciais quebram |
| 7 | Evolution API | Postgres + Redis + volume `instances` | sim | sessão WhatsApp: mesma regra do CRM; n8n e CRM apontam para ela |

## Cloudflare Tunnel em casa

- Criar um tunnel NOVO para casa (ex.: `casa-hp`). Não reutilizar o token do tunnel da VPS:
  dois conectores no mesmo tunnel dividem o tráfego entre VPS e casa.
- cloudflared instalado como serviço (systemd) no servidor de casa, apontando
  cada hostname para `http://localhost:80` (Traefik do Coolify).
- No Coolify, o domínio do app fica como `http://NOME.kntbr.com` (o TLS é feito na Cloudflare).
- Teste: hostname temporário no tunnel de casa (ex.: `crm-teste.kntbr.com`).
- Virada: mover o hostname definitivo do tunnel da VPS para o de casa.
  Rollback: mover de volta (segundos).

## Padrão por sistema

1. Backup na VPS (somente leitura: `tar` do volume / `pg_dump`).
2. `scp` iniciado pelo servidor de casa.
3. Criar app no Coolify de casa (mesmo repo/branch/build, mesmas variáveis).
4. Restaurar dados, subir, testar por Tailscale ou hostname `-teste`.
5. Virada: backup final na VPS, restaurar de novo, mover hostname.
6. Alguns dias estável → Salomão decide desligar na VPS.

Deploy: sem webhooks do GitHub (painel só via Tailscale). Usar Redeploy manual
ou, depois, GitHub Actions chamando a API do Coolify pelo tunnel com token.
