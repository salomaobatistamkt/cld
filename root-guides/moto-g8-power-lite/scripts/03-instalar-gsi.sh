#!/usr/bin/env bash
# Instala uma GSI (Android genérico leve) no Moto via fastboot.
# Uso: bash scripts/03-instalar-gsi.sh <gsi.img> <vbmeta.img-do-firmware-original>
#  - gsi.img: imagem DESCOMPACTADA (.img, não .xz/.zip)
#  - vbmeta.img: tirado do firmware original do SEU modelo (ver DOWNLOADS.md)
source "$(dirname "$0")/../../comum/lib.sh"
GSI="${1:?Informe o arquivo gsi.img}"; VBMETA="${2:?Informe o vbmeta.img do firmware original}"
[[ -f "$GSI" && -f "$VBMETA" ]] || { erro "Arquivo não encontrado."; exit 1; }
case "$GSI" in *.xz|*.zip|*.7z) erro "Descompacte a GSI antes (precisa ser .img)."; exit 1;; esac
precisa fastboot

confirmar "Vai substituir o sistema e APAGAR os dados. Bootloader já desbloqueado e firmware original guardado?"
adb get-state >/dev/null 2>&1 && adb reboot bootloader || true
esperar_fastboot

fastboot getvar unlocked 2>&1 | grep -qi 'yes' || { erro "Bootloader ainda bloqueado. Rode a etapa 2."; exit 1; }

passo "1/4 Desativando verificação (vbmeta)"
fastboot --disable-verity --disable-verification flash vbmeta "$VBMETA"

if fastboot getvar super-partition-name 2>&1 | grep -q super; then
  passo "Partições dinâmicas detectadas → entrando em fastbootd"
  fastboot reboot fastboot; sleep 8; esperar_fastboot
fi

passo "2/4 Apagando system antigo"
fastboot erase system
passo "3/4 Gravando GSI (pode levar alguns minutos)"
fastboot flash system "$GSI"
passo "4/4 Limpando dados (obrigatório na troca de sistema)"
fastboot -w
ok "Concluído. Reiniciando..."
fastboot reboot
aviso "O primeiro boot pode levar até 10 minutos. Se ficar em loop > 15 min, veja README → 'Se der errado'."
