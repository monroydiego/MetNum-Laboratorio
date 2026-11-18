// Tokens de diseño para el Canvas (espejo de @theme en index.css).
//
// Dirección artística «Cinta de Plata»: el laboratorio es un corto animado
// «rubber hose» en blanco y negro de 1930. Todo es tinta sobre plata.
//   · OMEGA es lo ÚNICO a todo color: su rojo mancha la película (hostil/omega).
//   · Cada sala recuperada se «colorea a mano» con su tinte (ver `tintes`):
//     el progreso del jugador devuelve el color al laboratorio.
//   · El dorado es el foco de atención (interacción, selección, estrellas).
// Los NOMBRES de los colores se conservan (los consumen componentes y dibujo.ts).
export const color = {
  // Plata (superficies)
  fondo: '#e6e5df', // plata de la película (fondo de escena)
  panel: '#fbfbf8', // blanco de fotograma (tarjetas)
  panel2: '#efeee9', // plata clara (zonas secundarias)
  campo: '#ffffff', // campos de texto
  papel: '#ffffff', // blanco de guante / brillo
  linea: '#b9b8b1', // lápiz gris (divisores, retícula)
  gris: '#8d8c85', // medio tono DECORATIVO (sombreado cel, inactivos). No usar para texto.
  // Tinta
  tinta: '#131313', // tinta china (texto, contornos, «lo propio»)
  tenue: '#56554e', // tinta aguada (texto secundario, AA)
  // Semánticos
  primario: '#131313', // lo propio y seguro = tinta
  primario2: '#cfcec7', // plata media (rellenos neutros, hover)
  ambar: '#6b5000', // dorado oscuro para TEXTO de atención (AA)
  ambar2: '#f2c230', // dorado foco (rellenos, estrellas, anillo de foco)
  menta: '#1f6b3e', // éxito: el color que regresa
  menta2: '#dfece2', // éxito lavado
  hostil: '#c8102e', // rojo OMEGA: SOLO lo hostil / error
  omega: '#8e0b20', // rojo profundo del núcleo
  escudo: '#4b3b8f', // violeta de los escudos de OMEGA
  azul: '#2a4f86', // tinta azul de pluma (series de gráficas)
} as const;

/** Tinte a mano de cada sala al recuperarla (claves = IdSala de mapa.ts). Decorativos: no para texto. */
export const tintes = {
  sensores: '#c98a1c', // Interpolación: sepia ámbar
  acceso: '#3f6fb8', // Ecuaciones no lineales: azul noche
  energia: '#3f8a4e', // Ecuaciones lineales: verde
  anomalias: '#7c55b5', // Mínimos cuadrados: violeta
  integrador: '#23908e', // Integración: turquesa
  omega: '#d19a12', // Ecuaciones diferenciales (OMEGA derrotada): oro
} as const;

export type IdTinte = keyof typeof tintes;

export const fuente = {
  display: '"Bowlby One", "Arial Black", system-ui, sans-serif',
  sans: '"Atkinson Hyperlegible", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

/** Grosor de trazo de tinta en px CSS. */
export const trazo = {
  fino: 1.5, // detalle, retícula fuerte
  medio: 2.5, // escenario, bordes de UI
  grueso: 4, // actores (personaje, drones)
} as const;

/** Sombra dura desplazada: luz arriba-izquierda, sombra abajo-derecha (igual que --shadow-tinta). */
export const sombra = {
  dx: 4,
  dy: 4,
  contacto: 0.25, // alfa de la elipse de sombra bajo actores
} as const;

export const radio = {
  sm: 8,
  md: 14,
  lg: 22,
} as const;

export const movimiento = {
  boilMs: 83, // «line boil» a 12 fps, como en la animación a dos
  rapido: 140,
  normal: 260,
  lento: 520,
  /** Curvas para interpolar en Canvas (equivalentes a --ease-* en CSS). */
  elastico: (t: number) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
  },
  suave: (t: number) => 1 - (1 - t) ** 3,
} as const;

/** Paleta de series de la gráfica: nunca usa rojo (reservado a OMEGA). */
export const paletaSeries = [color.tinta, color.azul, color.ambar, color.menta, color.escudo, color.tenue] as const;

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
