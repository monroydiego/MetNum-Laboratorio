// Estado global de la partida: useReducer + persistencia en localStorage (con try/catch).
import { useEffect, useReducer } from 'react';
import { SALAS, consolasRequeridas, indiceSala, type IdSala, type Sala, TOTAL_REQUERIDAS } from './mapa';

/** Puntos de cada vida (barra de vida del traje). */
export const ENERGIA_MAX = 100;
/** Vidas del personaje: al agotarse las 5, se pierde el progreso de la sala actual. */
export const VIDAS_MAX = 5;
export const ENERGIA_POR_METODO = 7;
export const VIDA_OMEGA = 3;

const CLAVE = 'escapeLabNumerico2_deluxe_v3';
const CLAVE_PREFS = 'escapeLabNumerico2_prefs';

/** Problema asignado a una consola: se conserva hasta resolverlo (cerrar la consola no lo cambia). */
export interface ProblemaAsignado {
  entrada: Record<string, unknown>;
  campos: string[];
}

export const VIDA_POR_RESPUESTA_INCORRECTA = 5;

export interface EstadoJuego {
  version: 3;
  enCurso: boolean;
  matricula: string;
  salaActual: IdSala;
  /** Slugs resueltos en modo juego (consolas y escudos). */
  resueltos: string[];
  historiasVistas: IdSala[];
  /** Puntos de la vida actual (0–100). */
  energia: number;
  /** Vidas restantes (1–5), cada una de 100 puntos. */
  vidas: number;
  /** Veces que se agotaron las 5 vidas (cada vez se reinicia la sala con problemas nuevos). */
  salasReiniciadas: number;
  omegaVida: number;
  puntos: number;
  tiempoMs: number;
  danosRecibidos: number;
  reapariciones: number;
  respuestasIncorrectas: number;
  /** Problema vigente de cada consola (slug -> problema). */
  problemas: Record<string, ProblemaAsignado>;
  victoria: boolean;
}

export type Accion =
  | { tipo: 'nuevaPartida'; matricula: string }
  | { tipo: 'matricula'; valor: string }
  | { tipo: 'entrarSala'; sala: IdSala }
  | { tipo: 'historiaVista'; sala: IdSala }
  | { tipo: 'resolver'; slug: string; esEscudo: boolean }
  | { tipo: 'dano'; cantidad: number }
  | { tipo: 'problema'; slug: string; problema: ProblemaAsignado }
  | { tipo: 'respuestaIncorrecta' }
  | { tipo: 'impactoOmega' }
  | { tipo: 'tiempo'; ms: number };

export function estadoInicial(matricula = ''): EstadoJuego {
  return {
    version: 3,
    enCurso: false,
    matricula,
    salaActual: SALAS[0].id,
    resueltos: [],
    historiasVistas: [],
    energia: ENERGIA_MAX,
    vidas: VIDAS_MAX,
    salasReiniciadas: 0,
    omegaVida: VIDA_OMEGA,
    puntos: 0,
    tiempoMs: 0,
    danosRecibidos: 0,
    reapariciones: 0,
    respuestasIncorrectas: 0,
    problemas: {},
    victoria: false,
  };
}

// ---- Derivados ----

export function salaCompleta(estado: Pick<EstadoJuego, 'resueltos' | 'omegaVida'>, sala: Sala): boolean {
  const req = consolasRequeridas(sala).every((c) => estado.resueltos.includes(c.slug));
  return sala.esJefe ? req && estado.omegaVida <= 0 : req;
}

export function escudosCaidos(estado: Pick<EstadoJuego, 'resueltos'>, sala: Sala): boolean {
  return consolasRequeridas(sala).every((c) => estado.resueltos.includes(c.slug));
}

/** Una sala está disponible si todas las anteriores están completas. */
export function salaDesbloqueada(estado: Pick<EstadoJuego, 'resueltos' | 'omegaVida'>, id: IdSala): boolean {
  const idx = indiceSala(id);
  return SALAS.slice(0, idx).every((s) => salaCompleta(estado, s));
}

export function progresoSala(estado: Pick<EstadoJuego, 'resueltos'>, sala: Sala): { hechas: number; total: number } {
  const req = consolasRequeridas(sala);
  return { hechas: req.filter((c) => estado.resueltos.includes(c.slug)).length, total: req.length };
}

