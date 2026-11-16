"""Ouvido: transcrição local com faster-whisper (int8, CPU)."""
import logging
import os

from . import config

log = logging.getLogger("konan.ouvido")


class Ouvido:
    def __init__(self):
        from faster_whisper import WhisperModel

        pasta = os.path.join(config.MODELOS, "whisper")
        os.makedirs(pasta, exist_ok=True)
        log.info("carregando Whisper '%s'…", config.WHISPER_MODELO)
        self._modelo = WhisperModel(
            config.WHISPER_MODELO, device="cpu", compute_type="int8",
            cpu_threads=config.WHISPER_THREADS, download_root=pasta,
        )
        # Ajuda o Whisper a escrever o nome do jeito certo
        self._dica = f"{config.NOME}, olá {config.NOME}, ei {config.NOME}, tudo bem?"

    def transcrever(self, audio) -> str:
        segmentos, _info = self._modelo.transcribe(
            audio, language="pt", beam_size=1, initial_prompt=self._dica,
            condition_on_previous_text=False, vad_filter=False, without_timestamps=True,
        )
        texto = " ".join(s.text.strip() for s in segmentos).strip()
        # O Whisper às vezes "alucina" a própria dica em silêncio/ruído
        if texto.strip(" .,!?").lower() == self._dica.strip(" .,!?").lower():
            return ""
        return texto
