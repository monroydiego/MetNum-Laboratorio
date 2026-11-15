// Lógica pura del motor: entidades, movimiento, colisiones y combate.
// No toca React ni el DOM: recibe el contexto y devuelve eventos.
import type { Sala } from '../mapa';

export const VELOCIDAD_JUGADOR = 230; // px/s
export const RADIO_INTERACCION = 105;
export const DANO_DRON = 12;
export const DANO_LASER = 17;
export const INVULNERABILIDAD = 1.45; // s
export const PERIODO_LASER = 2.4; // s
export const VELOCIDAD_LASER = 260; // px/s
export const VELOCIDAD_DISPARO = 620; // px/s
export const ENFRIAMIENTO_DISPARO = 0.48; // s
export const INICIO = { x: 72, y: 334 } as const;
export const OMEGA_X = 933;
const LIMITES = { xMin: 34, xMax: 1012, yMin: 142, yMax: 530 };

export interface Jugador {
  x: number;
  y: number;
  tx: number | null;
  ty: number | null;
  direccion: 1 | -1;
  paso: number;
  moviendo: boolean;
}

export interface Dron {
  cx: number;
  cy: number;
  fase: number;
  rango: number;
  velocidad: number;
  x: number;
  y: number;
  giro: number;
}

export interface Proyectil {
  x: number;
  y: number;
}

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  color: string;
}

export interface Mundo {
  t: number;
  jugador: Jugador;
  drones: Dron[];
  lasers: Proyectil[];
  disparos: Proyectil[];
  particulas: Particula[];
  invulnerable: number;
  temblor: number;
  destello: number;
  enfriamientoDisparo: number;
  enfriamientoLaser: number;
  omegaY: number;
}

export interface ContextoSala {
  sala: Sala;
  resueltos: ReadonlySet<string>;
  omegaVida: number;
  energia: number;
  puertaAbierta: boolean;
  escudosCaidos: boolean;
  reducirMovimiento: boolean;
}

export type Evento =
  | { tipo: 'dano'; cantidad: number; reaparece: boolean }
  | { tipo: 'impacto' }
  | { tipo: 'sonido'; sonido: 'disparo' | 'omega' | 'resuelto' }
  | { tipo: 'aviso'; texto: string };

export function crearMundo(sala: Sala): Mundo {
  return {
    t: 0,
    jugador: { x: INICIO.x, y: INICIO.y, tx: null, ty: null, direccion: 1, paso: 0, moviendo: false },
    drones: sala.esJefe
      ? []
      : [0, 1, 2].map((i) => ({
          cx: 285 + i * 285,
          cy: i % 2 ? 405 : 280,
          fase: i * 2.2,
          rango: 95 + i * 12,
          velocidad: 0.48 + i * 0.11,
          x: 285 + i * 285,
          y: 280,
          giro: 0,
        })),
    lasers: [],
    disparos: [],
    particulas: [],
    invulnerable: 1,
    temblor: 0,
    destello: 0,
    enfriamientoDisparo: 0,
    enfriamientoLaser: 1.2,
    omegaY: 340,
  };
}

const sujetar = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function chispas(m: Mundo, x: number, y: number, color: string, n = 20): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 40 + Math.random() * 190;
    m.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.5 + Math.random() * 0.55, color });
  }
  if (m.particulas.length > 280) m.particulas.splice(0, m.particulas.length - 280);
}

export function consolaCercana(m: Mundo, sala: Sala): number {
  let idx = -1;
  let mejor = Infinity;
  sala.consolas.forEach((c, i) => {
    const d = Math.hypot(c.x - m.jugador.x, c.y - m.jugador.y);
    if (d < mejor) {
      mejor = d;
      idx = i;
    }
  });
  return mejor < RADIO_INTERACCION ? idx : -1;
}

export function cercaPuerta(m: Mundo, sala: Sala): boolean {
  return !sala.esJefe && m.jugador.x > 930 && Math.abs(m.jugador.y - 334) < 116;
}

export function destinoClic(m: Mundo, x: number, y: number): void {
  m.jugador.tx = sujetar(x, LIMITES.xMin, LIMITES.xMax);
  m.jugador.ty = sujetar(y, LIMITES.yMin, LIMITES.yMax);
}

function reaparecer(m: Mundo): void {
  m.jugador.x = INICIO.x;
  m.jugador.y = INICIO.y;
  m.jugador.tx = null;
  m.jugador.ty = null;
  m.lasers = [];
}

function recibirDano(m: Mundo, ctx: ContextoSala, cantidad: number, eventos: Evento[]): void {
  if (m.invulnerable > 0) return;
  m.invulnerable = INVULNERABILIDAD;
  m.temblor = ctx.reducirMovimiento ? 0 : 15;
  m.destello = 0.25;
  chispas(m, m.jugador.x, m.jugador.y, '#ff7781', 13);
  const reaparece = ctx.energia - cantidad <= 0;
  if (reaparece) reaparecer(m);
  eventos.push({ tipo: 'dano', cantidad, reaparece });
}

