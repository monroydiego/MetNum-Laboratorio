// Panel Docente: evidencias del Modo Comprobación (foto vs gráfica vs tabla) e intentos de respuesta del juego
// (cada uno con la foto obligatoria del procedimiento y si la respuesta fue correcta).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Image as ImageIcon, LogOut, RefreshCw, Search, Trophy, Users, XCircle } from 'lucide-react';
import { formatearTiempo } from '../juego/estado';
import { Dialogo } from './Dialogo';
import { TablaDesdeFilas } from './TablaResultado';
import { ErrorApi, listarEvidencias, listarMatriculas, mensajeDeError } from '../services/apiClient';
import type { EvidenciaDTO, ResumenMatriculaDTO } from '../types/numericos';

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function fecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatoFecha.format(d);
}

interface Props {
  onCerrar: () => void;
  /** Cierra la sesión del docente (y el panel). */
  onSalir: () => void;
  /** El servidor respondió 401: la sesión caducó. */
  onSesionExpirada: () => void;
  correo: string;
  matriculaInicial?: string;
}

export function PanelDocente({ onCerrar, onSalir, onSesionExpirada, correo, matriculaInicial = '' }: Props) {
  const [matriculas, setMatriculas] = useState<ResumenMatriculaDTO[]>([]);
  const [filtro, setFiltro] = useState(matriculaInicial);
  const [aplicado, setAplicado] = useState(matriculaInicial);
  const [evidencias, setEvidencias] = useState<EvidenciaDTO[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarMatriculas()
      .then((m) => vigente && setMatriculas(m))
      .catch(() => undefined);
    listarEvidencias(50, aplicado || undefined)
      .then((l) => {
        if (!vigente) return;
        setEvidencias(l);
        setEstado('listo');
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        if (e instanceof ErrorApi && e.estado === 401) return onSesionExpirada();
        setError(mensajeDeError(e));
        setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [aplicado, version, onSesionExpirada]);

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
    <Dialogo titulo="Panel Docente" subtitulo={`Sesión de ${correo}. Revisa la foto del procedimiento de cada intento y compárala con la tabla calculada.`} onCerrar={onCerrar} completo>
      <div className="flex flex-col gap-5">
        <section className="tarjeta flex flex-col gap-3 p-4" aria-label="Matrículas con respuestas enviadas">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="m-0 flex items-center gap-2 text-lg">
              <Users size={18} aria-hidden /> Matrículas registradas
            </h3>
            <span className="chapa numero">{matriculas.length}</span>
            <button type="button" className="btn btn-fantasma ml-auto" onClick={onSalir}>
              <LogOut size={16} aria-hidden /> Cerrar sesión docente
            </button>
          </div>
          {matriculas.length === 0 ? (
            <p className="m-0 text-sm text-tenue">Aún ninguna matrícula ha enviado una respuesta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-[length:var(--trazo-fino)] border-tinta text-left font-display tracking-wide">
                    <th className="px-2 py-1.5">Matrícula</th>
                    <th className="px-2 py-1.5">Intentos</th>
                    <th className="px-2 py-1.5">Correctos</th>
                    <th className="px-2 py-1.5">Incorrectos</th>
                    <th className="px-2 py-1.5">Récord</th>
                    <th className="px-2 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {matriculas.map((m) => (
                    <tr key={m.matricula} className={`border-b border-dashed border-linea ${aplicado === m.matricula ? 'bg-ambar-2' : ''}`}>
                      <td className="numero px-2 py-1.5 font-bold">{m.matricula}</td>
                      <td className="numero px-2 py-1.5">{m.intentos}</td>
                      <td className="numero px-2 py-1.5">{m.correctos}</td>
                      <td className="numero px-2 py-1.5">{m.incorrectos}</td>
                      <td className="numero px-2 py-1.5">{m.record_ms === null ? <span className="text-tenue">Sin récord</span> : <span className="inline-flex items-center gap-1"><Trophy size={14} aria-hidden /> {formatearTiempo(m.record_ms)}</span>}</td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          aria-pressed={aplicado === m.matricula}
                          className="btn min-h-9 py-0.5 text-sm"
                          onClick={() => {
                            setFiltro(m.matricula);
                            setEstado('cargando');
                            setAplicado(m.matricula);
                          }}
                        >
                          Ver intentos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form onSubmit={filtrar} className="tarjeta flex flex-wrap items-end gap-3 p-4">
          <label className="flex min-w-0 flex-col gap-1.5 font-display text-sm max-sm:w-full">
            Filtrar por matrícula
            <span className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-tenue" aria-hidden />
              <input className="campo numero w-56 pl-9 font-normal max-sm:w-full" value={filtro} onChange={(e) => setFiltro(e.target.value)} inputMode="numeric" maxLength={20} />
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
          <button type="button" className="btn sm:ml-auto" onClick={recargar}>
            <RefreshCw size={16} aria-hidden /> Actualizar
          </button>
        </form>

        {estado === 'cargando' && (
          <p className="m-0 flex items-center gap-2 text-tenue">
            <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> Cargando evidencias…
          </p>
        )}
        {estado === 'error' && (
          <p role="alert" className="m-0 flex items-start gap-2 rounded-xl border-[length:var(--trazo-fino)] border-hostil bg-papel px-3 py-2 text-sm text-hostil">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {estado === 'listo' && !visibles.length && (
          <div className="semitono flex flex-col items-center gap-3 rounded-xl border-[length:var(--trazo-fino)] border-dashed border-tinta/40 p-8 text-center">
            <span className="grid size-16 place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-papel shadow-tinta-sm" aria-hidden>
              <ImageIcon size={28} />
            </span>
            <p className="m-0 max-w-md rounded-md bg-panel px-3 py-1 text-tenue">
              {aplicado ? `No hay evidencias de la matrícula ${aplicado}.` : 'Todavía no hay evidencias. Aparecerán cuando un estudiante verifique una respuesta (con la foto de su procedimiento).'}
            </p>
          </div>
        )}
        {estado === 'listo' && (
          <ul className="m-0 flex list-none flex-col gap-6 p-0">
            {visibles.map((ev, k) => (
              <li key={ev.id} className={`tarjeta overflow-hidden ${ev.correcta === false ? 'border-hostil' : ''}`}>
                <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[length:var(--trazo-fino)] border-tinta bg-panel-2 px-4 py-3">
                  <h3 className="m-0 min-w-0 text-xl break-words">{ev.metodo}</h3>
                  {ev.correcta !== null && <Veredicto correcta={ev.correcta} />}
                  <span className="numero chapa ml-auto py-1 text-tinta">Folio {ev.id}</span>
                </header>
                <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 px-4 pt-3 text-sm">
                  <dt className="text-tenue">Matrícula</dt>
                  <dd className="numero m-0 font-bold">{ev.matricula}</dd>
                  <dt className="text-tenue">Nivel</dt>
                  <dd className="numero m-0">{ev.nivel}</dd>
                  <dt className="text-tenue">Fecha</dt>
                  <dd className="m-0">{fecha(ev.fecha_registro)}</dd>
                  <dt className="text-tenue">Datos</dt>
                  <dd className="numero m-0 break-words">{ev.funcion}</dd>
                  <dt className="text-tenue">{ev.correcta !== null ? 'Respuesta del alumno' : 'Resultado'}</dt>
                  <dd className="numero m-0 font-bold break-words">{ev.resultado_exacto}</dd>
                  {ev.error !== null && (
                    <>
                      <dt className="text-tenue">Error reportado</dt>
                      <dd className="numero m-0">{ev.error.toLocaleString('en-US', { maximumSignificantDigits: 15, useGrouping: false })}</dd>
                    </>
                  )}
                </dl>
                <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-3">
                  <Imagen titulo="Foto del procedimiento" url={ev.foto_procedimiento_url} giro={k % 2 ? 'rotate-1' : '-rotate-1'} />
                  {ev.foto_canvas_url && <Imagen titulo="Gráfica calculada" url={ev.foto_canvas_url} giro={k % 2 ? '-rotate-1' : 'rotate-1'} />}
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

/** Estado del intento: icono + color + texto (nunca solo color). Rojo SOLO para la incorrecta. */
function Veredicto({ correcta }: { correcta: boolean }) {
  return correcta ? (
    <span className="chapa border-menta bg-menta-2 py-1 font-sans text-sm font-bold tracking-normal text-menta">
      <CheckCircle2 size={15} aria-hidden /> Respuesta correcta
    </span>
  ) : (
    <span className="chapa border-hostil bg-papel py-1 font-sans text-sm font-bold tracking-normal text-hostil">
      <XCircle size={15} aria-hidden /> Respuesta incorrecta
    </span>
  );
}

/** Evidencia como fotografía impresa: margen blanco, contorno de tinta, sombra dura y esquinas de álbum. */
function Imagen({ titulo, url, giro }: { titulo: string; url: string; giro: string }) {
  return (
    <figure className="m-0 flex min-w-0 flex-col items-center gap-3">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`group relative block w-full ${giro} border-[length:var(--trazo-medio)] border-tinta bg-papel p-2.5 pb-3 shadow-tinta transition-transform duration-200 ease-elastico hover:rotate-0 hover:scale-[1.02] focus-visible:rotate-0`}
        title="Abrir en tamaño completo"
      >
        <span className="pointer-events-none absolute -top-1 -left-1 z-10 size-5 bg-tinta [clip-path:polygon(0_0,100%_0,0_100%)]" aria-hidden />
        <span className="pointer-events-none absolute -right-1 -bottom-1 z-10 size-5 bg-tinta [clip-path:polygon(100%_0,100%_100%,0_100%)]" aria-hidden />
        <span className="block border-[length:var(--trazo-fino)] border-tinta bg-panel-2">
          <img src={url} alt={titulo} loading="lazy" className="max-h-80 w-full object-contain" />
        </span>
        <span className="mt-2 flex items-center justify-center gap-1.5 text-sm text-tenue">
          <ExternalLink size={13} aria-hidden /> Abrir en tamaño completo
        </span>
      </a>
      <figcaption className="font-display text-base">{titulo}</figcaption>
    </figure>
  );
}
