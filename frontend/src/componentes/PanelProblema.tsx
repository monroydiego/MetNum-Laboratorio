// Consola del juego: el programa plantea un problema, el jugador lo resuelve A MANO y escribe su resultado.
// Para verificar es OBLIGATORIO subir la foto del procedimiento (queda guardada para el docente).
// Solo si la respuesta coincide (parte entera y 3 decimales) se muestra la resolución completa y la consola
// queda resuelta; cada respuesta incorrecta le quita 5 de vida al personaje.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { BookOpen, Camera, CheckCircle2, HeartCrack, ImagePlus, PencilLine, ShieldCheck, XCircle } from 'lucide-react';
import { calcular, mensajeDeError, obtenerProblema, revisarProblema, verificarRespuesta } from '../services/apiClient';
import type { EvidenciaDTO, MetodoInfoDTO, ResultadoNumericoDTO } from '../types/numericos';
import { camposDesdeEsquema, valoresDesdeEjemplo, valoresIniciales, type ValoresFormulario } from '../utilidades/esquema';
import { ROMANOS } from '../juego/mapa';
import { VIDA_POR_RESPUESTA_INCORRECTA, type ProblemaAsignado } from '../juego/estado';
import { FormularioMetodo } from './FormularioMetodo';
import { NombreResultado } from './Latex';
import { Resolucion } from './Resolucion';

interface Props {
  metodo: MetodoInfoDTO;
  matricula: string;
  nivel: number;
  problema?: ProblemaAsignado;
  yaResuelto?: boolean;
  onProblema?: (p: ProblemaAsignado) => void;
  onResuelto?: (r: ResultadoNumericoDTO) => void;
  onIncorrecta?: () => void;
  onEvidencia?: (e: EvidenciaDTO, matricula: string) => void;
  /** Se escribió la matrícula en este panel (para guardarla en la partida). */
  onMatricula?: (m: string) => void;
  vida?: number;
  vidas?: number;
}

const NUMERO = /^[+\-−]?(\d+([.,]\d*)?|[.,]\d+)(\/\d+([.,]\d+)?)?$/;
const TIPOS_FOTO = ['image/png', 'image/jpeg', 'image/webp'];
const TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024;
const SIN_EFECTO = () => undefined;

