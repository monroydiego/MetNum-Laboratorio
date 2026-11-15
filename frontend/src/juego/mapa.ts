// Mapa del juego (aprobado): 4 sectores = 4 Unidades del libro.
// Los nombres visibles de cada método salen del catálogo del backend (`nombre_libro`);
// aquí solo se guardan el slug y la posición de la consola dentro de la sala.

export type IdSala = 'sensores' | 'acceso' | 'energia' | 'anomalias' | 'integrador' | 'omega';

/**
 * obligatoria: problema que HAY que resolver para abrir la puerta (todos los problemas lo son).
 * escudo: barrera del jefe OMEGA (también un problema obligatorio).
 */
export type TipoConsola = 'obligatoria' | 'escudo';

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

/**
 * Módulos de laboratorio (consolas) acomodados como mesas de trabajo a lo largo de las paredes
 * superior e inferior, dejando libre el pasillo central (y ≈ 334) que va de la entrada a la puerta.
 */
const FILA_SUPERIOR = 200;
const FILA_INFERIOR = 462;

function filas(superior: number[], inferior: number[]): { x: number; y: number }[] {
  return [...superior.map((x) => ({ x, y: FILA_SUPERIOR })), ...inferior.map((x) => ({ x, y: FILA_INFERIOR }))];
}

/** 5 módulos: 3 arriba y 2 abajo (entre ellos), 6 módulos: 3 y 3. */
const POSICIONES: Record<number, { x: number; y: number }[]> = {
  5: filas([250, 535, 820], [392, 677]),
  6: filas([250, 535, 820], [250, 535, 820]),
};
/** Sala del jefe: 8 escudos (4 arriba y 4 abajo) a la izquierda de OMEGA. */
const POS_ESCUDOS = filas([135, 330, 525, 720], [135, 330, 525, 720]);

function modulos(slugs: string[]): Consola[] {
  const pos = POSICIONES[slugs.length];
  return slugs.map((slug, i) => ({ slug, tipo: 'obligatoria' as const, ...pos[i] }));
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
    nombre: 'Interpolación',
    sector: 1,
    descripcion: 'Los sensores perdieron sus lecturas. Reconstruye las mediciones interpolando datos.',
    historia: {
      titulo: 'El archivo fantasma',
      texto:
        'OMEGA borró las lecturas de los sensores del laboratorio. Cada consola guarda una tabla incompleta: recupera los valores que faltan para reactivar la cámara.',
    },
    consolas: modulos(['interpolacion-lineal', 'newton-adelante', 'newton-atras', 'diferencias-divididas', 'lagrange']),
    esJefe: false,
  },
  {
    id: 'acceso',
    nombre: 'Ecuaciones no lineales',
    sector: 1,
    descripcion: 'Las puertas de seguridad dependen de raíces correctas de funciones.',
    historia: {
      titulo: 'Cerraduras de raíz',
      texto:
        'Los controles de acceso solo se liberan cuando alguien encuentra las raíces de sus funciones. Los drones vigilan cada consola: muévete con cuidado.',
    },
    consolas: modulos(['grafico', 'bisectriz', 'punto-fijo', 'newton-raphson', 'falsa-posicion', 'secante']),
    esJefe: false,
  },
  {
    id: 'energia',
    nombre: 'Ecuaciones lineales',
    sector: 2,
    descripcion: 'La planta responde a sistemas de ecuaciones simultáneas. Resuélvelos para restablecerla.',
    historia: {
      titulo: 'El corazón de la planta',
      texto:
        'El sistema eléctrico se reparte en redes acopladas. Resuelve sus sistemas de ecuaciones antes de que OMEGA apague el reactor.',
    },
    consolas: modulos(['montante', 'gauss-jordan', 'eliminacion-gaussiana', 'gauss-seidel', 'jacobi']),
    esJefe: false,
  },
  {
    id: 'anomalias',
    nombre: 'Mínimos cuadrados',
    sector: 2,
    descripcion: 'OMEGA contaminó las mediciones con ruido. Ajusta curvas que sigan la tendencia.',
    historia: {
      titulo: 'La mentira en los datos',
      texto:
        'Las mediciones del archivo están llenas de ruido. Ajusta modelos a los datos para reconstruir la tendencia real sin forzar cada punto.',
    },
    consolas: modulos(['linea-recta', 'cuadratica', 'cubica', 'lineal-con-funcion', 'cuadratica-con-funcion']),
    esJefe: false,
  },
  {
    id: 'integrador',
    nombre: 'Integración',
    sector: 3,
    descripcion: 'El integrador acumula la energía de las celdas. Calcula sus áreas para recargarlo.',
    historia: {
      titulo: 'Áreas bajo control',
      texto:
        'Las celdas de energía se recargan midiendo el área bajo sus curvas de potencia. Integra con precisión para devolverles la carga.',
    },
    consolas: modulos(['trapezoidal', 'newton-cotes-cerradas', 'newton-cotes-abiertas', 'simpson-1-3', 'simpson-3-8']),
    esJefe: false,
  },
  {
    id: 'omega',
    nombre: 'Ecuaciones diferenciales',
    sector: 4,
    descripcion:
      'OMEGA protege su núcleo con ocho escudos, uno por método de ecuaciones diferenciales. Desactívalos todos y después dispara con Espacio.',
    historia: {
      titulo: 'Protocolo OMEGA',
      texto:
        'El núcleo de la IA calcula su propia trayectoria con ecuaciones diferenciales. Resuelve en cada módulo un problema de Euler y de Runge – Kutta para tumbar sus ocho escudos; cuando caigan, dispara con Espacio mientras esquivas sus rayos.',
    },
    consolas: [
      'euler-adelante',
      'euler-atras',
      'euler-modificado',
      'runge-kutta-2',
      'runge-kutta-3',
      'runge-kutta-4-simpson-1-3',
      'runge-kutta-4-simpson-3-8',
      'runge-kutta-orden-superior',
    ].map((slug, i) => ({ slug, tipo: 'escudo' as const, ...POS_ESCUDOS[i] })),
    esJefe: true,
  },
];

export const SALA_POR_ID = new Map(SALAS.map((s) => [s.id, s]));

export function indiceSala(id: IdSala): number {
  return SALAS.findIndex((s) => s.id === id);
}

/** Consolas que bloquean la puerta: todos los problemas de la sala (no hay opcionales). */
export function consolasRequeridas(sala: Sala): Consola[] {
  return sala.consolas;
}

export const TOTAL_REQUERIDAS = SALAS.reduce((n, s) => n + consolasRequeridas(s).length, 0);

/** Nombre de respaldo cuando el método aún no está en el catálogo del backend. */
export function nombreRespaldo(slug: string): string {
  const t = slug.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const ROMANOS = ['', 'I', 'II', 'III', 'IV'] as const;
