// Dibujo de la sala en Canvas 2D. Todo el arte se genera al vuelo, sin archivos externos.
//
// Dirección artística «Cinta de Plata»: un corto rubber hose en blanco y negro de 1930.
// Tinta china sobre plata, contornos a pincel con «line boil» a 12 fps, sombreado cel de dos
// tonos, sombras duras abajo-derecha (luz arriba-izquierda), guantes blancos y ojos de pastel.
// OMEGA (drones, núcleo, candado de la salida) es lo único a todo color; el dorado marca el foco
// de atención y lo resuelto se «colorea a mano» en menta.
//
// Capas por cuadro: fondo pre-renderizado (pared, piso, mesas, estantes) → escenario (módulos,
// puerta) → actores (Agente, centinelas, OMEGA) → FX (partículas) → daño, grano, viñeta e iris.
// Este archivo solo decide CÓMO se dibuja: posiciones y colisiones vienen de logica.ts.
import { ANCHO_SALA as W, ALTO_SALA as H, type Sala } from '../mapa';
import { color, conAlfa, fuente, movimiento, sombra, tintes, trazo } from '../../tokens';
import { cercaPuerta, OMEGA_X, type ContextoSala, type Mundo } from './logica';

export interface Vista {
  /** Color de acento del sector. */
  acento: string;
  /** Etiqueta corta de cada consola (mismo orden que sala.consolas). */
  etiquetas: string[];
  /** Si el método de cada consola existe en el catálogo del backend. */
  disponibles: boolean[];
  cercana: number;
  nombreJugador: string;
  /** Reloj decorativo en segundos (se congela con movimiento reducido). */
  reloj: number;
}

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Utilidades de trazo
// ---------------------------------------------------------------------------

/** Pseudoaleatorio sembrado en [0, 1): estable por objeto, nunca por cuadro. */
function azar(n: number): number {
  let t = (Math.floor(n * 9973) + 0x9e3779b9) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Semilla del «line boil»: cambia cada movimiento.boilMs (0 con movimiento reducido). */
let boil = 0;

/** Contorno de tinta a pincel: dos pasadas con ±0.4 px de desplazamiento sembrado. */
function entintar(c: Ctx, p: Path2D, grosor: number = trazo.medio, semilla = 0, col: string = color.tinta) {
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = col;
  c.lineWidth = grosor;
  c.stroke(p);
  const s = semilla * 13.7 + boil * 3.1;
  const dx = (azar(s) - 0.5) * 0.8;
  const dy = (azar(s + 1.3) - 0.5) * 0.8;
  c.translate(dx, dy);
  c.lineWidth = grosor * 0.55;
  c.stroke(p);
  c.translate(-dx, -dy);
}

function rellenar(c: Ctx, p: Path2D, col: string) {
  c.fillStyle = col;
  c.fill(p);
}

/** Sombra dura desplazada (mismo desplazamiento que --shadow-tinta del DOM). */
function sombraDura(c: Ctx, p: Path2D, dx: number = sombra.dx, dy: number = sombra.dy, col: string = color.tinta) {
  c.translate(dx, dy);
  rellenar(c, p, col);
  c.translate(-dx, -dy);
}

/** Banda de sombra cel: la parte de la forma que no cubre su copia desplazada hacia la luz. */
function sombreado(c: Ctx, forma: Path2D, d = 8, alfa = 0.18, col: string = color.tinta) {
  c.save();
  c.clip(forma);
  const p = new Path2D();
  p.rect(-3000, -3000, 6000, 6000);
  p.addPath(forma, new DOMMatrix().translate(-d, -d));
  c.fillStyle = conAlfa(col, alfa);
  c.fill(p, 'evenodd');
  c.restore();
}

function rrP(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

function elipseP(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
  return p;
}

function lineaP(puntos: number[]): Path2D {
  const p = new Path2D();
  p.moveTo(puntos[0], puntos[1]);
  for (let k = 2; k < puntos.length; k += 2) p.lineTo(puntos[k], puntos[k + 1]);
  return p;
}

/** Halo suave (solo para fuentes de luz: OMEGA, salida, foco). */
function brillo(c: Ctx, x: number, y: number, r: number, col: string, alfa = 0.22) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, conAlfa(col, alfa));
  g.addColorStop(1, conAlfa(col, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function sombraContacto(c: Ctx, x: number, y: number, rx: number, ry: number, alfa: number = sombra.contacto) {
  c.fillStyle = conAlfa(color.tinta, alfa);
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fill();
}

/** Rótulo de texto. `contorno` dibuja un ribete de papel para leerse sobre cualquier fondo. */
function rotulo(
  c: Ctx,
  t: string,
  x: number,
  y: number,
  tam = 14,
  col: string = color.tinta,
  alin: CanvasTextAlign = 'left',
  contorno: string | null = null,
  familia: string = fuente.display,
  peso = '400',
) {
  c.font = `${peso} ${tam}px ${familia}`;
  c.textAlign = alin;
  c.textBaseline = 'alphabetic';
  if (contorno) {
    c.lineJoin = 'round';
    c.lineWidth = Math.max(3, tam * 0.32);
    c.strokeStyle = contorno;
    c.strokeText(t, x, y);
  }
  c.fillStyle = col;
  c.fillText(t, x, y);
}

function recortar(c: Ctx, t: string, max: number, tam: number): string {
  c.font = `400 ${tam}px ${fuente.display}`;
  if (c.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}

/** Ojo de pastel: óvalo de tinta con una cuña blanca que mira hacia (mx, my). */
function ojoPastel(c: Ctx, x: number, y: number, rx: number, ry: number, mx: number, my: number, cerrado = false) {
  if (cerrado) {
    c.strokeStyle = color.tinta;
    c.lineWidth = trazo.fino + 0.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - rx - 0.5, y + 1);
    c.quadraticCurveTo(x, y + 3, x + rx + 0.5, y + 1);
    c.stroke();
    return;
  }
  c.fillStyle = color.tinta;
  c.beginPath();
  c.ellipse(x + mx * rx * 0.25, y + my * ry * 0.15, rx, ry, 0, 0, TAU);
  c.fill();
  const cx = x + mx * rx * 0.45;
  const cy = y - ry * 0.3 + my * ry * 0.2;
  const a = -1.75 + mx * 0.55;
  c.fillStyle = color.papel;
  c.beginPath();
  c.moveTo(cx, cy);
  c.ellipse(cx, cy, rx * 0.62, ry * 0.55, 0, a - 0.45, a + 0.45);
  c.closePath();
  c.fill();
}

/** Extremidad de manguera: curva cuadrática sin codos, tubo de tinta. */
function manguera(c: Ctx, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number, grosor: number, semilla: number) {
  const p = new Path2D();
  p.moveTo(x1, y1);
  p.quadraticCurveTo(cx, cy, x2, y2);
  entintar(c, p, grosor, semilla);
}

/** Guante blanco con puño y dos dedos marcados. */
function guante(c: Ctx, x: number, y: number, r: number, ang: number, semilla: number) {
  const p = elipseP(x, y, r, r * 0.92, ang);
  rellenar(c, p, color.papel);
  entintar(c, p, trazo.fino + 0.4, semilla);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const puno = elipseP(x - ux * r * 0.95, y - uy * r * 0.95, r * 0.42, r * 0.7, ang);
  rellenar(c, puno, color.papel);
  entintar(c, puno, trazo.fino, semilla + 1);
  c.strokeStyle = color.tinta;
  c.lineWidth = 1;
  c.beginPath();
  for (const d of [-0.32, 0.32]) {
    const px = x + ux * r * 0.15 - uy * r * d;
    const py = y + uy * r * 0.15 + ux * r * d;
    c.moveTo(px, py);
    c.lineTo(px + ux * r * 0.7, py + uy * r * 0.7);
  }
  c.stroke();
}

/** Estrella de 4 puntas con contorno de tinta. */
function estrella(c: Ctx, x: number, y: number, r: number, giro: number, col: string, contorno = true) {
  const p = new Path2D();
  for (let k = 0; k < 8; k++) {
    const a = giro + (k * Math.PI) / 4;
    const rr = k % 2 ? r * 0.36 : r;
    if (k === 0) p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
  rellenar(c, p, col);
  if (contorno) {
    c.lineJoin = 'round';
    c.strokeStyle = color.tinta;
    c.lineWidth = 1.2;
    c.stroke(p);
  }
}

// ---------------------------------------------------------------------------
// Fondo pre-renderizado (pared, piso, mesas y estanterías)
// ---------------------------------------------------------------------------

let versionFuentes = 0;
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.ready.then(() => versionFuentes++).catch(() => undefined);
  document.fonts.addEventListener?.('loadingdone', () => versionFuentes++);
}

function nuevoLienzo(w: number, h: number): HTMLCanvasElement {
  const l = document.createElement('canvas');
  l.width = w;
  l.height = h;
  return l;
}

let cacheFondo: { clave: string; lienzo: HTMLCanvasElement } | null = null;
let cacheVineta: { clave: string; lienzo: HTMLCanvasElement } | null = null;

function tinteSala(sala: Sala): string {
  return tintes[sala.id];
}

/** Matraz Erlenmeyer dibujado a tinta. */
function matraz(c: Ctx, x: number, y: number, alto: number, liquido: string, nivel: number, semilla: number, burbujas = false) {
  const cuello = alto * 0.38;
  const base = alto * 0.62;
  const p = new Path2D();
  p.moveTo(x - 5, y);
  p.lineTo(x - 5, y + cuello);
  p.quadraticCurveTo(x - base * 0.66, y + alto * 0.92, x - base * 0.6, y + alto);
  p.lineTo(x + base * 0.6, y + alto);
  p.quadraticCurveTo(x + base * 0.66, y + alto * 0.92, x + 5, y + cuello);
  p.lineTo(x + 5, y);
  p.closePath();
  sombraDura(c, p, 2, 2, conAlfa(color.tinta, 0.35));
  rellenar(c, p, conAlfa(color.papel, 0.8));
  c.save();
  c.clip(p);
  const sup = y + alto * (1 - nivel);
  c.fillStyle = liquido;
  c.fillRect(x - base, sup, base * 2, alto * nivel + 2);
  c.fillStyle = conAlfa(color.tinta, 0.18);
  c.fillRect(x + base * 0.15, sup, base, alto * nivel + 2);
  if (burbujas) {
    c.strokeStyle = color.tinta;
    c.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      c.arc(x - 4 + k * 5, sup + 6 + (k % 2) * 6, 1.6 + (k % 2), 0, TAU);
      c.fillStyle = color.papel;
      c.fill();
      c.stroke();
    }
  }
  c.restore();
  c.strokeStyle = color.tinta;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x - base * 0.5, sup);
  c.lineTo(x + base * 0.5, sup);
  c.stroke();
  entintar(c, p, trazo.fino + 0.3, semilla);
  // Brillo especular: una cuña blanca.
  c.fillStyle = color.papel;
  c.beginPath();
  c.ellipse(x - base * 0.28, y + alto * 0.72, 1.6, 5, 0.5, 0, TAU);
  c.fill();
  const tapon = rrP(x - 7, y - 4, 14, 5, 2);
  rellenar(c, tapon, color.tinta);
}

function tubo(c: Ctx, x: number, y: number, liquido: string, nivel: number, semilla: number) {
  const p = rrP(x - 4, y, 8, 30, 4);
  rellenar(c, p, conAlfa(color.papel, 0.8));
  c.save();
  c.clip(p);
  c.fillStyle = liquido;
  c.fillRect(x - 4, y + 30 - 28 * nivel, 8, 28 * nivel);
  c.restore();
  entintar(c, p, trazo.fino, semilla);
  c.fillStyle = color.papel;
  c.fillRect(x - 2.2, y + 4, 1.4, 10);
}

/** Mesa de trabajo (mostrador) con cajones y sombreado cel. */
function mostrador(c: Ctx, y: number, alto: number, semilla: number) {
  const p = rrP(20, y, 1040, alto, 6);
  rellenar(c, p, color.primario2);
  sombreado(c, p, alto * 0.4, 0.16);
  c.strokeStyle = conAlfa(color.papel, 0.9);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(28, y + 3);
  c.lineTo(1052, y + 3);
  c.stroke();
  for (let x = 65; x < 1020; x += 135) {
    const asa = rrP(x, y + alto * 0.36, 65, 6, 3);
    rellenar(c, asa, color.tinta);
    c.fillStyle = color.papel;
    c.fillRect(x + 6, y + alto * 0.36 + 1, 18, 1.2);
    c.strokeStyle = conAlfa(color.tinta, 0.35);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 2, y + 2);
    c.lineTo(x - 2, y + alto - 2);
    c.stroke();
  }
  entintar(c, p, trazo.medio, semilla);
}

