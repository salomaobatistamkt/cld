#!/usr/bin/env bash
# Copia TUDO da VPS para o servidor de casa. Rodar NO SERVIDOR DE CASA.
# Na VPS é somente leitura: nada é parado, apagado ou alterado.
# Uso:  bash backup-vps.sh root@IP_DA_VPS
set -euo pipefail
VPS="${1:?uso: bash backup-vps.sh root@IP_DA_VPS}"
DEST="$HOME/backup-vps/$(date +%F_%H%M)"
mkdir -p "$DEST" && chmod 700 "$HOME/backup-vps" "$DEST"

# Uma conexão SSH só (pede a senha uma vez).
SSHOPT=(-o ControlMaster=auto -o ControlPath="$HOME/.ssh/cm-%r@%h" -o ControlPersist=15m)
mkdir -p "$HOME/.ssh"
r() { ssh "${SSHOPT[@]}" "$VPS" "$@"; }
r true

echo ">> versão do Coolify na VPS"
r "docker inspect coolify --format '{{.Config.Image}}'" | tee "$DEST/coolify-versao.txt"

echo ">> banco do Coolify (todas as configurações e variáveis dos apps)"
r "docker exec coolify-db pg_dump --format=custom --no-acl --no-owner --username coolify coolify" > "$DEST/coolify-db.dump"
r "tar czf - -C /data/coolify source/.env ssh" > "$DEST/coolify-chaves.tgz"

echo ">> CRM (deskcrm, fora do Coolify): pasta do compose com .env"
CRMDIR=$(r "docker inspect deskcrm-app-1 --format '{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}'")
echo "$CRMDIR" > "$DEST/deskcrm-pasta.txt"
r "tar czf - -C '$CRMDIR' ." > "$DEST/deskcrm-pasta.tgz"

echo ">> bancos Postgres (dump consistente)"
r "docker exec postgresql-cpvzreia0ldlmecgfdjhrjuy sh -c 'pg_dumpall -U \"\$POSTGRES_USER\"'" | gzip > "$DEST/n8n-postgres.sql.gz"
r "docker exec postgres-csa2r2mwq8k3yevvq6vq0cuc sh -c 'pg_dumpall -U \"\$POSTGRES_USER\"'" | gzip > "$DEST/evolution-postgres.sql.gz"

echo ">> volumes"
VOLS=(
  1rp081mosyajsy2awacey8xp-planer-financeiro-familiarmain-iyypue7qitn1o0rjtvz5lamp-data
  yqeuvzfbo5jritkagphndk5c_konext-dados
  34bcd36df52d13a48a546460fb2eecf2adf9622d3ffde943be3dd3dc6f192610
  6w8uo6wkyxzdlwosyunoowz5_dados
  6w8uo6wkyxzdlwosyunoowz5_modelos-cerebro
  deskcrm_waha-data
  deskcrm_waha-media
  9d12259727bdbd3568179c279396234a5da6b4d5c5df4745daebb3dd45430166
  cpvzreia0ldlmecgfdjhrjuy_n8n-data
  cpvzreia0ldlmecgfdjhrjuy_postgresql-data
  oc6fqfaeaawhl5ottgxq4bic_n8n-data
  csa2r2mwq8k3yevvq6vq0cuc_evolution-instances
  csa2r2mwq8k3yevvq6vq0cuc_evolution-redis
  csa2r2mwq8k3yevvq6vq0cuc_postgres-data
  redis-data-x30qhmqi6u164wbj5e7jj0hq
)
mkdir -p "$DEST/volumes"
for v in "${VOLS[@]}"; do
  printf '   %s ... ' "$v"
  r "docker run --rm -v '$v':/v:ro alpine tar czf - -C /v ." > "$DEST/volumes/$v.tgz"
  du -h "$DEST/volumes/$v.tgz" | cut -f1
done

ssh "${SSHOPT[@]}" -O exit "$VPS" 2>/dev/null || true
echo; echo "PRONTO: $DEST"; du -sh "$DEST"; ls -la "$DEST" "$DEST/volumes"
