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

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
