"""Konan: assistente de voz local. Execute com `python -m konan`."""
import logging
import os
import random
import signal
import threading
import time

from . import config
from .audio import Microfone
from .cerebro import Cerebro, esperar_cerebro
from .conversa import Conversa
from .interface import Painel
from .memoria import Memoria
from .ouvido import Ouvido
from .voz import Voz

logging.basicConfig(level=os.environ.get("LOG", "INFO"), format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("konan")

SAUDACOES = ["Oi! Tô aqui.", "Oi, pode falar.", "Fala, tô ouvindo.", "Oi! Em que posso ajudar?"]


def main():
    parar = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: parar.set())

    painel = Painel()
    if config.INTERFACE_ATIVA:
        painel.servir(config.INTERFACE_PORTA)

    memoria = Memoria(os.path.join(config.DADOS, "memoria.sqlite3"))
    conversa = Conversa(memoria)
    cerebro = Cerebro()
    esperar_cerebro(cerebro, log.info)
    ouvido = Ouvido()
    mic = Microfone()
    voz = Voz(ao_comecar=lambda: (mic.silenciar(True), painel.publicar("falando")),
              ao_terminar=lambda: (mic.silenciar(False), painel.publicar("dormindo")))

    def dizer(texto: str):
        painel.publicar("falando", texto, config.NOME)
        voz.falar(texto)
        voz.esperar()
        conversa.acordar()

    mic.iniciar()
    painel.publicar("dormindo")
    log.info("%s pronta. Diga \"%s\" para chamar. Memória: %d trocas.", config.NOME, config.NOME, memoria.total())

    for audio in mic.falas(parar):
        texto = ouvido.transcrever(audio)
        if not texto:
            continue
        decisao = conversa.decidir(texto)
        log.info("ouvi: %r -> %s", texto, decisao.tipo)
        if decisao.tipo == "ignorar":
            continue
        painel.publicar("ouvindo", texto, "você")

        if decisao.tipo == "saudar":
            dizer(random.choice(SAUDACOES))
        elif decisao.tipo == "interface":
            if not config.INTERFACE_ATIVA:
                dizer("Minha interface está desligada nas configurações.")
            else:
                url = config.INTERFACE_URL or f"o IP deste computador, porta {config.INTERFACE_PORTA}"
                dizer(f"Minha interface fica em {url.replace('http://', '')}. É só abrir no navegador.")
        elif decisao.tipo == "confirmar_esquecer":
            dizer("Tem certeza que quer que eu apague toda a minha memória? Diga sim para confirmar.")
        elif decisao.tipo == "esquecido":
            dizer("Pronto, apaguei tudo. Começando do zero.")
        else:
            painel.publicar("pensando", decisao.pedido, "você")
            inicio, partes = time.time(), []
            try:
                for frase in cerebro.responder(decisao.mensagens, ao_calcular=lambda e, r: log.info("calcular(%s) = %s", e, r)):
                    partes.append(frase)
                    painel.publicar("falando", " ".join(partes), config.NOME)
                    voz.falar(frase)
            except Exception:  # noqa: BLE001
                log.exception("erro no cérebro")
                partes = []
                voz.falar("Desculpa, meu cérebro não respondeu agora. Tenta de novo daqui a pouco.")
            voz.esperar()
            resposta = " ".join(partes)
            if resposta:
                memoria.guardar(decisao.pedido, resposta)
            log.info("respondi em %.1fs: %s", time.time() - inicio, resposta)
            conversa.acordar()


if __name__ == "__main__":
    main()
