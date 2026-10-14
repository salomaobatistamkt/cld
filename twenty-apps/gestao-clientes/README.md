# Gestão de Clientes (app para o Twenty CRM)

App que transforma o Twenty num painel de **clientes, serviços contratados e entregas**, com **mapas mentais** para planejar o trabalho de cada cliente.

## O que ele adiciona

**Cliente (usa o objeto Empresa do Twenty)**: campos novos de status do cliente, segmento, contato principal, WhatsApp, e-mail, CNPJ/CPF, redes sociais e "cliente desde". Também ganha um briefing completo: público-alvo, tom de voz, cores e fontes da marca, concorrentes, objetivos e briefing livre. A página do cliente ganha quatro abas:
- **Mapa do cliente**: mapa mental gerado automaticamente com os serviços e suas entregas, o briefing, os acessos, as reuniões e os mapas de planejamento. Clique em um item com ↗ para abri-lo.
- **Serviços e entregas**
- **Briefing**
- **Acessos e reuniões**

**Novos objetos**

| Objeto | Para quê |
| --- | --- |
| Tipo de serviço | Catálogo editável. Já vem com *Marketing / Tráfego*, *Sites / Sistemas* e *Consultoria / Mentoria*. Para oferecer um serviço novo, basta criar um registro, sem mexer em código. |
| Serviço contratado | O contrato com o cliente: status, valor, setup, recorrência, forma de pagamento, dia de vencimento, início, renovação, link do contrato e escopo. |
| Entrega | O que será entregue: status (Backlog → Entregue), prioridade, prazo, responsável, link e descrição. Fica ligada ao cliente, ao serviço e ao tipo. |
| Acesso | Plataforma, categoria, link, login, onde está a senha e observações. **A senha em si não é guardada**: registre só o cofre onde ela está. |
| Reunião | Data, tipo, participantes, resumo, decisões, próximos passos e gravação. |
| Mapa mental | Editor visual. Detalhes abaixo. |

**Visões prontas**: Clientes (tabela e kanban por status), Quadro de entregas (kanban), Calendário de entregas, Entregas atrasadas, Serviços por status e Calendário de renovações.

**Painel**: clientes ativos, receita recorrente mensal, entregas em aberto, entregas atrasadas, entregues nos últimos 30 dias, distribuição por status, próximos prazos e renovações. Tudo fica numa pasta própria do menu lateral.

### Editor de mapa mental

- **+ Filho** e **+ Irmão** criam nós. O campo de texto edita o nó selecionado. **↑ ↓** reordenam, os pontos coloridos mudam a cor do ramo e **Excluir** remove o nó com tudo abaixo dele.
- O círculo ao lado de cada nó recolhe ou expande o ramo. Arraste o fundo para mover o mapa; use a roda do mouse ou os botões − / + para o zoom.
- **Modelos**: tráfego pago, site/sistema, consultoria/mentoria e onboarding. Num mapa vazio, o modelo vira o mapa. Num mapa com conteúdo, os ramos entram no nó selecionado.
- **→ Virar entregas**: cria uma Entrega para cada filho do nó selecionado, já ligada ao cliente do mapa. Cada nó passa a apontar para a entrega criada.
- O salvamento é automático.

## Instalar

Requisitos: Node 24 e Yarn 4 (`corepack enable`). Funciona em qualquer instância do Twenty: Twenty Cloud ou auto-hospedado (≥ 2.46).

> **Windows:** use uma pasta sem acentos ou espaços no caminho (ex.: `C:\dev\cld`).

```bash
cd twenty-apps/gestao-clientes
yarn install

# Twenty Cloud ou servidor próprio:
yarn twenty remote:add --url https://SEU-TWENTY

# ...ou um Twenty local com Docker (login: tim@apple.dev / tim@apple.dev):
yarn twenty docker:start
yarn twenty remote:add --local

yarn twenty apply   # instala/atualiza o app no workspace conectado
```

## Adaptar

- Opções de status, prioridade, categorias etc.: arquivos em `src/objects/` e `src/fields/cliente/`.
- Modelos de mapa mental: `src/constants/modelos-mapa.ts`.
- Tipos de serviço iniciais: `src/constants/tipos-de-servico-iniciais.ts`. Depois de instalado, você também pode editá-los direto no Twenty.
- Nunca altere os valores em `src/constants/universal-identifiers.ts` depois da primeira instalação.

Depois de mudar algo, rode `yarn twenty app typecheck && yarn lint && yarn test:unit` e então `yarn twenty app apply`.
