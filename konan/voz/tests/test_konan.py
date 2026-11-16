import json

import httpx
import pytest

from konan import cerebro, despertar, matematica
from konan.conversa import Conversa
from konan.memoria import Memoria


@pytest.mark.parametrize("frase, resto", [
    ("Konan", ""),
    ("Ei, Konan, tudo bem?", "tudo bem?"),
    ("Olá Conan, quanto é dois mais dois?", "quanto é dois mais dois?"),
    ("Oi Konan.", ""),
    ("konan me explica derivada", "me explica derivada"),
])
def test_acorda_com_o_nome(frase, resto):
    assert despertar.detectar(frase, "Konan") == (True, resto)


@pytest.mark.parametrize("frase", [
    "eu assisti Naruto ontem e a Konan apareceu",
    "a gente vai comer pizza hoje",
    "canal novo no youtube",
])
def test_nao_acorda_sem_chamar(frase):
    assert despertar.detectar(frase, "Konan")[0] is False


@pytest.mark.parametrize("expressao, esperado", [
    ("0.18*2340", "421.2"),
    ("x**2 - 5*x + 6 = 0", "[2, 3]"),
    ("sen(rad(30))", "1/2"),
    ("diff(x**3, x)", "3*x**2"),
    ("integrate(2*x, x)", "x**2"),
    ("binario(10)", "0b1010"),
    ("de_base('ff', 16)", "255"),
    ("mdc(84, 36)", "12"),
    ("Mod(17, 5)", "2"),
    ("pi*3**2", "9*pi"),
    ("2^10", "1024"),
])
def test_matematica(expressao, esperado):
    assert matematica.calcular(expressao).startswith(esperado)


@pytest.mark.parametrize("perigosa", [
    "__import__('os').system('ls')", "open('/etc/passwd')", "().__class__", "exec('1')",
])
def test_matematica_bloqueia_codigo(perigosa):
    assert matematica.calcular(perigosa).startswith("erro")


def test_matematica_tempo_limite(monkeypatch):
    monkeypatch.setattr(matematica, "TEMPO_LIMITE_S", 1)
    assert "demorou" in matematica.calcular("factorial(10**7)") or matematica.calcular("factorial(10**7)").startswith("erro")


def test_memoria_lembra_conversas_antigas(tmp_path):
    m = Memoria(str(tmp_path / "m.sqlite3"))
    m.guardar("meu cachorro se chama Thor", "Que nome forte!", quando=100)
    m.guardar("gosto de trigonometria", "Legal!", quando=200)
    achadas = m.lembrar("qual o nome do meu cachorro?", antes_de=1000, limite=3)
    assert achadas and achadas[0][1] == "meu cachorro se chama Thor"
    assert m.recentes(150, 5) == [("gosto de trigonometria", "Legal!")]
    m.esquecer_tudo()
    assert m.total() == 0 and m.lembrar("cachorro", 1000, 3) == []


def test_conversa_janela_e_comandos(tmp_path):
    c = Conversa(Memoria(str(tmp_path / "m.sqlite3")))
    assert c.decidir("bom dia pessoal", agora=1000).tipo == "ignorar"
    assert c.decidir("Ei Konan", agora=1000).tipo == "saudar"
    c.acordar(1000)
    d = c.decidir("quanto é a raiz de dois?", agora=1003)  # dentro da janela, sem o nome
    assert d.tipo == "conversar" and d.mensagens[-1]["content"] == "quanto é a raiz de dois?"
    assert c.decidir("e o seno de trinta?", agora=5000).tipo == "ignorar"  # janela fechou
    assert c.decidir("Konan, abre sua interface", agora=5001).tipo == "interface"
    assert c.decidir("Konan, apaga toda sua memória", agora=5002).tipo == "confirmar_esquecer"
    assert c.decidir("Konan, sim", agora=5003).tipo == "esquecido"


def test_para_fala_limpa_simbolos():
    assert cerebro.para_fala("**x²** + √2 ≈ 3,4") == "x ao quadrado + raiz de 2 aproximadamente 3,4"
    assert cerebro.para_fala("<think>hmm</think>Oi!") == "Oi!"


