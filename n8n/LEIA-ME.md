# Automações Meta Ads — Konext (n8n)

6 workflows padronizados. Todos usam a **mesma base de clientes**, as **mesmas credenciais** e a **mesma regra de envio de WhatsApp**.

| Arquivo | Quando roda | O que faz |
|---|---|---|
| `00 - Preparar Planilhas (rodar 1x).json` | Rodar 1x agora (+ confere todo dia 05:45) | Cria colunas e abas que faltam, renomeia VORK → KONEXT |
| `01 - Pausar Campanhas…json` | Sábado 12:00 / Segunda 07:30 | Pausa tudo no sábado, reativa na segunda, avisa cada cliente |
| `02 - Sincronizar Base de Clientes.json` | Todo dia 06:00 (+ manual) | Preenche Página, Instagram e Públicos na Planilha Geral |
| `03 - Monitor de Custo por Resultado (CPR).json` | **A cada 30 min, das 06h às 23h30** | Estourou o teto → pausa na hora e avisa |
| `04 - Verificacao de Saldo Meta Ads.json` | Todo dia 09:00 | Avisa saldo baixo (Pix/Boleto) ou cobrança próxima (cartão) |
| `05 - Relatorio de Performance….json` | **Terça e sexta 07:30** | Relatório de performance para cada cliente |

## Padrão único

- **Evolution API:** credencial `Salomão Konext`, instância `Salomão - Konext IA` em **todos** os nós de WhatsApp. O nó do CPR que ainda usava `n8n Baileys` / `Evolution KNTX]` foi corrigido.
- **Google Sheets:** `Google Sheets account 2` · **Facebook:** `Facebook Graph account` · Graph API `v26.0` em todos.
- **Fuso:** `America/Sao_Paulo` fixado nos 4 fluxos.
- **Gestor (alertas e resumos):** `5584994104701`, no nó **Config** de cada fluxo. O CPR usava `558496449636`. Se quiser receber em outro número, troque só esse campo.

## Planilhas e papel de cada uma

| Planilha | ID | Uso |
|---|---|---|
| **Planilha-Geral-Konext** (aba `Clientes`) | `1IywT4jszZAVuBCBk3p_8DgsUeffoTCkkiBojdQOybZk` | **Base mestra**. Todos os fluxos leem daqui: Status = Ativo, ID da Conta, Contato, Reativar na Segunda, Monitorar Custo, Valor Base |
| Grupos de WhatsApp (1ª aba) | `1AR75HoQXFCE7ancGQTLjekHP2eCDt1_-GjuaVgP0iKc` | Lista dos IDs de grupo (`…@g.us`) |
| Planilha_Pausa_Campanhas (aba `CLIENTES` + aba `Campanhas Pausadas`) | `1w0y2bu6_gA3Ye-u0GYYZT56voGixcD1InqKiB5dhzwY` | Painel da pausa (status por cliente) + log de cada campanha pausada |
| SALDO - CLIENTES Konext | `1dDmkDK--VRx-ei2rwRVr1jxwlT5pGI2Wz0bpdiAwxXc` | Valor Base, Método de Pagamento, Saldo na Conta, Ativo (do saldo) |

## Para onde vai o WhatsApp do cliente

Para cada cliente, nesta ordem:
1. Coluna **ID do Grupo** na Planilha Geral, se você criar essa coluna (opcional; serve para forçar um grupo).
2. **Grupo encontrado na planilha de grupos** pelo nome ou apelido do cliente. Ex.: "Thalita Dourado" → *Assessoria Sistema de Vendas - Dra. Thalita*; "Thamiris" → *Assessoria Comercial - Thamiris*. O grupo só é escolhido quando **um único** grupo combina. Se der ambíguo, preencha o **Apelido** na Planilha Geral.
3. **Contato do cliente** da Planilha Geral. Aceita número (`5584999999999`) ou um ID de grupo (`120363…@g.us`).

Quer priorizar o contato pessoal em vez do grupo? Coloque `preferir_grupo = false` no nó Config. Se o cliente não tiver nenhum destino, o gestor recebe um alerta dizendo que ele não foi avisado. O fluxo não para.

## O que estava quebrado e foi corrigido

