"""Interface web da Konan (estilo Jarvis).

- Modo local: só mostra a esfera e as legendas (o áudio é do próprio PC).
- Modo web: a página também usa o microfone e o alto-falante do navegador (celular/PC),
  manda cada fala para /ouvir e toca a resposta. Protegida por senha (KONAN_SENHA).

Servidor HTTP da biblioteca padrão + Server-Sent Events. Custo de memória desprezível.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import queue
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from . import config

log = logging.getLogger("konan.interface")
_PAGINA = os.path.join(os.path.dirname(__file__), "static", "index.html")
_LIMITE_AUDIO = 3 * 1024 * 1024

_LOGIN = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Konan</title>
<style>body{background:#05070d;color:#cfe3ff;font-family:system-ui,sans-serif;min-height:100vh;margin:0;
display:flex;align-items:center;justify-content:center;padding:16px}form{display:flex;flex-direction:column;gap:12px;
width:min(320px,100%)}input,button{font:inherit;padding:12px 14px;border-radius:10px;border:1px solid #2a4a7a;
background:#0c1426;color:inherit}button{background:#2a5bd7;border:0;cursor:pointer}p{opacity:.7;margin:0}</style>
</head><body><form method="post" action="/entrar"><h1>Konan</h1><p>__MSG__</p>
<input type="password" name="senha" placeholder="Senha" autofocus required>
<button>Entrar</button></form></body></html>"""


def _token() -> str:
    return hmac.new(config.SENHA.encode(), b"konan-sessao", hashlib.sha256).hexdigest()


