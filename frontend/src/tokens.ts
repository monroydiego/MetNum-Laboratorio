// Tokens de color para el Canvas (espejo de @theme en index.css).
export const color = {
  fondo: '#f1efe9',
  panel: '#ffffff',
  panel2: '#f7f6f2',
  linea: '#dedad1',
  tinta: '#22302d',
  tenue: '#5f6b67',
  primario: '#2d7a67',
  primario2: '#8fc3b4',
  ambar: '#b9741a',
  menta: '#2f8f55',
  hostil: '#c4483a',
  omega: '#a8325a',
  escudo: '#6f55b8',
  azul: '#3c6ea6',
} as const;

export const fuente = {
  display: '"Outfit", system-ui, sans-serif',
  sans: '"Atkinson Hyperlegible", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

/** Paleta de series de la gráfica: nunca usa rojo (reservado a lo hostil). */
export const paletaSeries = [color.primario, color.ambar, color.azul, color.escudo, color.menta, color.tinta] as const;

/** Añade canal alfa (0-1) a un color hexadecimal #rrggbb. */
export function conAlfa(hex: string, alfa: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alfa)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

export function prefiereMovimientoReducido(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
