"""CAPA 1: entidades puras. Sin dependencias de fastapi, sqlalchemy ni sympy.

Todo método del libro devuelve un `ResultadoNumerico` con la misma forma:
- `columnas` + `filas`: la tabla tal como la presenta el libro (encabezados en LaTeX).
- `pasos`: la sustitución renglón por renglón (integración, EDO, matrices, etc.).
- `resultado`: valores finales con nombre del libro (g(x), x, I, y_{n+1}, a_0...).
Los valores de precisión viajan como `str`; las coordenadas de gráfica y los errores, como `float`.
"""
from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class Columna:
    clave: str  # identificador de la columna en cada fila
    latex: str  # encabezado tal como lo escribe el libro


@dataclass(frozen=True)
class Paso:
    descripcion: str  # texto en español ("Sustituyendo en g(x)")
    latex: str  # expresión KaTeX


@dataclass(frozen=True)
class Matriz:
    """Matriz intermedia (Montante, Gauss – Jordán, Eliminación Gaussiana, mínimos cuadrados)."""

    titulo: str
    filas: list[list[str]]  # valores exactos como str ("62/87", "1.5")
    pivote: tuple[int, int] | None = None  # (fila, columna) del elemento pivote, si aplica
    nota: str | None = None  # p. ej. "Pivote = 2" (pivote anterior en Montante)


@dataclass(frozen=True)
class Serie:
    nombre: str
    tipo: Literal["linea", "puntos"]
    puntos: list[tuple[float, float]]


@dataclass
class ResultadoNumerico:
    metodo: str  # slug del endpoint
    nombre_libro: str  # nombre exacto del método en el libro
    pagina: int  # página del libro impreso
    columnas: list[Columna] = field(default_factory=list)
    filas: list[dict[str, str | None]] = field(default_factory=list)
    pasos: list[Paso] = field(default_factory=list)
    matrices: list[Matriz] = field(default_factory=list)
    resultado: dict[str, str] = field(default_factory=dict)
    errores: list[float] = field(default_factory=list)  # Є por iteración, para graficar convergencia
    series: list[Serie] = field(default_factory=list)
    advertencias: list[str] = field(default_factory=list)


@dataclass
class EvidenciaPartida:
    matricula: str
    nivel: int
    metodo: str
    funcion: str
    resultado_exacto: str
    error: float | None
    iteraciones: list[dict[str, str | None]]
    foto_procedimiento_url: str
    foto_canvas_url: str  # "" en los intentos de respuesta del juego (solo llevan la foto del procedimiento)
    # Intento de respuesta del juego: True/False según la verificación; None = evidencia del Modo Comprobación.
    correcta: bool | None = None


@dataclass(frozen=True)
class Docente:
    id: int
    correo: str