export function PanelProblema(props: Props) {
  const { metodo, nivel, yaResuelto, onResuelto, onIncorrecta, onEvidencia, onMatricula, vida, vidas } = props;
  const id = useId();
  const campos = useMemo(() => camposDesdeEsquema(metodo.esquema_entrada), [metodo]);
  const [actual, setActual] = useState<ProblemaAsignado | null>(null);
  const [valores, setValores] = useState<ValoresFormulario>(() => valoresIniciales(campos));
  const [respuesta, setRespuesta] = useState<Record<string, string>>({});
  const [veredicto, setVeredicto] = useState<Record<string, boolean> | null>(null);
  const [resultado, setResultado] = useState<ResultadoNumericoDTO | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallos, setFallos] = useState(0);
  const [folio, setFolio] = useState<number | null>(null);
  const [sinDatos, setSinDatos] = useState(false);
  const [matricula, setMatricula] = useState(props.matricula);
  const [foto, setFoto] = useState<File | null>(null);
  const [urlFoto, setUrlFoto] = useState<string | null>(null);

  // Lo que se lee solo al montar (el problema vigente) y los callbacks, sin reiniciar el efecto.
  const inicial = useRef({ problema: props.problema, yaResuelto });
  const reportar = useRef(props.onProblema ?? SIN_EFECTO);
  useEffect(() => {
    reportar.current = props.onProblema ?? SIN_EFECTO;
  });
  const resolucionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const guardado = inicial.current.problema ?? null;
        if (inicial.current.yaResuelto) {
          // Consola ya resuelta: se muestra su resolución (si la partida guardó el problema).
          if (!guardado) {
            if (activo) setSinDatos(true);
            return;
          }
          setActual(guardado);
          setValores(valoresDesdeEjemplo(campos, guardado.entrada));
          const r = await calcular(metodo.slug, guardado.entrada);
          if (activo) setResultado(r);
          return;
        }
        // Antes de mostrarlo, el servidor revisa que el problema cumpla las restricciones del método;
        // si no las cumple (o no hay problema todavía) se plantean datos nuevos que sí las cumplen.
        let p: ProblemaAsignado;
        if (guardado) {
          const r = await revisarProblema(metodo.slug, guardado.entrada);
          p = { entrada: r.entrada, campos: r.campos_respuesta };
          if (r.reemplazado || r.campos_respuesta.join('|') !== guardado.campos.join('|')) reportar.current(p);
        } else {
          const d = await obtenerProblema(metodo.slug);
          p = { entrada: d.entrada, campos: d.campos_respuesta };
          reportar.current(p); // se conserva en la partida: cerrar la consola no cambia el problema
        }
        if (!activo) return;
        setActual(p);
        setValores(valoresDesdeEjemplo(campos, p.entrada));
      } catch (err) {
        if (activo) setError(`No se pudo plantear el problema: ${mensajeDeError(err)}`);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [metodo.slug, campos]);

  // Vista previa de la foto: se libera al cambiarla o al cerrar.
  useEffect(
    () => () => {
      if (urlFoto) URL.revokeObjectURL(urlFoto);
    },
    [urlFoto],
  );

  const resuelto = resultado !== null;

  function elegirFoto(archivo: File | null) {
    if (archivo && !TIPOS_FOTO.includes(archivo.type)) {
      setError('La foto debe ser PNG, JPG o WebP.');
      return;
    }
    if (archivo && archivo.size > TAMANO_MAXIMO_FOTO) {
      setError('La foto supera 8 MB. Tómala con menor resolución.');
      return;
    }
    setError(null);
    setFoto(archivo);
    setUrlFoto(archivo ? URL.createObjectURL(archivo) : null);
  }

  async function verificar(e: FormEvent) {
    e.preventDefault();
    if (!actual || resuelto) return;
    const vacios = actual.campos.filter((c) => !(respuesta[c] ?? '').trim());
    const invalidos = actual.campos.filter((c) => (respuesta[c] ?? '').trim() && !NUMERO.test((respuesta[c] ?? '').trim()));
    // Datos incompletos o mal escritos: se corrigen sin penalización (aún no es una respuesta).
    if (vacios.length || invalidos.length) {
      setVeredicto(Object.fromEntries([...vacios, ...invalidos].map((c) => [c, false])));
      setError(vacios.length ? 'Escribe todos los resultados que pide el problema.' : 'Escribe cada resultado como número (por ejemplo 2.345 o -0.5).');
      return;
    }
    if (!matricula.trim()) {
      setError('Escribe tu matrícula: tu foto queda registrada a tu nombre para el docente.');
      return;
    }
    if (!foto) {
      setError('Sube la foto de tu procedimiento hecho a mano: es obligatoria para verificar tu respuesta.');
      return;
    }
    setError(null);
    setVerificando(true);
    try {
      const v = await verificarRespuesta({ slug: metodo.slug, entrada: actual.entrada, respuesta, matricula: matricula.trim(), nivel, foto });
      if (matricula.trim() !== props.matricula) onMatricula?.(matricula.trim());
      setVeredicto(v.campos);
      setFolio(v.folio);
      if (v.correcta && v.resultado) {
        setResultado(v.resultado);
        onResuelto?.(v.resultado);
        requestAnimationFrame(() => resolucionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else {
        setFallos((n) => n + 1);
        onIncorrecta?.();
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado: referencia del libro y estado del personaje. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-tenue">
        <p className="m-0 flex items-center gap-2">
          <BookOpen size={16} aria-hidden /> Unidad {ROMANOS[metodo.unidad] ?? metodo.unidad}
          {metodo.capitulo ? `, ${metodo.capitulo}` : ''}, página {metodo.pagina} del libro
        </p>
        {vida !== undefined && (
          <p className="m-0 flex items-center gap-1.5 sm:ml-auto">
            Vida <span className="numero font-semibold text-tinta">{Math.ceil(vida)}%</span>
            {vidas !== undefined && (
              <>
                · Vidas <span className="numero font-semibold text-tinta">{vidas}</span>
              </>
            )}
            <span>· cada error resta {VIDA_POR_RESPUESTA_INCORRECTA}</span>
          </p>
        )}
      </div>

      {cargando && <p className="m-0 text-tenue">Planteando el problema…</p>}
      {sinDatos && <p className="m-0 text-menta">Esta consola ya estaba resuelta en tu partida guardada.</p>}

      {actual && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          {/* 1. Problema (solo lectura) */}
          <section className="tarjeta flex min-w-0 flex-col gap-3 p-5" aria-labelledby={`${id}-problema`}>
            <h3 id={`${id}-problema`} className="m-0 flex items-center gap-2 text-xl">
              <Paso n={1} /> Problema
            </h3>
            <p className="m-0 text-sm text-tenue">Resuélvelo a mano con el método del libro, en tu cuaderno.</p>
            <FormularioMetodo campos={campos} valores={valores} errores={{}} onCambio={SIN_EFECTO} deshabilitado />
          </section>

          {/* 2–4. Respuesta, foto y verificación */}
          <form onSubmit={verificar} className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0 lg:self-start" noValidate>
            <fieldset className="tarjeta m-0 flex min-w-0 flex-col gap-3 p-5">
              <legend className="sr-only">Tu respuesta</legend>
              <h3 className="m-0 flex items-center gap-2 text-xl" aria-hidden>
                <Paso n={2} /> Tu respuesta
              </h3>
              {!resuelto && <p className="m-0 text-sm text-tenue">Debe coincidir desde la parte entera hasta el 3.er decimal.</p>}
              {actual.campos.map((c) => {
                const ok = veredicto?.[c];
                return (
                  <label key={c} className="flex flex-col gap-1 text-sm">
                    <span className="flex items-center gap-2 font-semibold">
                      <NombreResultado clave={c} />
                      {resuelto || ok === true ? (
                        <CheckCircle2 size={14} className="text-menta" aria-label="Correcto" />
                      ) : ok === false ? (
                        <XCircle size={14} className="text-hostil" aria-label="Incorrecto" />
                      ) : null}
                    </span>
                    <input
                      className="campo numero"
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      value={respuesta[c] ?? ''}
                      disabled={resuelto || verificando}
                      aria-invalid={ok === false ? true : undefined}
                      onChange={(e) => {
                        setRespuesta((prev) => ({ ...prev, [c]: e.target.value }));
                        setVeredicto((prev) => (prev && c in prev ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== c)) : prev));
                      }}
                    />
                  </label>
                );
              })}
            </fieldset>

            {!resuelto && (
              <fieldset className="tarjeta m-0 flex min-w-0 flex-col gap-3 p-5">
                <legend className="sr-only">Foto de tu procedimiento</legend>
                <h3 className="m-0 flex items-center gap-2 text-xl" aria-hidden>
                  <Paso n={3} /> Foto de tu procedimiento
                </h3>
                <p className="m-0 text-sm text-tenue">Obligatoria: tu docente la revisará en el Panel Docente. PNG, JPG o WebP de hasta 8 MB.</p>
                <label
                  htmlFor={`${id}-foto`}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-3 text-center text-sm transition-colors ${
                    foto ? 'border-primario-2 bg-panel-2' : 'border-linea hover:border-primario-2'
                  }`}
                >
                  {urlFoto ? (
                    <img src={urlFoto} alt="Vista previa de tu procedimiento" className="max-h-44 w-full rounded-lg object-contain" />
                  ) : (
                    <>
                      <ImagePlus size={28} className="text-primario" aria-hidden />
                      <span className="font-semibold text-tinta">Elegir o tomar foto</span>
                    </>
                  )}
                  {foto && (
                    <span className="flex items-center gap-1 text-tenue">
                      <Camera size={14} aria-hidden /> {foto.name} · cambiar
                    </span>
                  )}
                </label>
                <input
                  id={`${id}-foto`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={verificando}
                  onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
                />
                {!props.matricula && (
                  <label className="flex flex-col gap-1 text-sm font-semibold">
                    Matrícula
                    <input className="campo numero" value={matricula} maxLength={20} inputMode="numeric" autoComplete="off" onChange={(e) => setMatricula(e.target.value)} />
                  </label>
                )}
              </fieldset>
            )}

            {error && actual && (
              <p role="alert" className="m-0 rounded-xl border border-hostil/40 bg-hostil/8 px-3 py-2 text-sm text-hostil">
                {error}
              </p>
            )}
            {fallos > 0 && !resuelto && (
              <p role="alert" className="m-0 flex items-start gap-2 rounded-xl border border-hostil/40 bg-hostil/8 px-3 py-2 text-sm text-hostil">
                <HeartCrack size={16} className="mt-0.5 shrink-0" aria-hidden />
                Respuesta incorrecta: perdiste {VIDA_POR_RESPUESTA_INCORRECTA} de vida
                {fallos > 1 ? ` (${fallos} intentos fallidos)` : ''}. Revisa tu procedimiento e inténtalo de nuevo.
              </p>
            )}
            {resuelto ? (
              <p className="m-0 flex items-start gap-2 rounded-xl border border-menta/40 bg-menta/8 px-3 py-2 text-sm text-menta">
                <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
                ¡Respuesta correcta! Consola resuelta{folio ? ` (folio ${folio} en el Panel Docente)` : ''}. La resolución completa está abajo.
              </p>
            ) : (
              <button type="submit" className="btn btn-primario w-full py-3 text-base" disabled={verificando || cargando}>
                <CheckCircle2 size={18} aria-hidden /> {verificando ? 'Verificando…' : 'Verificar respuesta'}
              </button>
            )}
          </form>
        </div>
      )}

      {error && !actual && (
        <p role="alert" className="m-0 rounded-xl border border-hostil/40 bg-hostil/8 px-3 py-2 text-sm text-hostil">
          {error}
        </p>
      )}

      <div ref={resolucionRef} className="flex min-w-0 scroll-mt-4 flex-col gap-6" aria-live="polite">
        {resultado && actual ? (
          <>
            <h3 className="m-0 flex items-center gap-2 text-xl">
              <PencilLine size={18} className="text-primario" aria-hidden /> Resolución completa
            </h3>
            <Resolucion slug={metodo.slug} resultado={resultado} entrada={actual.entrada} matricula={matricula} nivel={nivel} onEvidencia={onEvidencia} />
          </>
        ) : (
          actual && (
            <p className="m-0 rounded-xl border border-dashed border-linea p-5 text-sm text-tenue">
              La resolución completa (procedimiento, tabla y gráfica) aparecerá aquí cuando tu respuesta sea correcta.
            </p>
          )
        )}
      </div>
    </div>
  );
}

function Paso({ n }: { n: number }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primario text-sm font-bold text-white" aria-hidden>
      {n}
    </span>
  );
}
