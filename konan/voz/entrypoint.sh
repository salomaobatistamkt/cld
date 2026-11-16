#!/bin/sh
# Aponta o áudio "padrão" do container para a placa escolhida (ALSA_CARD),
# convertendo taxa/canais automaticamente (plug). Sem PulseAudio, sem interface gráfica.
set -e
CARD="${ALSA_CARD:-0}"
cat > /etc/asound.conf <<EOF
pcm.!default { type plug slave.pcm "hw:${CARD}" }
ctl.!default { type hw card ${CARD} }
EOF
echo "[konan] áudio: placa ALSA '${CARD}'. Placas encontradas:"
aplay -l 2>/dev/null | grep '^card' || echo "  nenhuma! confira se /dev/snd foi passado ao container"
exec "$@"
