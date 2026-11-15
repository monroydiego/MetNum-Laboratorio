// Espejo de backend/app/presentation/schemas_integracion.py (skill sync-contratos).
// Unidad III · 5 Integración. Valores numéricos como string (precisión); n y decimales como number.

/** Entrada común: trapezoidal, newton-cotes-cerradas, newton-cotes-abiertas, simpson-1-3, simpson-3-8. */
export interface IntegracionIn {
  funcion: string; // f(x), p. ej. "1/(1+x^2)"
  a: string; // límite inferior
  b: string; // límite superior
  n: number; // entero 1..1000 (1/3 Simpson: par; 3/8 Simpson: 3; Cerradas: 1..10; Abiertas: 1..6)
  decimales?: number; // 1..30, por defecto 9
}

export type TipoTablaNewtonCotes = 'cerradas' | 'abiertas' | 'ambas';

/** Entrada de tablas-newton-cotes. */
export interface TablasNewtonCotesIn {
  tipo?: TipoTablaNewtonCotes; // por defecto "ambas"
}

/** Claves de `resultado` en los métodos de integración (valores string). */
export type ResultadoIntegracion = {
  h: string;
  I: string;
  'α'?: string; // solo Newton – Cotes, p. ej. "6/20"
};