export function requeridasResueltas(estado: Pick<EstadoJuego, 'resueltos'>): number {
  return SALAS.reduce((n, s) => n + progresoSala(estado, s).hechas, 0);
}

export { TOTAL_REQUERIDAS };

// ---- Reductor ----

export type Consecuencia = 'nada' | 'vidaPerdida' | 'salaReiniciada';

/** Qué pasaría si el personaje recibe `cantidad` de daño ahora (para avisar antes de despachar). */
export function consecuenciaDano(estado: Pick<EstadoJuego, 'energia' | 'vidas'>, cantidad: number): Consecuencia {
  if (estado.energia - cantidad > 0) return 'nada';
  return estado.vidas - 1 > 0 ? 'vidaPerdida' : 'salaReiniciada';
}

/**
 * Resta vida. Al llegar a 0 se pierde una vida y el traje se restaura a 100.
 * Al perder la 5.ª vida se pierde TODO el progreso de la sala actual: sus problemas se marcan
 * como no resueltos y se cambian por otros nuevos (se borran los asignados), y se recuperan las 5 vidas.
 */
function aplicarDano(estado: EstadoJuego, cantidad: number): EstadoJuego {
  const energia = estado.energia - cantidad;
  if (energia > 0) return { ...estado, energia };
  const vidas = estado.vidas - 1;
  if (vidas > 0) return { ...estado, energia: ENERGIA_MAX, vidas, reapariciones: estado.reapariciones + 1 };
  const sala = SALAS[indiceSala(estado.salaActual)];
  const slugs = new Set(sala.consolas.map((c) => c.slug));
  return {
    ...estado,
    energia: ENERGIA_MAX,
    vidas: VIDAS_MAX,
    reapariciones: estado.reapariciones + 1,
    salasReiniciadas: estado.salasReiniciadas + 1,
    resueltos: estado.resueltos.filter((s) => !slugs.has(s)),
    problemas: Object.fromEntries(Object.entries(estado.problemas).filter(([s]) => !slugs.has(s))),
    omegaVida: sala.esJefe ? VIDA_OMEGA : estado.omegaVida,
  };
}

function reductor(estado: EstadoJuego, accion: Accion): EstadoJuego {
  switch (accion.tipo) {
    case 'nuevaPartida':
      return { ...estadoInicial(accion.matricula.trim().slice(0, 20)), enCurso: true };
    case 'matricula':
      return { ...estado, matricula: accion.valor.slice(0, 20) };
    case 'entrarSala':
      if (!salaDesbloqueada(estado, accion.sala)) return estado;
      return { ...estado, enCurso: true, salaActual: accion.sala };
    case 'historiaVista':
      if (estado.historiasVistas.includes(accion.sala)) return estado;
      return { ...estado, historiasVistas: [...estado.historiasVistas, accion.sala] };
    case 'resolver':
      if (estado.resueltos.includes(accion.slug)) return estado;
      return {
        ...estado,
        resueltos: [...estado.resueltos, accion.slug],
        energia: Math.min(ENERGIA_MAX, estado.energia + ENERGIA_POR_METODO),
        puntos: estado.puntos + (accion.esEscudo ? 250 : 100),
      };
    case 'dano':
      return { ...aplicarDano(estado, accion.cantidad), danosRecibidos: estado.danosRecibidos + 1 };
    case 'problema':
      return { ...estado, problemas: { ...estado.problemas, [accion.slug]: accion.problema } };
    case 'respuestaIncorrecta':
      // Cada respuesta incorrecta quita 5 puntos de vida (mismas reglas de vidas que los golpes).
      return { ...aplicarDano(estado, VIDA_POR_RESPUESTA_INCORRECTA), respuestasIncorrectas: estado.respuestasIncorrectas + 1 };
    case 'impactoOmega': {
      if (estado.omegaVida <= 0) return estado;
      const omegaVida = estado.omegaVida - 1;
      return { ...estado, omegaVida, puntos: estado.puntos + 200, victoria: omegaVida <= 0 };
    }
    case 'tiempo':
      if (estado.victoria) return estado;
      return { ...estado, tiempoMs: estado.tiempoMs + accion.ms };
  }
}

// ---- Persistencia ----

const IDS_SALA = new Set<string>(SALAS.map((s) => s.id));
const SLUGS = new Set(SALAS.flatMap((s) => s.consolas.map((c) => c.slug)));

