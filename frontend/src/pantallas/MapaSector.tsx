// Plano esquemático de la instalación (SVG tipo blueprint): las salas se "energizan"
// al recuperarse y OMEGA late en rojo en el núcleo hasta ser derrotada.
import type { KeyboardEvent } from 'react';
import { Lock, Play } from 'lucide-react';
import { SALAS, SECTORES, ROMANOS, type IdSala } from '../juego/mapa';
import { progresoSala, requeridasResueltas, salaCompleta, salaDesbloqueada, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { color } from '../tokens';

interface Props {
  estado: EstadoJuego;
  onEntrar: (id: IdSala) => void;
}

interface Caja {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CAJAS: Record<Exclude<IdSala, 'omega'>, Caja> = {
  sensores: { x: 50, y: 270, w: 200, h: 120 },
  acceso: { x: 50, y: 70, w: 200, h: 120 },
  energia: { x: 330, y: 70, w: 180, h: 120 },
  anomalias: { x: 540, y: 70, w: 180, h: 120 },
  integrador: { x: 770, y: 70, w: 190, h: 120 },
  propulsion: { x: 770, y: 300, w: 190, h: 120 },
};
const NUCLEO = { cx: 520, cy: 440, r: 100 };

const ZONAS: Record<number, Caja> = {
  1: { x: 30, y: 40, w: 240, h: 540 },
  2: { x: 310, y: 40, w: 430, h: 180 },
  3: { x: 750, y: 40, w: 230, h: 180 },
  4: { x: 310, y: 250, w: 670, h: 330 },
};

/** Conductos: [sala de origen (energiza el conducto al completarse), trazo]. */
const CONDUCTOS: [IdSala | 'esclusa', string][] = [
  ['esclusa', 'M150 470 V390'],
  ['sensores', 'M150 270 V190'],
  ['acceso', 'M250 130 H330'],
  ['energia', 'M510 130 H540'],
  ['anomalias', 'M720 130 H770'],
  ['integrador', 'M865 190 V300'],
  ['propulsion', 'M770 360 H700 L616 410'],
];

export function MapaSector({ estado, onEntrar }: Props) {
  const total = requeridasResueltas(estado);
  const omegaViva = estado.omegaVida > 0;

  function energizado(origen: IdSala | 'esclusa'): boolean {
    if (origen === 'esclusa') return true;
    return salaCompleta(estado, SALAS.find((s) => s.id === origen)!);
  }

  function teclas(e: KeyboardEvent, id: IdSala) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEntrar(id);
    }
  }

  const actual = SALAS.find((s) => s.id === estado.salaActual)!;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex min-w-0 flex-col gap-3" aria-labelledby="titulo-plano">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="titulo-plano" className="m-0 text-h2">
              Plano de la instalación
            </h1>
            <p className="m-0 text-tenue">
              Recupera los cuatro sectores. Cada sala se energiza cuando resuelves todas sus consolas.
            </p>
          </div>
          <button type="button" className="btn btn-primario" onClick={() => onEntrar(actual.id)}>
            <Play size={16} aria-hidden /> {estado.resueltos.length || estado.historiasVistas.length ? `Continuar en ${actual.nombre}` : 'Entrar al laboratorio'}
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-cian-2/50 bg-[#061520]">
          <svg viewBox="0 0 1000 610" className="block w-full min-w-[640px]" role="group" aria-label="Plano esquemático del laboratorio">
            <defs>
              <pattern id="cuadricula-fina" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M10 0H0V10" fill="none" stroke={color.cian} strokeOpacity="0.06" strokeWidth="0.5" />
              </pattern>
              <pattern id="cuadricula" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="url(#cuadricula-fina)" />
                <path d="M50 0H0V50" fill="none" stroke={color.cian} strokeOpacity="0.13" strokeWidth="0.8" />
              </pattern>
              <radialGradient id="pulso-omega">
                <stop offset="0" stopColor={color.omega} stopOpacity="0.55" />
                <stop offset="1" stopColor={color.omega} stopOpacity="0" />
              </radialGradient>
              <filter id="resplandor" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="1000" height="610" fill="url(#cuadricula)" />

            {/* Zonas de sector */}
            {SECTORES.map((s) => {
              const z = ZONAS[s.numero];
              return (
                <g key={s.numero}>
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6" fill="none" stroke={color.cian} strokeOpacity="0.35" strokeDasharray="6 5" />
                  <text x={z.x + 10} y={z.y - 8} fill={color.cian} fillOpacity="0.8" fontFamily="Chakra Petch" fontWeight="600" fontSize="14">
                    {s.nombre}
                  </text>
                  <text x={z.x + z.w - 10} y={z.y - 8} textAnchor="end" fill={color.tenue} fontFamily="Atkinson Hyperlegible" fontSize="12">
                    {s.unidad}
                  </text>
                </g>
              );
            })}

            {/* Conductos de energía */}
            {CONDUCTOS.map(([origen, d]) => (
              <g key={d}>
                <path d={d} fill="none" stroke={color.cian} strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" />
                {energizado(origen) && (
                  <path d={d} fill="none" stroke={color.cian} strokeWidth="2.5" strokeDasharray="8 4" className="animate-flujo" filter="url(#resplandor)" />
                )}
              </g>
            ))}

            {/* Esclusa de entrada */}
            <g>
              <rect x="60" y="470" width="180" height="80" rx="4" fill="#0a2230" stroke={color.cian} strokeOpacity="0.6" />
              <text x="150" y="505" textAnchor="middle" fill={color.tinta} fontFamily="Chakra Petch" fontWeight="600" fontSize="15">
                Esclusa de entrada
              </text>
              <text x="150" y="527" textAnchor="middle" fill={color.tenue} fontFamily="Atkinson Hyperlegible" fontSize="12">
                Punto de control del traje
              </text>
            </g>

            {/* Salas */}
            {SALAS.filter((s) => !s.esJefe).map((s) => {
              const c = CAJAS[s.id as keyof typeof CAJAS];
              const abierta = salaDesbloqueada(estado, s.id);
              const hecha = salaCompleta(estado, s);
              const aqui = estado.salaActual === s.id;
              const { hechas, total: t } = progresoSala(estado, s);
              const trazo = hecha ? color.cian : abierta ? color.cian : color.tenue;
              return (
                <g
                  key={s.id}
                  role="button"
                  tabIndex={abierta ? 0 : -1}
                  aria-disabled={!abierta}
                  aria-label={`${s.nombre}: ${hecha ? 'recuperada' : abierta ? `${hechas} de ${t} consolas` : 'bloqueada'}${aqui ? ', estás aquí' : ''}`}
                  onClick={() => abierta && onEntrar(s.id)}
                  onKeyDown={(e) => abierta && teclas(e, s.id)}
                  className={`${abierta ? 'cursor-pointer' : 'cursor-not-allowed'} outline-none [&:focus-visible>.foco]:opacity-100`}
                >
                  <rect className="foco opacity-0" x={c.x - 6} y={c.y - 6} width={c.w + 12} height={c.h + 12} rx="8" fill="none" stroke={color.ambar} strokeWidth="2" />
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    rx="4"
                    fill={hecha ? '#0d3a3d' : '#0a1d29'}
                    fillOpacity={abierta ? 1 : 0.6}
                    stroke={trazo}
                    strokeOpacity={abierta ? 0.9 : 0.35}
                    strokeWidth={hecha ? 2 : 1.2}
                    strokeDasharray={abierta ? undefined : '4 4'}
                    filter={hecha ? 'url(#resplandor)' : undefined}
                  />
                  <text x={c.x + 14} y={c.y + 30} fill={abierta ? color.tinta : color.tenue} fontFamily="Chakra Petch" fontWeight="600" fontSize="16">
                    {s.nombre}
                  </text>
                  <text x={c.x + 14} y={c.y + 52} fill={hecha ? color.menta : color.tenue} fontFamily="Atkinson Hyperlegible" fontSize="13">
                    {hecha ? 'Recuperada' : abierta ? `${hechas} de ${t} consolas` : 'Bloqueada'}
                  </text>
                  {/* Indicadores de consolas */}
                  {Array.from({ length: t }, (_, k) => (
                    <rect
                      key={k}
                      x={c.x + 14 + k * 22}
                      y={c.y + c.h - 30}
                      width="16"
                      height="8"
                      rx="2"
                      fill={k < hechas ? color.cian : 'none'}
                      stroke={abierta ? color.cian : color.tenue}
                      strokeOpacity={abierta ? 0.7 : 0.35}
                    />
                  ))}
                  {aqui && (
                    <g>
                      <circle cx={c.x + c.w - 16} cy={c.y + c.h - 26} r="6" fill={color.ambar} />
                      <text x={c.x + c.w - 28} y={c.y + c.h - 22} textAnchor="end" fill={color.ambar} fontFamily="Atkinson Hyperlegible" fontSize="12">
                        Estás aquí
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Núcleo OMEGA */}
            {(() => {
              const s = SALAS[SALAS.length - 1];
              const abierta = salaDesbloqueada(estado, s.id);
              const aqui = estado.salaActual === s.id;
              const { hechas } = progresoSala(estado, s);
              return (
                <g
                  role="button"
                  tabIndex={abierta ? 0 : -1}
                  aria-disabled={!abierta}
                  aria-label={`${s.nombre}: ${!omegaViva ? 'OMEGA derrotada' : abierta ? `${hechas} de 3 escudos desactivados` : 'bloqueado'}${aqui ? ', estás aquí' : ''}`}
                  onClick={() => abierta && onEntrar(s.id)}
                  onKeyDown={(e) => abierta && teclas(e, s.id)}
                  className={`${abierta ? 'cursor-pointer' : 'cursor-not-allowed'} outline-none [&:focus-visible>.foco]:opacity-100`}
                >
                  <circle className="foco opacity-0" cx={NUCLEO.cx} cy={NUCLEO.cy} r={NUCLEO.r + 8} fill="none" stroke={color.ambar} strokeWidth="2" />
                  {omegaViva && (
                    <circle
                      cx={NUCLEO.cx}
                      cy={NUCLEO.cy}
                      r={NUCLEO.r + 30}
                      fill="url(#pulso-omega)"
                      className="animate-latido"
                      style={{ transformOrigin: `${NUCLEO.cx}px ${NUCLEO.cy}px` }}
                    />
                  )}
                  <circle cx={NUCLEO.cx} cy={NUCLEO.cy} r={NUCLEO.r} fill="#13101c" stroke={omegaViva ? color.omega : color.cian} strokeWidth="2" />
                  {[0, 1, 2].map((k) => {
                    const caido = estado.resueltos.includes(s.consolas[k].slug);
                    return (
                      <circle
                        key={k}
                        cx={NUCLEO.cx}
                        cy={NUCLEO.cy}
                        r={NUCLEO.r - 14 - k * 12}
                        fill="none"
                        stroke={caido ? color.tenue : color.escudo}
                        strokeOpacity={caido ? 0.25 : 0.8}
                        strokeDasharray={caido ? '2 6' : '10 6'}
                      />
                    );
                  })}
                  <circle cx={NUCLEO.cx} cy={NUCLEO.cy} r="22" fill={omegaViva ? color.omega : '#3b4552'} />
                  <text x={NUCLEO.cx} y={NUCLEO.cy - NUCLEO.r - 14} textAnchor="middle" fill={omegaViva ? '#ffc3cf' : color.cian} fontFamily="Chakra Petch" fontWeight="700" fontSize="18">
                    {omegaViva ? 'Núcleo OMEGA' : 'Núcleo recuperado'}
                  </text>
                  <text x={NUCLEO.cx} y={NUCLEO.cy + 50} textAnchor="middle" fill={color.tinta} fontFamily="Atkinson Hyperlegible" fontSize="13">
                    {!omegaViva ? 'OMEGA desconectada' : abierta ? `Escudos ${3 - hechas}/3` : 'Acceso bloqueado'}
                  </text>
                  {aqui && omegaViva && (
                    <text x={NUCLEO.cx} y={NUCLEO.cy + 70} textAnchor="middle" fill={color.ambar} fontFamily="Atkinson Hyperlegible" fontSize="12">
                      Estás aquí
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Rótulo del plano */}
            <g fontFamily="Atkinson Hyperlegible" fontSize="12" fill={color.tenue}>
              <line x1="800" y1="598" x2="900" y2="598" stroke={color.tenue} />
              <line x1="800" y1="593" x2="800" y2="603" stroke={color.tenue} />
              <line x1="900" y1="593" x2="900" y2="603" stroke={color.tenue} />
              <text x="910" y="602">20 m</text>
              <text x="30" y="602">Laboratorio de Métodos Numéricos, plano de evacuación</text>
            </g>
          </svg>
        </div>
      </section>

      <aside className="flex flex-col gap-4 rounded-xl border border-linea bg-panel p-5" aria-label="Sectores">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-xl">Sectores</h2>
          <span className="numero text-sm">
            {total}/{TOTAL_REQUERIDAS}
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {SECTORES.map((sec) => (
            <li key={sec.numero} className="flex flex-col gap-1.5">
              <p className="m-0 font-display font-semibold">
                {sec.nombre} <span className="font-sans font-normal text-tenue">({sec.unidad})</span>
              </p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {SALAS.filter((s) => s.sector === sec.numero).map((s) => {
                  const abierta = salaDesbloqueada(estado, s.id);
                  const hecha = salaCompleta(estado, s);
                  const { hechas, total: t } = progresoSala(estado, s);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!abierta}
                        onClick={() => onEntrar(s.id)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-linea px-3 py-2 text-left text-sm hover:border-cian-2 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {!abierta && <Lock size={14} aria-hidden className="text-tenue" />}
                        <span className="flex-1">{s.nombre}</span>
                        <span className={`numero ${hecha ? 'text-menta' : 'text-tenue'}`}>
                          {hechas}/{t}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <p className="m-0 text-sm text-tenue">
          Las terminales opcionales y los paneles de consulta no bloquean las puertas. Sector {ROMANOS[actual.sector]} es tu posición actual.
        </p>
      </aside>
    </div>
  );
}
