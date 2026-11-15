#!/usr/bin/env bash
# Reinstala apps removidos pelo debloat.
# Uso: bash comum/restaurar-debloat.sh <debloat-removidos-XXXX.txt | lista.txt>
source "$(dirname "$0")/lib.sh"
LISTA="${1:?Informe o arquivo}"
esperar_adb
grep -vE '^\s*(#|$)' "$LISTA" | while read -r pkg _; do
  adb shell cmd package install-existing "$pkg" >/dev/null 2>&1 && ok "Restaurado: $pkg" || aviso "Ignorado: $pkg"
done
