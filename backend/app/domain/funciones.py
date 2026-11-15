"""Puerto (CAPA 1) para funciones matemáticas ingresadas por el usuario.

Los casos de uso reciben objetos que cumplen `FuncionUsuario`; la implementación con SymPy vive en
`infrastructure/math_parser.py`. Así `use_cases/` no depende de SymPy.
"""
from typing import Any, Protocol


class FuncionUsuario(Protocol):
    texto: str  # expresión tal como la escribió el usuario
    latex: str  # expresión en LaTeX

    def __call__(self, *valores: Any) -> Any:  # recibe y devuelve mpmath.mpf
        ...


class Derivable(FuncionUsuario, Protocol):
    def derivada(self) -> "FuncionUsuario": ...


class ErrorMetodo(ValueError):
    """Error de datos de entrada o caso borde del método (se responde con HTTP 422)."""
