"""Detecta o nome da Konan no começo da frase ("Konan", "Ei, Konan", "Olá Konan, tudo bem?")."""
import difflib
import re
import unicodedata

from . import config

_SAUDACOES = {"ei", "eí", "hey", "oi", "ola", "alo", "e", "o", "ô", "fala"}


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]+", " ", sem_acento.lower()).strip()


def _parece_nome(palavra: str, nome: str) -> bool:
    if len(palavra) < 4:
        return False
    if palavra in {nome, "conan", "konan", "conam", "konam", "kona n"}:
        return True
    return difflib.SequenceMatcher(None, palavra, nome).ratio() >= 0.8


def detectar(texto: str, nome: str | None = None) -> tuple[bool, str]:
    """Retorna (chamou_a_konan, resto_da_frase).

    Só procura o nome nas 4 primeiras palavras, para não acordar quando o nome
    aparece no meio de uma conversa qualquer.
    """
    nome_n = normalizar(nome or config.NOME)
    original = texto.strip()
    palavras_orig = original.split()
    for i, palavra in enumerate(palavras_orig[:4]):
        p = normalizar(palavra)
        if not p:
            continue
        if _parece_nome(p, nome_n):
            antes = [normalizar(x) for x in palavras_orig[:i]]
            if all(a in _SAUDACOES or not a for a in antes):
                resto = " ".join(palavras_orig[i + 1:]).lstrip(" ,.!?;:-")
                return True, resto
            return False, original
    return False, original
