"""Motor de matemática exata (SymPy) que a Konan usa por dentro para não "chutar" contas.

Cobre aritmética, álgebra, funções, trigonometria, geometria (via fórmulas),
cálculo e matemática da computação (bases, bits, mod, mdc/mmc, fatorial, combinações).
"""
import multiprocessing as mp
import re

LIMITE_CARACTERES = 300
TEMPO_LIMITE_S = 5

# Só caracteres de expressão matemática. Bloqueia "__", aspas, ponto-e-vírgula etc.
_PERMITIDO = re.compile(r"^[\w\s+\-*/^().,=<>!%\[\]']*$")
_PROIBIDO = re.compile(r"__|\bimport\b|\blambda\b|\bexec\b|\beval\b|\bopen\b|\bgetattr\b|\bglobals\b|\blocals\b")


def _namespace():
    import sympy as sp

    x, y, z, t, n, k, a, b, c = sp.symbols("x y z t n k a b c")
    ns = {nome: getattr(sp, nome) for nome in (
        "sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan", "atan2",
        "sinh", "cosh", "tanh", "exp", "log", "ln", "sqrt", "root", "cbrt", "Abs", "floor", "ceiling",
        "pi", "E", "I", "oo", "Rational", "factorial", "binomial", "gcd", "lcm", "isprime", "factorint",
        "prime", "nextprime", "divisors", "Mod", "Matrix", "det", "simplify", "expand", "factor",
        "solve", "solveset", "Eq", "diff", "integrate", "limit", "series", "summation", "Sum",
        "nsimplify", "deg", "rad", "N", "Symbol", "symbols", "Interval", "S",
    ) if hasattr(sp, nome)}
    ns.update({"x": x, "y": y, "z": z, "t": t, "n": n, "k": k, "a": a, "b": b, "c": c})
    # Português
    ns.update({
        "sen": sp.sin, "tg": sp.tan, "arcsen": sp.asin, "arccos": sp.acos, "arctg": sp.atan,
        "raiz": sp.sqrt, "mdc": sp.gcd, "mmc": sp.lcm, "fatorial": sp.factorial,
        "combinacao": sp.binomial, "resolver": sp.solve, "derivar": sp.diff, "integrar": sp.integrate,
        "limite": sp.limit, "primo": sp.isprime, "fatorar": sp.factorint,
    })
    # Matemática da computação
    ns.update({
        "binario": lambda v: bin(int(v)), "hexa": lambda v: hex(int(v)), "octal": lambda v: oct(int(v)),
        "de_base": lambda s, base: int(str(s), int(base)),
        "bits": lambda v: int(v).bit_length(), "log2": lambda v: sp.log(v, 2),
        "xor": lambda p, q: int(p) ^ int(q), "e_bit": lambda p, q: int(p) & int(q),
        "ou_bit": lambda p, q: int(p) | int(q),
    })
    return sp, ns


def _avaliar(expressao: str):
    sp, ns = _namespace()
    from sympy.parsing.sympy_parser import (
        convert_xor, implicit_multiplication_application, parse_expr, standard_transformations,
    )

    base = {"__builtins__": {}, "Integer": sp.Integer, "Float": sp.Float, "Rational": sp.Rational, "Symbol": sp.Symbol}
    transf = standard_transformations + (implicit_multiplication_application, convert_xor)
    expr_txt = expressao.replace("÷", "/").replace("×", "*").replace("π", "pi")

    if expr_txt.count("=") == 1 and not re.search(r"[<>!=]=|=[<>=]", expr_txt):
        esq, dir_ = expr_txt.split("=")
        eq = sp.Eq(parse_expr(esq, local_dict=ns, global_dict=base, transformations=transf),
                   parse_expr(dir_, local_dict=ns, global_dict=base, transformations=transf))
        livres = sorted(eq.free_symbols, key=str)
        resultado = sp.solve(eq, livres[0] if len(livres) == 1 else livres)
    else:
        resultado = parse_expr(expr_txt, local_dict=ns, global_dict=base, transformations=transf)

    if isinstance(resultado, (str, int, bool)):
        return str(resultado)
    exato = resultado
    if getattr(exato, "is_Float", False):
        return f"{float(exato):.12g}"
    texto = str(exato)
    try:
        if hasattr(exato, "free_symbols") and not exato.free_symbols and not getattr(exato, "is_Integer", False):
            aprox = sp.N(exato, 10)
            if str(aprox) != texto:
                texto += f" (aproximadamente {aprox})"
    except Exception:
        pass
    return texto


def _trabalhador(expressao, fila):
    try:
        fila.put(("ok", _avaliar(expressao)))
    except Exception as erro:  # noqa: BLE001
        fila.put(("erro", f"{type(erro).__name__}: {erro}"))


def calcular(expressao: str) -> str:
    """Avalia com segurança e tempo limite. Sempre retorna texto (resultado ou erro)."""
    expressao = (expressao or "").strip()
    if not expressao:
        return "erro: expressão vazia"
    if len(expressao) > LIMITE_CARACTERES:
        return "erro: expressão longa demais"
    if not _PERMITIDO.match(expressao.replace("÷", "/").replace("×", "*").replace("π", "pi")) or _PROIBIDO.search(expressao):
        return "erro: caracteres não permitidos"
    ctx = mp.get_context("fork") if hasattr(mp, "get_context") else mp
    fila = ctx.Queue()
    proc = ctx.Process(target=_trabalhador, args=(expressao, fila), daemon=True)
    proc.start()
    proc.join(TEMPO_LIMITE_S)
    if proc.is_alive():
        proc.kill()
        return "erro: a conta demorou demais"
    if fila.empty():
        return "erro: falha ao calcular"
    status, valor = fila.get()
    return valor if status == "ok" else f"erro: {valor}"


FERRAMENTA = {
    "type": "function",
    "function": {
        "name": "calcular",
        "description": (
            "Calcula com exatidão usando SymPy. Use para QUALQUER conta, equação, função, "
            "trigonometria (radianos; use rad(30) para graus), geometria, derivada, integral, "
            "bases numéricas (binario, hexa, de_base('ff',16)), bits, mod, mdc, mmc, fatorial."
        ),
        "parameters": {
            "type": "object",
            "properties": {"expressao": {"type": "string", "description": "Ex.: 0.18*2340 | x**2-5*x+6=0 | sen(rad(30)) | diff(x**3,x)"}},
            "required": ["expressao"],
        },
    },
}
