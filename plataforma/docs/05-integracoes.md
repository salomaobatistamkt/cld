# 05 · Integrações: como conectar cada fornecedor

Situação verificada em novembro de 2026. Nada aqui é apresentado como funcionando sem estar funcionando: o painel mostra cada integração como **ativo** ou **pendente**.

## Travelpayouts · Aviasales Data API (voos): fonte principal

**Situação:** código pronto em `src/adapters/travelpayouts.ts`, aguardando credenciais.

1. Crie conta em travelpayouts.com e conecte o programa **Aviasales**.
2. Copie o **token da API** e o **marker** (seu identificador de afiliado) no painel da Travelpayouts.
3. Local: acrescente ao arquivo `plataforma/.dev.vars`:
   ```
   TRAVELPAYOUTS_TOKEN=...
   TRAVELPAYOUTS_MARKER=...
   ```
   Produção: `npx wrangler secret put TRAVELPAYOUTS_TOKEN` e `npx wrangler secret put TRAVELPAYOUTS_MARKER`.
4. No painel, *Integrações* deve mostrar "ativo". Rode *Rotas → Coletar agora*.

**Limitações conhecidas:**

- Os preços vêm do cache de buscas reais dos últimos 2 a 7 dias: são **preços vistos**, não garantidos. Por isso todo post traz data e hora e há reverificação.
- A API não confirma se o preço inclui taxas. O post diz "taxas a confirmar no parceiro".
- A busca em tempo real da Aviasales exige 50 mil usuários ativos por mês. Até lá, só a Data API.
- **Formato do link de afiliado:** o adaptador monta `aviasales.com/<caminho>&marker=<marker>`. Confirme no painel da Travelpayouts (*Ferramentas → Links*) se é o formato recomendado para a sua conta. Se for outro, o ajuste é uma linha no adaptador.

## Telegram (distribuição automática)

1. Crie um bot com o @BotFather e copie o token.
2. Adicione o bot como **administrador** do canal.
3. `TELEGRAM_BOT_TOKEN=...` em `.dev.vars` ou `wrangler secret put TELEGRAM_BOT_TOKEN`.
4. No painel, cadastre o canal tipo Telegram com destino técnico `@nome_do_canal`.

## WhatsApp

- **Canal do WhatsApp:** sem API pública de postagem. O painel gera o texto, você copia, publica e marca como publicado.
- **API oficial (Cloud API):** mensagens individuais só para quem consentiu, com modelo aprovado pela Meta e cobrança por mensagem. A API de Grupos exige conta comercial oficial (OBA), ainda pouco acessível.
- **Não suportado:** Baileys, Evolution API e similares (violam os termos de uso e arriscam banimento do número).

## Instagram e Facebook

API oficial de publicação para contas comerciais (Graph API). Está na fase 7: exige app aprovado na Meta e geração da arte. No MVP, a legenda vem pronta e a publicação é assistida.

## Booking.com (hospedagem)

Cadastre-se no programa de afiliados e copie o seu `aid`. Em *Painel → Parceiros → Booking.com*, coloque o ID e mude o status para **ativo**. O planejador passa a gerar o link de busca com cidade e datas. Preço e disponibilidade por API exigem parceria aprovada (fase futura).

## Rentcars (carro), via Awin

Entre na Awin, candidate-se ao programa Rentcars e gere o deeplink. Cole o modelo de link e o ID em *Parceiros*.

## Ônibus

Nenhum programa de afiliados público encontrado (ClickBus). Requer contato comercial. Módulo marcado como pendente no planejador.

## Duffel (fase futura)

Para confirmar preço em tempo real e, no futuro, emitir. Cobra por pedido emitido e por busca acima da proporção de 1.500 buscas por pedido. Antes de contratar, verifique a cobertura de GOL, Azul e LATAM.

## Como adicionar um fornecedor novo

1. Crie `src/adapters/<fornecedor>.ts` implementando `FlightAdapter` (`status()` e `search()`).
2. Registre em `src/adapters/index.ts`.
3. Nenhuma outra parte muda: coleta, pontuação, verificação e posts já usam o contrato.
