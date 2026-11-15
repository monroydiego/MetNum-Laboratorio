// Panel de un método: formulario generado, resolución en el backend y resultados
// (resultado, pasos KaTeX, matrices, tabla, gráfica, convergencia) + Modo Comprobación.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, BookOpen, Dices, Eraser, PlugZap, RefreshCw, Sigma } from 'lucide-react';
import { useCatalogo } from '../catalogo/contexto';
import { calcular, ErrorApi, mensajeDeError, obtenerProblema } from '../services/apiClient';
import type { EvidenciaDTO, MetodoInfoDTO, ResultadoNumericoDTO } from '../types/numericos';
import type { ProblemaAsignado } from '../juego/estado';
import {
  camposDesdeEsquema,
  construirPayload,
  valoresDesdeEjemplo,
  valoresIniciales,
  type ValorCampo,
  type ValoresFormulario,
} from '../utilidades/esquema';
import { FormularioMetodo } from './FormularioMetodo';
import { PanelProblema } from './PanelProblema';
import { Resolucion } from './Resolucion';
import { ROMANOS } from '../juego/mapa';

interface Props {
  slug: string;
  /**
   * consola: problema del juego (el jugador lo resuelve a mano y escribe su respuesta).
   * profesor: exploración libre con datos propios o problemas aleatorios.
   * consulta: tabla de referencia sin problema.
   */
  modo: 'consola' | 'profesor' | 'consulta';
  matricula: string;
  nivel: number;
  onResuelto?: (r: ResultadoNumericoDTO) => void;
  onEvidencia?: (e: EvidenciaDTO, matricula: string) => void;
  /** Solo modo consola: problema vigente guardado en la partida, si ya se había planteado. */
  problema?: ProblemaAsignado;
  /** Solo modo consola: la consola ya se resolvió antes (se muestra su resolución). */
  yaResuelto?: boolean;
  /** Solo modo consola: se asignó un problema nuevo (para conservarlo en la partida). */
  onProblema?: (p: ProblemaAsignado) => void;
  /** Solo modo consola: respuesta incorrecta (resta vida al personaje). */
  onIncorrecta?: () => void;
  /** Solo modo consola: vida actual del traje (se muestra junto a la respuesta). */
  vida?: number;
  /** Solo modo consola: vidas restantes del personaje. */
  vidas?: number;
  /** Solo modo consola: matrícula escrita en el panel (para guardarla en la partida). */
  onMatricula?: (m: string) => void;
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
  if (props.modo === 'consola') return <PanelProblema key={metodo.slug} metodo={metodo} {...props} />;
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
  const autoProblema = modo !== 'consulta';
  const [generando, setGenerando] = useState(autoProblema);
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

  /** Pide un problema aleatorio (distinto cada vez) y lo carga en el formulario. */
  const nuevoProblema = useCallback(
    async (vigente: () => boolean = () => true) => {
      setGenerando(true);
      setErrorGeneral(null);
      try {
        const { entrada: problema } = await obtenerProblema(metodo.slug);
        if (!vigente()) return;
        setValores(valoresDesdeEjemplo(campos, problema));
        setErrores({});
        setResultado(null); // el resultado anterior pertenece al problema anterior
      } catch (err) {
        if (vigente()) setErrorGeneral(`No se pudo generar un problema: ${mensajeDeError(err)}`);
      } finally {
        if (vigente()) setGenerando(false);
      }
    },
    [campos, metodo.slug],
  );

  // Al entrar a un método se plantea un problema distinto.
  useEffect(() => {
    if (!autoProblema) return;
    let activo = true;
    void nuevoProblema(() => activo);
    return () => {
      activo = false;
    };
  }, [nuevoProblema, autoProblema]);

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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form onSubmit={resolver} className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start" noValidate>
        <div className="flex flex-col gap-1">
          <p className="m-0 flex items-center gap-2 text-sm text-tenue">
            <BookOpen size={16} aria-hidden /> Unidad {ROMANOS[metodo.unidad] ?? metodo.unidad}
            {metodo.capitulo ? `, ${metodo.capitulo}` : ''}, página {metodo.pagina} del libro
          </p>
          {modo === 'profesor' && <p className="m-0 text-sm text-ambar">Modo profesor: este cálculo no marca consolas del juego.</p>}
          {modo === 'consulta' && <p className="m-0 text-sm text-ambar">Panel de consulta: tabla de referencia, no es un problema.</p>}
        </div>
        {campos.length ? (
          <FormularioMetodo campos={campos} valores={valores} errores={errores} onCambio={cambiar} deshabilitado={cargando || generando} />
        ) : (
          <p className="m-0 text-tenue">Este método no necesita datos de entrada.</p>
        )}
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-lg border border-hostil/60 bg-hostil/10 px-3 py-2 text-sm text-hostil">
            {errorGeneral}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primario" disabled={cargando || generando}>
            <Sigma size={16} aria-hidden /> {cargando ? 'Resolviendo…' : 'Resolver'}
          </button>
          {autoProblema && (
            <button type="button" className="btn" disabled={cargando || generando} onClick={() => void nuevoProblema()}>
              <Dices size={16} aria-hidden /> {generando ? 'Generando…' : 'Problema nuevo'}
            </button>
          )}
          {tieneEjemplo && (
            <button type="button" className="btn" disabled={cargando || generando} onClick={() => {
              setValores(valoresDesdeEjemplo(campos, metodo.ejemplo));
              setResultado(null);
              setErrores({});
              setErrorGeneral(null);
            }}>
              <BookOpen size={16} aria-hidden /> Cargar ejemplo del libro
            </button>
          )}
          <button type="button" className="btn btn-fantasma" disabled={cargando || generando} onClick={() => {
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
              ? 'Resuelve el problema planteado (o pide uno nuevo, o carga el ejemplo del libro) y pulsa «Resolver». Aquí aparecerán el procedimiento, la tabla y la gráfica.'
              : 'Resuelve el problema planteado (o pide uno nuevo) y pulsa «Resolver». Aquí aparecerán el procedimiento, la tabla y la gráfica.'}
          </div>
        ) : (
          <>
            <Resolucion slug={metodo.slug} resultado={resultado} entrada={entrada} matricula={matricula} nivel={nivel} onEvidencia={onEvidencia} />
          </>
        )}
      </div>
    </div>
  );
}
