// Panel de un método: formulario generado, resolución en el backend y resultados
// (resultado, pasos KaTeX, matrices, tabla, gráfica, convergencia) + Modo Comprobación.
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, BookOpen, ClipboardCheck, Eraser, PlugZap, RefreshCw, Sigma } from 'lucide-react';
import { useCatalogo } from '../catalogo/contexto';
import { calcular, ErrorApi, mensajeDeError } from '../services/apiClient';
import type { EvidenciaDTO, MetodoInfoDTO, ResultadoNumericoDTO, SerieDTO } from '../types/numericos';
import {
  camposDesdeEsquema,
  construirPayload,
  valoresDesdeEjemplo,
  valoresIniciales,
  type ValorCampo,
  type ValoresFormulario,
} from '../utilidades/esquema';
import { fichaResultadoPNG } from '../utilidades/fichaCanvas';
import { FormularioMetodo } from './FormularioMetodo';
import { NombreResultado, ValorCelda } from './Latex';
import { MatrizVista } from './MatrizVista';
import { ModalComprobacion } from './ModalComprobacion';
import { PasosKatex } from './PasosKatex';
import { PlanoCartesiano, type PlanoHandle } from './PlanoCartesiano';
import { TablaResultado } from './TablaResultado';
import { ROMANOS } from '../juego/mapa';

interface Props {
  slug: string;
  /** consola: marca la consola al resolver. profesor: exploración libre. */
  modo: 'consola' | 'profesor';
  matricula: string;
  nivel: number;
  onResuelto?: (r: ResultadoNumericoDTO) => void;
  onEvidencia?: (e: EvidenciaDTO, matricula: string) => void;
}

/** Contenido del panel de método. El contenedor (diálogo o columna) lo pone quien lo usa. */
export function PanelMetodo(props: Props) {
  const { estado, porSlug, error, recargar } = useCatalogo();
  const metodo = porSlug.get(props.slug);

  if (!metodo) {
    if (estado === 'cargando') return <p className="text-tenue">Consultando el catálogo de métodos…</p>;
    if (estado === 'error')
      return (
        <EstadoVacio icono={<PlugZap aria-hidden />} titulo="Sin conexión con el servidor de cálculo" texto={error ?? ''}>
          <button type="button" className="btn" onClick={recargar}>
            <RefreshCw size={16} aria-hidden /> Reintentar
          </button>
        </EstadoVacio>
      );
    return (
      <EstadoVacio
        icono={<AlertTriangle aria-hidden />}
        titulo="Consola sin método disponible"
        texto={`El servidor todavía no tiene registrado el método «${props.slug}». Cuando esté disponible, esta consola se activará sola.`}
      >
        <button type="button" className="btn" onClick={recargar}>
          <RefreshCw size={16} aria-hidden /> Volver a consultar
        </button>
      </EstadoVacio>
    );
  }
  // key: reinicia el estado interno al cambiar de método.
  return <PanelConMetodo key={metodo.slug} metodo={metodo} {...props} />;
}

function EstadoVacio({ icono, titulo, texto, children }: { icono: React.ReactNode; titulo: string; texto: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p className="m-0 flex items-center gap-2 font-display text-xl text-ambar">
        {icono} {titulo}
      </p>
      <p className="m-0 max-w-prose text-tenue">{texto}</p>
      {children}
    </div>
  );
}

