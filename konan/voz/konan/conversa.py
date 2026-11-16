"""Lógica da conversa (sem áudio): decide se a Konan deve responder e monta o contexto."""
import re
import time
from dataclasses import dataclass, field

from . import config, despertar
from .cerebro import montar_sistema
from .memoria import Memoria

_ABRIR_INTERFACE = re.compile(r"\b(abr\w*|mostr\w*|cad[eê]|qual)\b.*\b(interface|painel|tela)\b", re.I)
_ESQUECER = re.compile(r"\b(esque[cç]\w*|apag\w*|limp\w*)\b.*\b(tudo|mem[oó]ria)\b", re.I)
_SIM = re.compile(r"^\s*(sim|pode|confirmo|isso|tenho)\b", re.I)


@dataclass
class Decisao:
    tipo: str  # "ignorar" | "saudar" | "interface" | "confirmar_esquecer" | "esquecido" | "conversar"
    pedido: str = ""
    mensagens: list = field(default_factory=list)


class Conversa:
    def __init__(self, memoria: Memoria):
        self.memoria = memoria
        self.acordada_ate = 0.0
        self.sessao_inicio = 0.0
        self.ultima_interacao = 0.0
        self._confirmando_esquecer = False

    def acordar(self, agora: float | None = None):
        self.acordada_ate = (agora or time.time()) + config.JANELA_CONTINUACAO_S

    def decidir(self, texto: str, agora: float | None = None) -> Decisao:
        agora = agora or time.time()
        chamou, resto = despertar.detectar(texto)
        acordada = agora <= self.acordada_ate
        if not chamou and not acordada:
            return Decisao("ignorar")
        pedido = (resto if chamou else texto).strip()

        if agora - self.ultima_interacao > config.SESSAO_EXPIRA_S:
            self.sessao_inicio = agora
        self.ultima_interacao = agora

        if self._confirmando_esquecer:
            self._confirmando_esquecer = False
            if _SIM.match(pedido):
                self.memoria.esquecer_tudo()
                return Decisao("esquecido", pedido)
        if not pedido:
            return Decisao("saudar")
        if _ABRIR_INTERFACE.search(pedido):
            return Decisao("interface", pedido)
        if _ESQUECER.search(pedido):
            self._confirmando_esquecer = True
            return Decisao("confirmar_esquecer", pedido)

        memorias = self.memoria.lembrar(pedido, antes_de=self.sessao_inicio, limite=config.MEMORIAS_CONTEXTO)
        mensagens = [{"role": "system", "content": montar_sistema(memorias)}]
        for usuario, konan in self.memoria.recentes(self.sessao_inicio, config.TURNOS_CONTEXTO):
            mensagens += [{"role": "user", "content": usuario}, {"role": "assistant", "content": konan}]
        mensagens.append({"role": "user", "content": pedido})
        return Decisao("conversar", pedido, mensagens)
