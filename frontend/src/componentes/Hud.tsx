import { Clock, Heart, ShieldAlert, Zap } from 'lucide-react';
import { ENERGIA_MAX, formatearTiempo, VIDAS_MAX } from '../juego/estado';

interface Props {
  energia: number;
  vidas: number;
  tiempoMs: number;
  omegaVida?: number | null;
}

/** Barra de estado sobre el canvas: vida actual, vidas restantes, integridad de OMEGA y tiempo. */
export function Hud({ energia, vidas, tiempoMs, omegaVida = null }: Props) {
  const baja = energia <= 30;
  return (
    <div className="tarjeta flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 text-sm">
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-semibold">
            <Zap size={15} className={baja ? 'text-ambar' : 'text-primario'} aria-hidden /> Vida
          </span>
          <span className="numero">{Math.ceil(energia)}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-linea"
          role="progressbar"
          aria-label="Vida actual"
          aria-valuemin={0}
          aria-valuemax={ENERGIA_MAX}
          aria-valuenow={Math.ceil(energia)}
        >
          <div className={`h-full rounded-full ${baja ? 'bg-ambar' : 'bg-primario'} transition-[width] duration-300`} style={{ width: `${Math.max(0, Math.min(100, energia))}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-2" role="img" aria-label={`${vidas} de ${VIDAS_MAX} vidas`}>
        <span className="font-semibold">Vidas</span>
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: VIDAS_MAX }, (_, i) => (
            <Heart key={i} size={18} className={i < vidas ? 'fill-hostil text-hostil' : 'text-linea'} />
          ))}
        </span>
      </div>

      {omegaVida !== null && (
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-omega" aria-hidden />
          <span className="font-semibold">OMEGA</span>
          <span className="numero">{omegaVida}/3</span>
        </div>
      )}

      <p className="m-0 flex items-center gap-1.5 text-tenue">
        <Clock size={15} aria-hidden /> <span className="numero">{formatearTiempo(tiempoMs)}</span>
      </p>
    </div>
  );
}
