"""Ouvido: transcreve a fala. Local (faster-whisper, CPU) ou por API compatível com OpenAI (ex.: Groq)."""
import io
import logging
import os
import wave

import numpy as np

from . import config

log = logging.getLogger("konan.ouvido")


def dica() -> str:
    # Ajuda o Whisper a escrever o nome do jeito certo
    return f"{config.NOME}, olá {config.NOME}, ei {config.NOME}, tudo bem?"


def _limpar(texto: str) -> str:
    texto = (texto or "").strip()
    # O Whisper às vezes "alucina" a própria dica em silêncio/ruído
    if texto.strip(" .,!?").lower() == dica().strip(" .,!?").lower():
        return ""
    return texto


def para_wav(audio: np.ndarray, taxa: int = config.TAXA) -> bytes:
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    saida = io.BytesIO()
    with wave.open(saida, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(taxa)
        w.writeframes(pcm)
    return saida.getvalue()


def de_wav(dados: bytes) -> np.ndarray:
    """WAV PCM 16 bits mono 16 kHz (o que a página envia) -> float32."""
    with wave.open(io.BytesIO(dados), "rb") as w:
        if w.getsampwidth() != 2 or w.getnchannels() != 1:
            raise ValueError("áudio precisa ser WAV mono de 16 bits")
        if w.getframerate() != config.TAXA:
            raise ValueError(f"áudio precisa ser {config.TAXA} Hz")
        if w.getnframes() > config.TAXA * (config.FALA_MAX_S + 5):
            raise ValueError("áudio longo demais")
        bruto = w.readframes(w.getnframes())
    return np.frombuffer(bruto, dtype="<i2").astype(np.float32) / 32768.0


class _Local:
    def __init__(self):
        from faster_whisper import WhisperModel

        pasta = os.path.join(config.MODELOS, "whisper")
        os.makedirs(pasta, exist_ok=True)
        log.info("carregando Whisper local '%s'…", config.WHISPER_MODELO)
        self._modelo = WhisperModel(
            config.WHISPER_MODELO, device="cpu", compute_type="int8",
            cpu_threads=config.WHISPER_THREADS, download_root=pasta,
        )

    def transcrever(self, audio: np.ndarray) -> str:
        segmentos, _ = self._modelo.transcribe(
            audio, language="pt", beam_size=1, initial_prompt=dica(),
            condition_on_previous_text=False, vad_filter=False, without_timestamps=True,
        )
        return _limpar(" ".join(s.text.strip() for s in segmentos))


class _Api:
    def __init__(self, cliente=None):
        import httpx

        if not config.OUVIDO_CHAVE:
            raise SystemExit("OUVIDO_MOTOR=api precisa de OUVIDO_CHAVE (ou CEREBRO_CHAVE).")
        self._url = config.OUVIDO_URL.rstrip("/") + "/audio/transcriptions"
        self._cliente = cliente or httpx.Client(timeout=60)
        self._cliente.headers["Authorization"] = f"Bearer {config.OUVIDO_CHAVE}"
        log.info("ouvido por API: %s (%s)", self._url, config.OUVIDO_MODELO)

    def transcrever(self, audio: np.ndarray) -> str:
        resp = self._cliente.post(
            self._url,
            files={"file": ("fala.wav", para_wav(audio), "audio/wav")},
            data={"model": config.OUVIDO_MODELO, "language": "pt", "prompt": dica(),
                  "response_format": "json", "temperature": "0"},
        )
        resp.raise_for_status()
        return _limpar(resp.json().get("text", ""))


def Ouvido():  # noqa: N802 — fábrica com cara de classe
    return _Api() if config.OUVIDO_MOTOR == "api" else _Local()
