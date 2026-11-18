import { Clock, Heart, ShieldAlert, Zap } from 'lucide-react';
import { ENERGIA_MAX, formatearTiempo, LIMITE_TERMINAL_MS, VIDA_OMEGA, VIDAS_MAX } from '../juego/estado';

interface Props {
  energia: number;
  vidas: number;
  tiempoMs: number;
  omegaVida?: number | null;
  /** Contrarreloj: terminales con el contador en marcha. */
  terminales?: { slug: string; nombre: string; inicio: number }[];
}

/** Cuenta regresiva de una terminal (se actualiza con cada repintado del reloj de la misión). */
export function CuentaTerminal({ inicio }: { inicio: number }) {
  const restante = Math.max(0, LIMITE_TERMINAL_MS - (Date.now() - inicio));
  return <span className={`numero font-semibold ${restante <= 5 * 60000 ? 'text-hostil' : ''}`}>{formatearTiempo(restante)}</span>;
}

/**
 * Barra de estado sobre el canvas, como tablero de instrumentos dibujado a tinta:
 * vida actual (tubo de goma), vidas restantes (corazones de goma), integridad de OMEGA
 * (lo único a color) y cronómetro.
 */
export function Hud({ energia, vidas, tiempoMs, omegaVida = null, terminales }: Props) {
  const baja = energia <= 30;
  return (
    <div className="tarjeta flex flex-wrap items-stretch gap-x-5 gap-y-3 px-4 py-3 text-sm">
      <div className="flex min-w-44 flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-display tracking-wide">
            <span className={`grid size-6 place-items-center rounded-full border-[length:var(--trazo-fino)] border-tinta ${baja ? 'bg-ambar-2' : 'bg-papel'}`}>
              <Zap size={13} className="text-tinta" aria-hidden />
            </span>
            Vida
          </span>
          <span className={`numero font-semibold ${baja ? 'text-ambar' : ''}`}>{Math.ceil(energia)}%</span>
        </div>
        <div
          className="medidor h-3.5"
          role="progressbar"
          aria-label="Vida actual"
          aria-valuemin={0}
          aria-valuemax={ENERGIA_MAX}
          aria-valuenow={Math.ceil(energia)}
        >
          <div className={`medidor-relleno ${baja ? 'text-ambar-2 animate-latido' : 'text-tinta'}`} style={{ width: `${Math.max(0, Math.min(100, energia))}%` }} />
        </div>
      </div>

      <span className="w-0.5 self-stretch rounded-full bg-tinta max-sm:hidden" aria-hidden />

      <div className="flex items-center gap-2" role="img" aria-label={`${vidas} de ${VIDAS_MAX} vidas`}>
        <span className="font-display tracking-wide">Vidas</span>
        <span className="flex gap-0.5" aria-hidden>
          {Array.from({ length: VIDAS_MAX }, (_, i) => (
            <Heart
              key={i}
              size={22}
              strokeWidth={2.5}
              className={i < vidas ? 'fill-tinta text-tinta' : 'text-gris [stroke-dasharray:3_3]'}
            />
          ))}
        </span>
      </div>

      {omegaVida !== null && (
        <>
          <span className="w-0.5 self-stretch rounded-full bg-tinta max-sm:hidden" aria-hidden />
          {/* OMEGA: la única mancha de color en la película */}
          <div className="flex items-center gap-2 rounded-full border-[length:var(--trazo-medio)] border-tinta bg-hostil px-3 py-1 text-papel shadow-tinta-sm">
            <ShieldAlert size={15} aria-hidden />
            <span className="font-display tracking-wide">OMEGA</span>
            <span className="flex gap-1" aria-hidden>
              {Array.from({ length: VIDA_OMEGA }, (_, i) => (
                <span key={i} className={`size-2.5 rounded-full border border-papel ${i < omegaVida ? 'bg-papel' : 'bg-transparent'}`} />
              ))}
            </span>
            <span className="numero font-semibold">{omegaVida}/3</span>
          </div>
        </>
      )}

      {terminales?.map((t) => (
        <p key={t.slug} className="chapa m-0 self-center py-1 text-sm text-tinta" title={`Tiempo restante de ${t.nombre}`}>
          <Clock size={14} aria-hidden /> <span className="font-sans">{t.nombre}</span> <CuentaTerminal inicio={t.inicio} />
        </p>
      ))}

      <p className="chapa m-0 ml-auto self-center py-1 text-sm text-tinta">
        <Clock size={14} aria-hidden /> <span className="numero font-sans">{formatearTiempo(tiempoMs)}</span>
      </p>
    </div>
  );
}
