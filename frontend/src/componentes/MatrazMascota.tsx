// Mascota decorativa: matraz Erlenmeyer al estilo «rubber hose» de 1930, en blanco y negro
// (tinta china sobre plata): ojos de pastel, brazos de manguera, guantes blancos y
// sombreado cel de dos tonos. Solo presentación.
import { useId } from 'react';
import { color, conAlfa, trazo } from '../tokens';

interface Props {
  className?: string;
  /** Saluda con el brazo derecho (animación de tambaleo). */
  saludando?: boolean;
  /** Sin animaciones (p. ej. como logotipo en la cabecera). */
  quieta?: boolean;
}

const CUERPO = 'M48 18H72V50L102 112Q106 124 94 124H26Q14 124 18 112L48 50Z';

/** Transform CSS sobre elementos SVG: la caja de referencia es la del propio trazo. */
const pivote = (origen: string) => ({ transformBox: 'fill-box' as const, transformOrigin: origen });

export function MatrazMascota({ className = '', saludando = true, quieta = false }: Props) {
  const id = useId();
  const recorte = `${id}-cuerpo`;
  const puntos = `${id}-puntos`;
  const tinta = { stroke: color.tinta, strokeWidth: trazo.medio, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const animar = (clase: string) => (quieta ? undefined : clase);

  return (
    <svg viewBox="0 0 120 148" className={className} aria-hidden focusable="false">
      <defs>
        <clipPath id={recorte}>
          <path d={CUERPO} />
        </clipPath>
        {/* Semitono de imprenta para el líquido */}
        <pattern id={puntos} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill={color.tinta} opacity="0.35" />
        </pattern>
      </defs>

      {/* Sombra de contacto */}
      <ellipse cx="60" cy="142" rx="34" ry="4" fill={conAlfa(color.tinta, 0.25)} />

      <g className={animar('animate-rebote')} style={pivote('50% 100%')}>
        {/* Piernas de manguera y zapatos con brillo */}
        <path d="M46 123Q44 134 39 139" fill="none" {...tinta} strokeWidth={trazo.grueso} />
        <path d="M74 123Q76 134 81 139" fill="none" {...tinta} strokeWidth={trazo.grueso} />
        <ellipse cx="35" cy="140" rx="9" ry="4.5" fill={color.tinta} />
        <ellipse cx="85" cy="140" rx="9" ry="4.5" fill={color.tinta} />
        <path d="M30 138.5Q32 137 35 137M80 138.5Q82 137 85 137" fill="none" stroke={color.papel} strokeWidth="1.2" strokeLinecap="round" />

        {/* Brazo izquierdo en jarra */}
        <path d="M33 96Q14 94 12 76" fill="none" {...tinta} strokeWidth={trazo.grueso} />
        <circle cx="12" cy="71" r="7" fill={color.papel} {...tinta} />
        <path d="M9 67.5Q12 66 14.5 67.5" fill="none" {...tinta} strokeWidth={trazo.fino} />

        {/* Brazo derecho saludando */}
        <g className={saludando ? animar('animate-tambaleo') : undefined} style={pivote('0% 100%')}>
          <path d="M87 96Q108 88 109 66" fill="none" {...tinta} strokeWidth={trazo.grueso} />
          <circle cx="109" cy="61" r="7" fill={color.papel} {...tinta} />
          <path d="M106 56V52M110 55V51" fill="none" {...tinta} strokeWidth={trazo.fino} />
        </g>

        {/* Vidrio, líquido en plata con semitono y burbujas */}
        <path d={CUERPO} fill={color.papel} />
        <g clipPath={`url(#${recorte})`}>
          <path d="M8 84Q30 76 50 84T90 84T132 84V132H8Z" fill={color.primario2} />
          <path d="M8 84Q30 76 50 84T90 84T132 84V132H8Z" fill={`url(#${puntos})`} />
          {/* Sombra cel: la luz viene de arriba-izquierda */}
          <path d="M70 18L112 110V132H70Q92 110 70 50Z" fill={conAlfa(color.tinta, 0.18)} />
          <path d="M8 84Q30 76 50 84T90 84T132 84" fill="none" stroke={color.tinta} strokeWidth={trazo.fino} />
          {[
            [40, 112, 3, '0s'],
            [78, 116, 2.5, '0.8s'],
            [60, 118, 2, '1.6s'],
          ].map(([cx, cy, r, retraso]) => (
            <circle
              key={String(cx)}
              cx={cx}
              cy={cy}
              r={r}
              fill={color.papel}
              stroke={color.tinta}
              strokeWidth="1"
              className={animar('animate-burbuja')}
              style={{ ...pivote('50% 50%'), animationDelay: String(retraso) }}
            />
          ))}
        </g>
        <path d={CUERPO} fill="none" {...tinta} strokeWidth={trazo.grueso} />
        {/* Brillo del vidrio: cuña blanca, nunca degradado */}
        <path d="M54 26V46M50 58L40 80" fill="none" stroke={color.papel} strokeWidth="3" strokeLinecap="round" />

        {/* Corcho de tinta con brillo */}
        <rect x="44" y="7" width="32" height="13" rx="4" fill={color.tinta} {...tinta} />
        <path d="M49 11H58" stroke={color.papel} strokeWidth="2" strokeLinecap="round" />

        {/* Cara: ojos de pastel, mejillas de semitono y sonrisa */}
        <ellipse cx="51" cy="74" rx="5" ry="8.5" fill={color.tinta} />
        <ellipse cx="69" cy="74" rx="5" ry="8.5" fill={color.tinta} />
        <path d="M51 74L49 66.5L53.5 67Z" fill={color.papel} />
        <path d="M69 74L67 66.5L71.5 67Z" fill={color.papel} />
        <ellipse cx="42" cy="90" rx="4.5" ry="3" fill={color.gris} opacity="0.55" />
        <ellipse cx="78" cy="90" rx="4.5" ry="3" fill={color.gris} opacity="0.55" />
        <path d="M50 92Q60 104 70 92" fill={color.tinta} {...tinta} />
        <path d="M55 97Q60 100 65 97" fill="none" stroke={color.papel} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
