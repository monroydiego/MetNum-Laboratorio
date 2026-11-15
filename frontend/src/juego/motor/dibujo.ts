// Dibujo de la sala en Canvas 2D. Todo el arte se genera al vuelo, sin archivos externos.
// Estilo: laboratorio claro (pared de azulejo, piso de loseta, mesas de trabajo y cristalería).
// El personaje, los drones centinela y los módulos de problemas conservan su diseño original.
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

/** Matraz Erlenmeyer decorativo con líquido de color. */
function matraz(c: Ctx, x: number, y: number, alto: number, liquido: string, nivel: number) {
  const cuello = alto * 0.38;
  const base = alto * 0.62;
  c.beginPath();
  c.moveTo(x - 5, y);
  c.lineTo(x - 5, y + cuello);
  c.lineTo(x - base * 0.62, y + alto);
  c.lineTo(x + base * 0.62, y + alto);
  c.lineTo(x + 5, y + cuello);
  c.lineTo(x + 5, y);
  c.closePath();
  c.fillStyle = '#ffffffcc';
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = conAlfa(liquido, 0.75);
  c.fillRect(x - base, y + alto * (1 - nivel), base * 2, alto * nivel);
  c.restore();
  c.strokeStyle = '#9aa8a2';
  c.lineWidth = 1.5;
  c.stroke();
  rr(c, x - 7, y - 3, 14, 4, 2, '#9aa8a2');
}

/** Tubo de ensayo en su gradilla. */
function tubo(c: Ctx, x: number, y: number, liquido: string, nivel: number) {
  rr(c, x - 4, y, 8, 30, 4, '#ffffffcc', '#9aa8a2', 1.2);
  rr(c, x - 3, y + 30 - 28 * nivel, 6, 28 * nivel - 1, 3, conAlfa(liquido, 0.8));
}

function fondo(c: Ctx, sala: ContextoSala['sala'], v: Vista) {
  // Pared del laboratorio (azulejo claro).
  c.fillStyle = '#e7ebe6';
  c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 36) linea(c, x, 0, x, 92, '#dbe1da', 1);
  for (let y = 18; y < 92; y += 18) linea(c, 0, y, W, y, '#dbe1da', 1);
  // Rótulo de la sala sobre la pared.
  rr(c, 20, 20, 8, 52, 4, v.acento);
  texto(c, sala.nombre, 40, 52, 26, color.tinta, '700');
  texto(c, sala.esJefe ? 'Desactiva los escudos y enfrenta al núcleo OMEGA' : 'Resuelve todos los módulos para abrir la salida', 41, 73, 12, color.tenue, '500');
  // Repisa con matraces y gradilla con tubos de ensayo.
  const liquidos = [v.acento, color.ambar, '#5f9fd6', color.escudo, color.menta];
  rr(c, 610, 76, 260, 8, 3, '#c9bfae', '#b3a891');
  for (let i = 0; i < 5; i++) matraz(c, 640 + i * 52, 34, 42, liquidos[i], 0.35 + ((i * 37) % 40) / 100);
  rr(c, 892, 66, 146, 14, 4, '#d8cfbf', '#b3a891');
  for (let i = 0; i < 7; i++) tubo(c, 905 + i * 20, 40, liquidos[(i + 2) % liquidos.length], 0.3 + ((i * 23) % 50) / 100);

  // Piso de loseta.
  rr(c, 20, 95, 1040, 454, 18, '#f5f6f2', '#c9cfc7', 2);
  c.save();
  c.beginPath();
  c.roundRect(21, 96, 1038, 452, 17);
  c.clip();
  for (let y = 100; y < 548; y += 47) linea(c, 20, y, 1060, y, '#e4e8e2', 1);
  for (let x = 25; x < 1060; x += 47) linea(c, x, 95, x, 548, '#e4e8e2', 1);
  brillo(c, 540, 330, 520, v.acento, 0.05);
  c.restore();
  // Mesas de trabajo (superior e inferior), donde se apoyan los módulos.
  rr(c, 20, 95, 1040, 27, 6, '#dcd3c4', '#c2b6a1');
  rr(c, 20, 524, 1040, 24, 6, '#dcd3c4', '#c2b6a1');
  for (let x = 65; x < 1020; x += 135) {
    rr(c, x, 105, 65, 6, 3, '#c7bba6');
    rr(c, x, 533, 65, 5, 3, '#c7bba6');
  }
  // Pasillo de seguridad de la entrada a la salida, con franjas de precaución.
  rr(c, 50, 294, 958, 94, 13, conAlfa(v.acento, 0.07), conAlfa(v.acento, 0.25));
  for (let x = 60; x < 1000; x += 24) {
    rr(c, x, 297, 12, 4, 2, conAlfa(color.ambar, 0.4));
    rr(c, x, 381, 12, 4, 2, conAlfa(color.ambar, 0.4));
  }
  if (!sala.esJefe) {
    // Flechas guía hacia la salida.
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let x = 210; x < 960; x += 160) {
      c.beginPath();
      c.moveTo(x, 328);
      c.lineTo(x + 13, 341);
      c.lineTo(x, 354);
      c.strokeStyle = conAlfa(v.acento, 0.35);
      c.lineWidth = 4;
      c.stroke();
    }
    c.lineCap = 'butt';
    c.lineJoin = 'miter';
  }
  // Entrada (punto de control del traje).
  rr(c, 24, 300, 22, 82, 6, '#ffffff', '#c9cfc7', 1.5);
}

