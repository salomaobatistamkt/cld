#!/usr/bin/env bash
# Volta ao sistema ORIGINAL da Motorola a partir do firmware oficial extraído.
# Caminho mais fácil: use o LMSA ("Software Fix") da Lenovo no Windows.
# Este script é a alternativa manual. Uso: bash scripts/05-restaurar-original.sh <pasta-do-firmware>
source "$(dirname "$0")/../../comum/lib.sh"
FW="${1:?Informe a pasta do firmware extraído}"
XML="$FW/flashfile.xml"; [[ -f "$XML" ]] || XML="$FW/servicefile.xml"
[[ -f "$XML" ]] || { erro "flashfile.xml/servicefile.xml não encontrado em $FW"; exit 1; }
precisa fastboot
confirmar "Restaurar o firmware original? APAGA TUDO."
esperar_fastboot
cd "$FW"
# Converte cada <step operation="..."> do XML em comando fastboot
grep -o '<step [^>]*>' "$(basename "$XML")" | while read -r linha; do
  op=$(sed -n 's/.*operation="\([^"]*\)".*/\1/p' <<<"$linha")
  part=$(sed -n 's/.*partition="\([^"]*\)".*/\1/p' <<<"$linha")
  arq=$(sed -n 's/.*filename="\([^"]*\)".*/\1/p' <<<"$linha")
  var=$(sed -n 's/.*var="\([^"]*\)".*/\1/p' <<<"$linha")
  case "$op" in
    flash)  echo "fastboot flash $part $arq"; fastboot flash "$part" "$arq";;
    erase)  [[ "$part" == "userdata" || "$part" == "modemst1" || "$part" == "modemst2" ]] && { echo "fastboot erase $part"; fastboot erase "$part"; };;
    getvar) fastboot getvar "$var" || true;;
    oem)    fastboot oem "$var" || true;;
  esac
done
fastboot reboot
ok "Firmware original restaurado."
