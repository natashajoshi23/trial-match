#!/bin/sh
set -e
sed "s|\${NGINX_BACKEND_HOST}|${NGINX_BACKEND_HOST}|g" /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
