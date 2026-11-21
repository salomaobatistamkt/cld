#!/usr/bin/env bash
# Restaura no servidor de casa o backup feito por backup-vps.sh.
# NÃO sobe nenhum app: só coloca volumes, configurações do Coolify e a pasta do CRM no lugar.
# Uso:  sudo bash restaurar-casa.sh /home/servidor-batista/backup-vps/PASTA
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Rode com sudo."; exit 1; }
B="${1:?uso: sudo bash restaurar-casa.sh CAMINHO_DO_BACKUP}"
for f in coolify-versao.txt coolify-db.dump coolify-chaves.tgz deskcrm-pasta.txt deskcrm-pasta.tgz; do
  [ -s "$B/$f" ] || { echo "Falta $B/$f — o backup não terminou?"; exit 1; }
done
VPSV=$(cat "$B/coolify-versao.txt"); CASAV=$(docker inspect coolify --format '{{.Config.Image}}')
[ "${VPSV##*:}" = "${CASAV##*:}" ] || { echo "Versões diferentes: VPS $VPSV / casa $CASAV"; exit 1; }

echo ">> 1/5 guardando o Coolify de casa como estava (para desfazer, se precisar)"
SAFE=/root/coolify-casa-antes-$(date +%F_%H%M); mkdir -p "$SAFE"; chmod 700 "$SAFE"
docker exec coolify-db pg_dump --format=custom --no-acl --no-owner -U coolify coolify > "$SAFE/coolify-db.dump"
cp -a /data/coolify/source/.env "$SAFE/env"; cp -a /data/coolify/ssh "$SAFE/ssh"
echo "   salvo em $SAFE"

echo ">> 2/5 volumes (mesmos nomes da VPS, o Coolify reaproveita)"
for t in "$B"/volumes/*.tgz; do
  v=$(basename "$t" .tgz)
  if docker volume inspect "$v" >/dev/null 2>&1; then
    if [ -n "$(docker run --rm -v "$v":/v alpine ls -A /v)" ]; then echo "   já tem dados: $v (pulando)"; continue; fi
  else
    labels=()
    if [[ "$v" == *_* && "$v" != redis-data-* ]]; then
      labels=(--label "com.docker.compose.project=${v%%_*}" --label "com.docker.compose.volume=${v#*_}")
    fi
    docker volume create "${labels[@]}" "$v" >/dev/null
  fi
  docker run --rm -v "$v":/v -v "$B/volumes":/b:ro alpine tar xzpf "/b/$v.tgz" -C /v
  echo "   ok: $v"
done

echo ">> 3/5 banco do Coolify da VPS"
docker stop coolify coolify-realtime >/dev/null 2>&1 || true
docker exec -i coolify-db pg_restore --clean --if-exists --no-acl --no-owner -U coolify -d coolify < "$B/coolify-db.dump" \
  || echo "   (avisos do pg_restore são normais)"

echo ">> 4/5 chaves do Coolify"
TMP=$(mktemp -d); tar xzf "$B/coolify-chaves.tgz" -C "$TMP"
OLD=$(grep '^APP_KEY=' "$TMP/source/.env" | cut -d= -f2-)
sed -i '/^APP_PREVIOUS_KEYS=/d' /data/coolify/source/.env
echo "APP_PREVIOUS_KEYS=$OLD" >> /data/coolify/source/.env
rm -rf /data/coolify/ssh/keys && cp -a "$TMP/ssh/keys" /data/coolify/ssh/keys
mkdir -p /root/.ssh && touch /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
for k in /data/coolify/ssh/keys/*; do
  pub=$(ssh-keygen -y -f "$k" 2>/dev/null || true)
  [ -n "$pub" ] && ! grep -qF "$pub" /root/.ssh/authorized_keys && echo "$pub coolify-vps" >> /root/.ssh/authorized_keys
done
rm -rf "$TMP"
chown -R 9999:root /data/coolify && chmod -R 700 /data/coolify

echo ">> 5/5 pasta do CRM (não sobe)"
CRMDIR=$(cat "$B/deskcrm-pasta.txt"); mkdir -p "$CRMDIR"
tar xzpf "$B/deskcrm-pasta.tgz" -C "$CRMDIR"; chmod 600 "$CRMDIR/.env" 2>/dev/null || true
echo "   em $CRMDIR"

echo ">> reiniciando o Coolify com as chaves novas"
cd /data/coolify/source
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate --remove-orphans

echo; echo "PRONTO. Nenhum app foi iniciado."
echo "NÃO clique Deploy em: cloudflared, evolution-api, n8n, nem suba o CRM — espere o próximo passo."
