# 06 · Automações com n8n

Três fluxos prontos em `plataforma/n8n/`:

| Arquivo | Quando | O que faz |
|---|---|---|
| `01-pipeline-ofertas.json` | A cada 6 h | Coletar → detectar → reverificar → expirar → montar rascunhos → avisar no Telegram se há posts aguardando aprovação |
| `02-envio-aprovados.json` | A cada 30 min | Envia o que foi aprovado (limite diário e horário de silêncio são aplicados pelo servidor) |
| `03-relatorio-diario.json` | Todo dia às 8 h (fuso do n8n) | Busca o resumo de 24 h e manda no Telegram |

## Como importar

1. No n8n: *Workflows → Import from File*.
2. Crie a credencial **Header Auth** chamada `Meridia ADMIN_TOKEN`, com nome `Authorization` e valor `Bearer <seu ADMIN_TOKEN>`.
3. Crie a credencial **Telegram** chamada `Bot Meridia` (pode ser o mesmo bot dos canais ou outro só para avisos).
4. Troque `SEU-DOMINIO` pela URL publicada e `SEU_CHAT_ID_ADMIN` pelo seu chat no Telegram.
5. Confira se o fuso do n8n (`GENERIC_TIMEZONE`) é `America/Sao_Paulo`.
6. Ative os fluxos.

> Os arquivos foram gerados no formato de exportação do n8n (nós HTTP Request v4.2, Schedule Trigger v1.2, IF v2, Telegram v1.2). Se a sua versão do n8n for muito antiga, a importação pode pedir ajuste dos nós. Revise após importar.

## Aprovação continua humana

O pipeline nunca envia sozinho o que não foi aprovado. Para automatizar parte da aprovação no futuro (ex.: aprovar sozinho "achado imperdível" verificado há menos de 1 h em canais de baixo risco), a regra entra no servidor com teste, não no n8n.

## Ideias para a fase 7

- Fluxo que lê o relatório de conversões dos parceiros (e-mail ou API) e chama `POST /api/admin/conversions`.
- Fluxo de alerta: se `errors_24h > 0`, avisar no Telegram.
- Fluxo de boas-vindas para novos interessados (e-mail com confirmação de inscrição).
