# ---- Stage 1: build --------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build          # outputs to /app/dist

# ---- Stage 2: serve --------------------------------------------------------
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/templates/app.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# nginx official image auto-runs envsubst on /etc/nginx/templates/*.template
# then writes the result to /etc/nginx/conf.d/ before starting nginx
CMD ["nginx", "-g", "daemon off;"]
