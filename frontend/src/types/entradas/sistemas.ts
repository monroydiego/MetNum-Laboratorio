// Espejo de backend/app/presentation/schemas_sistemas.py (skill sync-contratos).
// Unidad II · 3 Solución de Ecuaciones Lineales (libro p.28–44).
// Todos los valores numéricos viajan como string ("2", "-1/3", "0.5"): NUNCA usar Number().

/** Base de Montante, Gauss – Jordán y Eliminación Gaussiana. */
export interface SistemaDirectoIn {
  /** Matriz aumentada [A|b], renglón por renglón (n renglones de n + 1 elementos). */
  matriz: string[][];
  /** Nombres de las variables en orden; null = los del libro. */
  variables?: string[] | null;
  /** Decimales del valor decimal de apoyo (1–30). */
  decimales?: number;
}

/** Montante (p.29). Variables por defecto: a, b, c. */
export type MontanteIn = SistemaDirectoIn;

/** Gauss – Jordán (p.32). Variables por defecto: a, b, c. */
export type GaussJordanIn = SistemaDirectoIn;

/** Eliminación Gaussiana (p.34). Variables por defecto: x₁, x₂, x₃. */
export type EliminacionGaussianaIn = SistemaDirectoIn;

/** Base de Gauss – Seidel y Jacobi. */
export interface SistemaIterativoIn extends SistemaDirectoIn {
  /** Margen de error ε (por defecto "0.001"). */
  tolerancia?: string;
}

/** Gauss – Seidel (p.36). Variables por defecto: x, y, z. Inicia con cero. */
export type GaussSeidelIn = SistemaIterativoIn;

/** Jacobi (p.39). Variables por defecto: x, y, z. Inicia con uno. */
export type JacobiIn = SistemaIterativoIn;

/** Raíces de Polinomios (p.42). */
export interface RaicesPolinomiosIn {
  /** Coeficientes en orden decreciente con respecto al grado: x² + x − 6 -> ["1", "1", "-6"]. */
  coeficientes: string[];
  decimales?: number;
}