/** Avanza la simulación `dt` segundos. Devuelve los eventos producidos. */
export function actualizar(m: Mundo, dt: number, teclas: ReadonlySet<string>, ctx: ContextoSala): Evento[] {
  const eventos: Evento[] = [];
  m.t += dt;
  m.invulnerable = Math.max(0, m.invulnerable - dt);
  m.destello = Math.max(0, m.destello - dt);
  m.temblor = Math.max(0, m.temblor - dt * 34);
  m.enfriamientoDisparo = Math.max(0, m.enfriamientoDisparo - dt);

  // Movimiento del jugador: teclado o clic.
  const j = m.jugador;
  let dx = 0;
  let dy = 0;
  let porTeclado = false;
  if (teclas.has('arrowleft') || teclas.has('a')) dx--;
  if (teclas.has('arrowright') || teclas.has('d')) dx++;
  if (teclas.has('arrowup') || teclas.has('w')) dy--;
  if (teclas.has('arrowdown') || teclas.has('s')) dy++;
  if (dx || dy) {
    porTeclado = true;
    j.tx = null;
    j.ty = null;
  } else if (j.tx !== null && j.ty !== null) {
    dx = j.tx - j.x;
    dy = j.ty - j.y;
    if (Math.hypot(dx, dy) < 5) {
      j.tx = null;
      j.ty = null;
      dx = 0;
      dy = 0;
    }
  }
  const largo = Math.hypot(dx, dy);
  j.moviendo = largo > 0;
  if (largo > 0) {
    // Teclado: velocidad completa. Clic: sin pasarse del destino.
    const paso = VELOCIDAD_JUGADOR * dt;
    const avance = porTeclado ? paso : Math.min(largo, paso);
    j.x += (dx / largo) * avance;
    j.y += (dy / largo) * avance;
    if (dx) j.direccion = dx > 0 ? 1 : -1;
    j.paso += dt * 13;
  }
  j.x = sujetar(j.x, LIMITES.xMin, LIMITES.xMax);
  j.y = sujetar(j.y, LIMITES.yMin, LIMITES.yMax);

  // Partículas.
  for (let i = m.particulas.length - 1; i >= 0; i--) {
    const p = m.particulas[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.vida -= dt;
    if (p.vida <= 0) m.particulas.splice(i, 1);
  }

  if (ctx.sala.esJefe) {
    m.omegaY = 340 + Math.sin(m.t) * 66;
    m.enfriamientoLaser -= dt;
    if (m.enfriamientoLaser < 0 && ctx.omegaVida > 0) {
      m.enfriamientoLaser = PERIODO_LASER;
      m.lasers.push({ x: 897, y: 335 + Math.sin(m.t) * 66 });
      eventos.push({ tipo: 'sonido', sonido: 'omega' });
    }
    for (let i = m.lasers.length - 1; i >= 0; i--) {
      const z = m.lasers[i];
      z.x -= VELOCIDAD_LASER * dt;
      if (Math.hypot(z.x - j.x, z.y - j.y) < 29) {
        m.lasers.splice(i, 1);
        recibirDano(m, ctx, DANO_LASER, eventos);
      } else if (z.x < 15) m.lasers.splice(i, 1);
    }
    for (let i = m.disparos.length - 1; i >= 0; i--) {
      const z = m.disparos[i];
      z.x += VELOCIDAD_DISPARO * dt;
      if (z.x > 888) {
        if (ctx.escudosCaidos && ctx.omegaVida > 0 && Math.abs(z.y - m.omegaY) < 115) {
          m.temblor = ctx.reducirMovimiento ? 0 : 9;
          chispas(m, 915, m.omegaY, '#ff7eac', 48);
          if (ctx.omegaVida - 1 <= 0) m.lasers = [];
          eventos.push({ tipo: 'impacto' });
        }
        m.disparos.splice(i, 1);
      }
    }
  } else {
    for (const d of m.drones) {
      d.giro += dt * 4;
      // Trayectoria de Lissajous.
      d.x = d.cx + Math.sin(m.t * d.velocidad * 2 + d.fase) * d.rango;
      d.y = d.cy + Math.cos(m.t * 0.65 + d.fase) * 46;
      if (Math.hypot(d.x - j.x, d.y - j.y) < 40) recibirDano(m, ctx, DANO_DRON, eventos);
    }
  }
  return eventos;
}

export function disparar(m: Mundo, ctx: ContextoSala): Evento[] {
  if (!ctx.sala.esJefe || ctx.omegaVida <= 0) return [];
  if (!ctx.escudosCaidos) return [{ tipo: 'aviso', texto: `Primero desactiva los ${ctx.sala.consolas.length} escudos de OMEGA en sus módulos.` }];
  if (m.enfriamientoDisparo > 0) return [];
  m.enfriamientoDisparo = ENFRIAMIENTO_DISPARO;
  m.disparos.push({ x: m.jugador.x + 25, y: m.jugador.y });
  chispas(m, m.jugador.x + 20, m.jugador.y, '#aefdf1', 6);
  return [{ tipo: 'sonido', sonido: 'disparo' }];
}
