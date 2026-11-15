#!/usr/bin/env bash
# Volta ao One UI original. A forma recomendada é o Odin (Windows), com o firmware oficial completo.
cat <<'TXT'
RESTAURAR O ORIGINAL (One UI):
1) Baixe o firmware completo do SEU modelo e região (ex.: SM-G780F, CSC ZTO = Brasil)
   com o Bifrost (ver DOWNLOADS.md). Extraia: vêm os arquivos BL_, AP_, CP_, CSC_ e HOME_CSC_.
2) Abra o Odin → coloque BL em BL, AP em AP, CP em CP, CSC em CSC
   (CSC = apaga tudo / HOME_CSC = mantém dados — após ROM custom use CSC).
3) Celular em modo Download (VOL+ e VOL− + cabo, depois VOL+) → Start.
4) Não rebloqueie o bootloader se tiver qualquer dúvida — rebloquear com software não-oficial trava o aparelho.
Linux/Mac: Heimdall não grava pacotes oficiais com facilidade; prefira um PC Windows com Odin.
TXT
