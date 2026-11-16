"""Konan: assistente de voz. Execute com `python -m konan`.

KONAN_MODO=local -> microfone e caixa de som ligados neste computador.
KONAN_MODO=web   -> microfone e som pelo navegador (celular/PC); ideal para VPS.
"""
import logging
import os
import signal
import sys
import threading

from . import config
from .cerebro import Cerebro, esperar_cerebro
from .interface import Painel
from .memoria import Memoria
from .nucleo import Konan
from .ouvido import Ouvido

logging.basicConfig(level=os.environ.get("LOG", "INFO"), format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("konan")


def main():
    parar = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: parar.set())

    if config.MODO == "web" and len(config.SENHA) < 8:
        sys.exit("No modo web a página fica na internet: defina KONAN_SENHA com pelo menos 8 caracteres.")

    painel = Painel()
    memoria = Memoria(os.path.join(config.DADOS, "memoria.sqlite3"))
    cerebro = Cerebro()
    konan = Konan(memoria, cerebro, painel.publicar)

    if config.MODO == "web":
        from .voz import Sintetizador

        ouvido = Ouvido()
        sintetizador = None if config.VOZ_MOTOR == "navegador" else Sintetizador()
        painel.servir(config.INTERFACE_PORTA, konan=konan, ouvido=ouvido, sintetizador=sintetizador)
        esperar_cerebro(cerebro, log.info)
        painel.publicar("dormindo")
        log.info("%s pronta no modo web, porta %d. Memória: %d trocas.", config.NOME, config.INTERFACE_PORTA, memoria.total())
        parar.wait()
        return

    from .audio import Microfone
    from .voz import Voz

    if config.INTERFACE_ATIVA:
        painel.servir(config.INTERFACE_PORTA)
    esperar_cerebro(cerebro, log.info)
    ouvido = Ouvido()
    mic = Microfone()
    voz = Voz(ao_comecar=lambda: (mic.silenciar(True), painel.publicar("falando")),
              ao_terminar=lambda: (mic.silenciar(False), painel.publicar("dormindo")))
    mic.iniciar()
    painel.publicar("dormindo")
    log.info("%s pronta. Diga \"%s\" para chamar. Memória: %d trocas.", config.NOME, config.NOME, memoria.total())

    for audio in mic.falas(parar):
        texto = ouvido.transcrever(audio)
        if not texto:
            continue
        falou = False
        for frase in konan.processar(texto):
            falou = True
            voz.falar(frase)
        if falou:
            voz.esperar()
            konan.conversa.acordar()  # a janela de continuação conta a partir do fim da fala


if __name__ == "__main__":
    main()
