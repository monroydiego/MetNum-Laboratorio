// Modo profesor: cualquier método del catálogo, agrupado por unidad y capítulo, con datos libres.
import { useMemo, useState } from 'react';
import { ArrowLeft, Film, Play, PlugZap, RefreshCw, Search } from 'lucide-react';
import { Dialogo } from './Dialogo';
import { PanelMetodo } from './PanelMetodo';
import { useCatalogo } from '../catalogo/contexto';
import { ROMANOS } from '../juego/mapa';
import type { EvidenciaDTO, MetodoInfoDTO } from '../types/numericos';

interface Props {
  matricula: string;
  onCerrar: () => void;
  onEvidencia?: (e: EvidenciaDTO, matricula: string) => void;
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function ModoProfesor({ matricula, onCerrar, onEvidencia }: Props) {
  const { estado, metodos, error, recargar } = useCatalogo();
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');

  const grupos = useMemo(() => {
    const f = normalizar(filtro.trim());
    const visibles = metodos.filter((m) => !f || normalizar(`${m.nombre_libro} ${m.capitulo} ${m.slug}`).includes(f));
    const porUnidad = new Map<number, Map<string, MetodoInfoDTO[]>>();
    for (const m of [...visibles].sort((a, b) => a.unidad - b.unidad || a.pagina - b.pagina)) {
      const caps = porUnidad.get(m.unidad) ?? new Map<string, MetodoInfoDTO[]>();
      const lista = caps.get(m.capitulo) ?? [];
      lista.push(m);
      caps.set(m.capitulo, lista);
      porUnidad.set(m.unidad, caps);
    }
    return [...porUnidad.entries()];
  }, [metodos, filtro]);

  const actual = metodos.find((m) => m.slug === seleccion);

  return (
    <Dialogo
      titulo="Modo profesor"
      subtitulo="Elige cualquier método del libro e ingresa tus propios puntos, funciones y datos. No marca consolas del juego."
      onCerrar={onCerrar}
      completo
      acento="ambar"
    >
      <div className="grid h-full gap-6 md:grid-cols-[19rem_minmax(0,1fr)]">
        <nav aria-label="Catálogo de métodos" className={`flex min-h-0 flex-col gap-3 ${seleccion ? 'max-md:hidden' : ''}`}>
          <label className="relative block">
            <span className="sr-only">Buscar método</span>
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-tenue" aria-hidden />
            <input className="campo pl-9" placeholder="Buscar método" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </label>
          {estado === 'cargando' && (
            <p className="m-0 flex items-center gap-2 text-tenue">
              <Film size={16} className="animate-tambaleo" aria-hidden /> Cargando catálogo…
            </p>
          )}
          {estado === 'error' && (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="m-0 flex items-center gap-2 text-hostil">
                <PlugZap size={16} aria-hidden /> {error}
              </p>
              <button type="button" className="btn" onClick={recargar}>
                <RefreshCw size={16} aria-hidden /> Reintentar
              </button>
            </div>
          )}
          {estado === 'listo' && !grupos.length && <p className="m-0 text-tenue">Ningún método coincide con la búsqueda.</p>}
          <div className="flex flex-col gap-5 overflow-y-auto pt-1 pr-2 pb-2">
            {grupos.map(([unidad, caps]) => (
              <section key={unidad} className="flex flex-col" aria-labelledby={`carrete-${unidad}`}>
                {/* Cada unidad es un carrete: cartela + tira de fotogramas perforada */}
                <h3
                  id={`carrete-${unidad}`}
                  className="intertitulo m-0 rounded-t-lg px-4 py-2 text-base"
                >
                  Unidad {ROMANOS[unidad] ?? unidad}
                </h3>
                <div className="flex overflow-hidden rounded-b-lg border-[length:var(--trazo-medio)] border-t-0 border-tinta bg-panel shadow-tinta-sm">
                  <span className="w-4 shrink-0 bg-tinta" style={PERFORACIONES} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    {[...caps.entries()].map(([cap, lista]) => (
                      <div key={cap} className="flex flex-col">
                        {cap && <h4 className="m-0 border-b border-dashed border-linea bg-panel-2 px-3 py-1 font-sans text-sm font-normal text-tenue italic">{cap}</h4>}
                        <ul className="m-0 flex list-none flex-col p-0">
                          {lista.map((m) => (
                            <li key={m.slug} className="border-b border-linea last:border-b-0">
                              <button
                                type="button"
                                aria-current={m.slug === seleccion ? 'true' : undefined}
                                onClick={() => setSeleccion(m.slug)}
                                className="group flex w-full cursor-pointer items-baseline gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-ambar-2/25 focus-visible:relative focus-visible:z-10 aria-[current=true]:bg-ambar-2 aria-[current=true]:font-bold"
                              >
                                <Play
                                  size={11}
                                  className="shrink-0 translate-y-px fill-tinta opacity-0 transition-opacity group-hover:opacity-60 group-aria-[current=true]:opacity-100"
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1">{m.nombre_libro}</span>
                                <span className="numero shrink-0 text-xs text-tenue group-aria-[current=true]:text-tinta">p. {m.pagina}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <span className="w-4 shrink-0 bg-tinta" style={PERFORACIONES} aria-hidden />
                </div>
              </section>
            ))}
          </div>
        </nav>
        <section className={`min-w-0 ${seleccion ? '' : 'max-md:hidden'}`} aria-live="polite">
          {actual ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn btn-fantasma md:hidden" onClick={() => setSeleccion(null)}>
                  <ArrowLeft size={16} aria-hidden /> Lista de métodos
                </button>
                <h3 key={actual.slug} className="m-0 animate-aparecer text-xl sm:text-h3">
                  {actual.nombre_libro}
                </h3>
              </div>
              <PanelMetodo slug={actual.slug} modo="profesor" matricula={matricula} nivel={actual.unidad} onEvidencia={onEvidencia} />
            </div>
          ) : (
            <div className="semitono flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border-[length:var(--trazo-fino)] border-dashed border-tinta/40 p-6 text-center">
              <span className="grid size-20 place-items-center rounded-full border-[length:var(--trazo-grueso)] border-tinta bg-papel shadow-tinta" aria-hidden>
                <Film size={34} className="animate-girar" />
              </span>
              <p className="m-0 max-w-sm rounded-md bg-panel px-3 py-1 text-tenue">Elige un método del carrete para proyectarlo aquí con tus propios datos.</p>
            </div>
          )}
        </section>
      </div>
    </Dialogo>
  );
}

/** Perforaciones de la tira de película (huecos de plata sobre la tinta). */
const PERFORACIONES = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent 0 0.4rem, var(--color-fondo) 0.4rem 0.9rem, transparent 0.9rem 1.25rem)',
  backgroundSize: '0.5rem 100%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
} as const;
