"""Configuração da Konan, lida de variáveis de ambiente (definidas no docker-compose / Coolify)."""
import os


def _int(nome: str, padrao: int) -> int:
    try:
        return int(os.environ.get(nome, padrao))
    except ValueError:
        return padrao


def _float(nome: str, padrao: float) -> float:
    try:
        return float(os.environ.get(nome, padrao))
    except ValueError:
        return padrao


NOME = os.environ.get("KONAN_NOME", "Konan")
DADOS = os.environ.get("KONAN_DADOS", "/data")
MODELOS = os.path.join(DADOS, "modelos")

# Modo: "local" = microfone/caixa ligados no próprio PC | "web" = microfone e som pelo navegador (celular/PC)
MODO = os.environ.get("KONAN_MODO", "local").lower()
SENHA = os.environ.get("KONAN_SENHA", "")

# Cérebro: qualquer API compatível com OpenAI (base já com a versão, ex.: .../v1)
#   local:  http://cerebro:8080/v1
#   Groq:   https://api.groq.com/openai/v1
#   Gemini: https://generativelanguage.googleapis.com/v1beta/openai
CEREBRO_URL = os.environ.get("CEREBRO_URL", "http://cerebro:8080/v1")
CEREBRO_CHAVE = os.environ.get("CEREBRO_CHAVE", "")
CEREBRO_MODELO = os.environ.get("CEREBRO_MODELO", "local")
CEREBRO_TEMPERATURA = _float("CEREBRO_TEMPERATURA", 0.6)
CEREBRO_MAX_TOKENS = _int("CEREBRO_MAX_TOKENS", 400)

# Ouvido: "local" (faster-whisper no próprio servidor) | "api" (transcrição por API compatível com OpenAI)
OUVIDO_MOTOR = os.environ.get("OUVIDO_MOTOR", "local").lower()
OUVIDO_URL = os.environ.get("OUVIDO_URL", "https://api.groq.com/openai/v1")
OUVIDO_CHAVE = os.environ.get("OUVIDO_CHAVE", "") or CEREBRO_CHAVE
OUVIDO_MODELO = os.environ.get("OUVIDO_MODELO", "whisper-large-v3-turbo")
WHISPER_MODELO = os.environ.get("WHISPER_MODELO", "base")
WHISPER_THREADS = _int("WHISPER_THREADS", 2)

# Voz: kokoro (feminina pt-BR "pf_dora") | piper (pt-BR) | navegador (a voz do celular/PC fala; só no modo web, custo zero)
VOZ_MOTOR = os.environ.get("VOZ_MOTOR", "kokoro").lower()
VOZ_KOKORO = os.environ.get("VOZ_KOKORO", "pf_dora")
VOZ_PIPER = os.environ.get("VOZ_PIPER", "pt_BR-faber-medium")
VOZ_VELOCIDADE = _float("VOZ_VELOCIDADE", 1.0)

# Áudio
TAXA = 16000
AUDIO_ENTRADA = os.environ.get("AUDIO_ENTRADA") or None  # nome/índice do microfone; vazio = padrão
AUDIO_SAIDA = os.environ.get("AUDIO_SAIDA") or None
VAD_AGRESSIVIDADE = _int("VAD_AGRESSIVIDADE", 2)  # 0 a 3
SILENCIO_FIM_MS = _int("SILENCIO_FIM_MS", 700)
FALA_MAX_S = _int("FALA_MAX_S", 15)

# Conversa
JANELA_CONTINUACAO_S = _int("JANELA_CONTINUACAO_S", 8)  # depois de responder, escuta sem precisar do nome
SESSAO_EXPIRA_S = _int("SESSAO_EXPIRA_S", 600)
TURNOS_CONTEXTO = _int("TURNOS_CONTEXTO", 6)
MEMORIAS_CONTEXTO = _int("MEMORIAS_CONTEXTO", 3)

# Interface (opcional)
INTERFACE_ATIVA = os.environ.get("INTERFACE_ATIVA", "1") not in ("0", "false", "nao", "não")
INTERFACE_PORTA = _int("INTERFACE_PORTA", 8090)
INTERFACE_URL = os.environ.get("INTERFACE_URL", "")  # ex.: http://192.168.0.10:8090
