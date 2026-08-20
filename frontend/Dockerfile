# ---- Stage 1: build --------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx vite build         # outputs to /app/dist (skips tsc, Vite transpiles TS)

# ---- Stage 2: serve --------------------------------------------------------
FROM nginx:1.27-alpine

# Copy our config as default.conf.template — nginx's template system runs
# envsubst and writes it to /etc/nginx/conf.d/default.conf, overwriting the
# default server block. No manual rm needed.
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
