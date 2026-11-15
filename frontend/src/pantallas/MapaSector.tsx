// Plano de la instalación (SVG estilo plano de laboratorio sobre papel): las salas se "energizan"
// al recuperarse y el núcleo OMEGA late hasta ser derrotado.
import type { KeyboardEvent } from 'react';
import { Lock, Play } from 'lucide-react';
import { SALAS, SECTORES, ROMANOS, type IdSala } from '../juego/mapa';
import { progresoSala, requeridasResueltas, salaCompleta, salaDesbloqueada, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { color, fuente } from '../tokens';

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
  sensores: { x: 50, y: 70, w: 210, h: 120 },
  acceso: { x: 290, y: 70, w: 210, h: 120 },
  energia: { x: 530, y: 70, w: 210, h: 120 },
  anomalias: { x: 770, y: 70, w: 210, h: 120 },
  integrador: { x: 770, y: 330, w: 210, h: 120 },
};
const NUCLEO = { cx: 520, cy: 400, r: 100 };
const ESCLUSA: Caja = { x: 50, y: 360, w: 210, h: 80 };

const ZONAS: Record<number, Caja> = {
  1: { x: 35, y: 45, w: 480, h: 165 },
  2: { x: 515, y: 45, w: 480, h: 165 },
  3: { x: 755, y: 305, w: 240, h: 165 },
  4: { x: 385, y: 270, w: 270, h: 265 },
};

