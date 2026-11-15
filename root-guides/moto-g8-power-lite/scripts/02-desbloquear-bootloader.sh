#!/usr/bin/env bash
# Desbloqueio OFICIAL do bootloader Motorola. APAGA TUDO NO CELULAR.
# Pré-requisitos: backup feito (comum/backup.sh), "Desbloqueio de OEM" ativado nas
# Opções do desenvolvedor, conta criada no site de desbloqueio da Motorola.
source "$(dirname "$0")/../../comum/lib.sh"
precisa adb; precisa fastboot

confirmar "Isto vai APAGAR TODOS OS DADOS do celular e anular a garantia. Fez backup?"

if adb get-state >/dev/null 2>&1; then
  passo "Reiniciando no bootloader"; adb reboot bootloader
fi
esperar_fastboot

passo "Obtendo o código de desbloqueio"
fastboot oem get_unlock_data 2>&1 | tee unlock_data.txt
echo
aviso "Junte as linhas acima numa ÚNICA linha, SEM o prefixo '(bootloader)' e sem espaços."
aviso "Cole no site oficial da Motorola (link em DOWNLOADS.md) → você receberá a CHAVE por e-mail."
JUNTO=$(grep -o '(bootloader) .*' unlock_data.txt | sed 's/(bootloader) //' | grep -v -i 'unlock data' | tr -d ' \r\n' || true)
echo "Sugestão já concatenada: $JUNTO"
echo
read -r -p "Cole aqui a CHAVE recebida por e-mail: " CHAVE
[[ -n "$CHAVE" ]] || { erro "Chave vazia."; exit 1; }

passo "Desbloqueando (confirme na tela do celular com volume + power se pedir)"
fastboot oem unlock "$CHAVE" || true
aviso "Se o celular pedir, rode novamente: fastboot oem unlock $CHAVE"
read -r -p "Pressione ENTER após confirmar no celular..."
fastboot getvar unlocked 2>&1 | grep -i unlocked
fastboot getvar securestate 2>&1 | grep -i securestate || true
ok "Se aparecer 'unlocked: yes' (ou 'flashing_unlocked'), está pronto para a etapa 3."