function numeroEn(v: unknown, min: number, max: number, porDefecto: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : porDefecto;
  return Math.max(min, Math.min(max, n));
}

/** Descarta problemas guardados con forma inválida o de métodos que ya no existen. */
function problemasValidos(v: unknown): Record<string, ProblemaAsignado> {
  const salida: Record<string, ProblemaAsignado> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return salida;
  for (const [slug, p] of Object.entries(v as Record<string, unknown>)) {
    if (!SLUGS.has(slug) || !p || typeof p !== 'object') continue;
    const { entrada, campos } = p as Partial<ProblemaAsignado>;
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) continue;
    if (!Array.isArray(campos) || !campos.every((c) => typeof c === 'string')) continue;
    salida[slug] = { entrada, campos };
  }
  return salida;
}

/** Lee la partida guardada; descarta datos adulterados o de versiones antiguas. */
export function cargarPartida(): EstadoJuego | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const d = JSON.parse(crudo) as Partial<EstadoJuego>;
    if (!d || d.version !== 3) return null;
    const base = estadoInicial(typeof d.matricula === 'string' ? d.matricula.slice(0, 20) : '');
    const resueltos = Array.isArray(d.resueltos) ? d.resueltos.filter((s): s is string => typeof s === 'string' && SLUGS.has(s)) : [];
    const estado: EstadoJuego = {
      ...base,
      enCurso: Boolean(d.enCurso),
      resueltos: [...new Set(resueltos)],
      historiasVistas: Array.isArray(d.historiasVistas)
        ? (d.historiasVistas.filter((s) => typeof s === 'string' && IDS_SALA.has(s)) as IdSala[])
        : [],
      energia: numeroEn(d.energia, 1, ENERGIA_MAX, ENERGIA_MAX),
      vidas: Math.trunc(numeroEn(d.vidas, 1, VIDAS_MAX, VIDAS_MAX)),
      salasReiniciadas: Math.trunc(numeroEn(d.salasReiniciadas, 0, 1e6, 0)),
      omegaVida: Math.trunc(numeroEn(d.omegaVida, 0, VIDA_OMEGA, VIDA_OMEGA)),
      puntos: numeroEn(d.puntos, 0, 1e7, 0),
      tiempoMs: numeroEn(d.tiempoMs, 0, 1e10, 0),
      danosRecibidos: numeroEn(d.danosRecibidos, 0, 1e6, 0),
      reapariciones: numeroEn(d.reapariciones, 0, 1e6, 0),
      respuestasIncorrectas: numeroEn(d.respuestasIncorrectas, 0, 1e6, 0),
      problemas: problemasValidos(d.problemas),
      victoria: false,
    };
    // No permitir salas bloqueadas con progreso adulterado.
    const sala = typeof d.salaActual === 'string' && IDS_SALA.has(d.salaActual) ? (d.salaActual as IdSala) : base.salaActual;
    estado.salaActual = salaDesbloqueada(estado, sala) ? sala : (SALAS.find((s) => !salaCompleta(estado, s))?.id ?? sala);
    if (!escudosCaidos(estado, SALAS[SALAS.length - 1])) estado.omegaVida = VIDA_OMEGA;
    estado.victoria = Boolean(d.victoria) && estado.omegaVida <= 0 && salaDesbloqueada(estado, 'omega');
    return estado;
  } catch {
    return null;
  }
}

function guardarPartida(estado: EstadoJuego): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Almacenamiento lleno o bloqueado: el juego sigue sin guardar.
  }
}

export function hayPartidaGuardada(): boolean {
  const p = cargarPartida();
  return Boolean(p && p.enCurso);
}

export function useEstadoJuego() {
  const [estado, despachar] = useReducer(reductor, undefined, () => cargarPartida() ?? estadoInicial());
  useEffect(() => {
    if (estado.enCurso) guardarPartida(estado);
  }, [estado]);
  return [estado, despachar] as const;
}

// ---- Preferencias (sonido) ----

export function leerSonidoActivo(): boolean {
  try {
    return localStorage.getItem(CLAVE_PREFS) !== 'silencio';
  } catch {
    return true;
  }
}

export function guardarSonidoActivo(activo: boolean): void {
  try {
    localStorage.setItem(CLAVE_PREFS, activo ? 'sonido' : 'silencio');
  } catch {
    // sin persistencia
  }
}

export function formatearTiempo(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
