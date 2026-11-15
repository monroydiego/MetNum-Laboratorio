"""Evaluador seguro con SymPy (parse_expr con diccionario cerrado, sin eval/exec propios).

Acepta la notación del libro: `sen`, `tg`, `Ln`, `e^x`, `2x` (multiplicación implícita), `^` como potencia.
"""
from dataclasses import dataclass, field
from typing import Any

import mpmath
import sympy as sp
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from app.domain.funciones import ErrorMetodo

_TRANSFORMACIONES = standard_transformations + (implicit_multiplication_application, convert_xor)

_FUNCIONES: dict[str, Any] = {
    "sen": sp.sin,
    "sin": sp.sin,
    "cos": sp.cos,
    "tg": sp.tan,
    "tan": sp.tan,
    "sec": sp.sec,
    "csc": sp.csc,
    "cot": sp.cot,
    "ctg": sp.cot,  # notación de las Actividades Fundamentales (context/OR)
    "ln": sp.log,
    "Ln": sp.log,
    "log": sp.log,
    "exp": sp.exp,
    "sqrt": sp.sqrt,
    "raiz": sp.sqrt,
    "abs": sp.Abs,
    "e": sp.E,
    "E": sp.E,
    "pi": sp.pi,
}

_PROHIBIDO = ("__", "import", "lambda", "exec", "eval", "open", ";", "[", "{")


def _parsear(texto: str, variables: tuple[str, ...], evaluar: bool = True) -> sp.Expr:
    limpio = texto.strip().replace("**", "^").replace("·", "*")
    if not limpio or len(limpio) > 300 or any(p in limpio for p in _PROHIBIDO):
        raise ErrorMetodo(f"Expresión no permitida: {texto!r}")
    simbolos = {v: sp.Symbol(v) for v in variables}
    try:
        expr = parse_expr(
            limpio,
            local_dict={**_FUNCIONES, **simbolos},
            global_dict={"Integer": sp.Integer, "Float": sp.Float, "Rational": sp.Rational,
                         "Symbol": sp.Symbol, "Function": sp.Function,
                         "Mul": sp.Mul, "Add": sp.Add, "Pow": sp.Pow},
            transformations=_TRANSFORMACIONES,
            evaluate=evaluar,
        )
    except Exception as exc:  # noqa: BLE001 — cualquier error de sintaxis se reporta igual
        raise ErrorMetodo(f"No se pudo interpretar la expresión {texto!r}") from exc
    if not isinstance(expr, sp.Expr):
        raise ErrorMetodo(f"La expresión {texto!r} no es una función matemática")
    sobrantes = {str(s) for s in expr.free_symbols} - set(variables)
    if sobrantes:
        raise ErrorMetodo(
            f"Variables no reconocidas en {texto!r}: {', '.join(sorted(sobrantes))}. "
            f"Usa solo: {', '.join(variables)}"
        )
    return expr


@dataclass
class FuncionSympy:
    """Implementa `domain.funciones.FuncionUsuario` / `Derivable`."""

    texto: str
    variables: tuple[str, ...]
    expr: sp.Expr = field(repr=False)
    latex: str = ""

    def __post_init__(self) -> None:
        if not self.latex:
            self.latex = sp.latex(self.expr, ln_notation=True)  # el libro escribe Ln, no log
        self._f = sp.lambdify([sp.Symbol(v) for v in self.variables], self.expr, modules="mpmath")

    def __call__(self, *valores: Any) -> Any:
        try:
            resultado = self._f(*valores)
        except ZeroDivisionError as exc:
            raise ErrorMetodo(f"División entre cero al evaluar {self.texto}") from exc
        return mpmath.mpf(resultado) if isinstance(resultado, (int, float)) else resultado

    def derivada(self, variable: str | None = None) -> "FuncionSympy":
        var = sp.Symbol(variable or self.variables[0])
        d = sp.diff(self.expr, var)
        return FuncionSympy(texto=str(d), variables=self.variables, expr=d)


def crear_funcion(texto: str, variables: tuple[str, ...] = ("x",)) -> FuncionSympy:
    expr = _parsear(texto, variables)
    try:
        # LaTeX con la forma que escribió el usuario (sin reordenar términos), como en el libro.
        latex = sp.latex(_parsear(texto, variables, evaluar=False), ln_notation=True, order="none")
    except ErrorMetodo:
        latex = ""
    return FuncionSympy(texto=texto, variables=variables, expr=expr, latex=latex)
