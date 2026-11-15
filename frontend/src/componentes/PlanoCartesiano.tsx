// Plano cartesiano en Canvas 2D: ejes escalables (zoom/desplazamiento), cuadrícula,
// series de línea/puntos, animación de iteraciones con requestAnimationFrame
// y exportación PNG con canvas.toBlob('image/png') para el Modo Comprobación Docente.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import { Maximize, Play, ZoomIn, ZoomOut } from 'lucide-react';
import type { SerieDTO } from '../types/numericos';
import { color, conAlfa, fuente, paletaSeries, prefiereMovimientoReducido } from '../tokens';

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
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = vistaRef.current;
    const ancho = W - MARGEN.izq - MARGEN.der;
    const altoP = H - MARGEN.sup - MARGEN.inf;
    const sx = (x: number) => MARGEN.izq + ((x - v.xmin) / (v.xmax - v.xmin)) * ancho;
    const sy = (y: number) => MARGEN.sup + (1 - (y - v.ymin) / (v.ymax - v.ymin)) * altoP;

    // Fondo opaco (la exportación PNG no queda transparente).
    c.fillStyle = color.panel;
    c.fillRect(0, 0, W, H);
    c.fillStyle = color.panel2;
    c.fillRect(MARGEN.izq, MARGEN.sup, ancho, altoP);

    // Cuadrícula y marcas.
    c.font = `11px ${fuente.mono}`;
    c.lineWidth = 1;
    const pasoX = pasoAgradable(v.xmax - v.xmin, ancho / 90);
    const pasoY = escalaY === 'log' ? Math.max(1, Math.round(pasoAgradable(v.ymax - v.ymin, altoP / 50))) : pasoAgradable(v.ymax - v.ymin, altoP / 50);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (let x = Math.ceil(v.xmin / pasoX) * pasoX; x <= v.xmax; x += pasoX) {
      const px = sx(x);
      c.strokeStyle = color.linea;
      c.beginPath();
      c.moveTo(px, MARGEN.sup);
      c.lineTo(px, MARGEN.sup + altoP);
      c.stroke();
      c.fillStyle = color.tenue;
      c.fillText(formatoEje(x, pasoX), px, MARGEN.sup + altoP + 6);
    }
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let y = Math.ceil(v.ymin / pasoY) * pasoY; y <= v.ymax; y += pasoY) {
      const py = sy(y);
      c.strokeStyle = color.linea;
      c.beginPath();
      c.moveTo(MARGEN.izq, py);
      c.lineTo(MARGEN.izq + ancho, py);
      c.stroke();
      c.fillStyle = color.tenue;
      c.fillText(escalaY === 'log' ? `1e${Math.round(y)}` : formatoEje(y, pasoY), MARGEN.izq - 6, py);
    }
    // Ejes x=0 / y=0.
    c.strokeStyle = conAlfa(color.tinta, 0.55);
    c.lineWidth = 1.5;
    if (v.ymin < 0 && v.ymax > 0 && escalaY !== 'log') {
      c.beginPath();
      c.moveTo(MARGEN.izq, sy(0));
      c.lineTo(MARGEN.izq + ancho, sy(0));
      c.stroke();
    }
    if (v.xmin < 0 && v.xmax > 0) {
      c.beginPath();
      c.moveTo(sx(0), MARGEN.sup);
      c.lineTo(sx(0), MARGEN.sup + altoP);
      c.stroke();
    }
    c.strokeStyle = color.linea;
    c.lineWidth = 1;
    c.strokeRect(MARGEN.izq + 0.5, MARGEN.sup + 0.5, ancho - 1, altoP - 1);

    // Títulos de ejes.
    c.fillStyle = color.tenue;
    c.font = `600 12px ${fuente.display}`;
    c.textAlign = 'right';
    c.textBaseline = 'bottom';
    c.fillText(etiquetaX, MARGEN.izq + ancho, H - 2);
    c.save();
    c.translate(12, MARGEN.sup + altoP / 2);
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(escalaY === 'log' ? `${etiquetaY} (escala log)` : etiquetaY, 0, 0);
    c.restore();

    // Series (recortadas al área de trazado).
    const p = progresoRef.current;
    c.save();
    c.beginPath();
    c.rect(MARGEN.izq, MARGEN.sup, ancho, altoP);
    c.clip();
    datos.series.forEach((s, i) => {
      const col = paletaSeries[i % paletaSeries.length];
      if (!s.puntos.length) return;
      if (s.tipo === 'linea') {
        const n = s.puntos.length;
        const hasta = p >= 1 ? n : Math.max(1, Math.floor(p * n));
        c.strokeStyle = col;
        c.lineWidth = 2;
        c.lineJoin = 'round';
        c.beginPath();
        for (let k = 0; k < hasta; k++) {
          const [x, y] = s.puntos[k];
          if (k === 0) c.moveTo(sx(x), sy(y));
          else c.lineTo(sx(x), sy(y));
        }
        c.stroke();
      } else {
        const n = s.puntos.length;
        const visibles = p >= 1 ? n : Math.max(1, Math.ceil(p * n));
        // Recorrido entre iteraciones.
        c.strokeStyle = conAlfa(col, 0.35);
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.beginPath();
        for (let k = 0; k < visibles; k++) {
          const [x, y] = s.puntos[k];
          if (k === 0) c.moveTo(sx(x), sy(y));
          else c.lineTo(sx(x), sy(y));
        }
        c.stroke();
        c.setLineDash([]);
        for (let k = 0; k < visibles; k++) {
          const [x, y] = s.puntos[k];
          const ultimo = k === visibles - 1 && p < 1;
          c.beginPath();
          c.arc(sx(x), sy(y), ultimo ? 6 : 4.5, 0, Math.PI * 2);
          c.fillStyle = col;
          c.fill();
          c.strokeStyle = color.fondo;
          c.lineWidth = 1.5;
          c.stroke();
          if (ultimo) {
            c.beginPath();
            c.arc(sx(x), sy(y), 12, 0, Math.PI * 2);
            c.strokeStyle = conAlfa(col, 0.6);
            c.stroke();
            c.font = `11px ${fuente.mono}`;
            c.fillStyle = color.tinta;
            c.textAlign = 'left';
            c.textBaseline = 'bottom';
            c.fillText(`${k + 1}`, sx(x) + 10, sy(y) - 8);
          }
        }
      }
    });
    c.restore();

    // Leyenda.
    if (datos.series.length) {
      c.font = `12px ${fuente.sans}`;
      const anchos = datos.series.map((s) => c.measureText(s.nombre).width);
      const anchoLeyenda = Math.max(...anchos) + 34;
      const x0 = MARGEN.izq + ancho - anchoLeyenda - 8;
      const y0 = MARGEN.sup + 8;
      c.fillStyle = conAlfa(color.panel, 0.88);
      c.strokeStyle = color.linea;
      c.beginPath();
      c.roundRect(x0, y0, anchoLeyenda, datos.series.length * 18 + 8, 6);
      c.fill();
      c.stroke();
      datos.series.forEach((s, i) => {
        const col = paletaSeries[i % paletaSeries.length];
        const y = y0 + 13 + i * 18;
        c.fillStyle = col;
        if (s.tipo === 'linea') c.fillRect(x0 + 8, y - 1.5, 14, 3);
        else {
          c.beginPath();
          c.arc(x0 + 15, y, 4, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = color.tinta;
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillText(s.nombre, x0 + 28, y);
      });
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
        <figcaption className="font-display text-base font-semibold">{titulo}</figcaption>
        <div className="flex gap-1">
          <button type="button" className="btn btn-fantasma px-2" onClick={reproducir} disabled={sinDatos} title="Reproducir iteraciones">
            <Play size={16} aria-hidden /> <span className="max-sm:sr-only">Reproducir</span>
          </button>
          <button type="button" className="btn btn-fantasma px-2" onClick={() => zoom(1 / 1.3)} aria-label="Acercar" title="Acercar">
            <ZoomIn size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-fantasma px-2" onClick={() => zoom(1.3)} aria-label="Alejar" title="Alejar">
            <ZoomOut size={16} aria-hidden />
          </button>
          <button type="button" className="btn btn-fantasma px-2" onClick={restablecer} aria-label="Restablecer vista" title="Restablecer vista">
            <Maximize size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div ref={contenedorRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          style={{ height: alto }}
          className="block w-full cursor-grab touch-none rounded-lg border border-linea active:cursor-grabbing"
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
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-tenue">Este resultado no trae puntos para graficar.</p>
        )}
      </div>
      <p className="text-sm text-tenue max-sm:hidden">Arrastra para desplazar; Ctrl + rueda para acercar.</p>
    </figure>
  );
}
