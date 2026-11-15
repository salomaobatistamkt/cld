#!/usr/bin/env bash
# Instala todos os .apk de uma pasta no celular (ex.: Aurora Store, F-Droid, Magisk).
# Uso: bash comum/instalar-apks.sh <pasta-com-apks>
source "$(dirname "$0")/lib.sh"
PASTA="${1:?Informe a pasta}"
esperar_adb
shopt -s nullglob
for apk in "$PASTA"/*.apk; do
  passo "Instalando $(basename "$apk")"
  adb install -r "$apk" && ok "Instalado" || aviso "Falhou: $apk"
done
