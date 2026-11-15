// Espejo de backend/app/presentation/schemas_minimos_cuadrados.py (skill sync-contratos).
// Unidad II · 4 Mínimos Cuadrados. Valores numéricos como string (precisión).

/** Línea Recta (p.46), Cuadrática (p.48), Cúbica (p.48). */
export interface MinimosCuadradosIn {
  x: string[];
  y: string[];
  decimales?: number; // 1–30, por defecto 9
}

/** Lineal con Función (p.49), Cuadrática con Función (p.49). */
export interface MinimosCuadradosConFuncionIn extends MinimosCuadradosIn {
  funcion: string; // e^x, sen(x), cos(x), tg(x), Ln(x), etc.
}

export type SlugMinimosCuadrados =
  | 'linea-recta'
  | 'cuadratica'
  | 'cubica'
  | 'lineal-con-funcion'
  | 'cuadratica-con-funcion';