function pintarFondo(c: Ctx, sala: Sala, acento: string) {
  // Pared de azulejo de plata con juntas de tinta.
  c.fillStyle = color.fondo;
  c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 18) {
    for (let x = (y / 18) % 2 ? -18 : 0; x < W; x += 36) {
      c.fillStyle = conAlfa(color.papel, 0.55);
      c.fillRect(x + 2, y + 2, 30, 2);
      c.fillRect(x + 2, y + 2, 2, 12);
      c.fillStyle = conAlfa(color.tinta, 0.07);
      c.fillRect(x + 4, y + 14, 30, 2);
    }
  }
  c.strokeStyle = conAlfa(color.tinta, 0.2);
  c.lineWidth = 1;
  c.beginPath();
  for (let y = 0; y < H; y += 18) {
    c.moveTo(0, y + 0.5);
    c.lineTo(W, y + 0.5);
    for (let x = (y / 18) % 2 ? -18 : 0; x < W; x += 36) {
      c.moveTo(x + 0.5, y);
      c.lineTo(x + 0.5, y + 18);
    }
  }
  c.stroke();
  // Manchas de plata envejecida (ruido de baja frecuencia).
  for (let k = 0; k < 26; k++) {
    const x = azar(k + 0.1) * W;
    const y = azar(k + 0.7) * H;
    brillo(c, x, y, 40 + azar(k + 0.4) * 90, color.tinta, 0.035);
  }
  // Zócalo bajo los azulejos y franja inferior.
  const zocalo = rrP(-4, 80, W + 8, 15, 0);
  rellenar(c, zocalo, color.primario2);
  entintar(c, zocalo, trazo.medio, 3);
  const pie = rrP(-4, 552, W + 8, 44, 0);
  rellenar(c, pie, color.primario2);
  sombreado(c, pie, 10, 0.12);
  entintar(c, pie, trazo.medio, 4);
  c.strokeStyle = conAlfa(color.tinta, 0.25);
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 6; x < W; x += 14) {
    c.moveTo(x, 562);
    c.lineTo(x - 8, 586);
  }
  c.stroke();

  // Cartel con el nombre de la sala.
  const sub = sala.esJefe ? 'Desactiva los escudos y enfrenta al núcleo OMEGA' : 'Resuelve todos los módulos para abrir la salida';
  let tam = 26;
  c.font = `400 ${tam}px ${fuente.display}`;
  while (tam > 16 && c.measureText(sala.nombre).width > 500) {
    tam--;
    c.font = `400 ${tam}px ${fuente.display}`;
  }
  const anchoTitulo = c.measureText(sala.nombre).width;
  c.font = `700 12px ${fuente.sans}`;
  const anchoCartel = Math.min(570, Math.max(anchoTitulo, c.measureText(sub).width) + 50);
  const cartel = rrP(16, 12, anchoCartel, 64, 8);
  sombraDura(c, cartel);
  rellenar(c, cartel, color.panel);
  sombreado(c, cartel, 6, 0.08);
  entintar(c, cartel, trazo.medio, 5);
  const franja = rrP(26, 22, 9, 44, 4);
  rellenar(c, franja, acento);
  entintar(c, franja, trazo.fino, 6);
  for (const [rx, ry] of [
    [anchoCartel + 8, 20],
    [anchoCartel + 8, 68],
  ]) {
    c.fillStyle = color.tinta;
    c.beginPath();
    c.arc(rx, ry, 2, 0, TAU);
    c.fill();
  }
  rotulo(c, sala.nombre, 46, 48, tam, color.tinta);
  rotulo(c, sub, 47, 66, 12, color.tenue, 'left', null, fuente.sans, '700');

  // Estante con cristalería a tinta (líquidos en gris; uno con el tinte de la sala).
  const tinte = tinteSala(sala);
  const liquidos = [color.gris, color.primario2, tinte, color.tenue, color.linea];
  const estante = rrP(606, 76, 266, 9, 3);
  for (const bx of [628, 846]) {
    const escuadra = lineaP([bx, 85, bx, 96, bx + 12, 85]);
    entintar(c, escuadra, trazo.fino + 0.5, bx);
  }
  for (let i = 0; i < 5; i++) matraz(c, 640 + i * 52, 33, 42, liquidos[i], 0.35 + ((i * 37) % 40) / 100, 20 + i, i === 2);
  rellenar(c, estante, color.primario2);
  entintar(c, estante, trazo.medio, 7);
  const gradilla = rrP(890, 66, 150, 14, 4);
  for (let i = 0; i < 7; i++) {
    const liq = i === 4 ? tinte : [color.gris, color.linea, color.tenue, color.primario2][i % 4];
    tubo(c, 905 + i * 20, 40, liq, 0.3 + ((i * 23) % 50) / 100, 40 + i);
  }
  rellenar(c, gradilla, color.primario2);
  sombreado(c, gradilla, 5, 0.16);
  entintar(c, gradilla, trazo.medio, 8);

  // Piso de loseta en damero de grises suaves.
  const piso = rrP(20, 95, 1040, 454, 18);
  rellenar(c, piso, color.panel2);
  c.save();
  c.clip(piso);
  for (let iy = 0, y = 95; y < 549; y += 47, iy++) {
    for (let ix = 0, x = 20; x < 1060; x += 47, ix++) {
      if ((ix + iy) % 2) {
        c.fillStyle = conAlfa(color.gris, 0.16);
        c.fillRect(x, y, 47, 47);
      }
    }
  }
  c.strokeStyle = conAlfa(color.tinta, 0.09);
  c.lineWidth = 1;
  c.beginPath();
  for (let y = 95; y < 549; y += 47) {
    c.moveTo(20, y + 0.5);
    c.lineTo(1060, y + 0.5);
  }
  for (let x = 20; x < 1060; x += 47) {
    c.moveTo(x + 0.5, 95);
    c.lineTo(x + 0.5, 549);
  }
  c.stroke();
  for (let k = 0; k < 18; k++) brillo(c, 40 + azar(k + 3.3) * 1000, 130 + azar(k + 5.1) * 400, 30 + azar(k + 7.7) * 60, color.tinta, 0.04);
  brillo(c, 380, 250, 560, color.papel, 0.45);
  // Sombra que proyecta la mesa superior sobre el piso.
  c.fillStyle = conAlfa(color.tinta, 0.12);
  c.fillRect(20, 122, 1040, 9);
  c.restore();
  entintar(c, piso, trazo.medio, 9);

  mostrador(c, 95, 27, 10);
  mostrador(c, 524, 24, 11);

  // Pasillo de seguridad de la entrada a la salida.
  const pasillo = rrP(50, 294, 958, 94, 13);
  rellenar(c, pasillo, conAlfa(color.papel, 0.4));
  for (const fy of [296, 380]) {
    const banda = rrP(56, fy, 946, 7, 2);
    rellenar(c, banda, color.panel);
    c.save();
    c.clip(banda);
    c.strokeStyle = conAlfa(color.tinta, 0.6);
    c.lineWidth = 5;
    c.beginPath();
    for (let x = 50; x < 1010; x += 16) {
      c.moveTo(x, fy + 9);
      c.lineTo(x + 9, fy - 2);
    }
    c.stroke();
    c.restore();
    entintar(c, banda, trazo.fino, fy);
  }
  c.setLineDash([10, 8]);
  c.strokeStyle = conAlfa(color.tinta, 0.3);
  c.lineWidth = trazo.fino;
  c.stroke(pasillo);
  c.setLineDash([]);
  if (!sala.esJefe) {
    for (let x = 210; x < 960; x += 160) {
      const flecha = lineaP([x, 327, x + 14, 341, x, 355]);
      entintar(c, flecha, 5, x, conAlfa(color.tinta, 0.28));
    }
  }
  // Escotilla de entrada (punto de control del traje).
  const escotilla = rrP(24, 300, 22, 82, 6);
  sombraDura(c, escotilla, 3, 3);
  rellenar(c, escotilla, color.panel);
  c.strokeStyle = conAlfa(color.tinta, 0.5);
  c.lineWidth = 1.2;
  c.beginPath();
  for (let y = 314; y < 372; y += 10) {
    c.moveTo(29, y);
    c.lineTo(41, y);
  }
  c.stroke();
  entintar(c, escotilla, trazo.medio, 12);
}