function PanelConMetodo({ metodo, modo, matricula, nivel, onResuelto, onEvidencia }: Props & { metodo: MetodoInfoDTO }) {
  const campos = useMemo(() => camposDesdeEsquema(metodo.esquema_entrada), [metodo]);
  const [valores, setValores] = useState<ValoresFormulario>(() => valoresIniciales(campos));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoNumericoDTO | null>(null);
  const [entrada, setEntrada] = useState<Record<string, unknown>>({});
  const [comprobando, setComprobando] = useState(false);
  const planoRef = useRef<PlanoHandle>(null);
  const convergenciaRef = useRef<PlanoHandle>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);
  const tieneEjemplo = Object.keys(metodo.ejemplo ?? {}).length > 0;

  const cambiar = useCallback((clave: string, v: ValorCampo) => {
    setValores((prev) => ({ ...prev, [clave]: v }));
    setErrores((prev) => {
      if (!prev[clave]) return prev;
      const { [clave]: _quitado, ...resto } = prev;
      void _quitado;
      return resto;
    });
  }, []);

  async function resolver(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    const { payload, errores: errs } = construirPayload(campos, valores);
    setErrores(errs);
    if (Object.keys(errs).length) {
      setErrorGeneral('Hay datos por corregir; revisa los campos marcados en rojo.');
      return;
    }
    setCargando(true);
    try {
      const r = await calcular(metodo.slug, payload);
      setResultado(r);
      setEntrada(payload);
      onResuelto?.(r);
      requestAnimationFrame(() => resultadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      if (err instanceof ErrorApi) setErrores(err.campos);
      setErrorGeneral(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  const seriesConvergencia = useMemo<SerieDTO[]>(
    () => ((resultado?.errores.length ?? 0) >= 2 && resultado ? [{ nombre: 'Error por iteración', tipo: 'linea', puntos: resultado.errores.map((e, i) => [i + 1, e]) }] : []),
    [resultado],
  );
  const seriesPlano = useMemo(() => resultado?.series ?? [], [resultado]);

  const obtenerCaptura = useCallback(async () => {
    if (seriesPlano.length && planoRef.current) return planoRef.current.exportarPNG();
    if (seriesConvergencia.length && convergenciaRef.current) return convergenciaRef.current.exportarPNG();
    return resultado ? fichaResultadoPNG(resultado) : null;
  }, [seriesPlano, seriesConvergencia, resultado]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={resolver} className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start" noValidate>
        <div className="flex flex-col gap-1">
          <p className="m-0 flex items-center gap-2 text-sm text-tenue">
            <BookOpen size={16} aria-hidden /> Unidad {ROMANOS[metodo.unidad] ?? metodo.unidad}
            {metodo.capitulo ? `, ${metodo.capitulo}` : ''}, página {metodo.pagina} del libro
          </p>
          {modo === 'profesor' && <p className="m-0 text-sm text-ambar">Modo profesor: este cálculo no marca consolas del juego.</p>}
        </div>
        {campos.length ? (
          <FormularioMetodo campos={campos} valores={valores} errores={errores} onCambio={cambiar} deshabilitado={cargando} />
        ) : (
          <p className="m-0 text-tenue">Este método no necesita datos de entrada.</p>
        )}
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-lg border border-hostil/60 bg-hostil/10 px-3 py-2 text-sm text-hostil">
            {errorGeneral}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primario" disabled={cargando}>
            <Sigma size={16} aria-hidden /> {cargando ? 'Resolviendo…' : 'Resolver'}
          </button>
          {tieneEjemplo && (
            <button type="button" className="btn" disabled={cargando} onClick={() => {
              setValores(valoresDesdeEjemplo(campos, metodo.ejemplo));
              setErrores({});
              setErrorGeneral(null);
            }}>
              <BookOpen size={16} aria-hidden /> Cargar ejemplo del libro
            </button>
          )}
          <button type="button" className="btn btn-fantasma" disabled={cargando} onClick={() => {
            setValores(valoresIniciales(campos));
            setErrores({});
            setErrorGeneral(null);
          }}>
            <Eraser size={16} aria-hidden /> Limpiar
          </button>
        </div>
      </form>

      <div ref={resultadosRef} className="flex min-w-0 scroll-mt-4 flex-col gap-6" aria-live="polite">
        {!resultado ? (
          <div className="rounded-xl border border-dashed border-linea p-6 text-tenue">
            {tieneEjemplo
              ? 'Escribe tus datos o carga el ejemplo del libro y pulsa «Resolver». Aquí aparecerán el procedimiento, la tabla y la gráfica.'
              : 'Escribe tus datos y pulsa «Resolver». Aquí aparecerán el procedimiento, la tabla y la gráfica.'}
          </div>
        ) : (
          <>
            <VistaResultado resultado={resultado} />
            <PasosKatex pasos={resultado.pasos} />
            {resultado.matrices.length > 0 && (
              <section className="flex flex-col gap-4" aria-label="Matrices">
                {resultado.matrices.map((m, i) => (
                  <MatrizVista key={i} matriz={m} primeraFilaEncabezado={metodo.slug === 'tablas-newton-cotes' ? true : undefined} />
                ))}
              </section>
            )}
            <TablaResultado columnas={resultado.columnas} filas={resultado.filas} />
            {seriesPlano.length > 0 && <PlanoCartesiano ref={planoRef} series={seriesPlano} titulo="Gráfica" />}
            {seriesConvergencia.length > 0 && (
              <PlanoCartesiano
                ref={convergenciaRef}
                series={seriesConvergencia}
                titulo="Convergencia del error"
                escalaY="log"
                etiquetaX="iteración"
                etiquetaY="error"
                alto={240}
              />
            )}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-linea bg-panel-2/60 p-4">
              <p className="m-0 flex-1 text-sm text-tenue">
                ¿Lo resolviste también a mano? Envía la foto de tu procedimiento para que tu docente lo compare con este resultado.
              </p>
              <button type="button" className="btn" onClick={() => setComprobando(true)}>
                <ClipboardCheck size={16} aria-hidden /> Modo Comprobación Docente
              </button>
            </div>
            {comprobando && (
              <ModalComprobacion
                resultado={resultado}
                entrada={entrada}
                matriculaInicial={matricula}
                nivelInicial={nivel}
                obtenerCaptura={obtenerCaptura}
                onCerrar={() => setComprobando(false)}
                onEnviada={onEvidencia}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VistaResultado({ resultado }: { resultado: ResultadoNumericoDTO }) {
  const entradas = Object.entries(resultado.resultado);
  return (
    <section className="flex flex-col gap-3" aria-label="Resultado">
      {resultado.advertencias.map((a, i) => (
        <p key={i} className="m-0 flex items-start gap-2 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-2 text-sm text-ambar">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> {a}
        </p>
      ))}
      {entradas.length > 0 && (
        <dl className="m-0 grid gap-2 sm:grid-cols-2">
          {entradas.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 rounded-lg border border-cian-2/60 bg-cian/5 px-4 py-3">
              <dt className="text-sm text-tenue">
                <NombreResultado clave={k} />
              </dt>
              <dd className="m-0 text-xl break-all text-cian">
                <ValorCelda valor={v} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