### Pausar / Reativar (o principal)
- **A reativação nunca funcionava.** Sábado gravava o log na aba `Campanhas Pausadas` da planilha de saldo, e essa aba não existe. Segunda lia o log de outra planilha (Pausa) **sem aba selecionada**, o nó dava erro e o fluxo parava.
  - Agora o log fica na aba `Campanhas Pausadas` da **Planilha_Pausa_Campanhas**. O fluxo tenta criar a aba sozinho.
  - Além disso, cada campanha pausada fica **guardada na memória do fluxo**. Mesmo que a planilha falhe, a segunda reativa.
  - A segunda só reativa o que foi pausado **nos últimos 7 dias** e respeita **Reativar na Segunda = Não**.
  - Se não houver nada a reativar, você recebe um aviso. Nunca mais termina em silêncio.
- Os clientes saíam da planilha de saldo (só a Dômma estava com `Ativo = Sim`). Agora saem da **Planilha Geral** (Status = Ativo).
- O ID de grupo virava só números e o envio falhava. Agora grupos funcionam.
- A aba `CLIENTES` da Planilha_Pausa é preenchida a cada execução (Status da Pausa, quantidade, Aviso Sábado/Segunda, Última Execução, destino usado). `Ativo = Não` nessa aba tira o cliente da pausa.
- O gestor recebe um **resumo final** no sábado e na segunda.

### Monitor de CPR
- O nó da planilha estava **sem aba selecionada**. Agora lê a Planilha Geral.
- Rodava **1x por dia às 6h**, e o prejuízo corria até o dia seguinte. Agora roda **a cada 30 min, das 06h às 23h30**: estourou o teto, pausa na mesma rodada.
- O aviso agora vai **para o cliente** (grupo ou contato) **e uma cópia para o gestor**.
- Se você **reativar manualmente** uma campanha que o monitor pausou, ele não pausa de novo por 24h (`ignorar_apos_reativacao_horas`).
- Falha repetida ao pausar não lota o WhatsApp: o alerta repete no máximo a cada `reaviso_horas`.
- `modo_teste = true` simula tudo e só manda para o gestor.

### Saldo
- Clientes vêm da Planilha Geral, cruzados com a planilha de saldo pela conta. Continua valendo `Ativo = Não` na planilha de saldo para desligar o aviso.
- **Pré-pago:** antes só funcionava com limite de gastos. Agora usa o **saldo disponível informado pela Meta** e, na falta dele, o limite de gastos.
- O tipo da conta segue a coluna **Método de Pagamento** (Pix/Boleto = pré-pago, Cartão = cartão). Se estiver vazia, vale o que a Meta informar.
- O nó *Wait* não tinha unidade (podia esperar **horas** entre clientes). Agora são 2 segundos. A mesma correção foi feita em todos os fluxos.

### Sincronizar Base
- O horário da "Última sincronização" saía em UTC (3h adiantado). Agora sai no horário de Brasília.
- Passou a registrar erro de leitura do Instagram. Graph API v26.

## Passo a passo para colocar no ar

> **Planilhas já preparadas (17/10/2026):** a coluna `Link do Relatório` (Planilha Geral › Clientes, coluna O), a aba `Parâmetros`, as abas `Campanhas Pausadas` e `Pausas CPR` (Planilha_Pausa) e o nome da aba de grupos (KONEXT) já foram criados direto nas planilhas. O fluxo **00** fica só como reserva, caso alguém apague algo.

1. No n8n, **importe** os 4 arquivos. Você pode abrir o fluxo antigo e usar *Import from File* para substituir, ou criar novos e **desativar os antigos** para não rodar em dobro.
2. Abra cada fluxo e confirme que as credenciais aparecem selecionadas (`Salomão Konext`, `Google Sheets account 2`, `Facebook Graph account`).
3. A aba `Campanhas Pausadas` é criada pelo fluxo **00**, com os cabeçalhos:
   `Data | Cliente | ID da Conta | ID Campanha | Nome Campanha | Status | Reativada em | Erro`
4. A aba de grupos é renomeada para `IDS GRUPOS - CLIENTES KONEXT` pelo fluxo **00**.
5. **Ative** os 4 fluxos. A memória da reativação só funciona com o fluxo **ativo**, não em execução manual.
6. Teste: no fluxo 01, clique no gatilho "Sábado às 12:00" e em *Execute step*. Confira a aba `Campanhas Pausadas` e o WhatsApp. Depois execute o gatilho "Segunda às 07:30".

