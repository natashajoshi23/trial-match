#!/bin/sh
set -e
echo "=== BACKEND_URL is: '$BACKEND_URL' ==="
echo "=== All env vars containing BACKEND: ==="
printenv | grep -i backend || echo "(none found)"
echo "=== Rendered nginx config: ==="
sed "s|\${BACKEND_URL}|${BACKEND_URL}|g" /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf
cat /etc/nginx/conf.d/default.conf
echo "=== Starting nginx ==="
exec nginx -g 'daemon off;'