function lienzoFondo(sala: Sala, acento: string, escala: number): HTMLCanvasElement {
  const w = Math.max(1, Math.round(W * escala));
  const h = Math.max(1, Math.round(H * escala));
  const clave = `${sala.id}|${acento}|${w}x${h}|${versionFuentes}`;
  if (cacheFondo?.clave === clave) return cacheFondo.lienzo;
  const lienzo = cacheFondo?.lienzo ?? nuevoLienzo(w, h);
  lienzo.width = w;
  lienzo.height = h;
  const g = lienzo.getContext('2d')!;
  g.setTransform(escala, 0, 0, escala, 0, 0);
  g.textRendering = 'geometricPrecision';
  const boilVivo = boil;
  boil = 0;
  pintarFondo(g, sala, acento);
  boil = boilVivo;
  cacheFondo = { clave, lienzo };
  return lienzo;
}

function lienzoVineta(escala: number): HTMLCanvasElement {
  const w = Math.max(1, Math.round(W * escala));
  const h = Math.max(1, Math.round(H * escala));
  const clave = `${w}x${h}`;
  if (cacheVineta?.clave === clave) return cacheVineta.lienzo;
  const lienzo = nuevoLienzo(w, h);
  const g = lienzo.getContext('2d')!;
  g.setTransform(escala, 0, 0, escala, 0, 0);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.64);
  v.addColorStop(0, conAlfa(color.tinta, 0));
  v.addColorStop(1, conAlfa(color.tinta, 0.35));
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  cacheVineta = { clave, lienzo };
  return lienzo;
}

// Grano de película: patrón de ruido 128×128 creado una sola vez.
let lienzoGrano: HTMLCanvasElement | null = null;
const patronesGrano = new WeakMap<Ctx, CanvasPattern>();

