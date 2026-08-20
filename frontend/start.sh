#!/bin/sh
set -e
# Replace ${BACKEND_URL} in template, leaving nginx's own $variables untouched
sed "s|\${BACKEND_URL}|${BACKEND_URL}|g" /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
