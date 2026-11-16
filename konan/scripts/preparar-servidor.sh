#!/usr/bin/env bash
# Prepara um Ubuntu Server 24.04 recém-instalado para rodar a Konan.
# Uso: curl -fsSL <url-deste-arquivo> | sudo bash     (ou: sudo bash scripts/preparar-servidor.sh)
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Rode com sudo."; exit 1; fi
USUARIO="${SUDO_USER:-$USER}"

echo "==> Atualizando o sistema"
apt-get update -y && apt-get upgrade -y

echo "==> Removendo o que não precisa (snap) para economizar memória"
if command -v snap >/dev/null 2>&1; then
  systemctl disable --now snapd.service snapd.socket snapd.seeded.service 2>/dev/null || true
fi

echo "==> zram: memória comprimida no lugar de swap em disco"
apt-get install -y zram-tools alsa-utils curl git
cat > /etc/default/zramswap <<'EOF'
ALGO=zstd
PERCENT=50
PRIORITY=100
EOF
systemctl restart zramswap || true
sysctl -w vm.swappiness=150 >/dev/null
echo "vm.swappiness=150" > /etc/sysctl.d/99-konan.conf

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
usermod -aG docker,audio "$USUARIO"

echo "==> Tailscale (para o Coolify da VPS enxergar este PC)"
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

echo
echo "==> Saídas de som (anote o 'card' onde a caixa está ligada -> ALSA_CARD_SAIDA):"
aplay -l | grep '^card' || echo "nenhuma saída encontrada"
echo "==> Microfones (anote o 'card' do microfone USB -> ALSA_CARD_ENTRADA):"
arecord -l | grep '^card' || echo "nenhum microfone encontrado — ele está conectado?"
echo
echo "Pronto! Próximos passos:"
echo "  1) sudo tailscale up        (abra o link que aparecer e faça login)"
echo "  2) saia e entre de novo na sessão (para valer o grupo docker)"
echo "  3) siga o README a partir de 'Coolify'"
