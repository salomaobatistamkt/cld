#!/usr/bin/env bash
# Uso (na VPS, como root):  bash instalar.sh SEU_DOMINIO_OU_IP
set -e
DOM="${1:?informe o dominio ou IP}"
apt-get update -y && apt-get install -y nginx
mkdir -p /var/www/dueto-cacau
cp -r site/* /var/www/dueto-cacau/
sed "s/SEU_DOMINIO_OU_IP/$DOM/" nginx.conf > /etc/nginx/sites-available/dueto-cacau
ln -sf /etc/nginx/sites-available/dueto-cacau /etc/nginx/sites-enabled/dueto-cacau
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Pronto: http://$DOM"
echo "Para HTTPS: apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d $DOM"
