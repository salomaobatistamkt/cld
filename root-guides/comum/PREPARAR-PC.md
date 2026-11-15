# Preparar o computador (faça uma vez só)

## 1. Android Platform Tools (adb + fastboot)
- Baixe em: https://developer.android.com/tools/releases/platform-tools
- Extraia numa pasta fácil, ex.: `C:\platform-tools` (Windows) ou `~/platform-tools` (Linux/Mac).
- Adicione a pasta ao PATH. Teste com: `adb version` e `fastboot --version`.

## 2. Rodar os scripts `.sh`
- **Linux/Mac:** abra o terminal na pasta e rode `bash scripts/01-diagnostico.sh`.
- **Windows:** instale o **Git for Windows** (https://git-scm.com) e use o **Git Bash**
  para rodar os scripts. Os comandos `adb`/`fastboot` funcionam normalmente nele.

## 3. Drivers USB (só Windows)
- **Motorola:** Motorola Device Manager / drivers USB da Motorola (site de suporte da Motorola).
- **Samsung:** Samsung USB Driver for Mobile Phones (site de desenvolvedores da Samsung).

## 4. Ferramentas específicas
- **Samsung:** Odin (Windows) **ou** Heimdall (Linux/Mac/Windows) — ver `samsung-s20-fe/DOWNLOADS.md`.
- **Motorola:** Lenovo Rescue and Smart Assistant (LMSA/"Software Fix") para restaurar o
  sistema original se algo der errado.

## 5. Ativar a Depuração USB no celular
1. Configurações → Sobre o telefone → toque 7 vezes em **Número da versão**.
2. Configurações → Sistema → **Opções do desenvolvedor** → ative **Depuração USB**.
3. Conecte o cabo e aceite o aviso "Permitir depuração USB" na tela.

> Use um cabo USB **original/de dados** e uma porta USB direta no PC (sem hub).
> Deixe a bateria acima de 60% antes de qualquer etapa.
