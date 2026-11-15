"""Adaptadores HTTP · Unidad II · 4 Mínimos Cuadrados."""
from app.domain.entities import ResultadoNumerico
from app.infrastructure.math_parser import crear_funcion
from app.presentation.registro import registrar
from app.presentation.schemas_minimos_cuadrados import MinimosCuadradosConFuncionIn, MinimosCuadradosIn
from app.use_cases import minimos_cuadrados as uc
from app.use_cases._comun import num

CAPITULO = "4 Mínimos Cuadrados"

# Ejemplo p.46 (Línea Recta). El libro no trae ejemplo para los demás ajustes: se reutilizan estos datos.
_X = ["1.1", "1.9", "2.4", "4.8", "5.1", "10.5"]
_Y = ["2.5", "2.7", "3.7", "5.2", "6.0", "8.3"]
_EJEMPLO = {"x": _X, "y": _Y, "decimales": 9}
_EJEMPLO_FUNCION = {**_EJEMPLO, "funcion": "Ln(x)"}


def _datos(d: MinimosCuadradosIn):
    return [num(v) for v in d.x], [num(v) for v in d.y]


@registrar(slug="linea-recta", nombre_libro="Línea Recta", pagina=46, unidad=2, capitulo=CAPITULO,
           entrada=MinimosCuadradosIn, ejemplo=_EJEMPLO)
def linea_recta(d: MinimosCuadradosIn) -> ResultadoNumerico:
    x, y = _datos(d)
    return uc.linea_recta(x, y, d.decimales)


@registrar(slug="cuadratica", nombre_libro="Cuadrática", pagina=48, unidad=2, capitulo=CAPITULO,
           entrada=MinimosCuadradosIn, ejemplo=_EJEMPLO)
def cuadratica(d: MinimosCuadradosIn) -> ResultadoNumerico:
    x, y = _datos(d)
    return uc.cuadratica(x, y, d.decimales)


@registrar(slug="cubica", nombre_libro="Cúbica", pagina=48, unidad=2, capitulo=CAPITULO,
           entrada=MinimosCuadradosIn, ejemplo=_EJEMPLO)
def cubica(d: MinimosCuadradosIn) -> ResultadoNumerico:
    x, y = _datos(d)
    return uc.cubica(x, y, d.decimales)


@registrar(slug="lineal-con-funcion", nombre_libro="Lineal con Función", pagina=49, unidad=2,
           capitulo=CAPITULO, entrada=MinimosCuadradosConFuncionIn, ejemplo=_EJEMPLO_FUNCION)
def lineal_con_funcion(d: MinimosCuadradosConFuncionIn) -> ResultadoNumerico:
    x, y = _datos(d)
    return uc.lineal_con_funcion(x, y, crear_funcion(d.funcion, ("x",)), d.decimales)


@registrar(slug="cuadratica-con-funcion", nombre_libro="Cuadrática con Función", pagina=49, unidad=2,
           capitulo=CAPITULO, entrada=MinimosCuadradosConFuncionIn, ejemplo=_EJEMPLO_FUNCION)
def cuadratica_con_funcion(d: MinimosCuadradosConFuncionIn) -> ResultadoNumerico:
    x, y = _datos(d)
    return uc.cuadratica_con_funcion(x, y, crear_funcion(d.funcion, ("x",)), d.decimales)
