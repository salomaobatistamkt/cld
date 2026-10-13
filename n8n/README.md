# Kommo → n8n: parar Salesbots quando o lead vira "Venda perdida"

Migração do cenário Make **Integration Webhooks** para o n8n.

## Fluxo

```
Webhook Kommo → Extrair leads perdidos (status_id = 143) → Listar Salesbots (GET /api/v4/bots)
             → Lead x Bot (combina cada lead com cada bot) → Parar Salesbot (POST /api/v4/bots/{id}/stop)
```

## Como importar

1. No n8n: **Workflows → Import from File** → `kommo-parar-salesbots.workflow.json`.
2. Crie uma credencial **Header Auth** (nome sugerido: `Kommo - Token`):
   - Name: `Authorization`
   - Value: `Bearer SEU_TOKEN_DE_LONGA_DURACAO`
   (Kommo → Configurações → Integrações → sua integração → aba Chaves e escopos → Token de longa duração)
3. Selecione essa credencial nos nós **Listar Salesbots** e **Parar Salesbot**.
4. Se o subdomínio não for `amarketingevendas`, altere `KOMMO_BASE_URL` no nó **Extrair leads perdidos**.
5. Ative o workflow e copie a **Production URL** do nó Webhook.
6. No Kommo: Configurações → Integrações → **Webhooks** → cole a URL e marque o evento
   **"Etapa do lead alterada"** (e, se quiser, "Lead alterado").
7. Só depois de testar, desative o cenário no Make (ou remova o webhook antigo do Kommo) para não parar os bots em dobro.

## Observações

- Bots que não estão rodando no lead podem responder com erro; o nó **Parar Salesbot** está com
  "Never Error" ligado, então o fluxo continua e o status de cada chamada fica visível na execução.
- Envio em lotes de 5 requisições por segundo para respeitar o limite da API do Kommo (7 req/s).
