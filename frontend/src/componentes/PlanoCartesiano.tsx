// Plano cartesiano en Canvas 2D: ejes escalables (zoom/desplazamiento), cuadrícula,
// series de línea/puntos, animación de iteraciones con requestAnimationFrame
// y exportación PNG con canvas.toBlob('image/png') para el Modo Comprobación Docente.
// Estilo «Cinta de Plata»: papel milimetrado de plata, ejes de tinta con flechas a mano,
// curvas a pincel y bolitas de goma con sombra dura; el punto activo va en dorado.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import { Maximize, Play, ZoomIn, ZoomOut } from 'lucide-react';
import type { SerieDTO } from '../types/numericos';
import { color, conAlfa, fuente, paletaSeries, prefiereMovimientoReducido, sombra, trazo } from '../tokens';

export interface PlanoHandle {
  /** Dibuja la gráfica completa (sin animación) y la exporta como PNG. */
  exportarPNG: () => Promise<Blob | null>;
}

interface Props {
  series: SerieDTO[];
  titulo: string;
  escalaY?: 'lineal' | 'log';
  etiquetaX?: string;
  etiquetaY?: string;
  alto?: number;
  ref?: Ref<PlanoHandle>;
}

interface Rango {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

const MARGEN = { izq: 62, der: 16, sup: 16, inf: 38 };

function pasoAgradable(rango: number, objetivo: number): number {
  const bruto = rango / Math.max(1, objetivo);
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const f = bruto / pot;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * pot;
}

function formatoEje(v: number, paso: number): string {
  if (Math.abs(v) < paso * 1e-9) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(1).replace('e+', 'e');
  const dec = Math.max(0, Math.min(6, -Math.floor(Math.log10(paso))));
  return v.toFixed(dec);
}


/** Desplazamiento pseudoaleatorio SEMBRADO (estable por objeto, no por cuadro) en ±0.4 px. */
function temblor(semilla: number): number {
  const s = Math.sin(semilla * 12.9898 + 78.233) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 0.8;
}

/** Línea de tinta «a mano»: curva apenas combada y repasada dos veces con temblor sembrado. */
function lineaTinta(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, semilla: number) {
  const mx = (x1 + x2) / 2 + temblor(semilla) * 1.5;
  const my = (y1 + y2) / 2 + temblor(semilla + 1) * 1.5;
  for (let r = 0; r < 2; r++) {
    const d = r === 0 ? 0 : temblor(semilla + 2);
    c.beginPath();
    c.moveTo(x1 + d, y1 - d);
    c.quadraticCurveTo(mx + d, my + d, x2 - d, y2 + d);
    c.stroke();
  }
}

/** Punta de flecha dibujada a mano (dos plumadas ligeramente asimétricas). */
function flecha(c: CanvasRenderingContext2D, x: number, y: number, ang: number) {
  const largo = 10;
  for (const [delta, l] of [[2.55, largo], [-2.6, largo * 0.9]] as const) {
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + Math.cos(ang + delta * 0.98) * l * 0.55,
      y + Math.sin(ang + delta * 0.98) * l * 0.55 + 0.6,
      x + Math.cos(ang + delta) * l,
      y + Math.sin(ang + delta) * l,
    );
    c.stroke();
  }
}

/**
 * Bolita de goma: sombra dura abajo-derecha, cuerpo con contorno de tinta y brillo
 * en cuña arriba-izquierda. `salto` la eleva (la sombra de contacto se encoge) y
 * `estira` > 0 la alarga en vertical (< 0 la aplasta).
 */
