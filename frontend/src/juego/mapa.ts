// Mapa del juego (aprobado): 4 sectores = 4 Unidades del libro.
// Los nombres visibles de cada método salen del catálogo del backend (`nombre_libro`);
// aquí solo se guardan el slug y la posición de la consola dentro de la sala.

export type IdSala = 'sensores' | 'acceso' | 'energia' | 'anomalias' | 'integrador' | 'propulsion' | 'omega';

/**
 * obligatoria: cuenta para abrir la puerta.
 * extra: terminal opcional (no bloquea).
 * consulta: panel de consulta (no bloquea).
 * escudo: barrera del jefe OMEGA.
 */
export type TipoConsola = 'obligatoria' | 'extra' | 'consulta' | 'escudo';

export interface Consola {
  slug: string;
  tipo: TipoConsola;
  x: number;
  y: number;
}

export interface Sala {
  id: IdSala;
  nombre: string;
  sector: 1 | 2 | 3 | 4;
  descripcion: string;
  historia: { titulo: string; texto: string };
  consolas: Consola[];
  esJefe: boolean;
}

export interface Sector {
  numero: 1 | 2 | 3 | 4;
  nombre: string;
  unidad: string;
}

/** Tamaño lógico del canvas de la sala. */
export const ANCHO_SALA = 1080;
export const ALTO_SALA = 590;

const POS = [
  { x: 182, y: 193 },
  { x: 450, y: 193 },
  { x: 737, y: 193 },
  { x: 310, y: 455 },
  { x: 762, y: 455 },
] as const;
const POS_EXTRA = { x: 536, y: 470 } as const;
const POS_ESCUDO = [
  { x: 166, y: 205 },
  { x: 422, y: 205 },
  { x: 680, y: 205 },
] as const;

function cinco(slugs: [string, string, string, string, string]): Consola[] {
  return slugs.map((slug, i) => ({ slug, tipo: 'obligatoria' as const, ...POS[i] }));
}

export const SECTORES: Sector[] = [
  { numero: 1, nombre: 'Sector I', unidad: 'Unidad I' },
  { numero: 2, nombre: 'Sector II', unidad: 'Unidad II' },
  { numero: 3, nombre: 'Sector III', unidad: 'Unidad III' },
  { numero: 4, nombre: 'Sector IV', unidad: 'Unidad IV' },
];

