#!/usr/bin/env bash
# Descobre o modelo exato e qual tipo de GSI serve no aparelho. NÃO altera nada.
# Uso: bash scripts/01-diagnostico.sh  (com o celular ligado e Depuração USB ativa)
source "$(dirname "$0")/../../comum/lib.sh"
esperar_adb
SAIDA="./diagnostico-$(date +%Y%m%d-%H%M).txt"
{
echo "=== DIAGNÓSTICO MOTO ==="
for p in ro.product.model ro.product.device ro.product.name ro.build.version.release \
         ro.build.fingerprint ro.product.cpu.abi ro.product.cpu.abilist ro.treble.enabled \
         ro.vndk.version ro.vndk.lite ro.build.system_root_image ro.boot.slot_suffix \
         ro.boot.dynamic_partitions ro.carrier ro.boot.hardware.sku sys.oem_unlock_allowed; do
  printf '%-32s = %s\n' "$p" "$(prop "$p")"
done
echo "RAM total: $(adb shell grep MemTotal /proc/meminfo | tr -d '\r')"
echo "Tamanho da partição system (bytes):"
adb shell 'ls -l /dev/block/by-name/ 2>/dev/null | grep -i system; cat /proc/partitions' | tr -d '\r' | head -40
} | tee "$SAIDA"

echo
passo "INTERPRETAÇÃO"
TREBLE=$(prop ro.treble.enabled); ABI=$(prop ro.product.cpu.abi)
SAR=$(prop ro.build.system_root_image); SLOT=$(prop ro.boot.slot_suffix)
DYN=$(prop ro.boot.dynamic_partitions); VNDKLITE=$(prop ro.vndk.lite)

[[ "$TREBLE" == "true" ]] && ok "Project Treble: SIM (aceita GSI)" || erro "Treble NÃO detectado — GSI provavelmente não funciona."

case "$ABI" in
  arm64-v8a) ok "Arquitetura: arm64 → baixe imagens 'arm64'";;
  armeabi-v7a) aviso "Arquitetura: 32 bits (arm) → baixe imagens 'arm32_binder64' ou 'a64'";;
  *) aviso "Arquitetura: $ABI";;
esac

if [[ -n "$SLOT" ]]; then ok "Tipo: A/B (slot $SLOT) → imagem 'bvN'/'ab'";
elif [[ "$SAR" == "true" ]]; then ok "Tipo: A-only system-as-root → imagens 'AB' atuais costumam funcionar";
else aviso "Tipo: A-only antigo (não system-as-root) → só GSIs antigas 'aonly' (Android 11 ou anterior). Ver README, etapa 4."; fi

[[ "$DYN" == "true" ]] && aviso "Partições dinâmicas: flash do system deve ser feito em 'fastbootd' (fastboot reboot fastboot)." \
                        || ok "Sem partições dinâmicas: flash direto no bootloader."
[[ "$VNDKLITE" == "true" ]] && aviso "VNDK lite: use variante 'vndklite' da GSI."
ok "Relatório salvo em $SAIDA — me envie este arquivo se quiser confirmação antes de prosseguir."
