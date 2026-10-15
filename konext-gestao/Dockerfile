# Konext Gestão — imagem única: monta o site e roda o servidor (Node 24, sem dependências extras).

# 1) Monta o site (React + Excalidraw)
FROM node:24-alpine AS build
WORKDIR /app
# Limita a memória do build para não sufocar a VPS.
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# O tipo do código já é conferido antes de cada envio; aqui só monta (usa menos memória).
RUN npm run build:servidor && test -f dist/index.html && test -d dist/fonts/Nunito

# 2) Imagem final, pequena: só o site pronto e o servidor
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    KONEXT_DADOS=/data \
    KONEXT_SITE=/app/dist
COPY --from=build /app/dist ./dist
COPY server ./server
RUN mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "--max-old-space-size=256", "server/servidor.mjs"]