function bolita(c: CanvasRenderingContext2D, x: number, y: number, r: number, relleno: string, salto: number, estira: number, conSombraContacto = true) {
  c.save();
  if (conSombraContacto && salto > 0.5) {
    const k = Math.max(0.35, 1 - salto / 12);
    c.fillStyle = conAlfa(color.tinta, sombra.contacto);
    c.beginPath();
    c.ellipse(x, y + r * 0.6, r * 1.2 * k, r * 0.45 * k, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.translate(x, y - salto);
  c.scale(1 - estira * 0.6, 1 + estira);
  // Sombra dura desplazada (misma dirección que --shadow-tinta, escalada al tamaño).
  const d = Math.max(1.5, r * 0.4);
  c.fillStyle = color.tinta;
  c.beginPath();
  c.arc(d, d, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = relleno;
  c.strokeStyle = color.tinta;
  c.lineWidth = trazo.fino;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Brillo: cuña blanca (nunca degradado).
  c.fillStyle = color.papel;
  c.beginPath();
  c.ellipse(-r * 0.38, -r * 0.4, r * 0.32, r * 0.18, -Math.PI / 4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Número de iteración en una chapita blanca con contorno de tinta. */
function etiquetaIteracion(c: CanvasRenderingContext2D, texto: string, x: number, y: number, limiteDer: number) {
  c.save();
  c.font = `600 12px ${fuente.mono}`;
  const w = c.measureText(texto).width + 10;
  const h = 16;
  const x0 = Math.min(x, limiteDer - w - 4);
  const y0 = y - h;
  c.fillStyle = color.tinta;
  c.beginPath();
  c.roundRect(x0 + 1.5, y0 + 1.5, w, h, h / 2);
  c.fill();
  c.fillStyle = color.ambar2;
  c.strokeStyle = color.tinta;
  c.lineWidth = trazo.fino;
  c.beginPath();
  c.roundRect(x0, y0, w, h, h / 2);
  c.fill();
  c.stroke();
  c.fillStyle = color.tinta;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(texto, x0 + w / 2, y0 + h / 2 + 0.5);
  c.restore();
}

interface Escenario {
  W: number;
  H: number;
  ancho: number;
  altoP: number;
  v: Rango;
  sx: (x: number) => number;
  sy: (y: number) => number;
  escalaY: 'lineal' | 'log';
  etiquetaX: string;
  etiquetaY: string;
}

/** Fondo y escenario: papel milimetrado de plata, ejes de tinta con flechas, marcas y rótulos. */
function pintarFondo(c: CanvasRenderingContext2D, e: Escenario) {
  const { W, H, ancho, altoP, v, sx, sy, escalaY, etiquetaX, etiquetaY } = e;
  const x0 = MARGEN.izq;
  const y0 = MARGEN.sup;
  const x1 = x0 + ancho;
  const y1 = y0 + altoP;

  // Fondo opaco (la exportación PNG no queda transparente).
  c.fillStyle = color.panel;
  c.fillRect(0, 0, W, H);
  c.fillStyle = color.papel;
  c.fillRect(x0, y0, ancho, altoP);

  const pasoX = pasoAgradable(v.xmax - v.xmin, ancho / 90);
  const pasoY = escalaY === 'log' ? Math.max(1, Math.round(pasoAgradable(v.ymax - v.ymin, altoP / 50))) : pasoAgradable(v.ymax - v.ymin, altoP / 50);

  // Retícula milimetrada: fina cada quinto de paso, gruesa en cada paso (cada 5 finas).
  c.save();
  c.beginPath();
  c.rect(x0, y0, ancho, altoP);
  c.clip();
  const reticula = (paso: number, eje: 'x' | 'y', ancho: number, estilo: string) => {
    c.strokeStyle = estilo;
    c.lineWidth = ancho;
    c.beginPath();
    if (eje === 'x') {
      for (let x = Math.ceil(v.xmin / paso) * paso; x <= v.xmax; x += paso) {
        const px = Math.round(sx(x)) + 0.5;
        c.moveTo(px, y0);
        c.lineTo(px, y1);
      }
    } else {
      for (let y = Math.ceil(v.ymin / paso) * paso; y <= v.ymax; y += paso) {
        const py = Math.round(sy(y)) + 0.5;
        c.moveTo(x0, py);
        c.lineTo(x1, py);
      }
    }
    c.stroke();
  };
  const finaX = pasoX / 5;
  const finaY = escalaY === 'log' ? pasoY : pasoY / 5;
  if ((finaX / (v.xmax - v.xmin)) * ancho >= 4) reticula(finaX, 'x', 1, conAlfa(color.linea, 0.45));
  if (escalaY !== 'log' && (finaY / (v.ymax - v.ymin)) * altoP >= 4) reticula(finaY, 'y', 1, conAlfa(color.linea, 0.45));
  reticula(pasoX, 'x', 1, color.linea);
  reticula(pasoY, 'y', 1, color.linea);
  c.restore();

  // Marco del área de trazado.
  c.strokeStyle = color.tinta;
  c.lineWidth = 1;
  c.strokeRect(x0 + 0.5, y0 + 0.5, ancho - 1, altoP - 1);

  // Ejes: en x=0 / y=0 si están a la vista; si no, pegados al borde inferior / izquierdo.
  const ejeY = escalaY !== 'log' && v.ymin < 0 && v.ymax > 0 ? sy(0) : y1;
  const ejeX = v.xmin < 0 && v.xmax > 0 ? sx(0) : x0;
  c.save();
  c.strokeStyle = color.tinta;
  c.lineWidth = trazo.medio;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  lineaTinta(c, x0, ejeY, x1 - 2, ejeY, 11);
  flecha(c, x1 - 2, ejeY, 0);
  lineaTinta(c, ejeX, y1, ejeX, y0 + 2, 23);
  flecha(c, ejeX, y0 + 2, -Math.PI / 2);

  // Marcas sobre los ejes y números en mono.
  c.lineWidth = trazo.fino;
  c.font = `12px ${fuente.mono}`;
  c.fillStyle = color.tenue;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  for (let x = Math.ceil(v.xmin / pasoX) * pasoX; x <= v.xmax; x += pasoX) {
    const px = sx(x);
    if (px < x0 + 2 || px > x1 - 12) continue;
    c.beginPath();
    c.moveTo(px, ejeY - 4);
    c.lineTo(px, ejeY + 4);
    c.stroke();
    c.fillText(formatoEje(x, pasoX), px, y1 + 7);
  }
  c.textAlign = 'right';
  c.textBaseline = 'middle';
  for (let y = Math.ceil(v.ymin / pasoY) * pasoY; y <= v.ymax; y += pasoY) {
    const py = sy(y);
    if (py > y1 - 2 || py < y0 + 12) continue;
    c.beginPath();
    c.moveTo(ejeX - 4, py);
    c.lineTo(ejeX + 4, py);
    c.stroke();
    c.fillText(escalaY === 'log' ? `1e${Math.round(y)}` : formatoEje(y, pasoY), x0 - 7, py);
  }
  c.restore();

  // Rótulos de los ejes.
  c.save();
  c.fillStyle = color.tinta;
  c.font = `14px ${fuente.display}`;
  c.textAlign = 'right';
  c.textBaseline = 'bottom';
  c.fillText(etiquetaX, x1, H - 2);
  c.translate(13, y0 + altoP / 2);
  c.rotate(-Math.PI / 2);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(escalaY === 'log' ? `${etiquetaY} (escala log)` : etiquetaY, 0, 0);
  c.restore();
}

export function PlanoCartesiano({ series, titulo, escalaY = 'lineal', etiquetaX = 'x', etiquetaY = 'y', alto = 320, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const progresoRef = useRef(1);
  const inicioAnimRef = useRef(0);
  const cuadroRef = useRef(0);
  const vistaRef = useRef<Rango>({ xmin: -1, xmax: 1, ymin: -1, ymax: 1 });
  const arrastreRef = useRef<{ x: number; y: number; vista: Rango } | null>(null);
  // Función del cuadro vigente; el bucle rAF la invoca a través de esta ref.
  const bucleRef = useRef<(ahora: number) => void>(() => {});
  // Capa estática (papel + retícula + ejes) pre-renderizada; se regenera al cambiar tamaño o vista.
  const capaFondoRef = useRef<{ lienzo: HTMLCanvasElement; clave: string } | null>(null);
  // Contador para invalidar la capa cuando terminan de cargar las fuentes.
  const fuentesListasRef = useRef(0);

  const transY = useCallback((y: number) => (escalaY === 'log' ? Math.log10(Math.max(Math.abs(y), 1e-300)) : y), [escalaY]);

  // Datos transformados (escala log si aplica) y rango completo.
  const datos = useMemo(() => {
    const ss = series.map((s) => ({
      ...s,
      puntos: s.puntos.map(([x, y]) => [x, transY(y)] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
    }));
    const todos = ss.flatMap((s) => s.puntos);
    let r: Rango = { xmin: -1, xmax: 1, ymin: -1, ymax: 1 };
    if (todos.length) {
      r = {
        xmin: Math.min(...todos.map((p) => p[0])),
        xmax: Math.max(...todos.map((p) => p[0])),
        ymin: Math.min(...todos.map((p) => p[1])),
        ymax: Math.max(...todos.map((p) => p[1])),
      };
      if (r.xmax - r.xmin < 1e-12) {
        r.xmin -= 1;
        r.xmax += 1;
      }
      if (r.ymax - r.ymin < 1e-12) {
        r.ymin -= 1;
        r.ymax += 1;
      }
      const px = (r.xmax - r.xmin) * 0.08;
      const py = (r.ymax - r.ymin) * 0.1;
      r = { xmin: r.xmin - px, xmax: r.xmax + px, ymin: r.ymin - py, ymax: r.ymax + py };
    }
    const maxPuntos = Math.max(1, ...ss.filter((s) => s.tipo === 'puntos').map((s) => s.puntos.length));
    return { series: ss, rango: r, duracion: Math.min(6, Math.max(1.4, maxPuntos * 0.35)) };
  }, [series, transY]);

  const dibujar = useCallback(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const v = vistaRef.current;
    const ancho = W - MARGEN.izq - MARGEN.der;
    const altoP = H - MARGEN.sup - MARGEN.inf;
    const sx = (x: number) => MARGEN.izq + ((x - v.xmin) / (v.xmax - v.xmin)) * ancho;
    const sy = (y: number) => MARGEN.sup + (1 - (y - v.ymin) / (v.ymax - v.ymin)) * altoP;

    // ---- Capa de fondo + escenario (papel, retícula, ejes): depende solo de tamaño y vista.
    // Se pinta en un canvas fuera de pantalla y se reutiliza en cada cuadro de la animación.
    const clave = `${canvas.width}x${canvas.height}|${v.xmin}|${v.xmax}|${v.ymin}|${v.ymax}|${escalaY}|${etiquetaX}|${etiquetaY}|${fuentesListasRef.current}`;
    let capa = capaFondoRef.current;
    if (!capa || capa.clave !== clave) {
      const lienzo = capa?.lienzo ?? document.createElement('canvas');
      lienzo.width = canvas.width;
      lienzo.height = canvas.height;
      const f = lienzo.getContext('2d');
      if (!f) return;
      f.setTransform(dpr, 0, 0, dpr, 0, 0);
      pintarFondo(f, { W, H, ancho, altoP, v, sx, sy, escalaY, etiquetaX, etiquetaY });
      capa = { lienzo, clave };
      capaFondoRef.current = capa;
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(capa.lienzo, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ---- Capa de actores: series (recortadas al área de trazado).
    const p = progresoRef.current;
    const ahora = performance.now();
    c.save();
    c.beginPath();
    c.rect(MARGEN.izq, MARGEN.sup, ancho, altoP);
    c.clip();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    datos.series.forEach((s, i) => {
      const col = paletaSeries[i % paletaSeries.length];
      if (!s.puntos.length) return;
      const n = s.puntos.length;
      if (s.tipo === 'linea') {
        const hasta = p >= 1 ? n : Math.max(1, Math.floor(p * n));
        // Trazo de pincel: pasada principal + pasada fina desplazada (semilla estable por serie).
        const pasada = (ancho: number, dx: number, dy: number) => {
          c.lineWidth = ancho;
          c.beginPath();
          for (let k = 0; k < hasta; k++) {
            const [x, y] = s.puntos[k];
            if (k === 0) c.moveTo(sx(x) + dx, sy(y) + dy);
            else c.lineTo(sx(x) + dx, sy(y) + dy);
          }
          c.stroke();
        };
        c.strokeStyle = col;
        pasada(trazo.medio, 0, 0);
        pasada(trazo.fino * 0.7, temblor(i * 7 + 1), temblor(i * 7 + 2));
      } else {
        const visibles = p >= 1 ? n : Math.max(1, Math.ceil(p * n));
        // Recorrido entre iteraciones: guiones de lápiz.
        c.save();
        c.strokeStyle = conAlfa(col, 0.55);
        c.lineWidth = trazo.fino;
        c.setLineDash([2, 6]);
        c.beginPath();
        for (let k = 0; k < visibles; k++) {
          const [x, y] = s.puntos[k];
          if (k === 0) c.moveTo(sx(x), sy(y));
          else c.lineTo(sx(x), sy(y));
        }
        c.stroke();
        c.restore();
        // Bolitas de goma; la activa (la última visible) va en dorado.
        for (let k = 0; k < visibles; k++) {
          const [x, y] = s.puntos[k];
          // Activa: la última visible mientras se anima; al terminar, solo el punto único
          // de una serie de un punto (el resultado: raíz, g(x)…) queda en dorado.
          const activa = p < 1 ? k === visibles - 1 : n === 1;
          let salto = 0;
          let estira = 0;
          if (activa && p < 1) {
            // Rebote corto en bucle: arriba (estirada) y abajo (aplastada).
            const fase = ((ahora - inicioAnimRef.current) / 520) % 1;
            const arco = Math.sin(fase * Math.PI);
            salto = arco * 7;
            estira = arco > 0.2 ? arco * 0.1 : -0.18 * (1 - arco / 0.2);
          }
          bolita(c, sx(x), sy(y), activa ? 6.5 : 4.5, activa ? color.ambar2 : col, salto, estira);
          if (activa && p < 1 && n > 1) etiquetaIteracion(c, `${k + 1}`, sx(x) + 10, sy(y) - 12 - salto, MARGEN.izq + ancho);
        }
      }
    });
    c.restore();

    // ---- Leyenda como chapas de goma (arriba a la derecha del área de trazado).
    if (datos.series.length) {
      c.save();
      c.font = `12px ${fuente.display}`;
      const altoChapa = 20;
      const anchos = datos.series.map((s) => c.measureText(s.nombre).width + 38);
      const anchoBloque = Math.max(...anchos);
      const altoBloque = datos.series.length * (altoChapa + 8) - 8;
      // Esquina con menos datos debajo (la leyenda no debe tapar puntos ni curvas).
      const esquinas = [
        [MARGEN.izq + ancho - anchoBloque - 12, MARGEN.sup + 10, true],
        [MARGEN.izq + 14, MARGEN.sup + 10, false],
        [MARGEN.izq + ancho - anchoBloque - 12, MARGEN.sup + altoP - altoBloque - 14, true],
        [MARGEN.izq + 14, MARGEN.sup + altoP - altoBloque - 14, false],
      ] as const;
      let mejor = 0;
      let menos = Infinity;
      esquinas.forEach(([ex, ey], e) => {
        let cuenta = 0;
        for (const s of datos.series) {
          for (const [x, y] of s.puntos) {
            const px = sx(x);
            const py = sy(y);
            if (px >= ex - 6 && px <= ex + anchoBloque + 6 && py >= ey - 6 && py <= ey + altoBloque + 6) cuenta += s.tipo === 'puntos' ? 4 : 1;
          }
        }
        if (cuenta < menos) {
          menos = cuenta;
          mejor = e;
        }
      });
      const [bx, by, alDerecha] = esquinas[mejor];
      let y0 = by;
      datos.series.forEach((s, i) => {
        const col = s.tipo === 'puntos' && s.puntos.length === 1 ? color.ambar2 : paletaSeries[i % paletaSeries.length];
        const anchoChapa = anchos[i];
        const x0 = alDerecha ? bx + anchoBloque - anchoChapa : bx;
        // Sombra dura + cuerpo + contorno.
        c.fillStyle = color.tinta;
        c.beginPath();
        c.roundRect(x0 + 2, y0 + 2, anchoChapa, altoChapa, altoChapa / 2);
        c.fill();
        c.fillStyle = color.papel;
        c.strokeStyle = color.tinta;
        c.lineWidth = trazo.fino;
        c.beginPath();
        c.roundRect(x0, y0, anchoChapa, altoChapa, altoChapa / 2);
        c.fill();
        c.stroke();
        const ym = y0 + altoChapa / 2;
        if (s.tipo === 'linea') {
          c.strokeStyle = col;
          c.lineWidth = trazo.medio;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(x0 + 9, ym + 2);
          c.quadraticCurveTo(x0 + 15, ym - 5, x0 + 22, ym);
          c.stroke();
        } else {
          bolita(c, x0 + 15, ym, 4, col, 0, 0, false);
        }
        c.fillStyle = color.tinta;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(s.nombre, x0 + 29, ym + 1);
        y0 += altoChapa + 8;
      });
      c.restore();
    }
  }, [datos, escalaY, etiquetaX, etiquetaY]);

  // Bucle rAF: avanza la animación y redibuja mientras haga falta.
  const pedirCuadro = useCallback(() => {
    cuadroRef.current = requestAnimationFrame((t) => bucleRef.current(t));
  }, []);

  useLayoutEffect(() => {
    bucleRef.current = (ahora: number) => {
      if (progresoRef.current < 1) {
        progresoRef.current = Math.min(1, (ahora - inicioAnimRef.current) / 1000 / datos.duracion);
      }
      dibujar();
      if (progresoRef.current < 1) pedirCuadro();
      else cuadroRef.current = 0;
    };
  }, [dibujar, datos.duracion, pedirCuadro]);

  const solicitarDibujo = useCallback(() => {
    if (!cuadroRef.current) pedirCuadro();
  }, [pedirCuadro]);

  const reproducir = useCallback(() => {
    cancelAnimationFrame(cuadroRef.current);
    cuadroRef.current = 0;
    if (prefiereMovimientoReducido()) {
      progresoRef.current = 1;
      solicitarDibujo();
      return;
    }
    progresoRef.current = 0;
    inicioAnimRef.current = performance.now();
    pedirCuadro();
  }, [pedirCuadro, solicitarDibujo]);

  // Nuevos datos: restablece la vista y anima las iteraciones.
  useEffect(() => {
    vistaRef.current = { ...datos.rango };
    reproducir();
    return () => {
      cancelAnimationFrame(cuadroRef.current);
      cuadroRef.current = 0;
    };
  }, [datos, reproducir]);

  // Tamaño en alta densidad.
  useEffect(() => {
    const canvas = canvasRef.current;
    const cont = contenedorRef.current;
    if (!canvas || !cont) return;
    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cont.clientWidth * dpr));
      canvas.height = Math.round(alto * dpr);
      solicitarDibujo();
    };
    const obs = new ResizeObserver(ajustar);
    obs.observe(cont);
    ajustar();
    return () => obs.disconnect();
  }, [alto, solicitarDibujo]);

  // Los rótulos usan las fuentes del juego: repinta cuando estén cargadas.
  useEffect(() => {
    let vivo = true;
    document.fonts?.ready.then(() => {
      if (!vivo) return;
      fuentesListasRef.current += 1;
      solicitarDibujo();
    });
    return () => {
      vivo = false;
    };
  }, [solicitarDibujo]);

  useImperativeHandle(
    ref,
    () => ({
      exportarPNG: () =>
        new Promise<Blob | null>((resolver) => {
          const canvas = canvasRef.current;
          if (!canvas) return resolver(null);
          progresoRef.current = 1;
          dibujar();
          canvas.toBlob((blob) => resolver(blob), 'image/png');
        }),
    }),
    [dibujar],
  );

  function zoom(factor: number, cx?: number, cy?: number) {
    const v = vistaRef.current;
    const mx = cx ?? (v.xmin + v.xmax) / 2;
    const my = cy ?? (v.ymin + v.ymax) / 2;
    vistaRef.current = {
      xmin: mx - (mx - v.xmin) * factor,
      xmax: mx + (v.xmax - mx) * factor,
      ymin: my - (my - v.ymin) * factor,
      ymax: my + (v.ymax - my) * factor,
    };
    solicitarDibujo();
  }

  function desplazar(fx: number, fy: number) {
    const v = vistaRef.current;
    const dx = (v.xmax - v.xmin) * fx;
    const dy = (v.ymax - v.ymin) * fy;
    vistaRef.current = { xmin: v.xmin + dx, xmax: v.xmax + dx, ymin: v.ymin + dy, ymax: v.ymax + dy };
    solicitarDibujo();
  }

  function restablecer() {
    vistaRef.current = { ...datos.rango };
    solicitarDibujo();
  }

  // Ctrl + rueda para acercar sin secuestrar el desplazamiento de la página.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rueda = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const v = vistaRef.current;
      const fx = (e.clientX - r.left - MARGEN.izq) / (r.width - MARGEN.izq - MARGEN.der);
      const fy = 1 - (e.clientY - r.top - MARGEN.sup) / (r.height - MARGEN.sup - MARGEN.inf);
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const cx = v.xmin + fx * (v.xmax - v.xmin);
      const cy = v.ymin + fy * (v.ymax - v.ymin);
      const nv = {
        xmin: cx - (cx - v.xmin) * factor,
        xmax: cx + (v.xmax - cx) * factor,
        ymin: cy - (cy - v.ymin) * factor,
        ymax: cy + (v.ymax - cy) * factor,
      };
      vistaRef.current = nv;
      solicitarDibujo();
    };
    canvas.addEventListener('wheel', rueda, { passive: false });
    return () => canvas.removeEventListener('wheel', rueda);
  }, [solicitarDibujo]);

  const sinDatos = !datos.series.some((s) => s.puntos.length);

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="font-display text-xl">{titulo}</figcaption>
        <div className="flex items-center gap-0.5 rounded-full border-(length:--trazo-fino) border-tinta bg-panel p-0.5 shadow-tinta-sm">
          <button type="button" className="btn btn-fantasma min-h-9 px-2.5" onClick={reproducir} disabled={sinDatos} title="Reproducir iteraciones">
            <Play size={16} aria-hidden /> <span className="max-sm:sr-only">Reproducir</span>
          </button>
          <button type="button" className="btn btn-fantasma min-h-9 px-2.5" onClick={() => zoom(1 / 1.3)} aria-label="Acercar" title="Acercar">
            <ZoomIn size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-fantasma min-h-9 px-2.5" onClick={() => zoom(1.3)} aria-label="Alejar" title="Alejar">
            <ZoomOut size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-fantasma min-h-9 px-2.5" onClick={restablecer} aria-label="Restablecer vista" title="Restablecer vista">
            <Maximize size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div ref={contenedorRef} className="relative w-full rounded-xl border-(length:--trazo-medio) border-tinta bg-panel shadow-tinta">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          style={{ height: alto }}
          className="block w-full cursor-grab touch-none rounded-lg active:cursor-grabbing"
          aria-label={`${titulo}. Teclas: más y menos para acercar, flechas para desplazar, 0 para restablecer.`}
          role="img"
          onKeyDown={(e) => {
            const acciones: Record<string, () => void> = {
              '+': () => zoom(1 / 1.3),
              '=': () => zoom(1 / 1.3),
              '-': () => zoom(1.3),
              '0': restablecer,
              ArrowLeft: () => desplazar(-0.1, 0),
              ArrowRight: () => desplazar(0.1, 0),
              ArrowUp: () => desplazar(0, 0.1),
              ArrowDown: () => desplazar(0, -0.1),
            };
            const a = acciones[e.key];
            if (a) {
              e.preventDefault();
              e.stopPropagation();
              a();
            }
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            arrastreRef.current = { x: e.clientX, y: e.clientY, vista: { ...vistaRef.current } };
          }}
          onPointerMove={(e) => {
            const a = arrastreRef.current;
            if (!a) return;
            const r = e.currentTarget.getBoundingClientRect();
            const dx = ((e.clientX - a.x) / (r.width - MARGEN.izq - MARGEN.der)) * (a.vista.xmax - a.vista.xmin);
            const dy = ((e.clientY - a.y) / (r.height - MARGEN.sup - MARGEN.inf)) * (a.vista.ymax - a.vista.ymin);
            vistaRef.current = { xmin: a.vista.xmin - dx, xmax: a.vista.xmax - dx, ymin: a.vista.ymin + dy, ymax: a.vista.ymax + dy };
            solicitarDibujo();
          }}
          onPointerUp={() => (arrastreRef.current = null)}
          onPointerCancel={() => (arrastreRef.current = null)}
        />
        {sinDatos && (
          <p className="pointer-events-none absolute inset-0 m-0 grid place-items-center">
            <span className="chapa bg-panel text-tenue">Este resultado no trae puntos para graficar.</span>
          </p>
        )}
      </div>
      <p className="m-0 mt-1 text-sm text-tenue max-sm:hidden">
        Arrastra para desplazar; <kbd className="kbd">Ctrl</kbd> + rueda para acercar
      </p>
    </figure>
  );
}
