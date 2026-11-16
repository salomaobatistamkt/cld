#!/bin/sh
# Configura o áudio do container (ALSA puro, sem PulseAudio nem interface gráfica).
# Saída e entrada podem ser placas diferentes, ex.: caixa no P2 do PC (placa 0) + microfone USB (placa 1).
# O "plug" converte taxa/canais automaticamente.
set -e
if [ "${KONAN_MODO:-local}" = "web" ]; then
  echo "[konan] modo web: microfone e som pelo navegador."
  exec "$@"
fi
SAIDA="${ALSA_CARD_SAIDA:-${ALSA_CARD:-0}}"
ENTRADA="${ALSA_CARD_ENTRADA:-${ALSA_CARD:-0}}"
cat > /etc/asound.conf <<EOF
pcm.konan_duplex {
  type asym
  playback.pcm "hw:${SAIDA}"
  capture.pcm "hw:${ENTRADA}"
}
pcm.!default { type plug slave.pcm "konan_duplex" }
ctl.!default { type hw card ${SAIDA} }
EOF
echo "[konan] áudio: saída na placa ${SAIDA}, microfone na placa ${ENTRADA}."
echo "[konan] placas de saída:";  aplay -l 2>/dev/null   | grep '^card' || echo "  nenhuma! /dev/snd foi passado ao container?"
echo "[konan] placas de entrada:"; arecord -l 2>/dev/null | grep '^card' || echo "  nenhuma! o microfone está conectado?"
exec "$@"
