"""Respuesta del alumno: qué valores debe capturar en cada método y cómo se verifican (CAPA 2).

El alumno resuelve el problema A MANO y escribe su resultado; el programa lo compara con el que obtiene
el método del libro. Regla de la comparación: una respuesta es correcta cuando coincide con la esperada
desde la parte entera hasta el tercer decimal (el libro mezcla redondeo y truncamiento, por eso se acepta
cualquiera de los dos a 3 decimales). Si difiere en la parte entera o en alguno de los 3 decimales es
incorrecta.
"""
import re
from collections.abc import Callable, Mapping, Sequence
from decimal import ROUND_DOWN, ROUND_HALF_UP, Decimal, localcontext
from fractions import Fraction

DECIMALES_COMPARACION = 3
_UNIDAD = Decimal(1).scaleb(-DECIMALES_COMPARACION)

CLAVE_GRAFICO_CAMBIOS = "cambios de signo"
CLAVE_GRAFICO_X = "X (extremo izquierdo del primer cambio de signo)"

_EDO = re.compile(r"^y'?_\d+$")
_COEFICIENTE = re.compile(r"^a_\d+$")
_RAIZ_POLINOMIO = re.compile(r"^x[₀-₉]+$")


def _es_variable(clave: str) -> bool:
    return not clave.endswith(" (decimal)") and not clave.startswith(("ε", "Є")) and clave != "I"


# slug -> ¿esta clave del resultado es parte de la respuesta?
_REGLAS: dict[str, Callable[[str], bool]] = {
    "interpolacion-lineal": lambda k: k in ("g(x)", "Є"),
    "newton-adelante": lambda k: k == "g(x)",
    "newton-atras": lambda k: k == "g(x)",
    "diferencias-divididas": lambda k: k == "g(x)",
    "lagrange": lambda k: k == "g(x)",
    "bisectriz": lambda k: k == "x",
    "punto-fijo": lambda k: k == "x",
    "newton-raphson": lambda k: k == "x",
    "falsa-posicion": lambda k: k == "x",
    "secante": lambda k: k == "x",
    "montante": lambda k: _es_variable(k) and k != "Determinante",
    "gauss-jordan": _es_variable,
    "eliminacion-gaussiana": _es_variable,
    "gauss-seidel": _es_variable,
    "jacobi": _es_variable,
    "raices-polinomios": lambda k: bool(_RAIZ_POLINOMIO.match(k)),
    "linea-recta": lambda k: bool(_COEFICIENTE.match(k)),
    "cuadratica": lambda k: bool(_COEFICIENTE.match(k)),
    "cubica": lambda k: bool(_COEFICIENTE.match(k)),
    "lineal-con-funcion": lambda k: bool(_COEFICIENTE.match(k)),
    "cuadratica-con-funcion": lambda k: bool(_COEFICIENTE.match(k)),
    "trapezoidal": lambda k: k == "I",
    "newton-cotes-cerradas": lambda k: k == "I",
    "newton-cotes-abiertas": lambda k: k == "I",
    "simpson-1-3": lambda k: k == "I",
    "simpson-3-8": lambda k: k == "I",
    "euler-adelante": lambda k: bool(_EDO.match(k)),
    "euler-atras": lambda k: bool(_EDO.match(k)),
    "euler-modificado": lambda k: bool(_EDO.match(k)),
    "runge-kutta-2": lambda k: bool(_EDO.match(k)),
    "runge-kutta-3": lambda k: bool(_EDO.match(k)),
    "runge-kutta-4-simpson-1-3": lambda k: bool(_EDO.match(k)),
    "runge-kutta-4-simpson-3-8": lambda k: bool(_EDO.match(k)),
    "runge-kutta-orden-superior": lambda k: bool(_EDO.match(k)),
}


def tiene_respuesta(slug: str) -> bool:
    """Los métodos de consulta (p. ej. la tabla de constantes de Newton – Cotes) no plantean problema."""
    return slug in _REGLAS or slug == "grafico"


def _primer_intervalo_izquierdo(resultado: Mapping[str, str]) -> str:
    m = re.search(r"\[\s*(-?[\d.]+)\s*,", resultado.get("intervalos", ""))
    return m.group(1) if m else ""


def valores_esperados(slug: str, resultado: Mapping[str, str]) -> dict[str, str]:
    """clave -> valor esperado (en decimal) de cada campo que el alumno debe capturar."""
    if slug == "grafico":
        esperados = {CLAVE_GRAFICO_CAMBIOS: resultado.get("cambios de signo", "0")}
        izquierdo = _primer_intervalo_izquierdo(resultado)
        if izquierdo:
            esperados[CLAVE_GRAFICO_X] = izquierdo
        return esperados
    regla = _REGLAS[slug]
    esperados: dict[str, str] = {}
    for clave, valor in resultado.items():
        if regla(clave):
            esperados[clave] = resultado.get(f"{clave} (decimal)", valor)
    return esperados


def campos_respuesta(slug: str, resultado: Mapping[str, str]) -> list[str]:
    return list(valores_esperados(slug, resultado))


def _a_decimal(texto: str) -> Decimal | None:
    limpio = texto.strip().replace("−", "-").replace(",", ".").replace(" ", "")
    if not limpio:
        return None
    try:
        q = Fraction(limpio)
    except (ValueError, ZeroDivisionError):
        return None
    with localcontext() as ctx:
        ctx.prec = 60
        return Decimal(q.numerator) / Decimal(q.denominator)


def _candidatos(valor: Decimal) -> set[Decimal]:
    """Valor a 3 decimales redondeado y truncado."""
    with localcontext() as ctx:
        ctx.prec = 60
        return {valor.quantize(_UNIDAD, rounding=ROUND_HALF_UP) + 0, valor.quantize(_UNIDAD, rounding=ROUND_DOWN) + 0}


def coinciden(esperado: str, dado: str) -> bool:
    """¿`dado` coincide con `esperado` en la parte entera y en los primeros 3 decimales?"""
    e, d = _a_decimal(esperado), _a_decimal(dado)
    if e is None or d is None:
        return False
    return bool(_candidatos(e) & _candidatos(d))


def verificar(slug: str, resultado: Mapping[str, str], respuesta: Mapping[str, str]) -> dict[str, bool]:
    """clave -> ¿correcta? para cada campo esperado. Las raíces de un polinomio pueden darse en cualquier orden."""
    esperados = valores_esperados(slug, resultado)
    if slug == "raices-polinomios":
        libres = list(esperados.values())
        veredicto: dict[str, bool] = {}
        for clave in esperados:
            dado = respuesta.get(clave, "")
            encontrado = next((v for v in libres if coinciden(v, dado)), None)
            veredicto[clave] = encontrado is not None
            if encontrado is not None:
                libres.remove(encontrado)
        return veredicto
    return {clave: coinciden(valor, respuesta.get(clave, "")) for clave, valor in esperados.items()}


def es_correcta(veredicto: Sequence[bool] | Mapping[str, bool]) -> bool:
    valores = list(veredicto.values()) if isinstance(veredicto, Mapping) else list(veredicto)
    return bool(valores) and all(valores)