function patronGrano(c: Ctx): CanvasPattern | null {
  const hecho = patronesGrano.get(c);
  if (hecho) return hecho;
  if (!lienzoGrano) {
    lienzoGrano = nuevoLienzo(128, 128);
    const g = lienzoGrano.getContext('2d')!;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 150 + Math.floor(azar(i * 0.37 + 0.11) * 105);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const p = c.createPattern(lienzoGrano, 'repeat');
  if (p) patronesGrano.set(c, p);
  return p;
}

// ---------------------------------------------------------------------------
// FX: pool fijo de chispas para los aciertos (sin `new` en el bucle)
// ---------------------------------------------------------------------------

interface Chispa {
  activa: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  max: number;
  giro: number;
  vg: number;
  tam: number;
  forma: number;
}

const POOL: Chispa[] = Array.from({ length: 96 }, () => ({
  activa: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  vida: 0,
  max: 1,
  giro: 0,
  vg: 0,
  tam: 1,
  forma: 0,
}));
const SIGNOS = ['+', '−', '×', '∑', 'π'] as const;
let semillaFx = 1;

function emitir(x: number, y: number, n: number) {
  for (const p of POOL) {
    if (n <= 0) break;
    if (p.activa) continue;
    const s = semillaFx++;
    const a = azar(s) * TAU;
    const v = 70 + azar(s + 0.5) * 170;
    p.activa = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * v;
    p.vy = Math.sin(a) * v - 60;
    p.max = 0.7 + azar(s + 0.9) * 0.5;
    p.vida = p.max;
    p.giro = azar(s + 0.2) * TAU;
    p.vg = (azar(s + 0.3) - 0.5) * 8;
    p.tam = 5 + azar(s + 0.6) * 5;
    p.forma = azar(s + 0.8) < 0.3 ? 1 + Math.floor(azar(s + 0.4) * SIGNOS.length) : 0;
    n--;
  }
}

function fx(c: Ctx, dt: number) {
  for (const p of POOL) {
    if (!p.activa) continue;
    p.vida -= dt;
    if (p.vida <= 0) {
      p.activa = false;
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy = p.vy * 0.95 + 220 * dt;
    p.giro += p.vg * dt;
    const k = p.vida / p.max;
    c.globalAlpha = Math.min(1, k * 1.6);
    if (p.forma === 0) estrella(c, p.x, p.y, p.tam * (0.5 + k * 0.5), p.giro, color.ambar2);
    else rotulo(c, SIGNOS[p.forma - 1], p.x, p.y, 14 + p.tam, color.tinta, 'center', color.ambar2);
  }
  c.globalAlpha = 1;
}

// Seguimiento de consolas recién resueltas (para el estallido y el rebote).
let mundoPrevio: Mundo | null = null;
const resueltosPrevios = new Set<string>();
const momentoResuelto = new Map<string, number>();
let ultimoCuadro = 0;
let cuadros = 0;
let granoX = 0;
let granoY = 0;

function vigilarAciertos(m: Mundo, ctx: ContextoSala, ahora: number) {
  const nuevoMundo = m !== mundoPrevio;
  mundoPrevio = m;
  if (nuevoMundo) {
    resueltosPrevios.clear();
    momentoResuelto.clear();
  }
  for (const con of ctx.sala.consolas) {
    const hecha = ctx.resueltos.has(con.slug);
    if (hecha && !resueltosPrevios.has(con.slug)) {
      resueltosPrevios.add(con.slug);
      if (!nuevoMundo && !ctx.reducirMovimiento) {
        momentoResuelto.set(con.slug, ahora);
        emitir(con.x, con.y - 10, 26);
      }
    } else if (!hecha) resueltosPrevios.delete(con.slug);
  }
}

// ---------------------------------------------------------------------------
// Escenario: módulos de problemas (aparatos de laboratorio de los años 30)
// ---------------------------------------------------------------------------

/** Gabinete «catedral» de baquelita (radio-osciloscopio), en coordenadas locales. */
function formaGabinete(): Path2D {
  const p = new Path2D();
  p.moveTo(-76, 36);
  p.lineTo(-77, -16);
  p.bezierCurveTo(-77, -48, -42, -54, 0, -54);
  p.bezierCurveTo(42, -54, 77, -48, 77, -16);
  p.lineTo(76, 36);
  p.closePath();
  return p;
}

function consola(c: Ctx, ctx: ContextoSala, v: Vista, i: number, ahora: number) {
  const con = ctx.sala.consolas[i];
  const { x, y } = con;
  const hecha = ctx.resueltos.has(con.slug);
  const cerca = v.cercana === i;
  const disponible = v.disponibles[i];
  const esEscudo = con.tipo === 'escudo';
  const esc = ctx.sala.esJefe ? 0.86 : 1;
  const pulso = (Math.sin(v.reloj * 3.2 + i * 2) + 1) / 2;
  const sem = 100 + i * 17;

  sombraContacto(c, x, y + 53 * esc, 84 * esc, 9 * esc);

  // Respiración al compás y rebote elástico al resolverse.
  let sy = 1 + Math.sin(v.reloj * 2.4 + i * 1.3) * 0.018;
  const tRes = momentoResuelto.get(con.slug);
  if (tRes !== undefined) {
    const k = (ahora - tRes) / (movimiento.lento * 1.4);
    if (k < 1) sy = 1 + (1 - movimiento.elastico(k)) * 0.28;
    else momentoResuelto.delete(con.slug);
  }
  const sx = 1 - (sy - 1) * 0.6;

  c.save();
  c.translate(x, y + 52 * esc);
  c.scale(esc * sx, esc * sy);
  c.translate(0, -52);

  // Patitas de manguera con zapatos.
  manguera(c, -46, 40, -52, 44, -54, 50, 5, sem + 1);
  manguera(c, 46, 40, 52, 44, 54, 50, 5, sem + 2);
  for (const lado of [-1, 1]) {
    const zapato = elipseP(lado * 57, 51, 10, 4.5);
    rellenar(c, zapato, color.tinta);
    c.fillStyle = color.papel;
    c.fillRect(lado * 57 - 5, 48.5, 3, 1.2);
  }

  const gab = formaGabinete();
  const base = rrP(-82, 32, 164, 12, 5);
  if (cerca) {
    c.strokeStyle = color.ambar2;
    c.lineJoin = 'round';
    c.lineWidth = 10 + pulso * 4;
    c.stroke(gab);
    c.stroke(base);
  }
  sombraDura(c, gab);
  sombraDura(c, base);
  const cuerpo = hecha ? color.menta2 : disponible ? color.panel : color.primario2;
  rellenar(c, gab, cuerpo);
  sombreado(c, gab, 9, 0.18);
  // Molduras laterales del gabinete.
  c.strokeStyle = conAlfa(color.tinta, 0.4);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-68, 30);
  c.lineTo(-69, -14);
  c.moveTo(68, 30);
  c.lineTo(69, -14);
  c.stroke();
  // Brillo especular del gabinete.
  c.fillStyle = color.papel;
  c.beginPath();
  c.ellipse(-55, -30, 9, 3.2, -0.75, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(-44, -40, 1.8, 0, TAU);
  c.fill();
  entintar(c, gab, trazo.medio + 0.5, sem);
  rellenar(c, base, color.tinta);
  c.fillStyle = conAlfa(color.papel, 0.7);
  c.fillRect(-74, 34.5, 40, 1.5);

  // Pantalla de fósforo con retícula y onda.
  const bisel = rrP(-62, -38, 88, 58, 12);
  rellenar(c, bisel, color.tinta);
  const pantalla = rrP(-56, -32, 76, 46, 8);
  rellenar(c, pantalla, hecha ? color.menta2 : disponible ? color.fondo : color.primario2);
  c.save();
  c.clip(pantalla);
  c.strokeStyle = conAlfa(color.tinta, 0.13);
  c.lineWidth = 1;
  c.beginPath();
  for (let gx = -52; gx < 20; gx += 9.5) {
    c.moveTo(gx, -32);
    c.lineTo(gx, 14);
  }
  for (let gy = -27; gy < 14; gy += 9) {
    c.moveTo(-56, gy);
    c.lineTo(20, gy);
  }
  c.stroke();
  const colOnda = hecha ? color.menta : !disponible ? color.gris : esEscudo ? color.escudo : color.tinta;
  c.strokeStyle = colOnda;
  c.lineWidth = 2.4;
  c.lineJoin = 'round';
  c.beginPath();
  for (let k = 0; k <= 32; k++) {
    const px = -52 + k * 2.2;
    const amp = !disponible ? 0 : hecha ? 4 : 10;
    const py = -9 + Math.sin(k * 0.5 + v.reloj * 3 + i) * amp;
    if (k === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  // Reflejo del cristal.
  c.fillStyle = conAlfa(color.papel, 0.6);
  c.beginPath();
  c.moveTo(-56, -32);
  c.lineTo(-30, -32);
  c.lineTo(-56, -10);
  c.closePath();
  c.fill();
  c.restore();

  // Rejilla del altavoz.
  c.strokeStyle = conAlfa(color.tinta, 0.75);
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  for (const gy of [25, 30]) {
    c.moveTo(-52, gy);
    c.lineTo(16, gy);
  }
  c.stroke();

  // Perillas (o insignia de escudo) y foco de estado.
  const giro = disponible ? v.reloj * 0.9 + i : 0.8;
  if (esEscudo) {
    const insignia = new Path2D();
    insignia.moveTo(50, -33);
    insignia.lineTo(60, -29);
    insignia.quadraticCurveTo(60, -16, 50, -10);
    insignia.quadraticCurveTo(40, -16, 40, -29);
    insignia.closePath();
    rellenar(c, insignia, hecha ? color.menta : color.escudo);
    entintar(c, insignia, trazo.fino + 0.4, sem + 3);
    c.fillStyle = color.papel;
    c.fillRect(44, -28, 2, 7);
  } else {
    const perilla = elipseP(50, -22, 10, 10);
    rellenar(c, perilla, color.tinta);
    c.strokeStyle = color.papel;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(50, -22);
    c.lineTo(50 + Math.cos(giro) * 7, -22 + Math.sin(giro) * 7);
    c.stroke();
    c.fillStyle = color.papel;
    c.beginPath();
    c.arc(46.5, -25.5, 1.6, 0, TAU);
    c.fill();
  }
  const perilla2 = elipseP(50, 2, 7, 7);
  rellenar(c, perilla2, color.tinta);
  c.strokeStyle = color.papel;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(50, 2);
  c.lineTo(50 + Math.cos(-giro * 1.3) * 5, 2 + Math.sin(-giro * 1.3) * 5);
  c.stroke();
  const foco = hecha ? color.menta : cerca ? color.ambar2 : !disponible ? color.gris : esEscudo ? color.escudo : pulso > 0.5 ? color.papel : color.primario2;
  if (hecha || cerca) brillo(c, 50, 22, 14, foco, 0.5);
  const bombilla = elipseP(50, 22, 5.5, 5.5);
  rellenar(c, bombilla, foco);
  entintar(c, bombilla, trazo.fino, sem + 4);
  c.fillStyle = color.papel;
  c.fillRect(47.5, 19, 1.5, 1.5);

  // Cartelito con el nombre del método.
  const placa = rrP(-78, -77, 156, 24, 6);
  sombraDura(c, placa, 2, 2);
  rellenar(c, placa, hecha ? color.menta2 : color.papel);
  entintar(c, placa, trazo.fino + 0.4, sem + 5);
  c.fillStyle = color.tinta;
  c.beginPath();
  c.arc(-72, -65, 1.6, 0, TAU);
  c.fill();
  const etiqueta = recortar(c, v.etiquetas[i] ?? con.slug, 120, 11);
  rotulo(c, etiqueta, -65, -60.5, 11, hecha ? color.menta : disponible ? color.tinta : color.tenue);
  // Glifo de estado dibujado (no depende de la fuente).
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (hecha) {
    entintar(c, lineaP([62, -65, 66, -61, 73, -70]), 3, sem + 6, color.menta);
  } else if (cerca) {
    rotulo(c, 'E', 67, -60, 13, color.ambar, 'center');
  } else if (disponible) {
    c.fillStyle = esEscudo ? color.escudo : color.tinta;
    c.beginPath();
    c.arc(67, -65, 3.6, 0, TAU);
    c.fill();
  } else {
    entintar(c, lineaP([63, -65, 71, -65]), 2.5, sem + 6, color.tenue);
  }
  c.restore();
}

/** Indicador «Pulsa E» del módulo cercano: capa de interfaz, por encima de los actores. */
function pastillaInteraccion(c: Ctx, ctx: ContextoSala, v: Vista) {
  const i = v.cercana;
  const con = ctx.sala.consolas[i];
  if (!con) return;
  const esc = ctx.sala.esJefe ? 0.86 : 1;
  const disponible = v.disponibles[i];
  const salto = ctx.reducirMovimiento ? 0 : -Math.abs(Math.sin(v.reloj * 5)) * 4;
  const yb = con.y + 61 * esc + salto;
  const pastilla = rrP(con.x - 52, yb, 104, 25, 12.5);
  sombraDura(c, pastilla, 3, 3);
  rellenar(c, pastilla, disponible ? color.ambar2 : color.primario2);
  entintar(c, pastilla, trazo.medio, 300 + i);
  rotulo(c, disponible ? 'Pulsa E' : 'Sin método', con.x, yb + 17.5, 12, color.tinta, 'center');
}

// ---------------------------------------------------------------------------
// Puerta de salida
// ---------------------------------------------------------------------------

function puerta(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista) {
  if (ctx.sala.esJefe) return;
  const abierta = ctx.puertaAbierta;
  const x = 1001;
  const y = 242;
  const cerca = cercaPuerta(m, ctx.sala);
  const pulso = (Math.sin(v.reloj * 3) + 1) / 2;
  const cx = x + 34;
  const cy = y + 92;

  if (abierta) brillo(c, cx, cy, 130, color.ambar2, 0.28 + 0.12 * pulso);
  sombraContacto(c, cx, y + 190, 46, 7);

  const marco = rrP(x - 6, y - 6, 80, 194, 10);
  if (cerca) {
    c.strokeStyle = color.ambar2;
    c.lineWidth = 12;
    c.stroke(marco);
  }
  sombraDura(c, marco);
  rellenar(c, marco, color.primario2);
  sombreado(c, marco, 7, 0.16);
  entintar(c, marco, trazo.medio + 0.5, 900);

  const hueco = rrP(x + 6, y + 6, 56, 170, 6);
  if (abierta) {
    // Destello dorado tras la puerta: rayos de iris girando despacio.
    rellenar(c, hueco, color.ambar2);
    c.save();
    c.clip(hueco);
    c.fillStyle = conAlfa(color.papel, 0.55);
    const g0 = v.reloj * 0.5;
    for (let k = 0; k < 12; k += 2) {
      const a1 = g0 + (k * TAU) / 12;
      const a2 = g0 + ((k + 1) * TAU) / 12;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a1) * 200, cy + Math.sin(a1) * 200);
      c.lineTo(cx + Math.cos(a2) * 200, cy + Math.sin(a2) * 200);
      c.closePath();
      c.fill();
    }
    c.restore();
    entintar(c, hueco, trazo.medio, 901);
    // Hoja de la puerta abierta, vista de canto.
    const hoja = lineaP([x + 62, y + 6, x + 76, y + 16, x + 76, y + 166, x + 62, y + 176]);
    hoja.closePath();
    rellenar(c, hoja, color.panel);
    sombreado(c, hoja, 4, 0.2);
    entintar(c, hoja, trazo.medio, 902);
    const insignia = elipseP(cx, y + 100, 16, 16);
    sombraDura(c, insignia, 2, 2);
    rellenar(c, insignia, color.papel);
    entintar(c, insignia, trazo.medio, 903);
    rotulo(c, 'F', cx, y + 108, 20, color.tinta, 'center');
  } else {
    rellenar(c, hueco, color.panel);
    sombreado(c, hueco, 6, 0.14);
    entintar(c, hueco, trazo.fino + 0.5, 904);
    // Barrotes de tinta con su brillo.
    for (let k = 0; k < 4; k++) {
      const bx = x + 15 + k * 12.7;
      c.strokeStyle = color.tinta;
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(bx, y + 8);
      c.lineTo(bx, y + 174);
      c.stroke();
      c.strokeStyle = conAlfa(color.papel, 0.8);
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(bx - 1, y + 14);
      c.lineTo(bx - 1, y + 60);
      c.stroke();
    }
    for (const yy of [y + 40, y + 146]) rellenar(c, rrP(x + 4, yy - 4, 60, 8, 3), color.tinta);
    // Candado con el ojo rojo de OMEGA.
    brillo(c, cx, cy + 6, 30, color.hostil, 0.35 + 0.25 * pulso);
    const arco = new Path2D();
    arco.arc(cx, cy - 2, 8, Math.PI, 0);
    c.lineWidth = 4;
    c.strokeStyle = color.tinta;
    c.stroke(arco);
    const candado = rrP(cx - 12, cy - 3, 24, 20, 4);
    sombraDura(c, candado, 2, 2);
    rellenar(c, candado, color.tinta);
    c.fillStyle = color.hostil;
    c.beginPath();
    c.arc(cx, cy + 5, 3.2, 0, TAU);
    c.fill();
    c.fillRect(cx - 1.2, cy + 6, 2.4, 6);
  }

  // Caja de control junto a la puerta.
  const caja = rrP(x - 40, y + 59, 34, 48, 6);
  sombraDura(c, caja, 3, 3);
  rellenar(c, caja, color.panel);
  sombreado(c, caja, 5, 0.14);
  entintar(c, caja, trazo.medio, 905);
  const lampara = abierta ? color.ambar2 : color.hostil;
  brillo(c, x - 23, y + 74, 16, lampara, 0.3 + 0.2 * pulso);
  const foco = elipseP(x - 23, y + 74, 7, 7);
  rellenar(c, foco, lampara);
  entintar(c, foco, trazo.fino, 906);
  c.fillStyle = color.papel;
  c.fillRect(x - 26, y + 70, 2, 2);
  c.strokeStyle = color.tinta;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x - 32, y + 91);
  c.lineTo(x - 14, y + 91);
  c.moveTo(x - 32, y + 97);
  c.lineTo(x - 14, y + 97);
  c.stroke();

  rotulo(c, abierta ? 'Salida abierta' : 'Salida bloqueada', x + 72, y - 15, 11, abierta ? color.ambar : color.hostil, 'right', color.papel);
}

// ---------------------------------------------------------------------------
// Actores
// ---------------------------------------------------------------------------

/** El Agente: pequeño científico-robot de goma con bata, guantes blancos y ojos de pastel. */
function jugador(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista) {
  const { x, y, moviendo, paso, direccion: dir } = m.jugador;
  const fase = moviendo ? paso : v.reloj * 3;
  const salto = moviendo ? Math.abs(Math.sin(paso)) * 3.2 : (Math.sin(v.reloj * 3) + 1) * 0.7;
  const estira = moviendo ? 1 + Math.cos(paso * 2) * 0.05 : 1 + Math.sin(v.reloj * 3) * 0.025;
  const sem = 500 + (boil % 3);

  c.save();
  if (m.invulnerable > 0 && Math.floor(m.invulnerable * 10) % 2 === 0) c.globalAlpha = 0.45;

  sombraContacto(c, x, y + 20, 22 - salto * 1.2, 7 - salto * 0.4);

  // Piernas de manguera y zapatos.
  const zancada = moviendo ? Math.sin(paso) * 7 : 0;
  const pies = [
    { px: x - 8 + zancada, py: y + 19 - (moviendo ? Math.max(0, Math.sin(paso)) * 4 : 0), hx: x - 6 },
    { px: x + 8 - zancada, py: y + 19 - (moviendo ? Math.max(0, -Math.sin(paso)) * 4 : 0), hx: x + 6 },
  ];
  for (const [k, p] of pies.entries()) {
    manguera(c, p.hx, y + 4 - salto, p.hx + (k ? 5 : -5), y + 12 - salto, p.px, p.py - 2, 5, sem + k);
    const zapato = elipseP(p.px + dir * 2.5, p.py + 1, 7.5, 4.5);
    rellenar(c, zapato, color.tinta);
    c.fillStyle = color.papel;
    c.fillRect(p.px + dir * 2.5 - 3, p.py - 1.5, 2.5, 1.2);
  }

  // Cuerpo (bata de laboratorio) con estirar y encoger anclado a los pies.
  c.save();
  c.translate(x, y + 16);
  c.scale(2 - estira, estira);
  c.translate(-x, -(y + 16));
  const by = y - salto;
  const bata = new Path2D();
  bata.moveTo(x - 15, by + 9);
  bata.bezierCurveTo(x - 21, by + 2, x - 19, by - 12, x - 12, by - 17);
  bata.quadraticCurveTo(x, by - 21, x + 12, by - 17);
  bata.bezierCurveTo(x + 19, by - 12, x + 21, by + 2, x + 15, by + 9);
  bata.quadraticCurveTo(x, by + 13, x - 15, by + 9);
  bata.closePath();
  rellenar(c, bata, color.papel);
  sombreado(c, bata, 6, 0.18);
  c.strokeStyle = color.tinta;
  c.lineWidth = trazo.fino;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - 7, by - 17);
  c.lineTo(x, by - 5);
  c.lineTo(x + 7, by - 17);
  c.moveTo(x, by - 5);
  c.lineTo(x, by + 10);
  c.stroke();
  c.fillStyle = color.tinta;
  for (const yy of [by - 1, by + 5]) {
    c.beginPath();
    c.arc(x + 3, yy, 1.4, 0, TAU);
    c.fill();
  }
  // Bolsillo con lápiz.
  c.strokeStyle = color.tinta;
  c.lineWidth = 1.2;
  c.strokeRect(x - 13, by - 6, 6, 5);
  c.beginPath();
  c.moveTo(x - 11, by - 6);
  c.lineTo(x - 11, by - 10);
  c.stroke();
  entintar(c, bata, trazo.grueso - 1, sem + 2);
  c.restore();

  // Brazos de manguera con guantes blancos.
  const brazo = moviendo ? Math.sin(paso) * 6 : Math.sin(fase) * 1.5;
  for (const lado of [-1, 1]) {
    const hx = x + lado * 13;
    const hy = y - 12 - salto;
    const mx = x + lado * 21;
    const my = y + 3 - salto + brazo * lado;
    manguera(c, hx, hy, x + lado * 25, y - 10 - salto, mx, my, 4.5, sem + 3 + lado);
    guante(c, mx, my + 1, 5.6, lado > 0 ? 0.9 : Math.PI - 0.9, sem + 5 + lado);
  }

  // Cabeza redonda con antena de resorte.
  const hy = y - 32 - salto * 1.1;
  const foco = v.cercana !== -1 || cercaPuerta(m, ctx.sala);
  const ant = new Path2D();
  ant.moveTo(x, hy - 18);
  for (let k = 1; k <= 4; k++) ant.lineTo(x + (k % 2 ? 3 : -3) + Math.sin(fase) * k * 0.4, hy - 18 - k * 3);
  entintar(c, ant, trazo.fino + 0.4, sem + 8);
  const bx = x + Math.sin(fase) * 1.8;
  if (foco) brillo(c, bx, hy - 33, 12, color.ambar2, 0.6);
  const bulbo = elipseP(bx, hy - 33, 4.2, 4.2);
  rellenar(c, bulbo, foco ? color.ambar2 : color.papel);
  entintar(c, bulbo, trazo.fino + 0.3, sem + 9);
  const cabeza = elipseP(x, hy, 19, 18);
  rellenar(c, cabeza, color.papel);
  sombreado(c, cabeza, 6, 0.18);
  // Orejas-tornillo.
  for (const lado of [-1, 1]) {
    const oreja = rrP(x + lado * 19 - 3, hy - 4, 6, 9, 2);
    rellenar(c, oreja, color.tinta);
  }
  entintar(c, cabeza, trazo.grueso, sem + 10);
  const parpadeo = !ctx.reducirMovimiento && v.reloj % 3.6 < 0.13;
  for (const lado of [-1, 1]) ojoPastel(c, x + lado * 6 + dir * 3, hy - 3, 3.6, 6.4, dir, 0, parpadeo);
  c.strokeStyle = color.tinta;
  c.lineWidth = trazo.fino + 0.3;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x + dir * 3, hy + 6, 5, 0.25 * Math.PI, 0.75 * Math.PI);
  c.stroke();
  c.fillStyle = color.papel;
  c.beginPath();
  c.ellipse(x - 9, hy - 10, 3.5, 1.6, -0.7, 0, TAU);
  c.fill();
  c.restore();

  rotulo(c, v.nombreJugador, x, y - 76 - salto, 11, color.tinta, 'center', color.papel);
}

