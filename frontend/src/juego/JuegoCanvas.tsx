// Canvas de la sala: bucle con requestAnimationFrame, entrada de teclado/clic/táctil.
// Montar con key={sala.id} para reiniciar el mundo al cambiar de sala.
import { useEffect, useLayoutEffect, useRef, type PointerEvent as EventoPuntero } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, DoorOpen, Hand } from 'lucide-react';
import { ALTO_SALA, ANCHO_SALA, type Sala } from './mapa';
import {
  actualizar,
  cercaPuerta,
  consolaCercana,
  crearMundo,
  destinoClic,
  disparar,
  RADIO_INTERACCION,
  type ContextoSala,
  type Evento,
  type Mundo,
} from './motor/logica';
import { dibujarSala } from './motor/dibujo';
import { color, prefiereMovimientoReducido } from '../tokens';

export interface Indicacion {
  tecla: string | null;
  texto: string;
}

interface Props {
  sala: Sala;
  resueltos: string[];
  omegaVida: number;
  energia: number;
  puertaAbierta: boolean;
  escudosCaidos: boolean;
  etiquetas: string[];
  disponibles: boolean[];
  nombreJugador: string;
  acento: string;
  pausado: boolean;
  onConsola: (indice: number) => void;
  onPuerta: () => void;
  onDano: (cantidad: number, reaparece: boolean) => void;
  onImpacto: () => void;
  onAviso: (texto: string) => void;
  onSonido: (s: 'disparo' | 'omega' | 'resuelto') => void;
  onIndicacion: (i: Indicacion) => void;
}

const TECLAS_MOVIMIENTO = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

function esCampoEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function JuegoCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mundoRef = useRef<Mundo | null>(null);
  const teclasRef = useRef(new Set<string>());
  const propsRef = useRef(props);
  const indicacionRef = useRef('');

  if (mundoRef.current === null) mundoRef.current = crearMundo(props.sala);

  useLayoutEffect(() => {
    propsRef.current = props;
  });

  function contexto(p: Props): ContextoSala {
    return {
      sala: p.sala,
      resueltos: new Set(p.resueltos),
      omegaVida: p.omegaVida,
      energia: p.energia,
      puertaAbierta: p.puertaAbierta,
      escudosCaidos: p.escudosCaidos,
      reducirMovimiento: prefiereMovimientoReducido(),
    };
  }

  function procesarEventos(eventos: Evento[]) {
    const p = propsRef.current;
    for (const e of eventos) {
      if (e.tipo === 'dano') p.onDano(e.cantidad, e.reaparece);
      else if (e.tipo === 'impacto') p.onImpacto();
      else if (e.tipo === 'aviso') p.onAviso(e.texto);
      else p.onSonido(e.sonido);
    }
  }

  function interactuar() {
    const p = propsRef.current;
    const m = mundoRef.current!;
    const i = consolaCercana(m, p.sala);
    if (i !== -1) return p.onConsola(i);
    if (cercaPuerta(m, p.sala)) return p.onPuerta();
    p.onAviso('Acércate a una consola para interactuar.');
  }

  function puerta() {
    const p = propsRef.current;
    if (cercaPuerta(mundoRef.current!, p.sala)) p.onPuerta();
    else p.onAviso(p.sala.esJefe ? 'Aquí no hay salida: enfréntate al núcleo OMEGA.' : 'Acércate a la puerta de la derecha para cambiar de sala.');
  }

  function fuego() {
    const p = propsRef.current;
    procesarEventos(disparar(mundoRef.current!, contexto(p)));
  }

  // Teclado.
  useEffect(() => {
    const teclas = teclasRef.current;
    const abajo = (e: KeyboardEvent) => {
      if (propsRef.current.pausado || esCampoEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (TECLAS_MOVIMIENTO.has(k)) {
        e.preventDefault();
        teclas.add(k);
        return;
      }
      if (e.repeat) return;
      if (k === 'e') interactuar();
      else if (k === 'f') puerta();
      else if (k === ' ') {
        e.preventDefault();
        fuego();
      }
    };
    const arriba = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());
    const limpiar = () => teclas.clear();
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    window.addEventListener('blur', limpiar);
    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', limpiar);
    };
    // Los manejadores leen siempre propsRef: basta con registrarlos una vez.
  }, []);

  // Al pausar (modal abierto) se sueltan las teclas; al reanudar, breve invulnerabilidad.
  useEffect(() => {
    teclasRef.current.clear();
    const m = mundoRef.current!;
    if (!props.pausado) m.invulnerable = Math.max(m.invulnerable, 0.8);
  }, [props.pausado]);

  // Bucle principal con requestAnimationFrame.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx2d = canvas?.getContext('2d');
    if (!canvas || !ctx2d) return;

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const ancho = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const alto = Math.round((ancho * ALTO_SALA) / ANCHO_SALA);
      if (canvas.width !== ancho || canvas.height !== alto) {
        canvas.width = ancho;
        canvas.height = alto;
        dibujadoEnPausa = false;
      }
    };
    // En pausa (panel abierto) basta con un cuadro: no se redibuja a 60 fps bajo el diálogo.
    let dibujadoEnPausa = false;
    const observador = new ResizeObserver(ajustar);
    observador.observe(canvas);
    ajustar();

    let ultimo = performance.now();
    let reloj = 0;
    let id = 0;
    const cuadro = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
      ultimo = ahora;
      const p = propsRef.current;
      const m = mundoRef.current!;
      const ctx = contexto(p);
      if (!ctx.reducirMovimiento) reloj += dt;
      if (p.pausado) {
        if (dibujadoEnPausa) {
          id = requestAnimationFrame(cuadro);
          return;
        }
        dibujadoEnPausa = true;
      } else {
        dibujadoEnPausa = false;
        procesarEventos(actualizar(m, dt, teclasRef.current, ctx));
      }

      const cercana = consolaCercana(m, p.sala);
      ctx2d.setTransform(canvas.width / ANCHO_SALA, 0, 0, canvas.height / ALTO_SALA, 0, 0);
      dibujarSala(ctx2d, m, ctx, {
        acento: p.acento,
        etiquetas: p.etiquetas,
        disponibles: p.disponibles,
        cercana,
        nombreJugador: p.nombreJugador,
        reloj,
      });

      // Indicación contextual (solo notifica si cambia).
      const ind = calcularIndicacion(m, p, cercana);
      const clave = `${ind.tecla}|${ind.texto}`;
      if (clave !== indicacionRef.current) {
        indicacionRef.current = clave;
        p.onIndicacion(ind);
      }
      id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(id);
      observador.disconnect();
    };
  }, []);

  function alHacerClic(e: React.MouseEvent<HTMLCanvasElement>) {
    const p = propsRef.current;
    if (p.pausado) return;
    const canvas = e.currentTarget;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * ANCHO_SALA) / r.width;
    const y = ((e.clientY - r.top) * ALTO_SALA) / r.height;
    const m = mundoRef.current!;
    const k = p.sala.consolas.findIndex((c) => Math.hypot(x - c.x, y - c.y) < 80);
    if (k !== -1 && Math.hypot(p.sala.consolas[k].x - m.jugador.x, p.sala.consolas[k].y - m.jugador.y) < RADIO_INTERACCION) {
      p.onConsola(k);
      return;
    }
    if (x > 985 && y > 235 && y < 445 && cercaPuerta(m, p.sala)) {
      p.onPuerta();
      return;
    }
    destinoClic(m, x, y);
  }

  function botonMovimiento(tecla: string) {
    return {
      onPointerDown: (e: EventoPuntero<HTMLButtonElement>) => {
        e.preventDefault();
        teclasRef.current.add(tecla);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Puntero sintético o ya liberado: el botón sigue funcionando sin captura.
        }
      },
      onPointerUp: () => teclasRef.current.delete(tecla),
      onPointerCancel: () => teclasRef.current.delete(tecla),
      onLostPointerCapture: () => teclasRef.current.delete(tecla),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    };
  }

  const claseTactil =
    'grid size-12 place-items-center rounded-lg border-2 border-tinta bg-panel text-tinta shadow-tinta-sm active:translate-x-0.5 active:translate-y-0.5 active:bg-primario-2 active:shadow-none touch-none select-none';

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        onClick={alHacerClic}
        className="block aspect-[1080/590] w-full cursor-crosshair rounded-xl border-2 border-tinta bg-fondo shadow-tinta"
        role="img"
        aria-label={`Sala ${props.sala.nombre}. Usa WASD o flechas para moverte, E para activar consolas y F para cruzar la puerta.`}
      />
      {/* Controles táctiles: visibles con puntero grueso o en pantallas pequeñas. */}
      <div className="hidden items-center justify-between gap-4 pointer-coarse:flex max-md:flex" aria-label="Controles táctiles">
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
          <span />
          <button type="button" className={claseTactil} aria-label="Mover arriba" {...botonMovimiento('arrowup')}>
            <ArrowUp size={22} />
          </button>
          <span />
          <button type="button" className={claseTactil} aria-label="Mover a la izquierda" {...botonMovimiento('arrowleft')}>
            <ArrowLeft size={22} />
          </button>
          <button type="button" className={claseTactil} aria-label="Mover abajo" {...botonMovimiento('arrowdown')}>
            <ArrowDown size={22} />
          </button>
          <button type="button" className={claseTactil} aria-label="Mover a la derecha" {...botonMovimiento('arrowright')}>
            <ArrowRight size={22} />
          </button>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn" onClick={interactuar}>
            <Hand size={18} aria-hidden /> Activar
          </button>
          {props.sala.esJefe ? (
            <button type="button" className="btn btn-primario" onClick={fuego}>
              <Crosshair size={18} aria-hidden /> Disparar
            </button>
          ) : (
            <button type="button" className="btn" onClick={puerta}>
              <DoorOpen size={18} aria-hidden style={{ color: props.puertaAbierta ? color.menta : color.hostil }} /> Puerta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function calcularIndicacion(m: Mundo, p: Props, cercana: number): Indicacion {
  if (cercana !== -1) {
    const con = p.sala.consolas[cercana];
    if (!p.disponibles[cercana]) return { tecla: 'E', texto: `${p.etiquetas[cercana]}: consola sin método disponible` };
    const hecha = p.resueltos.includes(con.slug);
    return { tecla: 'E', texto: `${hecha ? 'Revisar' : 'Activar'} ${p.etiquetas[cercana]}${hecha ? ' (resuelta)' : ''}` };
  }
  if (p.sala.esJefe) {
    if (p.omegaVida <= 0) return { tecla: null, texto: 'OMEGA está desconectada.' };
    if (p.escudosCaidos) return { tecla: 'Espacio', texto: 'Dispara al núcleo y esquiva los rayos' };
    const faltan = p.sala.consolas.filter((c) => !p.resueltos.includes(c.slug)).length;
    return { tecla: 'E', texto: `Desactiva ${faltan === 1 ? 'el escudo que falta' : `los ${faltan} escudos que faltan`} en sus módulos` };
  }
  if (cercaPuerta(m, p.sala)) {
    if (p.puertaAbierta) return { tecla: 'F', texto: 'Cruzar a la siguiente sala' };
    const faltan = p.sala.consolas.filter((c) => !p.resueltos.includes(c.slug)).length;
    return { tecla: 'F', texto: `Puerta bloqueada: ${faltan === 1 ? 'falta 1 problema' : `faltan ${faltan} problemas`}` };
  }
  return { tecla: 'WASD', texto: 'o flechas para moverte; también puedes hacer clic en el suelo' };
}
