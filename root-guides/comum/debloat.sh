#!/usr/bin/env bash
# Remove apps de fábrica para o USUÁRIO atual (sem root, reversível).
# Uso: bash comum/debloat.sh <arquivo-lista.txt> [--aplicar]
# Sem --aplicar ele só MOSTRA o que seria removido (modo simulação).
source "$(dirname "$0")/lib.sh"
LISTA="${1:?Informe o arquivo de lista}"; MODO="${2:-simular}"
esperar_adb

INSTALADOS=$(adb shell pm list packages | sed 's/package://' | tr -d '\r')
LOG="./debloat-removidos-$(date +%Y%m%d-%H%M).txt"

grep -vE '^\s*(#|$)' "$LISTA" | while read -r pkg _; do
  if grep -qx "$pkg" <<<"$INSTALADOS"; then
    if [[ "$MODO" == "--aplicar" ]]; then
      if adb shell pm uninstall --user 0 "$pkg" | grep -q Success; then
        ok "Removido: $pkg"; echo "$pkg" >> "$LOG"
      else
        aviso "Não removido: $pkg"
      fi
    else
      echo "  [simulação] removeria: $pkg"
    fi
  fi
done

if [[ "$MODO" != "--aplicar" ]]; then
  aviso "Nada foi alterado. Revise a lista acima e rode de novo com --aplicar."
else
  ok "Pronto. Lista do que foi removido: $LOG (use comum/restaurar-debloat.sh para desfazer)."
  aviso "Reinicie o celular: adb reboot"
fi
