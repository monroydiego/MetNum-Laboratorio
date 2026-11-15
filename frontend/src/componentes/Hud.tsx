import { Clock, Zap } from 'lucide-react';
import { formatearTiempo } from '../juego/estado';

interface Props {
  energia: number;
  tiempoMs: number;
  omegaVida?: number | null;
}

/** Indicadores sobre el canvas: energía del traje, integridad de OMEGA y tiempo. */
export function Hud({ energia, tiempoMs, omegaVida = null }: Props) {
  const baja = energia <= 30;
  return (
    <div className="pointer-events-none absolute top-2 left-2 flex w-[min(15rem,45%)] max-sm:w-28 flex-col gap-2 rounded-lg border border-linea bg-panel/90 px-3 py-2 text-sm max-sm:top-1 max-sm:left-1 max-sm:gap-1 max-sm:px-2 max-sm:py-1">
      <Barra etiqueta="Energía del traje" valor={energia} max={100} color={baja ? 'bg-ambar' : 'bg-cian'} icono={<Zap size={14} aria-hidden />} />
      {omegaVida !== null && (
        <Barra etiqueta="Integridad de OMEGA" valor={omegaVida} max={3} color="bg-omega" texto={`${omegaVida}/3`} />
      )}
      <p className="m-0 flex items-center gap-1.5 text-tenue max-sm:hidden">
        <Clock size={14} aria-hidden /> <span className="numero">{formatearTiempo(tiempoMs)}</span>
      </p>
    </div>
  );
}

function Barra({ etiqueta, valor, max, color, texto, icono }: { etiqueta: string; valor: number; max: number; color: string; texto?: string; icono?: React.ReactNode }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 max-sm:text-xs">
          {icono} <span className="max-sm:sr-only">{etiqueta}</span>
        </span>
        <span className="numero max-sm:text-xs">{texto ?? `${Math.ceil(valor)}%`}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-linea"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.ceil(valor)}
      >
        <div className={`h-full rounded-full ${color} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
