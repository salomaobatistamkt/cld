"""Núcleo da Konan: recebe o texto ouvido e devolve, frase por frase, o que ela deve falar.

Usado tanto no modo local (microfone do PC) quanto no modo web (microfone do navegador).
"""
import logging
import random
import time
from typing import Callable, Iterator

from . import config
from .cerebro import Cerebro
from .conversa import Conversa
from .memoria import Memoria

log = logging.getLogger("konan")

SAUDACOES = ["Oi! Tô aqui.", "Oi, pode falar.", "Fala, tô ouvindo.", "Oi! Em que posso ajudar?"]


class Konan:
    def __init__(self, memoria: Memoria, cerebro: Cerebro, publicar: Callable[..., None] = lambda *a, **k: None):
        self.memoria = memoria
        self.cerebro = cerebro
        self.conversa = Conversa(memoria)
        self.publicar = publicar

    def processar(self, texto: str, direto: bool = False) -> Iterator[str]:
        """Gera as frases da resposta. Não gera nada se a Konan não foi chamada."""
        decisao = self.conversa.decidir(texto, direto=direto)
        log.info("ouvi: %r -> %s", texto, decisao.tipo)
        if decisao.tipo == "ignorar":
            return
        self.publicar("ouvindo", texto, "você")

        if decisao.tipo == "saudar":
            yield random.choice(SAUDACOES)
        elif decisao.tipo == "interface":
            if config.MODO == "web":
                yield "Você já está nela! É essa página aberta aí."
            elif not config.INTERFACE_ATIVA:
                yield "Minha interface está desligada nas configurações."
            else:
                url = config.INTERFACE_URL or f"o IP deste computador, porta {config.INTERFACE_PORTA}"
                yield f"Minha interface fica em {url.replace('http://', '').replace('https://', '')}. É só abrir no navegador."
        elif decisao.tipo == "confirmar_esquecer":
            yield "Tem certeza que quer que eu apague toda a minha memória? Diga sim para confirmar."
        elif decisao.tipo == "esquecido":
            yield "Pronto, apaguei tudo. Começando do zero."
        else:
            self.publicar("pensando", decisao.pedido, "você")
            inicio, partes = time.time(), []
            try:
                for frase in self.cerebro.responder(
                    decisao.mensagens, ao_calcular=lambda e, r: log.info("calcular(%s) = %s", e, r)
                ):
                    partes.append(frase)
                    self.publicar("falando", " ".join(partes), config.NOME)
                    yield frase
            except Exception:  # noqa: BLE001
                log.exception("erro no cérebro")
                partes = []
                yield "Desculpa, meu cérebro não respondeu agora. Tenta de novo daqui a pouco."
            resposta = " ".join(partes)
            if resposta:
                self.memoria.guardar(decisao.pedido, resposta)
            log.info("respondi em %.1fs: %s", time.time() - inicio, resposta)
        self.conversa.acordar()
