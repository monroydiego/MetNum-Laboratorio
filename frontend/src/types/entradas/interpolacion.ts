// Espejo de backend/app/presentation/schemas_interpolacion.py (skill sync-contratos).
// Valores numéricos como string (se convierten con mpmath en el backend).

/** Interpolación Lineal (p.4). */
export interface InterpolacionLinealIn {
  a: string;
  b: string;
  x: string;
  f_a?: string | null;
  f_b?: string | null;
  f_x?: string | null;
  funcion?: string | null;
  decimales?: number;
}

/** Newton hacia Adelante, Newton hacia Atrás, Newton con Diferencias Divididas y Lagrange (p.6–14). */
export interface TablaInterpolacionIn {
  /** x_i (abscisas de los datos), mínimo 2 */
  x: string[];
  /** y_i (ordenadas de los datos), mismo largo que x */
  y: string[];
  /** x en el que se obtiene g(x) */
  x_interpolar: string;
  decimales?: number;
}