/** Centinela de OMEGA: dron-ojo rojo con hélice de manguera y guantes colgantes. */
function dron(c: Ctx, d: Mundo['drones'][number], m: Mundo, k: number) {
  const j = m.jugador;
  const sem = 700 + k * 11;
  sombraContacto(c, d.x, d.y + 42, 17, 4.5, 0.18);
  c.save();
  c.translate(d.x, d.y);
  c.rotate(Math.sin(d.giro) * 0.12);

  // Hélice sobre un tallo de manguera.
  manguera(c, 0, -17, 4, -23, 0, -29, 3.5, sem);
  const aspa = Math.abs(Math.cos(d.giro * 3));
  for (const lado of [-1, 1]) {
    const pala = elipseP(lado * 11 * aspa, -30, 11 * aspa + 1.5, 3);
    rellenar(c, pala, color.panel);
    entintar(c, pala, trazo.fino, sem + lado);
  }
  rellenar(c, elipseP(0, -30, 3, 3), color.tinta);

  // Brazos colgantes con guantes.
  const balanceo = Math.sin(d.giro * 0.8) * 3;
  manguera(c, -15, 4, -26, 6, -24, 16 + balanceo, 3.5, sem + 2);
  manguera(c, 15, 4, 26, 6, 24, 16 - balanceo, 3.5, sem + 3);
  guante(c, -24, 19 + balanceo, 4.6, Math.PI / 2 + 0.3, sem + 4);
  guante(c, 24, 19 - balanceo, 4.6, Math.PI / 2 - 0.3, sem + 5);

  // Cuerpo rojo con sombreado cel y brillo.
  const cuerpo = elipseP(0, 0, 19, 18);
  rellenar(c, cuerpo, color.hostil);
  sombreado(c, cuerpo, 7, 0.55, color.omega);
  c.fillStyle = color.papel;
  c.beginPath();
  c.ellipse(-10, -9, 4, 2, -0.7, 0, TAU);
  c.fill();
  entintar(c, cuerpo, trazo.grueso - 0.5, sem + 6);

  // Ojo que sigue al Agente.
  const dx = j.x - d.x;
  const dy = j.y - d.y;
  const dist = Math.hypot(dx, dy) || 1;
  const blanco = elipseP(0, 1, 9.5, 10);
  rellenar(c, blanco, color.papel);
  entintar(c, blanco, trazo.fino, sem + 7);
  ojoPastel(c, (dx / dist) * 3, 1 + (dy / dist) * 3, 3.6, 5.6, dx / dist, dy / dist);
  // Ceño fruncido.
  entintar(c, lineaP([-11, -11, 0, -6, 11, -11]), 3.5, sem + 8);
  c.restore();
  rotulo(c, 'Centinela', d.x, d.y - 42, 10, color.hostil, 'center', color.papel);
}

