"""Modo Comprobación Docente: guarda las dos imágenes en disco y registra la evidencia en la BD."""
from dataclasses import dataclass

from app.domain.entities import EvidenciaPartida
from app.domain.funciones import ErrorMetodo
from app.domain.repositories import EvidenciaGuardada, IEvidenciaRepo, IFileStorage

TIPOS_IMAGEN = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
TAMANO_MAXIMO = 8 * 1024 * 1024  # 8 MB por imagen


@dataclass(frozen=True)
class ImagenSubida:
    contenido: bytes
    tipo_mime: str


def _extension(imagen: ImagenSubida, nombre: str) -> str:
    if imagen.tipo_mime not in TIPOS_IMAGEN:
        raise ErrorMetodo(f"{nombre}: formato no admitido ({imagen.tipo_mime}). Usa PNG, JPG o WebP.")
    if not imagen.contenido:
        raise ErrorMetodo(f"{nombre}: el archivo está vacío.")
    if len(imagen.contenido) > TAMANO_MAXIMO:
        raise ErrorMetodo(f"{nombre}: supera 8 MB.")
    return TIPOS_IMAGEN[imagen.tipo_mime]


class GestionarEvidencia:
    def __init__(self, repo: IEvidenciaRepo, almacen: IFileStorage) -> None:
        self._repo = repo
        self._almacen = almacen

    def registrar(
        self,
        *,
        matricula: str,
        nivel: int,
        metodo: str,
        funcion: str,
        resultado_exacto: str,
        error: float | None,
        iteraciones: list[dict[str, str | None]],
        foto_procedimiento: ImagenSubida,
        foto_canvas: ImagenSubida,
    ) -> EvidenciaGuardada:
        if not matricula.strip():
            raise ErrorMetodo("Escribe la matrícula del alumno.")
        ext_proc = _extension(foto_procedimiento, "Foto del procedimiento")
        ext_canvas = _extension(foto_canvas, "Captura de la gráfica")

        ruta_proc = self._almacen.guardar(foto_procedimiento.contenido, ext_proc)
        ruta_canvas = self._almacen.guardar(foto_canvas.contenido, ext_canvas)
        try:
            return self._repo.guardar(
                EvidenciaPartida(
                    matricula=matricula.strip(),
                    nivel=nivel,
                    metodo=metodo,
                    funcion=funcion,
                    resultado_exacto=resultado_exacto,
                    error=error,
                    iteraciones=iteraciones,
                    foto_procedimiento_url=ruta_proc,
                    foto_canvas_url=ruta_canvas,
                )
            )
        except Exception:
            self._almacen.eliminar(ruta_proc)
            self._almacen.eliminar(ruta_canvas)
            raise

    def listar(self, limite: int = 50, matricula: str | None = None) -> list[EvidenciaGuardada]:
        return self._repo.ultimas(max(1, min(limite, 200)), matricula or None)