function consola(c: Ctx, ctx: ContextoSala, v: Vista, i: number) {
  const con = ctx.sala.consolas[i];
  const { x, y } = con;
  const hecha = ctx.resueltos.has(con.slug);
  const cerca = v.cercana === i;
  const disponible = v.disponibles[i];
  const esc = ctx.sala.esJefe ? 0.86 : 1;
  const acento = con.tipo === 'escudo' ? color.escudo : v.acento;
  const col = hecha ? color.menta : disponible ? acento : '#8a9a94';
  const pulso = (Math.sin(v.reloj * 3.2 + i * 2) + 1) / 2;

  // Sombra del módulo sobre el piso.
  c.beginPath();
  c.ellipse(x, y + 52 * esc, 86 * esc, 10 * esc, 0, 0, Math.PI * 2);
  c.fillStyle = '#22302d22';
  c.fill();
  brillo(c, x, y, 96 * esc, col, disponible ? 0.08 + 0.08 * pulso : 0.04);
  // Módulo (mismo diseño de siempre: monitor con onda, indicadores y base).
  c.save();
  c.translate(x, y);
  c.scale(esc, esc);
  rr(c, -76, 32, 152, 22, 4, '#07141e', '#3a5866');
  rr(c, -81, -49, 162, 90, 8, '#172a38', '#4f6c7a', 1.5);
  rr(c, -69, -36, 138, 68, 6, hecha ? '#133430' : '#0f2531', hecha ? '#6ee5a4' : conAlfa(col, 0.7), 1);
  for (let k = 0; k < 3; k++) rr(c, -58 + k * 10, -26, 5, 5, 1, hecha ? '#6ee5a4' : k === 1 ? col : '#2f5562');
  c.strokeStyle = hecha ? '#6ee5a4' : col;
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
  // Placa del nombre (clara, para leerse sobre el laboratorio).
  rr(c, -81, -75, 162, 23, 6, hecha ? '#e4f3ea' : '#ffffff', hecha ? color.menta : conAlfa(col, 0.65), 1.5);
  c.restore();

  const etiqueta = recortar(c, v.etiquetas[i] ?? con.slug, 128 * esc, 11);
  texto(c, etiqueta, x - 70 * esc, y - 58 * esc, 11, hecha ? color.menta : disponible ? color.tinta : color.tenue, '600');
  texto(c, hecha ? '✓' : cerca ? 'E' : disponible ? '●' : '–', x + 68 * esc, y - 58 * esc, 13, hecha ? color.menta : cerca ? color.ambar : col, '700', 'center');

  if (cerca) {
    c.strokeStyle = col;
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.strokeRect(x - 88 * esc, y - 82 * esc, 176 * esc, 140 * esc);
    c.setLineDash([]);
    const yb = y + 61 * esc;
    rr(c, x - 52, yb, 104, 24, 12, color.primario);
    texto(c, disponible ? 'Pulsa E' : 'Sin método', x, yb + 16, 11, '#ffffff', '700', 'center');
  }
}

function puerta(c: Ctx, m: Mundo, ctx: ContextoSala) {
  if (ctx.sala.esJefe) return;
  const abierta = ctx.puertaAbierta;
  const col = abierta ? color.menta : color.hostil;
  const x = 1001;
  const y = 242;
  brillo(c, x + 34, y + 88, 110, col, abierta ? 0.22 : 0.1);
  rr(c, x, y, 68, 182, 8, '#e9ece8', '#9eaaa5', 3);
  rr(c, x + 10, y + 13, 48, 154, 5, abierta ? '#dff2e6' : '#f7e4e1', col, 2);
  for (let k = 0; k < 4; k++) linea(c, x + 17, y + 27 + k * 41, x + 53, y + 27 + k * 41, conAlfa(col, 0.5), 2);
  rr(c, x - 40, y + 59, 34, 48, 6, '#ffffff', '#9eaaa5');
  c.beginPath();
  c.arc(x - 23, y + 74, 7, 0, Math.PI * 2);
  c.fillStyle = col;
  c.fill();
  texto(c, abierta ? 'Salida abierta' : 'Salida bloqueada', x + 34, y - 12, 11, col, '700', 'center');
  if (abierta) texto(c, 'F', x + 34, y + 100, 22, color.menta, '700', 'center');
  if (cercaPuerta(m, ctx.sala)) {
    c.strokeStyle = col;
    c.setLineDash([5, 4]);
    c.lineWidth = 2;
    c.strokeRect(x - 8, y - 6, 84, 194);
    c.setLineDash([]);
  }
}

