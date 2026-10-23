# Servidor Node com a API de dados (usado pelo Coolify)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 HOSTNAME=0.0.0.0 DATA_DIR=/data
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 80
CMD ["node", "server.js"]
