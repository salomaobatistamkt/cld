#!/usr/bin/env bash
# Root com Magisk no LineageOS (OPCIONAL).
# Uso: bash scripts/04-root-magisk.sh <Magisk-vXX.apk>
source "$(dirname "$0")/../../comum/lib.sh"
APK="${1:?Informe o Magisk APK}"
precisa adb
cp "$APK" ./magisk-sideload.zip
cat <<'TXT'
Reinicie no LineageOS Recovery (celular ligado: adb reboot recovery)
→ 'Apply Update' → 'Apply from ADB'. Se pedir confirmação de assinatura, escolha 'Yes'.
TXT
adb reboot recovery || true
read -r -p "ENTER quando estiver aguardando o pacote..."
adb sideload ./magisk-sideload.zip
ok "Reinicie e instale/abra o app Magisk (bash ../comum/instalar-apks.sh com o APK). Ele finaliza a instalação."
