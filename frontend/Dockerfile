# ---- Stage 1: build --------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vite build         # outputs to /app/dist

# ---- Stage 2: serve --------------------------------------------------------
FROM nginx:1.27-alpine

# Copy nginx template and built app
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Substitute only BACKEND_URL, leaving nginx's own $host/$remote_addr etc intact
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
