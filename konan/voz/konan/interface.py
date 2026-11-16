"""Interface opcional (estilo Jarvis): uma página com a esfera que reage ao estado da Konan.

Servidor HTTP da biblioteca padrão + Server-Sent Events. Custo de memória desprezível.
"""
import json
import logging
import os
import queue
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

log = logging.getLogger("konan.interface")
_PAGINA = os.path.join(os.path.dirname(__file__), "static", "index.html")


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

    def servir(self, porta: int):
        painel = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *_):
                pass

            def do_GET(self):
                if self.path in ("/", "/index.html"):
                    with open(_PAGINA, "rb") as f:
                        corpo = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header("Content-Length", str(len(corpo)))
                    self.end_headers()
                    self.wfile.write(corpo)
                elif self.path == "/eventos":
                    self.send_response(200)
                    self.send_header("Content-Type", "text/event-stream")
                    self.send_header("Cache-Control", "no-cache")
                    self.end_headers()
                    fila = painel._assinar()
                    try:
                        self.wfile.write(f"data: {json.dumps(painel.ultimo)}\n\n".encode())
                        self.wfile.flush()
                        while True:
                            try:
                                evento = fila.get(timeout=15)
                                self.wfile.write(f"data: {json.dumps(evento)}\n\n".encode())
                            except queue.Empty:
                                self.wfile.write(b": ping\n\n")
                            self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError):
                        pass
                    finally:
                        painel._cancelar(fila)
                elif self.path == "/saude":
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"ok")
                else:
                    self.send_response(404)
                    self.end_headers()

        servidor = ThreadingHTTPServer(("0.0.0.0", porta), Handler)
        servidor.daemon_threads = True
        threading.Thread(target=servidor.serve_forever, daemon=True).start()
        log.info("interface em http://0.0.0.0:%d", porta)
