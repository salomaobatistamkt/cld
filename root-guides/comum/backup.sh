#!/usr/bin/env bash
# Backup do que dá para salvar SEM root: fotos, vídeos, downloads, documentos, músicas,
# lista de apps instalados e informações do aparelho.
# Uso: bash comum/backup.sh  (o backup vai para ./backups/<modelo>-<data>/)
source "$(dirname "$0")/lib.sh"
esperar_adb

MODELO=$(prop ro.product.model | tr ' ' '_')
DESTINO="./backups/${MODELO}-$(date +%Y%m%d-%H%M)"
mkdir -p "$DESTINO"

passo "Salvando informações do aparelho"
adb shell getprop > "$DESTINO/getprop.txt"
adb shell pm list packages -3 | sed 's/package://' | sort > "$DESTINO/apps-instalados-por-voce.txt"
adb shell pm list packages     | sed 's/package://' | sort > "$DESTINO/todos-os-pacotes.txt"
ok "Lista de apps em $DESTINO/apps-instalados-por-voce.txt"

for pasta in DCIM Pictures Movies Download Documents Music WhatsApp Android/media/com.whatsapp; do
  if adb shell "[ -d /sdcard/$pasta ]" 2>/dev/null; then
    passo "Copiando /sdcard/$pasta (pode demorar)"
    adb pull "/sdcard/$pasta" "$DESTINO/" || aviso "Falha parcial em $pasta"
  fi
done

ok "Backup concluído em: $DESTINO"
aviso "Contatos/agenda: confirme que estão sincronizados na conta Google (ou exporte .vcf no app Contatos)."
aviso "WhatsApp: faça backup das conversas pelo próprio app ANTES de desbloquear o bootloader."
