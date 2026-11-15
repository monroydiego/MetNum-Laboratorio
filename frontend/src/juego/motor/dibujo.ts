// Dibujo de la sala en Canvas 2D. Todo el arte se genera al vuelo, sin archivos externos.
import { ANCHO_SALA as W, ALTO_SALA as H } from '../mapa';
import { color, conAlfa, fuente } from '../../tokens';
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

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, relleno?: string | null, trazo?: string | null, grosor = 1) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  if (relleno) {
    c.fillStyle = relleno;
    c.fill();
  }
  if (trazo) {
    c.strokeStyle = trazo;
    c.lineWidth = grosor;
    c.stroke();
  }
}

function texto(c: Ctx, t: string, x: number, y: number, tam = 14, col: string = color.tinta, peso = '600', alin: CanvasTextAlign = 'left') {
  c.font = `${peso} ${tam}px ${fuente.display}`;
  c.textAlign = alin;
  c.fillStyle = col;
  c.fillText(t, x, y);
}

function linea(c: Ctx, x1: number, y1: number, x2: number, y2: number, col = '#38505b', g = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = col;
  c.lineWidth = g;
  c.stroke();
}

function brillo(c: Ctx, x: number, y: number, r: number, col: string, alfa = 0.22) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, conAlfa(col, alfa));
  g.addColorStop(1, conAlfa(col, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

function recortar(c: Ctx, t: string, max: number, tam: number): string {
  c.font = `600 ${tam}px ${fuente.display}`;
  if (c.measureText(t).width <= max) return t;
  let s = t;
  while (s.length > 1 && c.measureText(s + '…').width > max) s = s.slice(0, -1);
  return s + '…';
}

function fondo(c: Ctx, sala: ContextoSala['sala'], v: Vista) {
  c.fillStyle = '#0a1520';
  c.fillRect(0, 0, W, H);
  rr(c, 20, 95, 1040, 454, 18, '#0d1f2b', '#2f4c5a', 2);
  c.save();
  c.beginPath();
  c.roundRect(21, 95, 1038, 452, 17);
  c.clip();
  for (let y = 100; y < 545; y += 47) linea(c, 20, y, 1060, y, '#1c3442', 0.8);
  for (let x = 25; x < 1060; x += 47) linea(c, x, 95, x, 548, '#1c3442', 0.8);
  for (let x = 48; x < 1060; x += 220) {
    brillo(c, x, 115, 130, v.acento, 0.05);
    brillo(c, x, 540, 110, v.acento, 0.06);
  }
  c.restore();
  // Vigas superior e inferior.
  rr(c, 20, 95, 1040, 27, 4, '#14283a', '#2f4c5a');
  rr(c, 20, 524, 1040, 24, 4, '#14283a', '#2f4c5a');
  for (let x = 65; x < 1020; x += 135) {
    rr(c, x, 108, 65, 5, 2, '#33606a');
    rr(c, x, 534, 65, 4, 2, '#2b505c');
  }
  // Monitores de fondo con onda.
  for (let i = 0; i < 3; i++) {
    const x = 120 + i * 425;
    rr(c, x, 305, 95, 69, 8, '#0c1f2c', '#2c4a58');
    rr(c, x + 12, 319, 71, 36, 4, '#11293a', '#386675');
    c.strokeStyle = conAlfa(v.acento, 0.55);
    c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k < 16; k++) {
      const xx = x + 13 + k * 4.5;
      const yy = 336 + Math.sin(k * 0.75 + v.reloj * 1.7 + i) * 9;
      if (k) c.lineTo(xx, yy);
      else c.moveTo(xx, yy);
    }
    c.stroke();
  }
  // Pasillo guía.
  rr(c, 50, 294, 958, 94, 13, '#0e2330a9', '#21414f');
  linea(c, 47, 341, 1005, 341, conAlfa(v.acento, 0.24), 2);
  if (!sala.esJefe) for (let x = 912; x < 1035; x += 27) rr(c, x, 328, 15, 3, 2, conAlfa(v.acento, 0.3));
  // Encabezado (a la derecha: la esquina izquierda la ocupa el HUD).
  texto(c, sala.nombre, 1040, 68, 15, v.acento, '700', 'right');
}

function consola(c: Ctx, ctx: ContextoSala, v: Vista, i: number) {
  const con = ctx.sala.consolas[i];
  const { x, y } = con;
  const hecha = ctx.resueltos.has(con.slug);
  const cerca = v.cercana === i;
  const disponible = v.disponibles[i];
  const extra = con.tipo === 'extra' || con.tipo === 'consulta';
  const esc = extra ? 0.72 : 1;
  const acento = con.tipo === 'escudo' ? color.escudo : extra ? color.ambar : v.acento;
  const col = hecha ? color.menta : disponible ? acento : '#4d6676';
  const pulso = (Math.sin(v.reloj * 3.2 + i * 2) + 1) / 2;

  brillo(c, x, y, 96 * esc, col, disponible ? 0.08 + 0.08 * pulso : 0.04);
  c.save();
  c.translate(x, y);
  c.scale(esc, esc);
  rr(c, -76, 32, 152, 22, 4, '#07141e', '#3a5866');
  rr(c, -81, -49, 162, 90, 8, '#172a38', '#4f6c7a', 1.5);
  rr(c, -69, -36, 138, 68, 6, hecha ? '#133430' : '#0f2531', hecha ? '#6ee5a4' : conAlfa(col, 0.7), 1);
  for (let k = 0; k < 3; k++) rr(c, -58 + k * 10, -26, 5, 5, 1, hecha ? color.menta : k === 1 ? col : '#2f5562');
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.beginPath();
  for (let k = 0; k <= 32; k++) {
    const px = -52 + k * 3.2;
    const py = 1 + (disponible ? Math.sin(k * 0.47 + v.reloj * 3 + i) * 9 : 0);
    if (k === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  rr(c, -28, 41, 56, 7, 3, hecha ? '#53c89b' : '#4c6f7c');
  rr(c, -81, -75, 162, 23, 5, hecha ? '#143a33' : '#1a3340', hecha ? '#438a65' : '#35606d');
  c.restore();

  const etiqueta = recortar(c, v.etiquetas[i] ?? con.slug, 128 * esc, 11);
  texto(c, etiqueta, x - 70 * esc, y - 58 * esc, 11, hecha ? '#b1ffd4' : disponible ? '#d5f1f8' : '#8399a6', '600');
  texto(c, hecha ? '✓' : cerca ? 'E' : disponible ? '●' : '–', x + 68 * esc, y - 58 * esc, 13, hecha ? color.menta : cerca ? color.ambar : '#6b9dac', '700', 'center');
  if (extra) texto(c, con.tipo === 'consulta' ? 'Consulta' : 'Opcional', x, y + 62 * esc, 10, color.ambar, '600', 'center');

  if (cerca) {
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.strokeRect(x - 88 * esc, y - 82 * esc, 176 * esc, 140 * esc);
    c.setLineDash([]);
    const yb = y + (extra ? 70 : 61);
    rr(c, x - 52, yb, 104, 24, 5, '#072a32', color.cian);
    texto(c, disponible ? 'Pulsa E' : 'Sin método', x, yb + 16, 11, '#d6fff8', '700', 'center');
  }
}

function puerta(c: Ctx, m: Mundo, ctx: ContextoSala) {
  if (ctx.sala.esJefe) return;
  const abierta = ctx.puertaAbierta;
  const col = abierta ? color.menta : color.hostil;
  const x = 1001;
  const y = 242;
  brillo(c, x + 34, y + 88, 110, col, abierta ? 0.25 : 0.13);
  rr(c, x, y, 68, 182, 8, '#0c1c29', '#45616f', 3);
  rr(c, x + 10, y + 13, 48, 154, 5, abierta ? '#113e39' : '#382534', col, 2);
  for (let k = 0; k < 4; k++) linea(c, x + 17, y + 27 + k * 41, x + 53, y + 27 + k * 41, conAlfa(col, 0.56), 2);
  rr(c, x - 40, y + 59, 34, 48, 6, '#192d39', '#55717b');
  c.beginPath();
  c.arc(x - 23, y + 74, 7, 0, Math.PI * 2);
  c.fillStyle = col;
  c.fill();
  texto(c, abierta ? 'Salida abierta' : 'Salida bloqueada', x + 34, y - 12, 11, abierta ? col : '#f0a3a8', '700', 'center');
  if (abierta) texto(c, 'F', x + 34, y + 100, 22, '#f1fff9', '700', 'center');
  if (cercaPuerta(m, ctx.sala)) {
    c.strokeStyle = col;
    c.setLineDash([5, 4]);
    c.lineWidth = 2;
    c.strokeRect(x - 8, y - 6, 84, 194);
    c.setLineDash([]);
  }
}

function jugador(c: Ctx, m: Mundo, v: Vista) {
  const { x, y, moviendo, paso } = m.jugador;
  const rebote = moviendo ? Math.sin(paso) * 2.3 : Math.sin(v.reloj * 3) * 1.2;
  // Parpadeo durante la invulnerabilidad.
  if (m.invulnerable > 0 && Math.floor(m.invulnerable * 10) % 2 === 0) c.globalAlpha = 0.55;
  c.beginPath();
  c.ellipse(x, y + 19, 24, 8, 0, 0, Math.PI * 2);
  c.fillStyle = '#010b1399';
  c.fill();
  rr(c, x - 14, y + 5 + rebote, 10, 19, 4, '#265d68', '#66a3a7');
  rr(c, x + 4, y + 5 - rebote, 10, 19, 4, '#265d68', '#66a3a7');
  rr(c, x - 21, y - 18 + rebote, 42, 38, 10, '#b5d5d8', '#e3f5f5', 1);
  rr(c, x - 26, y - 12 + rebote, 10, 26, 5, '#417b85', '#78cad1');
  rr(c, x + 17, y - 12 + rebote, 10, 26, 5, '#417b85', '#78cad1');
  rr(c, x - 13, y - 12 + rebote, 26, 25, 7, '#25505d');
  rr(c, x - 8, y - 6 + rebote, 16, 13, 4, color.cian);
  c.beginPath();
  c.arc(x, y - 27 + rebote, 22, 0, Math.PI * 2);
  c.fillStyle = '#e2f2ec';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = '#2f606a';
  c.stroke();
  c.beginPath();
  c.ellipse(x, y - 27 + rebote, 16, 12, 0, 0, Math.PI * 2);
  c.fillStyle = '#0d3444';
  c.fill();
  c.beginPath();
  c.ellipse(x + 5 * m.jugador.direccion, y - 33 + rebote, 7, 4, -0.5 * m.jugador.direccion, 0, Math.PI * 2);
  c.fillStyle = '#84d9e0';
  c.fill();
  c.globalAlpha = 1;
  texto(c, v.nombreJugador, x, y - 56 + rebote, 11, '#d6faff', '600', 'center');
}

function dron(c: Ctx, d: Mundo['drones'][number]) {
  brillo(c, d.x, d.y, 68, color.hostil, 0.16);
  c.save();
  c.translate(d.x, d.y);
  c.rotate(Math.sin(d.giro) * 0.12);
  rr(c, -23, -15, 46, 31, 8, '#392339', '#fc7892', 2);
  rr(c, -40, -8, 15, 18, 4, '#68304a', '#f9a0af');
  rr(c, 25, -8, 15, 18, 4, '#68304a', '#f9a0af');
  c.beginPath();
  c.arc(0, 0, 9, 0, Math.PI * 2);
  c.fillStyle = '#ffcfbd';
  c.fill();
  c.beginPath();
  c.arc(1, 0, 4, 0, Math.PI * 2);
  c.fillStyle = '#b32b68';
  c.fill();
  c.restore();
  texto(c, 'Centinela', d.x, d.y - 27, 10, '#ffc3c7', '600', 'center');
}

function omega(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista) {
  const x = OMEGA_X;
  const y = m.omegaY;
  const vivo = ctx.omegaVida > 0;
  brillo(c, x, y, 175, vivo ? color.omega : '#5c5665', vivo ? 0.26 : 0.12);
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(v.reloj * 0.7) * 0.08);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + v.reloj * 0.35;
    linea(c, Math.cos(a) * 64, Math.sin(a) * 64, Math.cos(a) * 88, Math.sin(a) * 88, vivo ? '#f478a4' : '#6d6475', 5);
  }
  c.beginPath();
  c.arc(0, 0, 72, 0, Math.PI * 2);
  c.fillStyle = '#321d36';
  c.fill();
  c.strokeStyle = vivo ? '#ff769f' : '#6d6475';
  c.lineWidth = 4;
  c.stroke();
  c.beginPath();
  c.arc(0, 0, 46, 0, Math.PI * 2);
  c.fillStyle = vivo ? '#5b244b' : '#2c2733';
  c.fill();
  c.strokeStyle = vivo ? '#ffb6bd' : '#6d6475';
  c.lineWidth = 3;
  c.stroke();
  c.beginPath();
  c.arc(0, 0, 18, 0, Math.PI * 2);
  c.fillStyle = vivo ? '#ff577b' : '#5c5665';
  c.fill();
  c.beginPath();
  c.arc(0, 0, 8, 0, Math.PI * 2);
  c.fillStyle = '#fff1e0';
  c.fill();
  c.restore();
  texto(c, 'OMEGA', x, y - 105, 20, '#ffd2dd', '700', 'center');
  if (!ctx.escudosCaidos) {
    const restantes = ctx.sala.consolas.filter((k) => !ctx.resueltos.has(k.slug)).length;
    c.beginPath();
    c.arc(x, y, 103 + Math.sin(v.reloj * 7) * 4, 0, Math.PI * 2);
    c.lineWidth = 3;
    c.strokeStyle = color.escudo;
    c.setLineDash([12, 12]);
    c.stroke();
    c.setLineDash([]);
    texto(c, `Escudos ${restantes}/3`, x, y + 122, 12, '#d5b4ff', '700', 'center');
  } else if (vivo) {
    texto(c, `Núcleos ${ctx.omegaVida}/3`, x, y + 122, 12, '#ffc3cf', '700', 'center');
  }
  for (const z of m.lasers) {
    brillo(c, z.x, z.y, 26, color.hostil, 0.35);
    rr(c, z.x - 20, z.y - 7, 40, 14, 7, '#e64b70', '#ffe0da');
  }
  for (const z of m.disparos) {
    brillo(c, z.x, z.y, 25, color.cian, 0.4);
    rr(c, z.x - 9, z.y - 5, 23, 10, 5, '#d9ffff', '#7dedfb');
  }
}

export function dibujarSala(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista): void {
  c.clearRect(0, 0, W, H);
  // Evita huecos entre letras al escalar el canvas a tamaños no enteros.
  c.textRendering = 'geometricPrecision';
  c.save();
  if (m.temblor > 0) c.translate((Math.random() - 0.5) * m.temblor, (Math.random() - 0.5) * m.temblor);
  fondo(c, ctx.sala, v);
  ctx.sala.consolas.forEach((_, i) => consola(c, ctx, v, i));
  puerta(c, m, ctx);
  if (ctx.sala.esJefe) omega(c, m, ctx, v);
  else m.drones.forEach((d) => dron(c, d));
  jugador(c, m, v);
  for (const p of m.particulas) {
    c.globalAlpha = Math.max(0, p.vida / 0.9);
    rr(c, p.x, p.y, 4, 4, 2, p.color);
  }
  c.globalAlpha = 1;
  c.restore();
  // Pantalla de daño: destello rojo + viñeta.
  if (m.destello > 0) {
    const a = m.destello * 4;
    c.fillStyle = `rgba(240,35,65,${a * 0.22})`;
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
    g.addColorStop(0, 'rgba(255,57,109,0)');
    g.addColorStop(1, `rgba(255,57,109,${a * 0.45})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
}