## 05 — Relatório de Performance (terça e sexta, 07:30)

### De onde vem cada número
| Linha da mensagem | Origem na Meta (mesmo período escrito na mensagem) |
|---|---|
| Investimento, Alcance, Impressões | Totais **da conta** (nível conta). O alcance não é somado por campanha, porque somar duplicaria pessoas; é o número exato do Gerenciador |
| Mensagens | ação `messaging_conversation_started_7d`, a mesma do Monitor de CPR |
| Visitas ao perfil | ação `instagram_profile_visit` / `profile_visit`, a mesma do Monitor de CPR |
| Público % | alcance por gênero (mulheres x homens, sem "desconhecido") |
| Investimento da campanha | gasto da campanha |
| **Custo por resultado da campanha** | **média do custo por resultado dos conjuntos que tiveram resultado.** Ex.: conjuntos de R$ 6,00 e R$ 3,00 mais um conjunto sem resultado → R$ 4,50. O conjunto sem resultado conta só no investimento |
| Campanhas pausadas | registro do Monitor de CPR (aba `Pausas CPR`) com o motivo, mais os criativos pausados no período, com o link de cada criativo |
| Escalada 🚀 | aumento de orçamento registrado no histórico da conta durante o período |
| Melhoramos / Ajustar | automático, pelas regras de avaliação abaixo (cada alerta vem com a justificativa). Também lê as colunas opcionais `Relatório - Melhorias` e `Relatório - Ajustes`, que você pode preencher |
| Saldo atual | Meta em tempo real; tipo (Pix/Boleto/Cartão) pela coluna Método de Pagamento da planilha de saldo |

Todas as consultas usam `use_unified_attribution_setting=true`, a mesma atribuição do Gerenciador de Anúncios.

### Regras de avaliação (CTR, custo por resultado, volume, frequência)
| Indicador | Faixas padrão |
|---|---|
| **CTR** (de link ou de saída, conforme o objetivo; a mensagem sempre diz qual) | > 10% excelente, com indicação para avaliar a qualidade do tráfego · 5–10% excelente · 3–5% bom · 2–3% atenção · < 2% alerta de baixo desempenho |
| **Custo por resultado** | até R$ 5,00 ótimo · R$ 5,00–10,00 bom · acima de R$ 10,00 ponto de atenção |
| **Impressões** | > 1.000 volume positivo · até 1.000 volume ainda limitado |
| **Alcance** | > 1.000 boa distribuição · até 1.000 distribuição limitada ou em fase inicial |
| **Frequência** | < 1,0 verificar os dados · 1,0–1,5 distribuição inicial · 1,5–2,0 boa exposição inicial · > 2,0 exposição repetida |

Como as regras são aplicadas:
- **Só classifica com dados suficientes.** CTR e frequência são classificados acima de 1.000 impressões; custo por resultado, a partir de 3 resultados. Abaixo disso a campanha aparece como *"Em fase inicial"*, nunca como ruim.
- **CTR automático pelo objetivo:** tráfego e vendas usam **CTR de saída**; mensagens, visitas e engajamento usam **CTR de link**.
- **Frequência alta não é boa nem ruim por si só.** Só vira alerta quando vem junto com queda do CTR ou alta do custo (≥ 15%) em relação ao período anterior.
- Toda classificação e todo alerta mostram a faixa usada (ex.: *"CTR de link de 1,70%: alerta de baixo desempenho, abaixo de 2%"*).
- **Melhores performances** = custo ótimo/bom **e** nenhum alerta. O fluxo **nunca recomenda aumentar orçamento**; ele só informa quando o orçamento foi de fato aumentado.
- Toda mensagem traz o aviso de que resultado barato não é, necessariamente, venda lucrativa (texto editável em `aviso_resultado`). Não há dados comerciais integrados hoje. Quando houver (vendas, qualidade dos leads, faturamento), dá para incluir.

