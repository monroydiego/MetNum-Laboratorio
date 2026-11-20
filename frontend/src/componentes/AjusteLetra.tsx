// Ajuste global del tamaño de la letra (sin cambiar la fuente): tuerca en la esquina superior
// derecha que abre un panel con un control deslizante. Escala el `font-size` raíz, de modo que
// todo lo medido en rem (texto, espaciados y ventanas de Tailwind) crece o se encoge a la vez.
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Minus, Plus, RotateCcw, Settings } from 'lucide-react';

const CLAVE = 'metnum.tamanoLetra';
export const LETRA_MIN = 70;
export const LETRA_MAX = 200;
export const LETRA_BASE = 100;
const PASO = 5;

function leer(): number {
  try {
    const n = Number(localStorage.getItem(CLAVE));
    if (n >= LETRA_MIN && n <= LETRA_MAX) return Math.round(n);
  } catch {
    /* sin almacenamiento: se usa el tamaño base */
  }
  return LETRA_BASE;
}

let porcentaje = leer();
const oyentes = new Set<() => void>();

function aplicar(p: number) {
  document.documentElement.style.fontSize = `${p}%`;
}
aplicar(porcentaje);

function fijar(p: number) {
  porcentaje = Math.min(LETRA_MAX, Math.max(LETRA_MIN, Math.round(p)));
  aplicar(porcentaje);
  try {
    localStorage.setItem(CLAVE, String(porcentaje));
  } catch {
    /* el ajuste vale para la sesión aunque no se pueda guardar */
  }
  oyentes.forEach((o) => o());
}

function useTamanoLetra(): number {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => porcentaje,
  );
}

const BOTON_ICONO =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-panel text-tinta transition-colors hover:bg-ambar-2 disabled:cursor-not-allowed disabled:opacity-40';

interface Props {
  /** Clases del contenedor (posición); por defecto se coloca en línea. */
  className?: string;
  /** `claro`: tuerca blanca sobre fondo oscuro (cabeceras); `oscuro`: tinta sobre fondo claro. */
  tono?: 'claro' | 'oscuro';
}

export function AjusteLetra({ className = '', tono = 'claro' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const p = useTamanoLetra();
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  const colores =
    tono === 'claro'
      ? 'border-papel bg-transparent text-papel hover:bg-papel hover:text-tinta'
      : 'border-tinta bg-panel text-tinta shadow-tinta-sm hover:bg-ambar-2';

  return (
    <div
      ref={raiz}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        // Esc cierra solo el panel, no la ventana que lo contiene.
        if (abierto && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setAbierto(false);
        }
      }}
    >
      <button
        type="button"
        className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[length:var(--trazo-fino)] transition-colors ${colores}`}
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-controls={id}
        aria-label="Configuración: tamaño de la letra"
        title="Configuración: tamaño de la letra"
      >
        <Settings size={20} aria-hidden />
      </button>

      {abierto && (
        <div
          id={id}
          role="group"
          aria-label="Tamaño de la letra"
          className="animate-aparecer absolute top-full right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border-[length:var(--trazo-medio)] border-tinta bg-panel p-4 text-left text-tinta shadow-tinta"
        >
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <label htmlFor={`${id}-rango`} className="font-display text-sm tracking-wide">
              Tamaño de la letra
            </label>
            <output htmlFor={`${id}-rango`} className="numero text-sm font-bold">
              {p}%
            </output>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={BOTON_ICONO} onClick={() => fijar(p - PASO)} disabled={p <= LETRA_MIN} aria-label="Disminuir letra">
              <Minus size={16} aria-hidden />
            </button>
            <input
              id={`${id}-rango`}
              type="range"
              min={LETRA_MIN}
              max={LETRA_MAX}
              step={PASO}
              value={p}
              onChange={(e) => fijar(Number(e.target.value))}
              aria-valuetext={`${p} por ciento`}
              className="h-6 min-w-0 flex-1 cursor-pointer accent-tinta"
            />
            <button type="button" className={BOTON_ICONO} onClick={() => fijar(p + PASO)} disabled={p >= LETRA_MAX} aria-label="Aumentar letra">
              <Plus size={16} aria-hidden />
            </button>
          </div>
          <div className="mt-1 flex justify-between text-sm text-tenue" aria-hidden>
            <span>Menor</span>
            <span>Mayor</span>
          </div>
          <button type="button" className="btn btn-fantasma mt-2 w-full" onClick={() => fijar(LETRA_BASE)} disabled={p === LETRA_BASE}>
            <RotateCcw size={14} aria-hidden /> Restablecer
          </button>
        </div>
      )}
    </div>
  );
}
