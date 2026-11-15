#!/usr/bin/env bash
# Identifica a versão exata do S20 FE (Exynos x Snapdragon) e o estado do aparelho. NÃO altera nada.
source "$(dirname "$0")/../../comum/lib.sh"
esperar_adb
SAIDA="./diagnostico-$(date +%Y%m%d-%H%M).txt"
{
echo "=== DIAGNÓSTICO SAMSUNG ==="
for p in ro.product.model ro.product.device ro.product.board ro.boot.hardware ro.build.version.release \
         ro.build.PDA ro.bootloader ro.csc.sales_code ro.boot.warranty_bit ro.boot.flash.locked \
         ro.boot.verifiedbootstate sys.oem_unlock_allowed ro.product.cpu.abi; do
  printf '%-30s = %s\n' "$p" "$(prop "$p")"
done
echo "RAM total: $(adb shell grep MemTotal /proc/meminfo | tr -d '\r')"
} | tee "$SAIDA"

passo "INTERPRETAÇÃO"
M=$(prop ro.product.model)
case "$M" in
  SM-G780F*) ok "$M = Exynos 990 (4G). Codinome LineageOS: r8s";;
  SM-G780G*) ok "$M = Snapdragon 865 (4G). Codinome LineageOS: r8q";;
  SM-G781*)  ok "$M = Snapdragon 865 (5G). Codinome LineageOS: r8q";;
  SM-G781U*|SM-G781V*|SM-G781W*) aviso "$M = modelo americano de operadora: bootloader normalmente NÃO desbloqueia.";;
  *) aviso "Modelo $M não reconhecido como S20 FE. Pare e confira.";;
esac
[[ "$(prop sys.oem_unlock_allowed)" == "1" ]] && ok "Desbloqueio de OEM permitido." \
  || aviso "Desbloqueio de OEM ainda não liberado (ver README, etapa 4: KG/'Prenormal')."
A=$(prop ro.build.version.release)
[[ "$A" -ge 13 ]] 2>/dev/null && ok "Android $A: firmware base atualizado." \
  || aviso "Android $A: atualize o firmware oficial para o Android 13 mais recente ANTES do LineageOS."
ok "Relatório: $SAIDA"