/** Conductos: [sala de origen (energiza el conducto al completarse), trazo]. */
const CONDUCTOS: [IdSala | 'esclusa', string][] = [
  ['esclusa', 'M155 360 V190'],
  ['sensores', 'M260 130 H290'],
  ['acceso', 'M500 130 H530'],
  ['energia', 'M740 130 H770'],
  ['anomalias', 'M875 190 V330'],
  ['integrador', 'M770 390 H620'],
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
      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="titulo-plano">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold tracking-wide text-tenue uppercase">Plano de evacuación</p>
            <h1 id="titulo-plano" className="m-0 text-h2">
              Plano de la instalación
            </h1>
            <p className="m-0 text-tenue">Recupera las seis salas en orden. Cada sala se energiza cuando resuelves todos sus problemas.</p>
          </div>
          <button type="button" className="btn btn-primario" onClick={() => onEntrar(actual.id)}>
            <Play size={16} aria-hidden /> {estado.resueltos.length || estado.historiasVistas.length ? `Continuar en ${actual.nombre}` : 'Entrar al laboratorio'}
          </button>
        </div>

        <div className="tarjeta overflow-x-auto p-2">
          <svg viewBox="0 0 1000 560" className="block w-full min-w-[640px]" role="group" aria-label="Plano esquemático del laboratorio">
            <defs>
              <pattern id="cuadricula-fina" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M10 0H0V10" fill="none" stroke={color.primario} strokeOpacity="0.05" strokeWidth="0.5" />
              </pattern>
              <pattern id="cuadricula" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="url(#cuadricula-fina)" />
                <path d="M50 0H0V50" fill="none" stroke={color.primario} strokeOpacity="0.1" strokeWidth="0.8" />
              </pattern>
              <radialGradient id="pulso-omega">
                <stop offset="0" stopColor={color.omega} stopOpacity="0.35" />
                <stop offset="1" stopColor={color.omega} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1000" height="560" rx="12" fill="#fbfaf6" />
            <rect width="1000" height="560" rx="12" fill="url(#cuadricula)" />

            {/* Zonas de sector */}
            {SECTORES.map((s) => {
              const z = ZONAS[s.numero];
              return (
                <g key={s.numero}>
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" fill="none" stroke={color.tenue} strokeOpacity="0.35" strokeDasharray="6 5" />
                  <text x={z.x + 10} y={z.y - 8} fill={color.primario} fontFamily={fuente.display} fontWeight="600" fontSize="14">
                    {s.nombre}
                  </text>
                  <text x={z.x + z.w - 10} y={z.y - 8} textAnchor="end" fill={color.tenue} fontFamily={fuente.sans} fontSize="12">
                    {s.unidad}
                  </text>
                </g>
              );
            })}

            {/* Conductos de energía */}
            {CONDUCTOS.map(([origen, d]) => (
              <g key={d}>
                <path d={d} fill="none" stroke={color.linea} strokeWidth="8" strokeLinecap="round" />
                {energizado(origen) && <path d={d} fill="none" stroke={color.primario} strokeWidth="3" strokeDasharray="8 5" strokeLinecap="round" className="animate-flujo" />}
              </g>
            ))}

            {/* Esclusa de entrada */}
            <g>
              <rect x={ESCLUSA.x} y={ESCLUSA.y} width={ESCLUSA.w} height={ESCLUSA.h} rx="10" fill="#ffffff" stroke={color.primario} strokeOpacity="0.6" />
              <text x={ESCLUSA.x + ESCLUSA.w / 2} y={ESCLUSA.y + 35} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontWeight="600" fontSize="15">
                Esclusa de entrada
              </text>
              <text x={ESCLUSA.x + ESCLUSA.w / 2} y={ESCLUSA.y + 56} textAnchor="middle" fill={color.tenue} fontFamily={fuente.sans} fontSize="12">
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
              return (
                <g
                  key={s.id}
                  role="button"
                  tabIndex={abierta ? 0 : -1}
                  aria-disabled={!abierta}
                  aria-label={`${s.nombre}: ${hecha ? 'recuperada' : abierta ? `${hechas} de ${t} problemas` : 'bloqueada'}${aqui ? ', estás aquí' : ''}`}
                  onClick={() => abierta && onEntrar(s.id)}
                  onKeyDown={(e) => abierta && teclas(e, s.id)}
                  className={`${abierta ? 'cursor-pointer' : 'cursor-not-allowed'} outline-none [&:focus-visible>.foco]:opacity-100`}
                >
                  <rect className="foco opacity-0" x={c.x - 6} y={c.y - 6} width={c.w + 12} height={c.h + 12} rx="14" fill="none" stroke={color.ambar} strokeWidth="2" />
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    rx="10"
                    fill={hecha ? '#e4f3ea' : abierta ? '#ffffff' : '#f1efe9'}
                    stroke={hecha ? color.menta : abierta ? color.primario : color.linea}
                    strokeWidth={aqui ? 2.5 : 1.5}
                    strokeDasharray={abierta ? undefined : '4 4'}
                  />
                  <text x={c.x + 14} y={c.y + 30} fill={abierta ? color.tinta : color.tenue} fontFamily={fuente.display} fontWeight="600" fontSize="15">
                    {s.nombre}
                  </text>
                  <text x={c.x + 14} y={c.y + 51} fill={hecha ? color.menta : color.tenue} fontFamily={fuente.sans} fontSize="13">
                    {hecha ? 'Recuperada' : abierta ? `${hechas} de ${t} problemas` : 'Bloqueada'}
                  </text>
                  {/* Indicadores de problemas */}
                  {Array.from({ length: t }, (_, k) => (
                    <rect
                      key={k}
                      x={c.x + 14 + k * 22}
                      y={c.y + c.h - 30}
                      width="16"
                      height="8"
                      rx="4"
                      fill={k < hechas ? color.primario : 'none'}
                      stroke={abierta ? color.primario : color.linea}
                      strokeOpacity={abierta ? 0.7 : 1}
                    />
                  ))}
                  {aqui && (
                    <g>
                      <circle cx={c.x + c.w - 16} cy={c.y + c.h - 26} r="6" fill={color.ambar} />
                      <text x={c.x + c.w - 28} y={c.y + c.h - 22} textAnchor="end" fill={color.ambar} fontFamily={fuente.sans} fontWeight="700" fontSize="12">
                        Estás aquí
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Núcleo OMEGA: sala de Ecuaciones diferenciales */}
            {(() => {
              const s = SALAS[SALAS.length - 1];
              const abierta = salaDesbloqueada(estado, s.id);
              const aqui = estado.salaActual === s.id;
              const { hechas, total: t } = progresoSala(estado, s);
              return (
                <g
                  role="button"
                  tabIndex={abierta ? 0 : -1}
                  aria-disabled={!abierta}
                  aria-label={`${s.nombre}: ${!omegaViva ? 'OMEGA derrotada' : abierta ? `${hechas} de ${t} escudos desactivados` : 'bloqueada'}${aqui ? ', estás aquí' : ''}`}
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
                  <circle cx={NUCLEO.cx} cy={NUCLEO.cy} r={NUCLEO.r} fill="#ffffff" stroke={omegaViva ? color.omega : color.menta} strokeWidth="2" />
                  {/* Un indicador por escudo (método de EDO) */}
                  {s.consolas.map((k, i) => {
                    const caido = estado.resueltos.includes(k.slug);
                    const a = -Math.PI / 2 + (i * 2 * Math.PI) / s.consolas.length;
                    return (
                      <circle
                        key={k.slug}
                        cx={NUCLEO.cx + Math.cos(a) * (NUCLEO.r - 16)}
                        cy={NUCLEO.cy + Math.sin(a) * (NUCLEO.r - 16)}
                        r="6"
                        fill={caido ? color.menta : color.escudo}
                        fillOpacity={caido ? 0.9 : 0.75}
                      />
                    );
                  })}
                  <circle cx={NUCLEO.cx} cy={NUCLEO.cy - 18} r="16" fill={omegaViva ? color.omega : color.menta} fillOpacity="0.9" />
                  <text x={NUCLEO.cx} y={NUCLEO.cy + 14} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontWeight="700" fontSize="14">
                    {s.nombre.split(' ')[0]}
                  </text>
                  <text x={NUCLEO.cx} y={NUCLEO.cy + 30} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontWeight="700" fontSize="14">
                    {s.nombre.split(' ').slice(1).join(' ')}
                  </text>
                  <text x={NUCLEO.cx} y={NUCLEO.cy + 50} textAnchor="middle" fill={color.tenue} fontFamily={fuente.sans} fontSize="12">
                    {!omegaViva ? 'OMEGA desconectada' : abierta ? `Escudos ${t - hechas}/${t}` : 'Acceso bloqueado'}
                  </text>
                  <text x={NUCLEO.cx} y={NUCLEO.cy - NUCLEO.r - 12} textAnchor="middle" fill={omegaViva ? color.omega : color.menta} fontFamily={fuente.display} fontWeight="700" fontSize="16">
                    {omegaViva ? 'Núcleo OMEGA' : 'Núcleo recuperado'}
                  </text>
                  {aqui && omegaViva && (
                    <text x={NUCLEO.cx} y={NUCLEO.cy + NUCLEO.r + 20} textAnchor="middle" fill={color.ambar} fontFamily={fuente.sans} fontWeight="700" fontSize="12">
                      Estás aquí
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Rótulo del plano */}
            <g fontFamily={fuente.sans} fontSize="12" fill={color.tenue}>
              <line x1="800" y1="540" x2="900" y2="540" stroke={color.tenue} />
              <line x1="800" y1="535" x2="800" y2="545" stroke={color.tenue} />
              <line x1="900" y1="535" x2="900" y2="545" stroke={color.tenue} />
              <text x="910" y="544">20 m</text>
              <text x="40" y="544">Laboratorio de Métodos Numéricos</text>
            </g>
          </svg>
        </div>
      </section>

      <aside className="tarjeta flex flex-col gap-4 p-5" aria-label="Sectores">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-xl">Salas</h2>
          <span className="numero text-sm">
            {total}/{TOTAL_REQUERIDAS}
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {SECTORES.map((sec) => (
            <li key={sec.numero} className="flex flex-col gap-1.5">
              <p className="m-0 text-sm font-semibold text-tenue">
                {sec.nombre} · {sec.unidad}
              </p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
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
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                          estado.salaActual === s.id ? 'border-primario bg-primario/8' : 'border-linea bg-panel-2 hover:border-primario-2'
                        }`}
                      >
                        {!abierta && <Lock size={14} aria-hidden className="text-tenue" />}
                        <span className="flex-1 font-semibold">{s.nombre}</span>
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
        <p className="m-0 mt-auto text-sm text-tenue">
          Todos los problemas son obligatorios para abrir la puerta. Tu posición actual: Sector {ROMANOS[actual.sector]}.
        </p>
      </aside>
    </div>
  );
}