### Alterar os parâmetros sem mexer em código
- **Padrão geral:** campos do nó **Config (Rel)** (`cpr_otimo_ate`, `cpr_bom_ate`, `ctr_*`, `impressoes_min`, `alcance_min`, `freq_*`, `resultados_min_classificar`, `variacao_relevante_pct`, `aviso_resultado`).
- **Por cliente, procedimento, objetivo ou tipo de resultado:** use a aba **`Parâmetros`** da Planilha Geral (criada pelo fluxo **00**), com estes cabeçalhos:

  `Cliente | Procedimento | Objetivo | Tipo de resultado | CPR ótimo até | CPR bom até | CTR muito alto acima de | CTR excelente a partir de | CTR bom a partir de | CTR atenção a partir de | Tipo de CTR | Impressões mínimas | Alcance mínimo | Frequência inicial até | Frequência boa até | Resultados mínimos | Gasto mínimo sem resultado | Ativo`

  - Colunas de escopo vazias valem para todos. **Procedimento** = palavra do nome da campanha (ex.: *Botox*). **Objetivo** = Engajamento, Tráfego, Leads, Vendas, Reconhecimento. **Tipo de resultado** = Mensagens, Visitas, Cliques, Cadastros, Engajamento. **Tipo de CTR** = Link, Saída ou Auto.
  - Preencha só os limites que quer mudar; o resto herda o padrão. Se duas linhas servirem, vence a mais específica (Cliente > Procedimento > Objetivo > Tipo de resultado).
  - Exemplos:

    | Cliente | Procedimento | Objetivo | Tipo de resultado | CPR ótimo até | CPR bom até |
    |---|---|---|---|---|---|
    | | | | Visitas | 0,30 | 0,60 |
    | Thalita Dourado | Botox | | | 4,00 | |

  - Sugestão: crie a linha de **Visitas**. Com o padrão de R$ 5/R$ 10, qualquer custo por visita sai como "ótimo". Os valores acima são só exemplo; use os seus.

### Proteções para nunca mandar número em conflito
- Se a Meta falhar em qualquer dado essencial (totais, campanhas, conjuntos), **o cliente não recebe**. Você recebe o erro.
- Se a soma do investimento das campanhas não bater com o total da conta, **o envio é bloqueado** e você recebe a prévia.
- O período sai escrito na mensagem (ex.: *16/10 a 19/10*). Basta abrir o relatório da Konext Gestão nas **mesmas datas**.

### Período (nó `Config (Rel)`)
- `desde_ultimo_relatorio` (padrão): a terça cobre **sexta → terça** e a sexta cobre **terça → sexta**, até hoje (`incluir_hoje = true`, igual à Konext Gestão). Com `incluir_hoje = false`, vai só até ontem.
- `ultimos_dias` + `periodo_dias = 5`: últimos 5 dias (contando hoje, se `incluir_hoje = true`).

### Para ativar
1. Rode o fluxo **00**. Ele cria na **Planilha Geral › Clientes**, no fim da linha 1, a coluna **`Link do Relatório`** (e também `Enviar Relatório`, `Relatório - Melhorias`, `Relatório - Ajustes`). Depois, cole o link do relatório de cada cliente na linha dele.
2. A aba **`Pausas CPR`** da Planilha_Pausa_Campanhas também é criada pelo **00**. O Monitor de CPR (03) foi atualizado para gravar nela cada pausa; **reimporte o 03**.
3. Importe o 05. Ele vem com **`modo_teste = true`**: todos os relatórios vão só para você. Rode pelo gatilho *Executar manualmente*, compare com a Konext Gestão nas mesmas datas e, estando tudo igual, mude `modo_teste` para `false` e ative.

## Pontos que dependem de você (vistos nas planilhas)

- **Thalita Dourado tem duas contas diferentes:** `203838872643867` na Planilha Geral e `1693416644465249` na Planilha_Pausa. A Planilha Geral é a que vale. Confirme que é a conta certa.
- **Thamiris (`977702063279068`):** a sincronização mostra "Erro ao ler Páginas (sem acesso à conta?)". O token do Facebook não tem acesso a essa conta, então pausa, CPR e saldo também vão falhar para ela, e o gestor será avisado. Dê acesso no Gerenciador de Negócios.
- **Dômma** está com Contato `5584996449636`, o mesmo número que aparece como contato de todos na planilha de saldo. Se esse for o seu número, e não o do cliente, corrija o contato ou crie a coluna **ID do Grupo**.
- **Andressa Barbosa** não tem grupo nem contato: ela não recebe aviso (o gestor é alertado).