class Painel:
    def __init__(self):
        self._ouvintes: list[queue.Queue] = []
        self._trava = threading.Lock()
        self.ultimo = {"estado": "iniciando", "texto": ""}

    def publicar(self, estado: str, texto: str = "", quem: str = ""):
        evento = {"estado": estado, "texto": texto, "quem": quem}
        self.ultimo = evento
        with self._trava:
            for fila in list(self._ouvintes):
                try:
                    fila.put_nowait(evento)
                except queue.Full:
                    pass

    def _assinar(self) -> queue.Queue:
        fila: queue.Queue = queue.Queue(maxsize=100)
        with self._trava:
            self._ouvintes.append(fila)
        return fila

    def _cancelar(self, fila):
        with self._trava:
            if fila in self._ouvintes:
                self._ouvintes.remove(fila)

    def servir(self, porta: int, konan=None, ouvido=None, sintetizador=None):
        painel = self
        processando = threading.Lock()  # 1 fala por vez (a VPS tem 1 núcleo)

        class Handler(BaseHTTPRequestHandler):
            server_version = "Konan"

            def log_message(self, *_):
                pass

            # --- autenticação -------------------------------------------------
            def _autenticado(self) -> bool:
                if not config.SENHA:
                    return True
                for parte in (self.headers.get("Cookie") or "").split(";"):
                    nome, _, valor = parte.strip().partition("=")
                    if nome == "konan" and hmac.compare_digest(valor, _token()):
                        return True
                return False

            def _enviar(self, codigo, corpo: bytes, tipo="text/html; charset=utf-8", extras=None):
                self.send_response(codigo)
                self.send_header("Content-Type", tipo)
                self.send_header("Content-Length", str(len(corpo)))
                self.send_header("Cache-Control", "no-store")
                for k, v in (extras or {}).items():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(corpo)

            def _login(self, msg="Digite a senha para falar com ela."):
                self._enviar(200, _LOGIN.replace("__MSG__", msg).encode())

            # --- rotas --------------------------------------------------------
            def do_GET(self):
                if self.path == "/saude":
                    return self._enviar(200, b"ok", "text/plain")
                if not self._autenticado():
                    return self._login() if self.path in ("/", "/index.html") else self._enviar(401, b"", "text/plain")
                if self.path in ("/", "/index.html"):
                    with open(_PAGINA, "rb") as f:
                        return self._enviar(200, f.read())
                if self.path == "/config":
                    dados = {"modo": config.MODO, "nome": config.NOME, "janela": config.JANELA_CONTINUACAO_S,
                             "vozNavegador": sintetizador is None, "velocidade": config.VOZ_VELOCIDADE}
                    return self._enviar(200, json.dumps(dados).encode(), "application/json")
                if self.path == "/eventos":
                    return self._eventos()
                self._enviar(404, b"", "text/plain")

            def do_POST(self):
                if self.path == "/entrar":
                    tamanho = min(int(self.headers.get("Content-Length") or 0), 4096)
                    campos = urllib.parse.parse_qs(self.rfile.read(tamanho).decode(errors="ignore"))
                    senha = (campos.get("senha") or [""])[0]
                    if config.SENHA and hmac.compare_digest(senha.encode(), config.SENHA.encode()):
                        seguro = "; Secure" if self.headers.get("X-Forwarded-Proto") == "https" else ""
                        cookie = f"konan={_token()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000{seguro}"
                        return self._enviar(303, b"", extras={"Location": "/", "Set-Cookie": cookie})
                    time.sleep(1.5)  # freia tentativas de adivinhar a senha
                    return self._login("Senha incorreta.")
                if not self._autenticado():
                    return self._enviar(401, b"", "text/plain")
                if self.path == "/ouvir" and konan and ouvido:
                    return self._ouvir()
                self._enviar(404, b"", "text/plain")

            def _eventos(self):
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()
                fila = painel._assinar()
                try:
                    self.wfile.write(f"data: {json.dumps(painel.ultimo)}\n\n".encode())
                    self.wfile.flush()
                    while True:
                        try:
                            self.wfile.write(f"data: {json.dumps(fila.get(timeout=15))}\n\n".encode())
                        except queue.Empty:
                            self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    pass
                finally:
                    painel._cancelar(fila)

            def _ouvir(self):
                from .ouvido import de_wav

                tamanho = int(self.headers.get("Content-Length") or 0)
                if not 0 < tamanho <= _LIMITE_AUDIO:
                    return self._enviar(413, b"", "text/plain")
                try:
                    audio = de_wav(self.rfile.read(tamanho))
                except Exception as erro:  # noqa: BLE001
                    return self._enviar(400, str(erro).encode(), "text/plain; charset=utf-8")
                direto = self.headers.get("X-Konan-Direto") == "1"

                self.send_response(200)
                self.send_header("Content-Type", "application/x-ndjson")
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()

                def linha(**dados):
                    self.wfile.write((json.dumps(dados) + "\n").encode())
                    self.wfile.flush()

                try:
                    with processando:
                        texto = ouvido.transcrever(audio)
                        linha(tipo="ouvi", texto=texto)
                        respondeu = False
                        for frase in konan.processar(texto, direto=direto) if texto else ():
                            respondeu = True
                            som = None
                            if sintetizador is not None:
                                try:
                                    som = base64.b64encode(sintetizador.wav(frase)).decode()
                                except Exception:  # noqa: BLE001
                                    log.exception("falha ao sintetizar")
                            linha(tipo="frase", texto=frase, audio=som)
                        linha(tipo="fim", respondeu=respondeu)
                        painel.publicar("dormindo")
                except (BrokenPipeError, ConnectionResetError):
                    pass
                except Exception:  # noqa: BLE001
                    log.exception("erro ao processar fala")
                    try:
                        linha(tipo="erro", texto="Algo deu errado aqui. Tenta de novo?")
                    except OSError:
                        pass

        servidor = ThreadingHTTPServer(("0.0.0.0", porta), Handler)
        servidor.daemon_threads = True
        threading.Thread(target=servidor.serve_forever, daemon=True).start()
        log.info("interface em http://0.0.0.0:%d (modo %s)", porta, config.MODO)
