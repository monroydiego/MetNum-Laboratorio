// Tokens de color para el Canvas (espejo de @theme en index.css).
export const color = {
  fondo: '#070e15',
  panel: '#101b26',
  panel2: '#121f2b',
  linea: '#263645',
  tinta: '#eaf3fb',
  tenue: '#8fa1b2',
  cian: '#48e7d5',
  cian2: '#178f8f',
  ambar: '#ffcf76',
  menta: '#83eda3',
  hostil: '#ff7781',
  omega: '#ff396d',
  escudo: '#bf76fb',
} as const;

export const fuente = {
  display: '"Chakra Petch", system-ui, sans-serif',
  sans: '"Atkinson Hyperlegible", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

/** Paleta de series de la gráfica: nunca usa rojo (reservado a lo hostil). */
export const paletaSeries = [color.cian, color.ambar, color.menta, color.escudo, '#7fb4ff', color.tinta] as const;

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