def _sse(*deltas):
    linhas = [f"data: {json.dumps({'choices': [{'delta': d}]})}" for d in deltas] + ["data: [DONE]"]
    return "\n\n".join(linhas) + "\n\n"


def test_cerebro_usa_ferramenta_e_fala_em_frases():
    pedidos = []

    def responder(request: httpx.Request):
        corpo = json.loads(request.content)
        pedidos.append(corpo)
        if len(pedidos) == 1:
            texto = _sse({"tool_calls": [{"index": 0, "id": "a", "function": {"name": "calcular", "arguments": '{"expressao":'}}]},
                         {"tool_calls": [{"index": 0, "function": {"arguments": ' "0.18*2340"}'}}]})
        else:
            assert corpo["messages"][-1] == {"role": "tool", "tool_call_id": "a", "content": "421.2"}
            texto = _sse({"content": "Dá quatrocentos e vinte e um "}, {"content": "e vinte. "}, {"content": "Mais alguma?"})
        return httpx.Response(200, text=texto, headers={"content-type": "text/event-stream"})

    cliente = httpx.Client(transport=httpx.MockTransport(responder))
    c = cerebro.Cerebro("http://teste/v1", cliente, chave="")
    frases = list(c.responder([{"role": "user", "content": "18% de 2340?"}]))
    assert frases == ["Dá quatrocentos e vinte e um e vinte.", "Mais alguma?"]
    assert pedidos[0]["tools"][0]["function"]["name"] == "calcular"


def test_modo_web_login_e_conversa(tmp_path, monkeypatch):
    import time
    import urllib.error
    import urllib.request

    import numpy as np

    from konan import config
    from konan.interface import Painel
    from konan.nucleo import Konan
    from konan.ouvido import para_wav

    monkeypatch.setattr(config, "SENHA", "senha-secreta")
    monkeypatch.setattr(config, "MODO", "web")

    class OuvidoFalso:
        def transcrever(self, audio):
            assert audio.dtype == np.float32 and len(audio) == 16000
            return "Ei Konan, quanto é 18% de 2340?"

    class CerebroFalso:
        def responder(self, mensagens, ao_calcular=None):
            assert mensagens[-1]["content"] == "quanto é 18% de 2340?"
            yield "Dá quatrocentos e vinte e um e vinte."

    konan = Konan(Memoria(str(tmp_path / "m.sqlite3")), CerebroFalso())
    Painel().servir(18091, konan=konan, ouvido=OuvidoFalso(), sintetizador=None)
    time.sleep(0.3)
    base = "http://127.0.0.1:18091"

    # sem login: página de senha e /ouvir bloqueado
    assert b'name="senha"' in urllib.request.urlopen(base + "/").read()
    with pytest.raises(urllib.error.HTTPError) as e:
        urllib.request.urlopen(urllib.request.Request(base + "/ouvir", data=b"x", method="POST"))
    assert e.value.code == 401

    class SemRedirecionar(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    abridor = urllib.request.build_opener(SemRedirecionar)
    with pytest.raises(urllib.error.HTTPError) as e:
        abridor.open(base + "/entrar", data=b"senha=senha-secreta")
    cookie = e.value.headers["Set-Cookie"].split(";")[0]
    assert e.value.code == 303 and cookie.startswith("konan=")

    cfg = json.loads(urllib.request.urlopen(urllib.request.Request(base + "/config", headers={"Cookie": cookie})).read())
    assert cfg["modo"] == "web" and cfg["vozNavegador"] is True

    req = urllib.request.Request(base + "/ouvir", data=para_wav(np.zeros(16000, np.float32)), method="POST",
                                 headers={"Cookie": cookie, "Content-Type": "audio/wav"})
    linhas = [json.loads(l) for l in urllib.request.urlopen(req).read().decode().splitlines()]
    assert [l["tipo"] for l in linhas] == ["ouvi", "frase", "fim"]
    assert linhas[1] == {"tipo": "frase", "texto": "Dá quatrocentos e vinte e um e vinte.", "audio": None}
    assert konan.memoria.total() == 1
