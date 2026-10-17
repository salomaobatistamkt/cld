# Konext Gestão — imagem leve: o site já vem montado na pasta dist (feito antes de cada envio
# ao GitHub), então a VPS não precisa instalar dependências nem compilar nada no deploy.
# O servidor usa só módulos do próprio Node 24.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    KONEXT_DADOS=/data \
    KONEXT_SITE=/app/dist
COPY dist ./dist
COPY server ./server
RUN test -f dist/index.html && mkdir -p /data && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "--max-old-space-size=256", "server/servidor.mjs"]
