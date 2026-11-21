#!/usr/bin/env bash
# Inventário do Coolify da VPS — SOMENTE LEITURA.
# Não altera nada e não mostra valores de variáveis (só os NOMES).
# Uso na VPS:  sudo bash inventario-vps.sh > inventario.txt
set -u

echo "##### APPS NO COOLIFY (repo, branch, build, domínio, porta)"
docker exec coolify-db psql -U coolify -d coolify -At -F ' | ' -c \
  "select name, git_repository, git_branch, build_pack, base_directory, docker_compose_location, fqdn, ports_exposes, status from applications order by name;" 2>/dev/null \
  || echo "(não consegui ler o banco do Coolify)"

echo; echo "##### SERVIÇOS (compose / one-click)"
docker exec coolify-db psql -U coolify -d coolify -At -F ' | ' -c \
  "select name, docker_compose_raw is not null as tem_compose from services order by name;" 2>/dev/null || true

echo; echo "##### BANCOS GERENCIADOS PELO COOLIFY"
for t in standalone_postgresqls standalone_mysqls standalone_mariadbs standalone_mongodbs standalone_redis standalone_keydbs standalone_dragonflies standalone_clickhouses; do
  docker exec coolify-db psql -U coolify -d coolify -At -F ' | ' -c "select '$t', name, image, status from $t;" 2>/dev/null || true
done

echo; echo "##### CONTAINERS"
for c in $(docker ps -a --format '{{.Names}}' | sort); do
  case "$c" in coolify|coolify-db|coolify-redis|coolify-realtime|coolify-proxy|coolify-sentinel) continue;; esac
  echo "=== $c"
  docker inspect "$c" --format 'imagem: {{.Config.Image}}
status: {{.State.Status}}
portas: {{range $p,$b := .NetworkSettings.Ports}}{{$p}}{{if $b}}->{{(index $b 0).HostPort}}{{end}} {{end}}'
  echo "volumes:"
  docker inspect "$c" --format '{{range .Mounts}}  {{.Type}} {{if .Name}}{{.Name}}{{else}}{{.Source}}{{end}} -> {{.Destination}}{{"\n"}}{{end}}'
  echo "domínios / coolify:"
  docker inspect "$c" --format '{{range $k,$v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' \
    | grep -E '^coolify\.(name|resourceName|projectName|serviceName|type)=|^traefik\.http\.routers\..*\.rule=|^caddy_[0-9]*=' | sed 's/^/  /'
  echo "variáveis (só nomes):"
  docker inspect "$c" --format '{{range .Config.Env}}{{println .}}{{end}}' | cut -d= -f1 \
    | grep -vE '^(PATH|HOME|HOSTNAME|LANG|GPG_KEY|PYTHON_.*|NODE_VERSION|YARN_VERSION)$' | tr '\n' ' '; echo
done

echo; echo "##### TAMANHO DOS VOLUMES"
du -sh /var/lib/docker/volumes/* 2>/dev/null | sort -h | tail -40
echo; echo "##### DISCO E MEMÓRIA"
df -h / ; free -h
