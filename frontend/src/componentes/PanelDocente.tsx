// Panel Docente: evidencias con foto del procedimiento vs canvas vs tabla, lado a lado.
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Dialogo } from './Dialogo';
import { TablaDesdeFilas } from './TablaResultado';
import { listarEvidencias, mensajeDeError } from '../services/apiClient';
import type { EvidenciaDTO } from '../types/numericos';

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function fecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatoFecha.format(d);
}

export function PanelDocente({ onCerrar, matriculaInicial = '' }: { onCerrar: () => void; matriculaInicial?: string }) {
  const [filtro, setFiltro] = useState(matriculaInicial);
  const [aplicado, setAplicado] = useState(matriculaInicial);
  const [evidencias, setEvidencias] = useState<EvidenciaDTO[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarEvidencias(50, aplicado || undefined)
      .then((l) => {
        if (!vigente) return;
        setEvidencias(l);
        setEstado('listo');
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        setError(mensajeDeError(e));
        setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [aplicado, version]);

  const recargar = useCallback(() => {
    setEstado('cargando');
    setVersion((v) => v + 1);
  }, []);

  function filtrar(e: FormEvent) {
    e.preventDefault();
    setEstado('cargando');
    setAplicado(filtro.trim());
  }

  // Filtro también en cliente, por si el backend ignora el parámetro.
  const visibles = aplicado ? evidencias.filter((ev) => ev.matricula.includes(aplicado)) : evidencias;

  return (
    <Dialogo titulo="Panel Docente" subtitulo="Compara la foto del procedimiento con la gráfica y la tabla calculadas." onCerrar={onCerrar} completo>
      <div className="flex flex-col gap-5">
        <form onSubmit={filtrar} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Filtrar por matrícula
            <span className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-tenue" aria-hidden />
              <input className="campo numero w-56 pl-9" value={filtro} onChange={(e) => setFiltro(e.target.value)} inputMode="numeric" maxLength={20} />
            </span>
          </label>
          <button type="submit" className="btn btn-primario">
            Filtrar
          </button>
          {aplicado && (
            <button type="button" className="btn btn-fantasma" onClick={() => {
              setFiltro('');
              setEstado('cargando');
              setAplicado('');
            }}>
              Ver todas
            </button>
          )}
          <button type="button" className="btn ml-auto" onClick={recargar}>
            <RefreshCw size={16} aria-hidden /> Actualizar
          </button>
        </form>

        {estado === 'cargando' && <p className="m-0 text-tenue">Cargando evidencias…</p>}
        {estado === 'error' && (
          <p role="alert" className="m-0 rounded-lg border border-hostil/60 bg-hostil/10 px-3 py-2 text-sm text-hostil">
            {error}
          </p>
        )}
        {estado === 'listo' && !visibles.length && (
          <p className="m-0 rounded-xl border border-dashed border-linea p-6 text-tenue">
            {aplicado ? `No hay evidencias de la matrícula ${aplicado}.` : 'Todavía no hay evidencias. Aparecerán cuando un estudiante use el Modo Comprobación Docente.'}
          </p>
        )}
        {estado === 'listo' && (
          <ul className="m-0 flex list-none flex-col gap-5 p-0">
            {visibles.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-linea bg-panel-2/50">
                <header className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-linea px-4 py-3">
                  <h3 className="m-0 text-xl">{ev.metodo}</h3>
                  <span className="text-sm text-tenue">
                    Matrícula <span className="numero text-tinta">{ev.matricula}</span>
                  </span>
                  <span className="text-sm text-tenue">
                    Nivel <span className="numero text-tinta">{ev.nivel}</span>
                  </span>
                  <span className="text-sm text-tenue">{fecha(ev.fecha_registro)}</span>
                  <span className="numero ml-auto text-sm text-tenue">Folio {ev.id}</span>
                </header>
                <div className="flex flex-col gap-1 px-4 pt-3 text-sm">
                  <p className="m-0 break-words">
                    <span className="text-tenue">Datos: </span>
                    <span className="numero">{ev.funcion}</span>
                  </p>
                  <p className="m-0 break-words">
                    <span className="text-tenue">Resultado: </span>
                    <span className="numero text-cian">{ev.resultado_exacto}</span>
                  </p>
                  {ev.error !== null && (
                    <p className="m-0">
                      <span className="text-tenue">Error reportado: </span>
                      <span className="numero">{ev.error.toLocaleString('en-US', { maximumSignificantDigits: 15, useGrouping: false })}</span>
                    </p>
                  )}
                </div>
                <div className="grid gap-4 p-4 lg:grid-cols-3">
                  <Imagen titulo="Foto del procedimiento" url={ev.foto_procedimiento_url} />
                  <Imagen titulo="Gráfica calculada" url={ev.foto_canvas_url} />
                  <div className="min-w-0">
                    <TablaDesdeFilas filas={ev.iteraciones_json} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialogo>
  );
}

function Imagen({ titulo, url }: { titulo: string; url: string }) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2">
      <figcaption className="text-base font-semibold font-display">{titulo}</figcaption>
      <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-linea bg-fondo" title="Abrir en tamaño completo">
        <img src={url} alt={titulo} loading="lazy" className="max-h-80 w-full object-contain" />
      </a>
    </figure>
  );
}
