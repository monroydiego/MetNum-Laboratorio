// Espejo de backend/app/presentation/schemas_edos.py (skill sync-contratos).
// Unidad IV · 6 Ecuaciones Diferenciales Ordinarias (libro p.62–73).
// Valores numéricos como string (se convierten con mpmath en el backend).

/** Euler hacia Adelante y Runge – Kutta de 2do, 3er y 4to orden. y' en términos de y y t. */
export interface EdoIn {
  /** y' ya despejada, en y y t; p. ej. "(5yt - 1)/3" */
  funcion: string;
  y0: string;
  h: string;
  /** t_0 (el libro: siempre es 0 pues parte del origen). Default "0". */
  t0?: string;
  /** Cantidad de valores y_{n+1} a calcular (1 a 500). Default 1. */
  pasos?: number;
  /** 1 a 30. Default 9. */
  decimales?: number;
}

/** Euler hacia Atrás y Euler Modificado: y_{n+1} usado dentro de f en el primer paso. */
export interface EdoArranqueIn extends EdoIn {
  /** Si se omite, y_{n+1} = y_n. */
  y_siguiente?: string | null;
}

/** Runge – Kutta de Orden Superior: y'' = f(V, U, q) con V = y', U = y, q = t. */
export interface EdoOrdenSuperiorIn {
  /** y'' ya despejada, en V, U y q; p. ej. "2Vq - U" */
  funcion: string;
  y0: string;
  /** y'_0 */
  yp0: string;
  h: string;
  /** q_0 = t_0. Default "0". */
  q0?: string;
  pasos?: number;
  decimales?: number;
}

export type SlugEdo =
  | 'euler-adelante'
  | 'euler-atras'
  | 'euler-modificado'
  | 'runge-kutta-2'
  | 'runge-kutta-3'
  | 'runge-kutta-4-simpson-1-3'
  | 'runge-kutta-4-simpson-3-8'
  | 'runge-kutta-orden-superior';

/** Cuerpo de entrada por slug. */
export interface EntradasEdo {
  'euler-adelante': EdoIn;
  'euler-atras': EdoArranqueIn;
  'euler-modificado': EdoArranqueIn;
  'runge-kutta-2': EdoIn;
  'runge-kutta-3': EdoIn;
  'runge-kutta-4-simpson-1-3': EdoIn;
  'runge-kutta-4-simpson-3-8': EdoIn;
  'runge-kutta-orden-superior': EdoOrdenSuperiorIn;
}
