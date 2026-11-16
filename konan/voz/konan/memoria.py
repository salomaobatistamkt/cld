"""Memória da Konan: um único arquivo SQLite com busca por texto (FTS5), sem modelo extra."""
import os
import re
import sqlite3
import threading
import time

from .despertar import normalizar

_PALAVRAS_VAZIAS = set(
    "a o as os um uma de da do das dos em no na nos nas que e é eu voce você me te se por para pra com "
    "como qual quais quando onde isso essa esse esta este ela ele mas mais muito ja já tem ter foi ser "
    "sobre meu minha seu sua konan ola olá oi ei tudo bem".split()
)


class Memoria:
    def __init__(self, caminho: str):
        os.makedirs(os.path.dirname(caminho) or ".", exist_ok=True)
        self._db = sqlite3.connect(caminho, check_same_thread=False)
        self._trava = threading.Lock()
        with self._trava, self._db:
            self._db.executescript(
                """
                CREATE TABLE IF NOT EXISTS trocas (
                    id INTEGER PRIMARY KEY, quando REAL NOT NULL, usuario TEXT NOT NULL, konan TEXT NOT NULL
                );
                CREATE VIRTUAL TABLE IF NOT EXISTS trocas_busca USING fts5(
                    usuario, konan, content='trocas', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
                );
                CREATE TRIGGER IF NOT EXISTS trocas_ai AFTER INSERT ON trocas BEGIN
                    INSERT INTO trocas_busca(rowid, usuario, konan) VALUES (new.id, new.usuario, new.konan);
                END;
                CREATE TRIGGER IF NOT EXISTS trocas_ad AFTER DELETE ON trocas BEGIN
                    INSERT INTO trocas_busca(trocas_busca, rowid, usuario, konan) VALUES ('delete', old.id, old.usuario, old.konan);
                END;
                """
            )

    def guardar(self, usuario: str, konan: str, quando: float | None = None) -> int:
        with self._trava, self._db:
            cur = self._db.execute(
                "INSERT INTO trocas(quando, usuario, konan) VALUES (?, ?, ?)", (quando or time.time(), usuario, konan)
            )
            return cur.lastrowid

    def recentes(self, desde: float, limite: int) -> list[tuple[str, str]]:
        with self._trava:
            linhas = self._db.execute(
                "SELECT usuario, konan FROM trocas WHERE quando >= ? ORDER BY id DESC LIMIT ?", (desde, limite)
            ).fetchall()
        return list(reversed(linhas))

    def lembrar(self, frase: str, antes_de: float, limite: int) -> list[tuple[float, str, str]]:
        """Trocas antigas (de sessões anteriores) relacionadas à frase."""
        termos = [p for p in normalizar(frase).split() if len(p) > 2 and p not in _PALAVRAS_VAZIAS]
        if not termos:
            return []
        consulta = " OR ".join(f'"{re.sub(chr(34), "", t)}"' for t in termos[:12])
        with self._trava:
            try:
                return self._db.execute(
                    """SELECT t.quando, t.usuario, t.konan FROM trocas_busca b JOIN trocas t ON t.id = b.rowid
                       WHERE trocas_busca MATCH ? AND t.quando < ? ORDER BY bm25(trocas_busca) LIMIT ?""",
                    (consulta, antes_de, limite),
                ).fetchall()
            except sqlite3.OperationalError:
                return []

    def esquecer_tudo(self) -> None:
        with self._trava, self._db:
            self._db.execute("DELETE FROM trocas")

    def total(self) -> int:
        with self._trava:
            return self._db.execute("SELECT COUNT(*) FROM trocas").fetchone()[0]