function omega(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista) {
  const x = OMEGA_X;
  const y = m.omegaY;
  const vivo = ctx.omegaVida > 0;
  const j = m.jugador;
  const sem = 800;
  if (vivo) brillo(c, x, y, 175, color.hostil, 0.2);
  sombraContacto(c, x, 520, 80, 10, 0.2);
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(v.reloj * 0.7) * 0.08);
  // Pistones de manguera con bolas en la punta.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + v.reloj * 0.35;
    const r2 = 90 + (vivo ? Math.sin(v.reloj * 4 + i) * 3 : 0);
    manguera(c, Math.cos(a) * 60, Math.sin(a) * 60, Math.cos(a + 0.12) * 76, Math.sin(a + 0.12) * 76, Math.cos(a) * r2, Math.sin(a) * r2, 6, sem + i);
    const bola = elipseP(Math.cos(a) * r2, Math.sin(a) * r2, 7, 7);
    rellenar(c, bola, vivo ? color.hostil : color.gris);
    entintar(c, bola, trazo.fino + 0.5, sem + 10 + i);
  }
  const cuerpo = elipseP(0, 0, 72, 72);
  sombraDura(c, cuerpo, sombra.dx + 2, sombra.dy + 2);
  rellenar(c, cuerpo, vivo ? color.omega : color.gris);
  sombreado(c, cuerpo, 16, 0.3);
  c.fillStyle = color.papel;
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    c.beginPath();
    c.arc(Math.cos(a) * 62, Math.sin(a) * 62, 2, 0, TAU);
    c.fill();
  }
  c.beginPath();
  c.ellipse(-38, -40, 12, 5, -0.75, 0, TAU);
  c.fill();
  entintar(c, cuerpo, trazo.grueso + 1, sem + 20);
  // Ojo del núcleo.
  const esclera = elipseP(0, 0, 44, 42);
  rellenar(c, esclera, vivo ? color.papel : color.primario2);
  sombreado(c, esclera, 8, 0.14);
  entintar(c, esclera, trazo.grueso, sem + 21);
  if (vivo) {
    const dx = j.x - x;
    const dy = j.y - y;
    const dist = Math.hypot(dx, dy) || 1;
    const ix = (dx / dist) * 13;
    const iy = (dy / dist) * 10;
    const iris = elipseP(ix, iy, 21, 21);
    rellenar(c, iris, color.hostil);
    entintar(c, iris, trazo.medio, sem + 22);
    ojoPastel(c, ix, iy, 8, 11, dx / dist, dy / dist);
    // Párpado furioso.
    const parpado = new Path2D();
    parpado.moveTo(-46, -8);
    parpado.quadraticCurveTo(0, -30, 46, -22);
    parpado.lineTo(46, -50);
    parpado.lineTo(-46, -50);
    parpado.closePath();
    c.save();
    c.clip(esclera);
    rellenar(c, parpado, color.omega);
    c.restore();
    const borde = new Path2D();
    borde.moveTo(-44, -8);
    borde.quadraticCurveTo(0, -30, 44, -22);
    entintar(c, borde, trazo.grueso, sem + 23);
  } else {
    for (const s of [-1, 1]) entintar(c, lineaP([-14, -14 * s, 14, 14 * s]), 6, sem + 24 + s);
  }
  c.restore();
  rotulo(c, 'OMEGA', x, y - 120, 22, vivo ? color.omega : color.tenue, 'center', color.papel);
  if (!ctx.escudosCaidos) {
    const total = ctx.sala.consolas.length;
    const restantes = ctx.sala.consolas.filter((k) => !ctx.resueltos.has(k.slug)).length;
    const r = 104 + Math.sin(v.reloj * 7) * 4;
    c.save();
    c.lineCap = 'round';
    c.setLineDash([16, 10]);
    c.lineDashOffset = -v.reloj * 30;
    c.strokeStyle = color.tinta;
    c.lineWidth = 9;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.stroke();
    c.strokeStyle = color.escudo;
    c.lineWidth = 5;
    c.stroke();
    c.restore();
    rotulo(c, `Escudos ${restantes}/${total}`, x, y + 128, 13, color.escudo, 'center', color.papel);
  } else if (vivo) {
    rotulo(c, `Núcleos ${ctx.omegaVida}/3`, x, y + 128, 13, color.omega, 'center', color.papel);
  }
  // Rayos de OMEGA (viajan a la izquierda) con líneas de velocidad.
  for (const [k, z] of m.lasers.entries()) {
    c.strokeStyle = color.tinta;
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    for (const dy of [-5, 0, 5]) {
      c.moveTo(z.x + 26, z.y + dy);
      c.lineTo(z.x + 38 + Math.abs(dy) * -1.5, z.y + dy);
    }
    c.stroke();
    brillo(c, z.x, z.y, 26, color.hostil, 0.35);
    const rayo = rrP(z.x - 20, z.y - 7, 40, 14, 7);
    sombraDura(c, rayo, 2, 2);
    rellenar(c, rayo, color.hostil);
    entintar(c, rayo, trazo.medio, 850 + k);
    c.fillStyle = conAlfa(color.papel, 0.85);
    c.fillRect(z.x - 13, z.y - 4, 18, 2);
  }
  // Disparos del Agente: pastillas doradas.
  for (const [k, z] of m.disparos.entries()) {
    c.strokeStyle = color.tinta;
    c.lineWidth = 2;
    c.lineCap = 'round';
    c.beginPath();
    for (const dy of [-4, 0, 4]) {
      c.moveTo(z.x - 13, z.y + dy);
      c.lineTo(z.x - 24 + Math.abs(dy) * 1.5, z.y + dy);
    }
    c.stroke();
    const bala = rrP(z.x - 9, z.y - 5, 23, 10, 5);
    rellenar(c, bala, color.ambar2);
    entintar(c, bala, trazo.fino + 0.5, 870 + k);
    c.fillStyle = color.papel;
    c.fillRect(z.x - 5, z.y - 2.5, 9, 1.5);
  }
}

