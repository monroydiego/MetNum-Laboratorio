// Modo profesor: cualquier método del catálogo, agrupado por unidad y capítulo, con datos libres.
import { useMemo, useState } from 'react';
import { ArrowLeft, PlugZap, RefreshCw, Search } from 'lucide-react';
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
      <div className="grid h-full gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
        <nav aria-label="Catálogo de métodos" className={`flex min-h-0 flex-col gap-3 ${seleccion ? 'max-md:hidden' : ''}`}>
          <label className="relative block">
            <span className="sr-only">Buscar método</span>
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-tenue" aria-hidden />
            <input className="campo pl-9" placeholder="Buscar método" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </label>
          {estado === 'cargando' && <p className="m-0 text-tenue">Cargando catálogo…</p>}
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
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {grupos.map(([unidad, caps]) => (
              <section key={unidad} className="flex flex-col gap-2">
                <h3 className="m-0 text-base text-primario">Unidad {ROMANOS[unidad] ?? unidad}</h3>
                {[...caps.entries()].map(([cap, lista]) => (
                  <div key={cap} className="flex flex-col gap-1">
                    {cap && <h4 className="m-0 text-sm font-normal text-tenue">{cap}</h4>}
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {lista.map((m) => (
                        <li key={m.slug}>
                          <button
                            type="button"
                            aria-current={m.slug === seleccion ? 'true' : undefined}
                            onClick={() => setSeleccion(m.slug)}
                            className="w-full cursor-pointer rounded-md border border-transparent px-2.5 py-1.5 text-left text-sm hover:border-linea aria-[current=true]:border-ambar/60 aria-[current=true]:bg-ambar/10 aria-[current=true]:text-ambar"
                          >
                            {m.nombre_libro}
                            <span className="numero ml-1.5 text-tenue">p. {m.pagina}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
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
                <h3 className="m-0 text-h3">{actual.nombre_libro}</h3>
              </div>
              <PanelMetodo slug={actual.slug} modo="profesor" matricula={matricula} nivel={actual.unidad} onEvidencia={onEvidencia} />
            </div>
          ) : (
            <p className="m-0 rounded-xl border border-dashed border-linea p-6 text-tenue">Selecciona un método del catálogo para empezar.</p>
          )}
        </section>
      </div>
    </Dialogo>
  );
}
