"""Voz da Konan: Kokoro (feminina pt-BR, padrão) ou Piper. Fala frase por frase, sem travar a conversa."""
import logging
import os
import queue
import threading
import urllib.request

import numpy as np

from . import config

log = logging.getLogger("konan.voz")

KOKORO_BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/"


def _baixar(url: str, destino: str):
    if os.path.exists(destino) and os.path.getsize(destino) > 0:
        return destino
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    log.info("baixando %s", url)
    temporario = destino + ".parcial"
    urllib.request.urlretrieve(url, temporario)
    os.replace(temporario, destino)
    return destino


class _Kokoro:
    def __init__(self):
        from kokoro_onnx import Kokoro

        pasta = os.path.join(config.MODELOS, "kokoro")
        modelo = _baixar(KOKORO_BASE + "kokoro-v1.0.int8.onnx", os.path.join(pasta, "kokoro-v1.0.int8.onnx"))
        vozes = _baixar(KOKORO_BASE + "voices-v1.0.bin", os.path.join(pasta, "voices-v1.0.bin"))
        self._k = Kokoro(modelo, vozes)

    def sintetizar(self, texto: str):
        amostras, taxa = self._k.create(texto, voice=config.VOZ_KOKORO, speed=config.VOZ_VELOCIDADE, lang="pt-br")
        return np.asarray(amostras, dtype=np.float32), taxa


class _Piper:
    def __init__(self):
        from piper import PiperVoice

        nome = config.VOZ_PIPER  # ex.: pt_BR-faber-medium
        lingua, voz, qualidade = nome.split("-", 2)
        rel = f"{lingua.split('_')[0]}/{lingua}/{voz}/{qualidade}/{nome}.onnx"
        pasta = os.path.join(config.MODELOS, "piper")
        modelo = _baixar(PIPER_BASE + rel, os.path.join(pasta, f"{nome}.onnx"))
        _baixar(PIPER_BASE + rel + ".json", os.path.join(pasta, f"{nome}.onnx.json"))
        self._v = PiperVoice.load(modelo)

    def sintetizar(self, texto: str):
        partes = [c.audio_float_array for c in self._v.synthesize(texto)]
        taxa = self._v.config.sample_rate
        return (np.concatenate(partes) if partes else np.zeros(1, np.float32)).astype(np.float32), taxa


class Voz:
    """Fila de frases -> síntese -> alto-falante. A próxima frase é sintetizada enquanto a anterior toca."""

    def __init__(self, ao_comecar=None, ao_terminar=None):
        import sounddevice as sd

        self._sd = sd
        self._motor = _Piper() if config.VOZ_MOTOR == "piper" else _Kokoro()
        self._frases: queue.Queue = queue.Queue()
        self._audios: queue.Queue = queue.Queue(maxsize=3)
        self._pendentes = 0
        self._trava = threading.Lock()
        self._ocioso = threading.Event()
        self._ocioso.set()
        self._ao_comecar, self._ao_terminar = ao_comecar, ao_terminar
        saida = config.AUDIO_SAIDA
        self._saida = int(saida) if saida and saida.isdigit() else saida
        threading.Thread(target=self._sintetizador, daemon=True).start()
        threading.Thread(target=self._tocador, daemon=True).start()

    def falar(self, frase: str):
        frase = frase.strip()
        if not frase:
            return
        with self._trava:
            if self._pendentes == 0:
                self._ocioso.clear()
                if self._ao_comecar:
                    self._ao_comecar()
            self._pendentes += 1
        self._frases.put(frase)

    def esperar(self):
        self._ocioso.wait()

    def _sintetizador(self):
        while True:
            frase = self._frases.get()
            try:
                self._audios.put(self._motor.sintetizar(frase))
            except Exception:  # noqa: BLE001
                log.exception("falha ao sintetizar: %r", frase)
                self._audios.put(None)

    def _tocador(self):
        while True:
            item = self._audios.get()
            try:
                if item is not None:
                    audio, taxa = item
                    self._sd.play(audio, taxa, device=self._saida)
                    self._sd.wait()
            except Exception:  # noqa: BLE001
                log.exception("falha ao tocar áudio")
            with self._trava:
                self._pendentes -= 1
                if self._pendentes == 0:
                    self._ocioso.set()
                    if self._ao_terminar:
                        self._ao_terminar()
