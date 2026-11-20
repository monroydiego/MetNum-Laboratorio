// Plano de evacuación dibujado a tinta (SVG): todo es blanco y negro hasta que el jugador recupera
// una sala; entonces se «colorea a mano» con su tinte. El núcleo OMEGA es lo único a color desde el inicio.
import type { KeyboardEvent } from 'react';
import { Check, Lock, Play } from 'lucide-react';
import { SALAS, SECTORES, ROMANOS, type IdSala } from '../juego/mapa';
import { progresoSala, requeridasResueltas, salaCompleta, salaDesbloqueada, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { color, fuente, sombra, tintes, trazo } from '../tokens';

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
  const nucleo = SALAS[SALAS.length - 1];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="titulo-plano">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 id="titulo-plano" className="m-0 text-h2">
              Plano de la instalación
            </h1>
            <p className="m-0 max-w-2xl text-tenue">
              Recupera las seis salas en orden. Cada sala recobra su color cuando resuelves todos sus problemas.
            </p>
          </div>
          <button type="button" className="btn btn-primario" onClick={() => onEntrar(actual.id)}>
            <Play size={16} aria-hidden /> {estado.resueltos.length || estado.historiasVistas.length ? `Continuar en ${actual.nombre}` : 'Entrar al laboratorio'}
          </button>
        </div>

        <div className="tarjeta overflow-x-auto p-2">
          <svg viewBox="0 0 1000 560" className="block w-full min-w-[640px]" role="group" aria-label="Plano esquemático del laboratorio">
            <defs>
              {/* Papel milimetrado en lápiz gris */}
              <pattern id="cuadricula-fina" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M10 0H0V10" fill="none" stroke={color.linea} strokeOpacity="0.45" strokeWidth="0.5" />
              </pattern>
              <pattern id="cuadricula" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="url(#cuadricula-fina)" />
                <path d="M50 0H0V50" fill="none" stroke={color.linea} strokeWidth="0.9" />
              </pattern>
              {/* Semitono de imprenta: zonas que siguen bajo control de OMEGA */}
              <pattern id="semitono-plano" width="6" height="6" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="1.1" fill={color.tinta} opacity="0.28" />
              </pattern>
              {/* Trama de pincel sobre el tinte: «coloreado a mano» */}
              <pattern id="trama-mano" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
                <path d="M0 2H9" stroke={color.papel} strokeOpacity="0.28" strokeWidth="2.5" />
              </pattern>
              <radialGradient id="pulso-omega">
                <stop offset="0" stopColor={color.hostil} stopOpacity="0.4" />
                <stop offset="1" stopColor={color.hostil} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="1000" height="560" rx="12" fill={color.panel} />
            <rect width="1000" height="560" rx="12" fill="url(#cuadricula)" />
            {/* Marco doble de plano técnico */}
            <rect x="8" y="8" width="984" height="544" rx="8" fill="none" stroke={color.tinta} strokeWidth={trazo.fino} />

            {/* Zonas de sector */}
            {SECTORES.map((s) => {
              const z = ZONAS[s.numero];
              return (
                <g key={s.numero}>
                  <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" fill="none" stroke={color.tinta} strokeOpacity="0.45" strokeWidth={trazo.fino} strokeDasharray="7 6" />
                  <text x={z.x + 10} y={z.y - 8} fill={color.tinta} fontFamily={fuente.display} fontSize="15">
                    {s.nombre}
                  </text>
                  <text x={z.x + z.w - 10} y={z.y - 8} textAnchor="end" fill={color.tenue} fontFamily={fuente.sans} fontSize="13">
                    {s.unidad}
                  </text>
                </g>
              );
            })}

            {/* Conductos: tubo de goma a tinta; al recuperarse su sala de origen se rellena con su tinte */}
            {CONDUCTOS.map(([origen, d]) => {
              const vivo = energizado(origen);
              return (
                <g key={d}>
                  <path d={d} fill="none" stroke={color.tinta} strokeWidth="11" strokeLinecap="round" />
                  <path d={d} fill="none" stroke={color.papel} strokeWidth="6" strokeLinecap="round" />
                  {vivo && (
                    <path
                      d={d}
                      fill="none"
                      stroke={origen === 'esclusa' ? color.tinta : tintes[origen]}
                      strokeWidth="4"
                      strokeDasharray="8 5"
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}

            {/* Esclusa de entrada */}
            <g>
              <rect x={ESCLUSA.x + sombra.dx} y={ESCLUSA.y + sombra.dy} width={ESCLUSA.w} height={ESCLUSA.h} rx="10" fill={color.tinta} />
              <rect x={ESCLUSA.x} y={ESCLUSA.y} width={ESCLUSA.w} height={ESCLUSA.h} rx="10" fill={color.papel} stroke={color.tinta} strokeWidth={trazo.medio} />
              <text x={ESCLUSA.x + ESCLUSA.w / 2} y={ESCLUSA.y + 35} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontSize="16">
                Esclusa de entrada
              </text>
              <text x={ESCLUSA.x + ESCLUSA.w / 2} y={ESCLUSA.y + 56} textAnchor="middle" fill={color.tenue} fontFamily={fuente.sans} fontSize="13">
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
                  className={`${abierta ? 'cursor-pointer' : 'cursor-not-allowed'} group outline-none [&:focus-visible>.foco]:opacity-100`}
                >
                  {/* Anillo de foco dorado con contorno de tinta */}
                  <g className="foco opacity-0">
                    <rect x={c.x - 8} y={c.y - 8} width={c.w + 18} height={c.h + 18} rx="16" fill="none" stroke={color.ambar2} strokeWidth="7" />
                    <rect x={c.x - 11} y={c.y - 11} width={c.w + 24} height={c.h + 24} rx="18" fill="none" stroke={color.tinta} strokeWidth={trazo.fino} />
                  </g>
                  {abierta && <rect x={c.x + sombra.dx} y={c.y + sombra.dy} width={c.w} height={c.h} rx="10" fill={color.tinta} />}

                  {hecha ? (
                    // Sala recuperada: se colorea a mano con su tinte
                    <g className="animate-colorear">
                      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="10" fill={tintes[s.id]} />
                      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="10" fill="url(#trama-mano)" />
                    </g>
                  ) : (
                    <>
                      <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="10" fill={abierta ? color.papel : color.panel2} />
                      {!abierta && <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="10" fill="url(#semitono-plano)" />}
                    </>
                  )}
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={c.h}
                    rx="10"
                    fill="none"
                    stroke={color.tinta}
                    strokeOpacity={abierta ? 1 : 0.55}
                    strokeWidth={aqui ? trazo.grueso : abierta ? trazo.medio : trazo.fino}
                    strokeDasharray={abierta ? undefined : '5 4'}
                    className="transition-[stroke-width] group-hover:[stroke-width:4]"
                  />

                  {/* Rótulo blanco: el texto nunca va directamente sobre el tinte */}
                  <rect x={c.x + 9} y={c.y + 10} width={c.w - 18} height="50" rx="6" fill={color.papel} stroke={color.tinta} strokeWidth={abierta ? trazo.fino : 1} strokeOpacity={abierta ? 1 : 0.55} />
                  <text x={c.x + 18} y={c.y + 31} fill={abierta ? color.tinta : color.tenue} fontFamily={fuente.display} fontSize="14" letterSpacing="0.01em">
                    {s.nombre}
                  </text>
                  <text x={c.x + 18} y={c.y + 50} fill={hecha ? color.menta : color.tenue} fontFamily={fuente.sans} fontWeight={hecha ? 700 : 400} fontSize="14">
                    {hecha ? 'Recuperada' : abierta ? `${hechas} de ${t} problemas` : 'Bloqueada'}
                  </text>
                  {/* Insignia en la esquina (fuera del rótulo): candado o visto bueno */}
                  {!abierta && (
                    <g aria-hidden>
                      <circle cx={c.x + c.w - 6} cy={c.y + 6} r="13" fill={color.panel2} stroke={color.tenue} strokeWidth={trazo.fino} />
                      <Lock x={c.x + c.w - 14} y={c.y - 2} width={16} height={16} color={color.tenue} strokeWidth={2.5} />
                    </g>
                  )}
                  {hecha && (
                    <g aria-hidden>
                      <circle cx={c.x + c.w - 6 + 2} cy={c.y + 6 + 2} r="14" fill={color.tinta} />
                      <circle cx={c.x + c.w - 6} cy={c.y + 6} r="14" fill={color.menta} stroke={color.tinta} strokeWidth={trazo.medio} />
                      <Check x={c.x + c.w - 15} y={c.y - 3} width={18} height={18} color={color.papel} strokeWidth={3.5} />
                    </g>
                  )}

                  {/* Un indicador de goma por problema */}
                  {Array.from({ length: t }, (_, k) => (
                    <rect
                      key={k}
                      x={c.x + 14 + k * 24}
                      y={c.y + c.h - 32}
                      width="18"
                      height="10"
                      rx="5"
                      fill={k < hechas ? color.tinta : color.papel}
                      stroke={color.tinta}
                      strokeWidth={trazo.fino}
                      strokeOpacity={abierta ? 1 : 0.45}
                      fillOpacity={abierta ? 1 : 0.6}
                    />
                  ))}

                  {aqui && (
                    // «Estás aquí»: cartel dorado ligeramente torcido
                    <g transform={`rotate(-4 ${c.x + c.w - 52} ${c.y + c.h - 4})`}>
                      <rect x={c.x + c.w - 104 + 2} y={c.y + c.h - 20 + 2} width="100" height="26" rx="7" fill={color.tinta} />
                      <rect x={c.x + c.w - 104} y={c.y + c.h - 20} width="100" height="26" rx="7" fill={color.ambar2} stroke={color.tinta} strokeWidth={trazo.medio} />
                      <text x={c.x + c.w - 54} y={c.y + c.h - 2.5} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontSize="13">
                        Estás aquí
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Núcleo OMEGA: sala de Ecuaciones diferenciales (lo único a color mientras vive) */}
            {(() => {
              const s = nucleo;
              const abierta = salaDesbloqueada(estado, s.id);
              const aqui = estado.salaActual === s.id;
              const { hechas, total: t } = progresoSala(estado, s);
              const { cx, cy, r } = NUCLEO;
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
                  <g className="foco opacity-0">
                    <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={color.ambar2} strokeWidth="7" />
                    <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke={color.tinta} strokeWidth={trazo.fino} />
                  </g>
                  {omegaViva && <circle cx={cx} cy={cy} r={r + 32} fill="url(#pulso-omega)" className="animate-latido" style={{ transformOrigin: `${cx}px ${cy}px` }} />}
                  <circle cx={cx + sombra.dx} cy={cy + sombra.dy} r={r} fill={color.tinta} />
                  {omegaViva ? (
                    <circle cx={cx} cy={cy} r={r} fill={color.papel} stroke={color.hostil} strokeWidth="6" />
                  ) : (
                    // Núcleo recuperado: anillo coloreado a mano con el oro de la última sala
                    <g className="animate-colorear">
                      <circle cx={cx} cy={cy} r={r} fill={tintes.omega} />
                      <circle cx={cx} cy={cy} r={r} fill="url(#trama-mano)" />
                    </g>
                  )}
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke={color.tinta} strokeWidth={omegaViva ? trazo.fino : trazo.medio} />
                  <circle cx={cx} cy={cy} r={r - 26} fill={color.papel} stroke={color.tinta} strokeWidth={trazo.fino} />

                  {/* Un indicador por escudo (método de EDO): violeta activo, hueco de tinta al caer */}
                  {s.consolas.map((k, i) => {
                    const caido = estado.resueltos.includes(k.slug);
                    const a = -Math.PI / 2 + (i * 2 * Math.PI) / s.consolas.length;
                    return (
                      <circle
                        key={k.slug}
                        cx={cx + Math.cos(a) * (r - 15)}
                        cy={cy + Math.sin(a) * (r - 15)}
                        r="7"
                        fill={caido ? color.papel : color.escudo}
                        stroke={color.tinta}
                        strokeWidth={trazo.fino}
                      />
                    );
                  })}

                  {/* Ojo de OMEGA: rojo con pupila de tinta; al caer, ojo de pastel cerrado */}
                  {omegaViva ? (
                    <g>
                      <ellipse cx={cx} cy={cy - 30} rx="20" ry="13" fill={color.hostil} stroke={color.tinta} strokeWidth={trazo.medio} />
                      <circle cx={cx} cy={cy - 30} r="5.5" fill={color.tinta} />
                      <path d={`M${cx - 4} ${cy - 35}l3 -3`} stroke={color.papel} strokeWidth="2" strokeLinecap="round" />
                    </g>
                  ) : (
                    <path d={`M${cx - 18} ${cy - 32}Q${cx} ${cy - 20} ${cx + 18} ${cy - 32}`} fill="none" stroke={color.tinta} strokeWidth={trazo.grueso} strokeLinecap="round" />
                  )}
                  <text x={cx} y={cy + 2} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontSize="14">
                    {s.nombre.split(' ')[0]}
                  </text>
                  <text x={cx} y={cy + 18} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontSize="14">
                    {s.nombre.split(' ').slice(1).join(' ')}
                  </text>
                  <text x={cx} y={cy + 35} textAnchor="middle" fill={color.tenue} fontFamily={fuente.sans} fontSize="13">
                    {!omegaViva ? 'OMEGA desconectada' : abierta ? `Escudos ${t - hechas}/${t}` : 'Acceso bloqueado'}
                  </text>
                  <text x={cx} y={cy - r - 14} textAnchor="middle" fill={omegaViva ? color.hostil : color.tinta} fontFamily={fuente.display} fontSize="17">
                    {omegaViva ? 'Núcleo OMEGA' : 'Núcleo recuperado'}
                  </text>
                  {aqui && omegaViva && (
                    <g transform={`rotate(-4 ${cx} ${cy + r + 18})`}>
                      <rect x={cx - 50 + 2} y={cy + r + 6 + 2} width="100" height="26" rx="7" fill={color.tinta} />
                      <rect x={cx - 50} y={cy + r + 6} width="100" height="26" rx="7" fill={color.ambar2} stroke={color.tinta} strokeWidth={trazo.medio} />
                      <text x={cx} y={cy + r + 23.5} textAnchor="middle" fill={color.tinta} fontFamily={fuente.display} fontSize="13">
                        Estás aquí
                      </text>
                    </g>
                  )}
                </g>
              );
            })()}

            {/* Cartucho del plano y escala */}
            <g>
              <rect x="30" y="514" width="300" height="30" rx="4" fill={color.tinta} />
              <rect x="34" y="518" width="292" height="22" rx="2" fill="none" stroke={color.papel} strokeWidth="1" />
              <text x="180" y="534" textAnchor="middle" fill={color.papel} fontFamily={fuente.display} fontSize="13" letterSpacing="0.02em">
                Laboratorio de Métodos Numéricos
              </text>
            </g>
            <g fontFamily={fuente.sans} fontSize="13" fill={color.tenue}>
              <rect x="800" y="536" width="50" height="6" fill={color.tinta} />
              <rect x="850" y="536" width="50" height="6" fill={color.papel} stroke={color.tinta} strokeWidth="1" />
              <text x="910" y="543" fill={color.tinta}>
                20 m
              </text>
            </g>
          </svg>
        </div>
      </section>

      <aside className="tarjeta flex flex-col gap-4 p-5" aria-label="Sectores">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-xl">Salas</h2>
          <span className="chapa numero">
            {total}/{TOTAL_REQUERIDAS}
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {SECTORES.map((sec) => (
            <li key={sec.numero} className="flex flex-col gap-2">
              <p className="m-0 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-display tracking-wide">{sec.nombre}</span>
                <span className="text-tenue">{sec.unidad}</span>
              </p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {SALAS.filter((s) => s.sector === sec.numero).map((s) => {
                  const abierta = salaDesbloqueada(estado, s.id);
                  const hecha = salaCompleta(estado, s);
                  const aqui = estado.salaActual === s.id;
                  const { hechas, total: t } = progresoSala(estado, s);
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!abierta}
                        onClick={() => onEntrar(s.id)}
                        aria-current={aqui ? 'location' : undefined}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl border-[length:var(--trazo-medio)] px-2.5 py-2 text-left text-sm transition-[transform,box-shadow] duration-150 ease-elastico disabled:cursor-not-allowed ${
                          !abierta
                            ? 'semitono border-dashed border-tenue bg-panel-2 text-tenue'
                            : aqui
                              ? 'border-tinta bg-papel shadow-oro hover:-translate-y-0.5'
                              : 'border-tinta bg-panel shadow-tinta-sm hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Muestra de color: blanco y negro hasta recuperarla */}
                        <span
                          aria-hidden
                          className={`grid size-7 shrink-0 place-items-center rounded-full border-[length:var(--trazo-fino)] ${
                            hecha ? 'animate-colorear border-tinta' : abierta ? 'border-tinta bg-papel' : 'border-tenue bg-panel-2'
                          }`}
                          style={hecha ? { backgroundColor: tintes[s.id] } : undefined}
                        >
                          {hecha ? (
                            <Check size={15} strokeWidth={3.5} className="text-papel" />
                          ) : !abierta ? (
                            <Lock size={13} className="text-tenue" />
                          ) : (
                            <span className="size-2.5 rounded-full bg-tinta" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col leading-tight">
                          <span className="font-semibold">{s.nombre}</span>
                          {aqui && <span className="text-sm text-ambar">Estás aquí</span>}
                        </span>
                        <span className={`numero ${hecha ? 'font-semibold text-menta' : 'text-tenue'}`}>
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
        <p className="m-0 mt-auto border-t-[length:var(--trazo-fino)] border-dashed border-linea pt-3 text-sm text-tenue">
          Todos los problemas son obligatorios para abrir la puerta. Tu posición actual: Sector {ROMANOS[actual.sector]}.
        </p>
      </aside>
    </div>
  );
}
