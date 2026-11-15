#!/usr/bin/env bash
# Instala o recovery do LineageOS (via Heimdall) e depois o LineageOS por sideload.
# Uso: bash scripts/03-instalar-lineage.sh <pasta-com-arquivos>
# A pasta deve ter: recovery.img (obrigatório), lineage-*.zip (obrigatório) e, SE o wiki do seu
# codinome pedir, vbmeta.img e/ou dtbo.img. Opcional: MindTheGapps-*.zip.
# Quem usa Windows/Odin: veja README (etapa 5, alternativa Odin) — este script usa Heimdall.
source "$(dirname "$0")/../../comum/lib.sh"
P="${1:?Informe a pasta com os arquivos}"
precisa heimdall; precisa adb
[[ -f "$P/recovery.img" ]] || { erro "Falta $P/recovery.img"; exit 1; }
ZIP=$(ls "$P"/lineage-*.zip 2>/dev/null | head -1); [[ -n "$ZIP" ]] || { erro "Falta lineage-*.zip"; exit 1; }
GAPPS=$(ls "$P"/MindTheGapps-*.zip 2>/dev/null | head -1 || true)

confirmar "Bootloader desbloqueado e firmware oficial Android 13 mais recente instalado?"
echo "Coloque o celular em MODO DOWNLOAD: desligue, segure VOL+ e VOL− e conecte o cabo; depois aperte VOL+ (continuar)."
read -r -p "ENTER quando estiver na tela 'Downloading'..."
heimdall detect || { erro "Heimdall não encontrou o celular (driver/cabo)."; exit 1; }

ARGS=(flash --RECOVERY "$P/recovery.img")
[[ -f "$P/vbmeta.img" ]] && ARGS+=(--VBMETA "$P/vbmeta.img")
[[ -f "$P/dtbo.img"   ]] && ARGS+=(--DTBO "$P/dtbo.img")
ARGS+=(--no-reboot)
passo "Executando: heimdall ${ARGS[*]}"
heimdall "${ARGS[@]}"

cat <<'TXT'

MUITO IMPORTANTE (senão o sistema da Samsung apaga o recovery novo):
 - Desconecte o cabo. Segure VOL− + POWER até a tela apagar.
 - Assim que apagar, troque IMEDIATAMENTE para VOL+ + POWER (mantenha VOL+ com o cabo conectado ao PC
   se não entrar) até aparecer o "LineageOS Recovery".
TXT
read -r -p "ENTER quando estiver no LineageOS Recovery..."

echo "No recovery: 'Factory Reset' → 'Format data/factory reset' → confirme. Depois volte."
read -r -p "ENTER após formatar..."
echo "No recovery: 'Apply Update' → 'Apply from ADB'."
read -r -p "ENTER quando a tela disser para enviar o pacote..."
adb wait-for-sideload 2>/dev/null || true
adb sideload "$ZIP" || aviso "Se parou em ~47% com 'Total xfer 1.00x', é normal."

if [[ -n "$GAPPS" ]]; then
  echo "Para instalar o MindTheGapps: 'Apply Update' → 'Apply from ADB' de novo."
  echo "(Se perguntar sobre assinatura, escolha 'Yes'. Se pedir 'reboot to recovery', aceite e repita.)"
  read -r -p "ENTER quando estiver aguardando o pacote..."
  adb sideload "$GAPPS" || aviso "Verifique a mensagem na tela."
fi
ok "Escolha 'Reboot system now' no recovery. Primeiro boot: até 10 minutos."
