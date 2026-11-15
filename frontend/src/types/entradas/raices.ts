// Espejo de backend/app/presentation/schemas_raices.py (skill sync-contratos).
// Valores numéricos como string (se convierten con mpmath en el backend).
// max_iteraciones: salvaguarda de implementación (el libro no la define); null => 100.

/** Gráfico (p.15): tabla X | Y de a a b con incremento `paso`. */
export interface GraficoIn {
  funcion: string;
  /** X inicial */
  a: string;
  /** X final */
  b: string;
  /** Incremento de X (default "1") */
  paso?: string;
  decimales?: number;
}

/** Bisectriz (p.16). */
export interface BisectrizIn {
  funcion: string;
  /** a: valor donde la función se comporta positiva */
  a: string;
  /** b: valor donde la función se comporta negativa */
  b: string;
  /** Margen de Error Є = |x_{i+1} - x_i| (default "0.001") */
  tolerancia?: string;
  decimales?: number;
  max_iteraciones?: number | null;
}

/** Punto Fijo ó Sustituciones Sucesivas (p.17–18). */
export interface PuntoFijoIn {
  /** g(x) de la forma equivalente x = g(x) */
  funcion: string;
  /** x_0: valor de inicio */
  x0: string;
  /** Margen de Error Є (default "0.00001") */
  tolerancia?: string;
  /** f(x) original, opcional (solo para graficar) */
  f?: string | null;
  decimales?: number;
  max_iteraciones?: number | null;
}

/** Newton – Raphson (p.19–20). */
export interface NewtonRaphsonIn {
  funcion: string;
  /** f'(x); si se omite se deriva automáticamente */
  derivada?: string | null;
  /** x_0: valor inicial */
  x0: string;
  /** Margen de Error Є (default "0.000001") */
  tolerancia?: string;
  decimales?: number;
  max_iteraciones?: number | null;
}

/** Falsa Posición ó Regula – Falsi (p.21–22). */
export interface FalsaPosicionIn {
  funcion: string;
  a: string;
  /** b: punto fijo */
  b: string;
  /** Margen de Error Є (default "0.001") */
  tolerancia?: string;
  decimales?: number;
  max_iteraciones?: number | null;
}

/** Secante (p.23–24). */
export interface SecanteIn {
  funcion: string;
  x0: string;
  x1: string;
  /** Margen de Error Є (default "0.001") */
  tolerancia?: string;
  decimales?: number;
  max_iteraciones?: number | null;
}
