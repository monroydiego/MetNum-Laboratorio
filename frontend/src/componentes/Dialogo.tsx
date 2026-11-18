import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  onCerrar?: () => void;
  ancho?: 'sm' | 'md' | 'lg' | 'xl';
  /** En móvil todos pasan a pantalla completa; `completo` lo fuerza también en escritorio. */
  completo?: boolean;
  acento?: 'primario' | 'hostil' | 'escudo' | 'ambar';
  children: ReactNode;
}

const ANCHOS = { sm: 'sm:max-w-lg', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl', xl: 'sm:max-w-6xl' } as const;
/** Fondo de la cartela de cabecera: tinta por defecto; el rojo de OMEGA y el violeta de sus escudos son la única mancha de color. */
const ACENTOS = {
  primario: 'bg-tinta',
  hostil: 'bg-omega',
  escudo: 'bg-escudo',
  ambar: 'bg-tinta border-b-[6px] border-ambar-2',
} as const;

/** Diálogo modal nativo (<dialog>): foco atrapado, Esc cierra, fondo bloqueado. */
export function Dialogo({ titulo, subtitulo, onCerrar, ancho = 'md', completo = false, acento = 'primario', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar?.();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onCerrar) onCerrar();
      }}
      className={`m-auto flex-col overflow-hidden border-[length:var(--trazo-medio)] border-tinta bg-panel p-0 text-tinta shadow-tinta-lg open:flex animate-aparecer
        max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:rounded-none
        sm:w-[calc(100vw-2rem)] sm:rounded-xl ${completo ? 'sm:h-[calc(100dvh-2rem)] sm:max-h-none sm:max-w-[min(100rem,calc(100vw-2rem))]' : `sm:max-h-[calc(100dvh-2rem)] ${ANCHOS[ancho]}`}`}
    >
      {/* Cabecera como intertítulo de cine mudo: cartela con marco blanco interior. */}
      <header className={`intertitulo flex shrink-0 items-start justify-between gap-4 px-5 py-4 sm:px-6 ${ACENTOS[acento]}`}>
        <div className="min-w-0">
          <h2 id={idTitulo} className="m-0 text-xl leading-tight sm:text-h3">
            {titulo}
          </h2>
          {subtitulo && <div className="mt-1 text-sm text-primario-2">{subtitulo}</div>}
        </div>
        {onCerrar && (
          <button
            type="button"
            className="relative z-10 -mt-1 -mr-2 inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[length:var(--trazo-fino)] border-papel bg-transparent text-papel transition-colors hover:bg-papel hover:text-tinta"
            onClick={onCerrar}
            aria-label="Cerrar (Esc)"
            title="Cerrar (Esc)"
          >
            <X size={20} aria-hidden />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
    </dialog>
  );
}
