# Como colocar o Konext Gestão na VPS (Coolify)

O sistema roda num único container leve: usa cerca de **20 MB de memória** depois de ligado.
Os dados ficam num banco SQLite dentro de um volume. Uma cópia de segurança automática é feita por dia, e o sistema guarda as últimas 14.

Nada aqui mexe no DeskCRM, no n8n, na Evolution API nem no próprio Coolify.

---

## Antes de começar

1. **Escolha o endereço.** Sugestão: `gestao.kntbr.com`. Pode ser outro, só não use `crm`.
2. **Crie o registro DNS** no mesmo lugar onde está o `crm.kntbr.com`, e do mesmo jeito:
   - Tipo **A**, nome `gestao`, apontando para o IP da VPS.
   - Se você usa Cloudflare, deixe a nuvem igual à do `crm`.
3. **Escolha a senha de acesso** (mínimo de 8 caracteres). É ela que você vai digitar para entrar no sistema.
4. **Salve uma cópia dos dados do protótipo**, se quiser aproveitá-los: no protótipo, vá em **Configurações → Seus dados → Baixar cópia de segurança**.

---

## Passo a passo no Coolify

1. Abra o Coolify e entre no projeto onde estão os outros serviços (ou crie um novo).
2. Clique em **+ New → Resource**.
3. Escolha **Private Repository (with GitHub App)**.
   - Se o Coolify ainda não tiver acesso ao repositório `salomaobatistamkt/cld`, autorize o GitHub App do Coolify nele.
4. Preencha:

   | Campo | Valor |
   |---|---|
   | Repository | `salomaobatistamkt/cld` |
   | Branch | `claude/happy-wozniak-42e0ty` |
   | Build Pack | **Docker Compose** |
   | Base Directory | `/konext-gestao` |
   | Docker Compose Location | `/docker-compose.yml` |

5. Clique em **Continue** e espere o Coolify ler o arquivo.
6. No serviço **konext-gestao**, no campo **Domains**, coloque o endereço **com a porta 3000 no final**:

   ```
   https://gestao.kntbr.com:3000
   ```

   O `:3000` diz ao Coolify em que porta o sistema responde. O endereço que você usa no navegador continua sendo `https://gestao.kntbr.com`.
7. Vá em **Environment Variables** e defina:

   | Variável | Valor |
   |---|---|
   | `KONEXT_SENHA` | a senha que você escolheu |
   | `KONEXT_SEGREDO` | deixe vazio (o sistema cria e guarda sozinho) |

8. Clique em **Deploy**.
   - A primeira montagem leva de 2 a 5 minutos.
   - No log, o final certo é: `Konext Gestão no ar na porta 3000`.
9. Abra `https://gestao.kntbr.com`, digite a senha e pronto.

> O volume `konext-dados` é criado sozinho pelo arquivo do Docker Compose. Os dados ficam guardados mesmo quando você atualiza ou reinicia o sistema.

---

## Depois de entrar

1. **Trazer os dados do protótipo:** vá em **Configurações → Seus dados → Restaurar cópia** e escolha o arquivo que você baixou antes.
2. **Conectar o Meta Ads:**
   1. No Gerenciador de Negócios da Meta, vá em **Configurações do negócio → Usuários do sistema**.
   2. Crie um usuário (ou use um que já existe) e dê a ele acesso às contas de anúncios dos clientes.
   3. Clique em **Gerar token**, escolha o app e marque a permissão **`ads_read`**.
   4. No Konext, vá em **Configurações → Integrações**, cole o token e clique em **Salvar e testar**.
   5. Em cada cliente, clique em **Editar** e preencha **Conta de anúncios do Meta** (`act_…`).

O token fica cifrado no servidor e nunca volta para a tela. Ele é enviado à Meta no cabeçalho da requisição, nunca no endereço, igual ao DeskCRM.

### Webhooks (lembrete de cobrança no WhatsApp pelo n8n)

Em **Configurações → Webhooks**, o Konext avisa outro sistema quando algo acontece. Funciona do mesmo jeito que no DeskCRM:
- `POST` em JSON no formato `{event, occurred_at, data}`;
- assinatura HMAC-SHA256 do corpo no cabeçalho `X-Konext-Signature`;
- até 3 tentativas.

Eventos disponíveis:

| Evento | Quando dispara |
|---|---|
| `cobranca.gerada` | Uma cobrança é gerada no Caixa. |
| `cobranca.vencendo` | Faltam 3 dias para o vencimento. |
| `cobranca.vence_hoje` | A cobrança vence hoje. |
| `cobranca.vencida` | Venceu e não foi paga. |
| `cobranca.recebida` | A cobrança é marcada como recebida. |
| `cliente.criado` | Um cliente novo é cadastrado. |
| `cliente.status_alterado` | O status de um cliente muda. |
| `entrega.status_alterado` | Uma entrega muda de etapa. |
| `entrega.entregue` | Uma entrega é concluída. |

Os três avisos de vencimento saem uma única vez por cobrança, sempre entre 8h e 20h (horário de Brasília).

Exemplo com n8n + Evolution API:
1. No n8n, crie um fluxo com um nó **Webhook** (POST) e copie a *Production URL*.
2. No Konext, clique em **Novo webhook**, cole a URL e marque **Cobrança vence em 3 dias** e **Cobrança venceu**. Clique em **Enviar teste**.
3. No n8n, envie a mensagem pela Evolution API usando os campos `data.cliente.contato.whatsapp`, `data.cobranca.valor` e `data.cobranca.vencimento`.

---

## Atualizar o sistema

Quando houver uma versão nova no GitHub, abra o recurso no Coolify e clique em **Redeploy**. Os dados não são apagados.

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Log com `Defina a variável KONEXT_SENHA` | Preencha `KONEXT_SENHA` em Environment Variables (mínimo 8 caracteres) e faça Deploy de novo. |
| `Bad Gateway` / `no available server` | Confira se o domínio termina com `:3000` (passo 6). |
| Cadeado/certificado não aparece | O DNS ainda está propagando. Espere alguns minutos e confira se o registro aponta para o IP da VPS. |
| Montagem para no meio com `Killed` ou `heap out of memory` | A VPS ficou sem memória durante a montagem, que precisa de cerca de 1,5 GB por uns 30 segundos. Veja quanto está livre com `free -h` e tente de novo num horário mais calmo. |
| “Muitas tentativas” na tela de senha | Depois de 10 senhas erradas, o acesso daquele IP fica bloqueado por 15 minutos. |
| Mensagem do Meta sobre token ou permissão | Gere um token novo com `ads_read` e confira se o usuário do sistema tem acesso à conta de anúncios do cliente. |

### Cópias de segurança

- **Automáticas:** uma por dia, dentro do volume, na pasta `/data/copias` (as últimas 14).
- **Manual:** em **Configurações → Seus dados → Baixar cópia de segurança** (um arquivo `.json`). Vale baixar de vez em quando e guardar fora da VPS.

---

## Para quem for mexer no código

```bash
npm install
npm run dev                # protótipo no navegador (dados de exemplo)
npm run build              # confere os tipos e monta o site em dist/
KONEXT_SENHA=uma-senha-boa npm start   # servidor em http://localhost:3000
```

| Variável | Para que serve |
|---|---|
| `KONEXT_SENHA` | Senha de acesso (obrigatória). |
| `KONEXT_SEGREDO` | Assina a sessão e cifra o token do Meta. Se ficar vazia, é criada em `/data/segredo.txt`. |
| `KONEXT_DADOS` | Pasta do banco (padrão `/data` no container). |
| `PORT` | Porta (padrão 3000). |
