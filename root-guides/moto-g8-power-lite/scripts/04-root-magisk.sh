#!/usr/bin/env bash
# Root com Magisk (OPCIONAL). Grava um boot.img já corrigido pelo app Magisk.
# Passo manual antes: copie o boot.img do firmware original para o celular, abra o app
# Magisk → Instalar → "Selecionar e corrigir um arquivo" → escolha o boot.img.
# Uso: bash scripts/04-root-magisk.sh   (o script puxa o arquivo corrigido do celular)
source "$(dirname "$0")/../../comum/lib.sh"
esperar_adb
ARQ=$(adb shell 'ls -t /sdcard/Download/magisk_patched*.img 2>/dev/null | head -1' | tr -d '\r')
[[ -n "$ARQ" ]] || { erro "Não achei magisk_patched*.img em /sdcard/Download. Faça o passo manual."; exit 1; }
adb pull "$ARQ" ./magisk_patched.img
confirmar "Gravar ./magisk_patched.img na partição boot?"
adb reboot bootloader; esperar_fastboot
fastboot flash boot ./magisk_patched.img
fastboot reboot
ok "Abra o app Magisk após ligar: deve mostrar 'Instalado: <versão>'."