// ---- Personaje (diseño original, sin cambios) ----
function jugador(c: Ctx, m: Mundo, v: Vista) {
  const { x, y, moviendo, paso } = m.jugador;
  const rebote = moviendo ? Math.sin(paso) * 2.3 : Math.sin(v.reloj * 3) * 1.2;
  // Parpadeo durante la invulnerabilidad.
  if (m.invulnerable > 0 && Math.floor(m.invulnerable * 10) % 2 === 0) c.globalAlpha = 0.55;
  c.beginPath();
  c.ellipse(x, y + 19, 24, 8, 0, 0, Math.PI * 2);
  c.fillStyle = '#010b1355';
  c.fill();
  rr(c, x - 14, y + 5 + rebote, 10, 19, 4, '#265d68', '#66a3a7');
  rr(c, x + 4, y + 5 - rebote, 10, 19, 4, '#265d68', '#66a3a7');
  rr(c, x - 21, y - 18 + rebote, 42, 38, 10, '#b5d5d8', '#e3f5f5', 1);
  rr(c, x - 26, y - 12 + rebote, 10, 26, 5, '#417b85', '#78cad1');
  rr(c, x + 17, y - 12 + rebote, 10, 26, 5, '#417b85', '#78cad1');
  rr(c, x - 13, y - 12 + rebote, 26, 25, 7, '#25505d');
  rr(c, x - 8, y - 6 + rebote, 16, 13, 4, '#48e7d5');
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
  texto(c, v.nombreJugador, x, y - 56 + rebote, 11, color.tinta, '600', 'center');
}

// ---- Dron centinela (diseño original, sin cambios) ----
function dron(c: Ctx, d: Mundo['drones'][number]) {
  brillo(c, d.x, d.y, 68, '#ff7781', 0.16);
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
  texto(c, 'Centinela', d.x, d.y - 27, 10, color.hostil, '600', 'center');
}

function omega(c: Ctx, m: Mundo, ctx: ContextoSala, v: Vista) {
  const x = OMEGA_X;
  const y = m.omegaY;
  const vivo = ctx.omegaVida > 0;
  brillo(c, x, y, 175, vivo ? '#ff396d' : '#5c5665', vivo ? 0.2 : 0.1);
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
  texto(c, 'OMEGA', x, y - 105, 20, color.omega, '700', 'center');
  if (!ctx.escudosCaidos) {
    const total = ctx.sala.consolas.length;
    const restantes = ctx.sala.consolas.filter((k) => !ctx.resueltos.has(k.slug)).length;
    c.beginPath();
    c.arc(x, y, 103 + Math.sin(v.reloj * 7) * 4, 0, Math.PI * 2);
    c.lineWidth = 3;
    c.strokeStyle = color.escudo;
    c.setLineDash([12, 12]);
    c.stroke();
    c.setLineDash([]);
    texto(c, `Escudos ${restantes}/${total}`, x, y + 122, 12, color.escudo, '700', 'center');
  } else if (vivo) {
    texto(c, `Núcleos ${ctx.omegaVida}/3`, x, y + 122, 12, color.omega, '700', 'center');
  }
  for (const z of m.lasers) {
    brillo(c, z.x, z.y, 26, '#ff7781', 0.35);
    rr(c, z.x - 20, z.y - 7, 40, 14, 7, '#e64b70', '#ffe0da');
  }
  for (const z of m.disparos) {
    brillo(c, z.x, z.y, 25, color.primario, 0.4);
    rr(c, z.x - 9, z.y - 5, 23, 10, 5, '#d9ffff', '#2d7a67');
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
  // Pantalla de daño: destello coral + viñeta.
  if (m.destello > 0) {
    const a = m.destello * 4;
    c.fillStyle = `rgba(196,72,58,${a * 0.2})`;
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
    g.addColorStop(0, 'rgba(196,72,58,0)');
    g.addColorStop(1, `rgba(196,72,58,${a * 0.4})`);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
}
