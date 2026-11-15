// Estado global de la partida: useReducer + persistencia en localStorage (con try/catch).
import { useEffect, useReducer } from 'react';
import { SALAS, consolasRequeridas, indiceSala, type IdSala, type Sala, TOTAL_REQUERIDAS } from './mapa';

export const ENERGIA_MAX = 100;
export const ENERGIA_POR_METODO = 7;
export const VIDA_OMEGA = 3;

const CLAVE = 'escapeLabNumerico2_deluxe_v3';
const CLAVE_PREFS = 'escapeLabNumerico2_prefs';

export interface EstadoJuego {
  version: 3;
  enCurso: boolean;
  matricula: string;
  salaActual: IdSala;
  /** Slugs resueltos en modo juego (consolas, extras y escudos). */
  resueltos: string[];
  historiasVistas: IdSala[];
  energia: number;
  omegaVida: number;
  puntos: number;
  tiempoMs: number;
  danosRecibidos: number;
  reapariciones: number;
  victoria: boolean;
}

export type Accion =
  | { tipo: 'nuevaPartida'; matricula: string }
  | { tipo: 'matricula'; valor: string }
  | { tipo: 'entrarSala'; sala: IdSala }
  | { tipo: 'historiaVista'; sala: IdSala }
  | { tipo: 'resolver'; slug: string; esEscudo: boolean }
  | { tipo: 'dano'; cantidad: number }
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
    omegaVida: VIDA_OMEGA,
    puntos: 0,
    tiempoMs: 0,
    danosRecibidos: 0,
    reapariciones: 0,
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

export function extrasResueltas(estado: Pick<EstadoJuego, 'resueltos'>): number {
  return SALAS.flatMap((s) => s.consolas)
    .filter((c) => c.tipo === 'extra' || c.tipo === 'consulta')
    .filter((c) => estado.resueltos.includes(c.slug)).length;
}

export { TOTAL_REQUERIDAS };

// ---- Reductor ----

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
    case 'dano': {
      const energia = estado.energia - accion.cantidad;
      const reaparece = energia <= 0;
      return {
        ...estado,
        energia: reaparece ? ENERGIA_MAX : energia,
        danosRecibidos: estado.danosRecibidos + 1,
        reapariciones: estado.reapariciones + (reaparece ? 1 : 0),
      };
    }
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
      energia: numeroEn(d.energia, 10, ENERGIA_MAX, ENERGIA_MAX),
      omegaVida: Math.trunc(numeroEn(d.omegaVida, 0, VIDA_OMEGA, VIDA_OMEGA)),
      puntos: numeroEn(d.puntos, 0, 1e7, 0),
      tiempoMs: numeroEn(d.tiempoMs, 0, 1e10, 0),
      danosRecibidos: numeroEn(d.danosRecibidos, 0, 1e6, 0),
      reapariciones: numeroEn(d.reapariciones, 0, 1e6, 0),
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
