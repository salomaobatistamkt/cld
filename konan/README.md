# Konan

Assistente de voz que roda **inteira no seu PC**: sem nuvem, sem mensalidade. Você diz **"Konan"**, **"Ei, Konan"** ou **"Olá, Konan, tudo bem?"** e ela responde falando, como a Alexa.

- Conversa natural em português do Brasil, com voz feminina
- Lembra das conversas anteriores
- Faz matemática exata: álgebra, funções, trigonometria, geometria, cálculo e matemática da computação (bases, bits, mod, mdc). Ela confere as contas com um motor simbólico (SymPy) e não "chuta" resultado
- Interface opcional estilo Jarvis no navegador: `http://IP-DO-PC:8090`

## Como funciona

```
você fala ─► microfone ─► detector de fala (VAD) ─► Whisper (texto) ─► começou com "Konan"?
                                                                         │ sim
             alto-falante ◄── Kokoro (voz) ◄── frase a frase ◄── Qwen 4B (cérebro) ◄── memória (SQLite)
                                                                         │
                                                              SymPy (contas exatas)
```

Dois containers:

| Container | O que faz | RAM aprox. |
|---|---|---|
| `cerebro` | llama.cpp com Qwen3 4B (Q4) no processador | ~2,4 GB |
| `voz` | escuta, transcreve, conversa, lembra, fala e serve a interface | ~0,5 GB |

Depois que ela responde, você tem **8 segundos** para continuar falando sem repetir o nome.

## Requisitos

- PC com 4 núcleos e 8 GB de RAM (testado para um i5-6500 com 8 GB, sem placa de vídeo)
- Ubuntu Server 24.04
- Caixa de som USB com microfone
- ~10 GB livres em disco

Na primeira vez que sobe, ela baixa os modelos (~3 GB). Depois funciona sem internet.

---

## Passo a passo

### 1. Instalar o Ubuntu Server no PC

1. Baixe o **Ubuntu Server 24.04 LTS** em ubuntu.com/download/server.
2. Grave num pendrive com o **balenaEtcher** ou o **Rufus**.
3. Dê boot pelo pendrive e instale. Marque **"Install OpenSSH server"** e não marque nenhum snap extra.
4. Conecte a caixa de som USB.

### 2. Preparar o servidor (Docker, Tailscale, zram)

```bash
git clone https://github.com/SEU_USUARIO/konan.git
cd konan
sudo bash scripts/preparar-servidor.sh
sudo tailscale up
```
Anote o número da placa da caixa de som (por exemplo, `card 1: ...` quer dizer `ALSA_CARD=1`). Depois saia e entre de novo na sessão.

Na **VPS**, instale o Tailscale também e entre na mesma conta:
```bash
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up
```

### 3. Coolify: adicionar o PC como servidor

1. No Coolify (VPS): **Servers → + Add**.
2. **IP:** o IP do Tailscale do PC. Ele aparece com `tailscale ip -4` e começa com `100.`.
3. **Usuário:** o seu usuário do Ubuntu. Use a chave SSH que o Coolify mostra e adicione-a no PC:
   ```bash
   echo "CHAVE_PUBLICA_DO_COOLIFY" >> ~/.ssh/authorized_keys
   ```
4. Clique em **Validate Server**. O Coolify confere o Docker do PC.

### 4. Coolify: fazer o deploy da Konan

1. **Projects → + New → Resource → Public/Private Repository** e escolha o repositório `konan`.
2. **Build Pack:** `Docker Compose`. **Arquivo:** `/docker-compose.yml`.
3. **Server:** o PC de casa (não a VPS!).
4. Em **Environment Variables**, cadastre pelo menos:
   - `ALSA_CARD` = número da sua caixa de som
   - `INTERFACE_URL` = `http://IP-DO-PC:8090`

   As outras opções estão em `.env.example`.
5. Clique em **Deploy**. A primeira vez demora (download de ~3 GB). Acompanhe pelos **Logs**.

Quando aparecer `Konan pronta. Diga "Konan" para chamar.`, é só falar.

> **Se o Coolify não passar o áudio** (algumas versões ignoram `devices:` do compose), rode direto no PC:
> ```bash
> cd ~/konan && cp .env.example .env && nano .env   # ajuste ALSA_CARD
> docker compose up -d --build
> docker compose logs -f voz
> ```

---

## Ajustes

Todos são feitos por variável de ambiente (no Coolify ou no `.env`):

| Quero… | Variável |
|---|---|
| Mais leve e rápida (menos esperta) | `MODELO=unsloth/Qwen3-1.7B-GGUF:Q4_K_M` |
| Entender melhor o que eu falo | `WHISPER_MODELO=small` (mais pesado) |
| Falar mais rápido ou devagar | `VOZ_VELOCIDADE=1.15` / `0.9` |
| Voz masculina | `VOZ_MOTOR=piper` |
| Desligar a interface | `INTERFACE_ATIVA=0` |
| Mudar o nome | `KONAN_NOME=...` |

## Comandos de voz

- **"Konan"** → "Oi, pode falar."
- **"Konan, abre sua interface"** → ela diz o endereço da página
- **"Konan, apaga sua memória"** → ela pede confirmação; responda **"sim"**

## Problemas comuns

| Sintoma | Solução |
|---|---|
| Ela não ouve nada | `docker compose logs voz` mostra as placas encontradas; confira o `ALSA_CARD`. Teste com `arecord -D plughw:1 -d 3 t.wav && aplay t.wav` |
| Acorda sozinha com a TV | `VAD_AGRESSIVIDADE=3` |
| Corta você no meio da frase | `SILENCIO_FIM_MS=1000` |
| Muito lenta | use o modelo 1.7B e `WHISPER_MODELO=tiny` |
| Não acorda com o nome | fale "Ei, Konan" com uma pausa curta; veja nos logs como o Whisper escreveu e abra uma issue |

## Desenvolvimento

```bash
cd voz && pip install -r requirements.txt pytest && python -m pytest -q tests
```

## Próximas ideias (fase 2)

- Extensão do Chrome para reuniões: gravar o vídeo no HD e salvar as notas organizadas na nuvem
- Lembretes por voz
