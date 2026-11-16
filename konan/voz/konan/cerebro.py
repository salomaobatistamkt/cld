"""Conversa com o llama.cpp (API OpenAI) em streaming, frase por frase, com a ferramenta de matemática."""
import json
import re
import time
from datetime import datetime
from typing import Callable, Iterator

import httpx

from . import config, matematica

SISTEMA = """Você é {nome}, uma assistente de voz que mora no computador da casa do usuário.
Você conversa como uma pessoa: calorosa, direta, com humor leve. Fala português do Brasil.
Suas respostas serão FALADAS em voz alta, então:
- Responda curto: 1 a 3 frases, a não ser que peçam explicação.
- Nada de markdown, listas, emojis, tabelas ou código.
- Escreva números e fórmulas como se fala (ex.: "x ao quadrado", "raiz de dois", "três vírgula catorze").
Para QUALQUER conta ou problema de matemática use a ferramenta calcular e confie no resultado dela; nunca invente números.
Se não souber algo, diga que não sabe. Hoje é {hoje}.
{memorias}"""

_DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
_FIM_FRASE = re.compile(r"(.+?[.!?…:;])(\s+|$)", re.S)


def montar_sistema(memorias: list[tuple[float, str, str]]) -> str:
    agora = datetime.now()
    hoje = f"{_DIAS[agora.weekday()]}, {agora:%d/%m/%Y}, {agora:%H:%M}"
    bloco = ""
    if memorias:
        linhas = [f'- em {datetime.fromtimestamp(q):%d/%m}: usuário disse "{u}" e você respondeu "{k}"' for q, u, k in memorias]
        bloco = "Lembranças de conversas antigas que podem ser úteis:\n" + "\n".join(linhas)
    return SISTEMA.format(nome=config.NOME, hoje=hoje, memorias=bloco)


_SIMBOLOS = [
    (r"\*\*|__|`+|#+\s*", ""), (r"\$+", ""), (r"\\\(|\\\)|\\\[|\\\]", ""),
    (r"√", " raiz de "), (r"π", " pi "), (r"≈", " aproximadamente "), (r"≠", " diferente de "),
    (r"≤", " menor ou igual a "), (r"≥", " maior ou igual a "), (r"×", " vezes "), (r"÷", " dividido por "),
    (r"²", " ao quadrado"), (r"³", " ao cubo"), (r"°", " graus"), (r"(?<=\d)\s*%", " por cento"),
    (r"(?<=\w)\^(\d+)", r" elevado a \1"), (r"^\s*[-*•]\s+", ""),
]


def para_fala(texto: str) -> str:
    """Limpa o texto para soar bem na voz."""
    texto = re.sub(r"<think>.*?</think>", "", texto, flags=re.S)
    for padrao, troca in _SIMBOLOS:
        texto = re.sub(padrao, troca, texto, flags=re.M)
    return re.sub(r"\s{2,}", " ", texto).strip()


class Cerebro:
    def __init__(self, url: str | None = None, cliente: httpx.Client | None = None):
        self.url = (url or config.CEREBRO_URL).rstrip("/") + "/v1/chat/completions"
        self.cliente = cliente or httpx.Client(timeout=httpx.Timeout(120, connect=5))

    def pronto(self) -> bool:
        try:
            return self.cliente.get(self.url.rsplit("/v1/", 1)[0] + "/health", timeout=3).status_code == 200
        except httpx.HTTPError:
            return False

    def _stream(self, mensagens: list[dict], com_ferramentas: bool) -> Iterator[dict]:
        corpo = {
            "messages": mensagens,
            "stream": True,
            "temperature": config.CEREBRO_TEMPERATURA,
            "max_tokens": config.CEREBRO_MAX_TOKENS,
            "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        if com_ferramentas:
            corpo["tools"] = [matematica.FERRAMENTA]
        with self.cliente.stream("POST", self.url, json=corpo) as resp:
            resp.raise_for_status()
            for linha in resp.iter_lines():
                if not linha.startswith("data:"):
                    continue
                dado = linha[5:].strip()
                if dado == "[DONE]":
                    break
                try:
                    escolha = json.loads(dado)["choices"][0]
                except (ValueError, KeyError, IndexError):
                    continue
                yield escolha.get("delta") or {}

    def responder(self, mensagens: list[dict], ao_calcular: Callable[[str, str], None] | None = None) -> Iterator[str]:
        """Gera a resposta frase por frase (para a voz começar a falar logo)."""
        mensagens = list(mensagens)
        for rodada in range(4):
            chamadas: dict[int, dict] = {}
            buffer, dentro_think = "", False
            for delta in self._stream(mensagens, com_ferramentas=rodada < 3):
                for tc in delta.get("tool_calls") or []:
                    item = chamadas.setdefault(tc.get("index", 0), {"id": "", "nome": "", "args": ""})
                    item["id"] = tc.get("id") or item["id"]
                    fn = tc.get("function") or {}
                    item["nome"] += fn.get("name") or ""
                    item["args"] += fn.get("arguments") or ""
                pedaco = delta.get("content") or ""
                if not pedaco:
                    continue
                buffer += pedaco
                if "<think>" in buffer:
                    dentro_think = True
                if dentro_think:
                    if "</think>" not in buffer:
                        continue
                    buffer = buffer.split("</think>", 1)[1]
                    dentro_think = False
                if chamadas:
                    continue
                while (m := _FIM_FRASE.match(buffer)) and len(m.group(1).strip()) > 1:
                    frase = para_fala(m.group(1))
                    buffer = buffer[m.end():]
                    if frase:
                        yield frase
            if not chamadas:
                resto = para_fala(buffer)
                if resto:
                    yield resto
                return
            # Executa as contas pedidas e devolve ao modelo
            lista = [chamadas[i] for i in sorted(chamadas)]
            mensagens.append({
                "role": "assistant", "content": None,
                "tool_calls": [{"id": c["id"] or f"c{n}", "type": "function", "function": {"name": c["nome"], "arguments": c["args"]}}
                               for n, c in enumerate(lista)],
            })
            for n, c in enumerate(lista):
                try:
                    expressao = json.loads(c["args"] or "{}").get("expressao", "")
                except ValueError:
                    expressao = c["args"]
                resultado = matematica.calcular(expressao) if c["nome"] == "calcular" else "erro: ferramenta desconhecida"
                if ao_calcular:
                    ao_calcular(expressao, resultado)
                mensagens.append({"role": "tool", "tool_call_id": c["id"] or f"c{n}", "content": resultado})
        yield "Me enrolei nessa conta. Pode repetir de outro jeito?"


def esperar_cerebro(cerebro: Cerebro, avisar: Callable[[str], None]) -> None:
    inicio = time.time()
    while not cerebro.pronto():
        if time.time() - inicio > 5:
            avisar("aguardando o cérebro carregar (na primeira vez ele baixa o modelo, pode levar alguns minutos)…")
            inicio = time.time() + 55
        time.sleep(2)
