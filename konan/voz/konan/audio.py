"""Microfone: captura contínua e recorte de falas com VAD (webrtcvad)."""
import collections
import logging
import queue
import threading

import numpy as np

from . import config

log = logging.getLogger("konan.audio")

QUADRO_MS = 30
AMOSTRAS_QUADRO = config.TAXA * QUADRO_MS // 1000


class Microfone:
    def __init__(self):
        import sounddevice as sd
        import webrtcvad

        self._sd = sd
        self._vad = webrtcvad.Vad(config.VAD_AGRESSIVIDADE)
        self._fila: queue.Queue[bytes] = queue.Queue(maxsize=2000)
        self._mudo = threading.Event()
        self._stream = None

    def iniciar(self):
        dispositivo = config.AUDIO_ENTRADA
        if dispositivo and dispositivo.isdigit():
            dispositivo = int(dispositivo)

        def _callback(dados, _frames, _tempo, status):
            if status:
                log.debug("microfone: %s", status)
            if not self._mudo.is_set():
                try:
                    self._fila.put_nowait(bytes(dados))
                except queue.Full:
                    pass

        self._stream = self._sd.RawInputStream(
            samplerate=config.TAXA, blocksize=AMOSTRAS_QUADRO, channels=1, dtype="int16",
            device=dispositivo, callback=_callback,
        )
        self._stream.start()
        log.info("microfone ativo: %s", self._stream.device)

    def silenciar(self, sim: bool):
        """Enquanto a Konan fala, o microfone é ignorado (para ela não ouvir a si mesma)."""
        if sim:
            self._mudo.set()
        else:
            while not self._fila.empty():
                try:
                    self._fila.get_nowait()
                except queue.Empty:
                    break
            self._mudo.clear()

    def falas(self, parar: threading.Event):
        """Gera cada fala completa (np.float32, 16 kHz) quando a pessoa termina de falar."""
        anteriores = collections.deque(maxlen=10)  # ~300 ms antes do início da fala
        janela = collections.deque(maxlen=10)
        gravando, quadros, silencio = False, [], 0
        silencio_max = config.SILENCIO_FIM_MS // QUADRO_MS
        max_quadros = config.FALA_MAX_S * 1000 // QUADRO_MS
        while not parar.is_set():
            try:
                quadro = self._fila.get(timeout=0.5)
            except queue.Empty:
                if self._mudo.is_set():
                    gravando, quadros, silencio = False, [], 0
                    anteriores.clear()
                    janela.clear()
                continue
            if len(quadro) != AMOSTRAS_QUADRO * 2:
                continue
            fala = self._vad.is_speech(quadro, config.TAXA)
            if not gravando:
                anteriores.append(quadro)
                janela.append(fala)
                if sum(janela) >= 6:
                    gravando, quadros, silencio = True, list(anteriores), 0
                    janela.clear()
                continue
            quadros.append(quadro)
            silencio = 0 if fala else silencio + 1
            if silencio >= silencio_max or len(quadros) >= max_quadros:
                gravando = False
                anteriores.clear()
                if len(quadros) - silencio >= 10:  # ignora estalos (< ~300 ms de fala)
                    audio = np.frombuffer(b"".join(quadros), dtype=np.int16).astype(np.float32) / 32768.0
                    yield audio
                quadros = []
