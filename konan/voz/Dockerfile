FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    KONAN_DADOS=/data HF_HOME=/data/modelos/hf

RUN apt-get update \
 && apt-get install -y --no-install-recommends libportaudio2 alsa-utils curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# PERFIL=completo (PC de casa: tudo local) | leve (VPS: cérebro/ouvido por API, voz do navegador)
ARG PERFIL=completo
COPY requirements*.txt ./
RUN if [ "$PERFIL" = "leve" ]; then pip install -r requirements-leve.txt; else pip install -r requirements.txt; fi

COPY konan ./konan
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME ["/data"]
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10m CMD curl -fs http://localhost:8090/saude || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "-m", "konan"]