/** Partículas del motor (chispas de daño e impacto) en el estilo de tinta. */
function particulasMundo(c: Ctx, m: Mundo, reducido: boolean) {
  const n = reducido ? Math.min(m.particulas.length, 40) : m.particulas.length;
  for (let k = 0; k < n; k++) {
    const p = m.particulas[k];
    const a = Math.max(0, Math.min(1, p.vida / 0.9));
    const rojizo = parseInt(p.color.slice(1, 3), 16) - parseInt(p.color.slice(3, 5), 16) > 40;
    c.globalAlpha = a;
    if (rojizo && k % 2 === 0) {
      // Gota de tinta estirada en la dirección de vuelo.
      c.fillStyle = color.tinta;
      c.beginPath();
      c.ellipse(p.x, p.y, 2.5 + a * 3, 1.8 + a * 1.4, Math.atan2(p.vy, p.vx), 0, TAU);
      c.fill();
    } else {
      estrella(c, p.x, p.y, 2.5 + a * 4, k + p.vida * 5, rojizo ? color.hostil : color.ambar2, a > 0.35);
    }
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Cuadro completo
// ---------------------------------------------------------------------------

const DURACION_IRIS = 0.75; // s
const irisPorMundo = new WeakMap<Mundo, boolean>();

export function dibujarSala(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista): void {
  const ahora = performance.now();
  const dt = ultimoCuadro ? Math.min(0.05, (ahora - ultimoCuadro) / 1000) : 0;
  ultimoCuadro = ahora;
  cuadros++;
  const reducido = ctx.reducirMovimiento;
  boil = reducido ? 0 : Math.floor((v.reloj * 1000) / movimiento.boilMs);
  const escala = c.getTransform().a || 1;

  c.clearRect(0, 0, W, H);
  // Evita huecos entre letras al escalar el canvas a tamaños no enteros.
  c.textRendering = 'geometricPrecision';
  vigilarAciertos(m, ctx, ahora);

  c.save();
  // Sacudida de cámara breve (≤ 6 px); el motor la anula con movimiento reducido.
  if (m.temblor > 0 && !reducido) {
    const t = Math.min(m.temblor, 12);
    c.translate((Math.random() - 0.5) * t, (Math.random() - 0.5) * t);
  }

  // Capa de fondo (pre-renderizada).
  c.drawImage(lienzoFondo(ctx.sala, v.acento, escala), 0, 0, W, H);

  // Escenario y actores ordenados por profundidad: los módulos cuyo pie queda delante del
  // Agente se dibujan después de él.
  const pieJugador = m.jugador.y + 20;
  const esc = ctx.sala.esJefe ? 0.86 : 1;
  const delante: number[] = [];
  ctx.sala.consolas.forEach((con, i) => {
    c.save();
    if (con.y + 52 * esc > pieJugador) delante.push(i);
    else consola(c, ctx, v, i, ahora);
    c.restore();
  });
  puerta(c, m, ctx, v);
  if (ctx.sala.esJefe) omega(c, m, ctx, v);
  jugador(c, m, ctx, v);
  for (const i of delante) {
    c.save();
    consola(c, ctx, v, i, ahora);
    c.restore();
  }
  if (!ctx.sala.esJefe) m.drones.forEach((d, k) => dron(c, d, m, k));
  pastillaInteraccion(c, ctx, v);

  // FX.
  particulasMundo(c, m, reducido);
  fx(c, dt);
  c.restore();

  // Daño: destello rojo de OMEGA + viñeta roja.
  if (m.destello > 0) {
    const a = Math.min(1, m.destello * 4);
    c.fillStyle = conAlfa(color.hostil, a * 0.18);
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
    g.addColorStop(0, conAlfa(color.hostil, 0));
    g.addColorStop(1, conAlfa(color.hostil, a * 0.4));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  // Grano de película (multiplicar) y viñeta.
  const grano = patronGrano(c);
  if (grano) {
    if (!reducido && cuadros % 2 === 0) {
      granoX = azar(cuadros * 0.13) * 128;
      granoY = azar(cuadros * 0.29) * 128;
    }
    grano.setTransform(new DOMMatrix().translate(granoX, granoY).scale(1 / escala));
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = 0.08;
    c.fillStyle = grano;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  if (!reducido) {
    // Parpadeo de exposición del proyector, al ritmo del boil.
    c.fillStyle = conAlfa(color.papel, 0.01 + azar(boil * 0.7) * 0.03);
    c.fillRect(0, 0, W, H);
  }
  c.drawImage(lienzoVineta(escala), 0, 0, W, H);

  // Iris de entrada a la sala (solo si la sala arrancó sin pausa).
  if (!irisPorMundo.has(m)) irisPorMundo.set(m, m.t > 0);
  if (irisPorMundo.get(m) && m.t < DURACION_IRIS) {
    const k = m.t / DURACION_IRIS;
    if (reducido) {
      c.fillStyle = conAlfa(color.tinta, 1 - k);
      c.fillRect(0, 0, W, H);
    } else {
      const r = movimiento.suave(k) * Math.hypot(W, H);
      const p = new Path2D();
      p.rect(0, 0, W, H);
      p.arc(m.jugador.x, m.jugador.y - 14, Math.max(0.1, r), 0, TAU);
      c.fillStyle = color.tinta;
      c.fill(p, 'evenodd');
    }
  }
}