export const SALAS: Sala[] = [
  {
    id: 'sensores',
    nombre: 'Cámara de sensores',
    sector: 1,
    descripcion: 'Los sensores perdieron sus lecturas. Reconstruye las mediciones interpolando datos.',
    historia: {
      titulo: 'El archivo fantasma',
      texto:
        'OMEGA borró las lecturas de los sensores del laboratorio. Cada consola guarda una tabla incompleta: recupera los valores que faltan para reactivar la cámara.',
    },
    consolas: cinco(['interpolacion-lineal', 'newton-adelante', 'newton-atras', 'diferencias-divididas', 'lagrange']),
    esJefe: false,
  },
  {
    id: 'acceso',
    nombre: 'Acceso y seguridad',
    sector: 1,
    descripcion: 'Las puertas de seguridad dependen de raíces correctas de funciones.',
    historia: {
      titulo: 'Cerraduras de raíz',
      texto:
        'Los controles de acceso solo se liberan cuando alguien encuentra las raíces de sus funciones. Los drones vigilan cada consola: muévete con cuidado.',
    },
    consolas: [
      ...cinco(['bisectriz', 'punto-fijo', 'newton-raphson', 'falsa-posicion', 'secante']),
      { slug: 'grafico', tipo: 'extra', ...POS_EXTRA },
    ],
    esJefe: false,
  },
  {
    id: 'energia',
    nombre: 'Núcleo de energía',
    sector: 2,
    descripcion: 'La planta responde a sistemas de ecuaciones simultáneas. Resuélvelos para restablecerla.',
    historia: {
      titulo: 'El corazón de la planta',
      texto:
        'El sistema eléctrico se reparte en redes acopladas. Resuelve sus sistemas de ecuaciones antes de que OMEGA apague el reactor.',
    },
    consolas: [
      ...cinco(['montante', 'gauss-jordan', 'eliminacion-gaussiana', 'gauss-seidel', 'jacobi']),
      { slug: 'raices-polinomios', tipo: 'extra', ...POS_EXTRA },
    ],
    esJefe: false,
  },
  {
    id: 'anomalias',
    nombre: 'Archivo de anomalías',
    sector: 2,
    descripcion: 'OMEGA contaminó las mediciones con ruido. Ajusta curvas que sigan la tendencia.',
    historia: {
      titulo: 'La mentira en los datos',
      texto:
        'Las mediciones del archivo están llenas de ruido. Ajusta modelos a los datos para reconstruir la tendencia real sin forzar cada punto.',
    },
    consolas: cinco(['linea-recta', 'cuadratica', 'cubica', 'lineal-con-funcion', 'cuadratica-con-funcion']),
    esJefe: false,
  },
  {
    id: 'integrador',
    nombre: 'Integrador',
    sector: 3,
    descripcion: 'El integrador acumula la energía de las celdas. Calcula sus áreas para recargarlo.',
    historia: {
      titulo: 'Áreas bajo control',
      texto:
        'Las celdas de energía se recargan midiendo el área bajo sus curvas de potencia. Integra con precisión para devolverles la carga.',
    },
    consolas: [
      ...cinco(['trapezoidal', 'newton-cotes-cerradas', 'newton-cotes-abiertas', 'simpson-1-3', 'simpson-3-8']),
      { slug: 'tablas-newton-cotes', tipo: 'consulta', ...POS_EXTRA },
    ],
    esJefe: false,
  },
  {
    id: 'propulsion',
    nombre: 'Propulsión',
    sector: 4,
    descripcion: 'Los motores de escape necesitan predecir su trayectoria paso a paso.',
    historia: {
      titulo: 'Trayectoria de escape',
      texto:
        'Los motores del laboratorio siguen ecuaciones diferenciales. Calcula su trayectoria paso a paso para preparar la huida.',
    },
    consolas: cinco(['euler-adelante', 'euler-atras', 'euler-modificado', 'runge-kutta-2', 'runge-kutta-3']),
    esJefe: false,
  },
  {
    id: 'omega',
    nombre: 'Núcleo OMEGA',
    sector: 4,
    descripcion: 'Desactiva los tres escudos con cálculos reales. Después esquiva sus rayos y dispara con Espacio.',
    historia: {
      titulo: 'Protocolo OMEGA',
      texto:
        'Tres escudos protegen el núcleo de la IA. Resuelve cada barrera en su consola con E. Cuando caigan, dispara con Espacio mientras esquivas sus rayos.',
    },
    consolas: [
      { slug: 'runge-kutta-4-simpson-1-3', tipo: 'escudo', ...POS_ESCUDO[0] },
      { slug: 'runge-kutta-4-simpson-3-8', tipo: 'escudo', ...POS_ESCUDO[1] },
      { slug: 'runge-kutta-orden-superior', tipo: 'escudo', ...POS_ESCUDO[2] },
    ],
    esJefe: true,
  },
];

export const SALA_POR_ID = new Map(SALAS.map((s) => [s.id, s]));

export function indiceSala(id: IdSala): number {
  return SALAS.findIndex((s) => s.id === id);
}

/** Consolas que bloquean la puerta (obligatorias o escudos). */
export function consolasRequeridas(sala: Sala): Consola[] {
  return sala.consolas.filter((c) => c.tipo === 'obligatoria' || c.tipo === 'escudo');
}

export const TOTAL_REQUERIDAS = SALAS.reduce((n, s) => n + consolasRequeridas(s).length, 0);

/** Nombre de respaldo cuando el método aún no está en el catálogo del backend. */
export function nombreRespaldo(slug: string): string {
  const t = slug.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const ROMANOS = ['', 'I', 'II', 'III', 'IV'] as const;
