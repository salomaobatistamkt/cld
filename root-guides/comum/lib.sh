#!/usr/bin/env bash
# Funções compartilhadas pelos scripts. Não execute diretamente.
set -euo pipefail

VERDE='\033[0;32m'; AMARELO='\033[1;33m'; VERMELHO='\033[0;31m'; NC='\033[0m'
ok()    { echo -e "${VERDE}[OK]${NC} $*"; }
aviso() { echo -e "${AMARELO}[ATENÇÃO]${NC} $*"; }
erro()  { echo -e "${VERMELHO}[ERRO]${NC} $*" >&2; }
passo() { echo; echo -e "${VERDE}==>${NC} $*"; }

confirmar() {
  # confirmar "mensagem" -> exige digitar SIM
  echo -e "${AMARELO}$1${NC}"
  read -r -p "Digite SIM (maiúsculo) para continuar: " r
  [[ "$r" == "SIM" ]] || { erro "Cancelado pelo usuário."; exit 1; }
}

precisa() {
  command -v "$1" >/dev/null 2>&1 || {
    erro "'$1' não encontrado. Instale o Android Platform Tools (ver comum/PREPARAR-PC.md) e coloque no PATH."
    exit 1
  }
}

esperar_adb() {
  precisa adb
  passo "Aguardando o telefone via ADB (aceite a 'Depuração USB' na tela do celular)..."
  adb wait-for-device
  ok "Conectado: $(adb shell getprop ro.product.model | tr -d '\r')"
}

esperar_fastboot() {
  precisa fastboot
  passo "Aguardando o telefone em modo fastboot..."
  until fastboot devices | grep -q .; do sleep 2; done
  ok "Fastboot detectado: $(fastboot devices | head -1)"
}

prop() { adb shell getprop "$1" | tr -d '\r'; }
