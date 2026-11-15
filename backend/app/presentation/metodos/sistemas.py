"""Adaptadores HTTP · Unidad II · 3 Solución de Ecuaciones Lineales."""
from app.domain.entities import ResultadoNumerico
from app.presentation.registro import registrar
from app.presentation.schemas_sistemas import (
    EliminacionGaussianaIn,
    GaussJordanIn,
    GaussSeidelIn,
    JacobiIn,
    MontanteIn,
    RaicesPolinomiosIn,
)
from app.use_cases import sistemas as uc

CAPITULO = "3 Solución de Ecuaciones Lineales"

# Ejemplo p.37 y p.40 (mismo sistema para Gauss – Seidel y Jacobi)
_EJEMPLO_ITERATIVO = {
    "matriz": [["1", "-3", "5", "5"], ["8", "-1", "-1", "8"], ["-2", "4", "1", "4"]],
    "variables": ["x", "y", "z"],
    "tolerancia": "0.001",
    "decimales": 9,
}


@registrar(
    slug="montante",
    nombre_libro="Montante",
    pagina=29,
    unidad=2,
    capitulo=CAPITULO,
    entrada=MontanteIn,
    # Ejemplo p.30: 2a + 5b − 2c = 1; −a + 2b + 3c = 2; 3a − 3b + 2c = 3
    ejemplo={"matriz": [["2", "5", "-2", "1"], ["-1", "2", "3", "2"], ["3", "-3", "2", "3"]],
             "variables": ["a", "b", "c"], "decimales": 9},
)
def montante(d: MontanteIn) -> ResultadoNumerico:
    return uc.montante(d.matriz, d.variables, d.decimales)


@registrar(
    slug="gauss-jordan",
    nombre_libro="Gauss – Jordán",
    pagina=32,
    unidad=2,
    capitulo=CAPITULO,
    entrada=GaussJordanIn,
    # Ejemplo p.33: 3a − 2b + 2c = 1; 4a + 2b + 2c = 2; 3a − 3b + 3c = 3
    ejemplo={"matriz": [["3", "-2", "2", "1"], ["4", "2", "2", "2"], ["3", "-3", "3", "3"]],
             "variables": ["a", "b", "c"], "decimales": 9},
)
def gauss_jordan(d: GaussJordanIn) -> ResultadoNumerico:
    return uc.gauss_jordan(d.matriz, d.variables, d.decimales)


@registrar(
    slug="eliminacion-gaussiana",
    nombre_libro="Eliminación Gaussiana",
    pagina=34,
    unidad=2,
    capitulo=CAPITULO,
    entrada=EliminacionGaussianaIn,
    # Ejemplo p.34: 2x₁ + x₂ − 3x₃ = −1; −x₁ + 3x₂ + 2x₃ = 12; 3x₁ + x₂ − 3x₃ = 0
    ejemplo={"matriz": [["2", "1", "-3", "-1"], ["-1", "3", "2", "12"], ["3", "1", "-3", "0"]],
             "variables": ["x₁", "x₂", "x₃"], "decimales": 9},
)
def eliminacion_gaussiana(d: EliminacionGaussianaIn) -> ResultadoNumerico:
    return uc.eliminacion_gaussiana(d.matriz, d.variables, d.decimales)


@registrar(
    slug="gauss-seidel",
    nombre_libro="Gauss – Seidel",
    pagina=36,
    unidad=2,
    capitulo=CAPITULO,
    entrada=GaussSeidelIn,
    ejemplo=_EJEMPLO_ITERATIVO,
)
def gauss_seidel(d: GaussSeidelIn) -> ResultadoNumerico:
    return uc.gauss_seidel(d.matriz, d.variables, d.tolerancia, d.decimales)


@registrar(
    slug="jacobi",
    nombre_libro="Jacobi",
    pagina=39,
    unidad=2,
    capitulo=CAPITULO,
    entrada=JacobiIn,
    ejemplo=_EJEMPLO_ITERATIVO,
)
def jacobi(d: JacobiIn) -> ResultadoNumerico:
    return uc.jacobi(d.matriz, d.variables, d.tolerancia, d.decimales)


@registrar(
    slug="raices-polinomios",
    nombre_libro="Raíces de Polinomios",
    pagina=42,
    unidad=2,
    capitulo=CAPITULO,
    entrada=RaicesPolinomiosIn,
    # Ejemplo p.42: f(x) = x² + x − 6
    ejemplo={"coeficientes": ["1", "1", "-6"], "decimales": 9},
)
def raices_polinomios(d: RaicesPolinomiosIn) -> ResultadoNumerico:
    return uc.raices_polinomios(d.coeficientes, d.decimales)
