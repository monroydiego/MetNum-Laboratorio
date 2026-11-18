// Consola del juego: el programa plantea un problema, el jugador lo resuelve A MANO y escribe su resultado.
// Para verificar es OBLIGATORIO subir la foto del procedimiento (queda guardada para el docente).
// Solo si la respuesta coincide (parte entera y 3 decimales) se muestra la resolución completa y la consola
// queda resuelta; cada respuesta incorrecta le quita 5 de vida al personaje.
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, BookOpen, Camera, Check, CheckCircle2, Heart, HeartCrack, ImagePlus, PencilLine, Star, XCircle } from 'lucide-react';
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
  // Solo presentación: resalta el marco de la foto mientras se arrastra un archivo encima.
  const [arrastrando, setArrastrando] = useState(false);

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

  // Paso que pide atención ahora (solo presentación): respuesta → foto → verificar.
  const respondido = actual ? actual.campos.every((c) => (respuesta[c] ?? '').trim()) : false;
  const pasoActual = resuelto ? 0 : !respondido ? 2 : !foto ? 3 : 4;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado: referencia del libro y estado del personaje. */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-tenue">
        <p className="chapa m-0 rounded-xl py-1 font-sans text-sm tracking-normal text-tinta">
          <BookOpen size={15} aria-hidden /> Unidad {ROMANOS[metodo.unidad] ?? metodo.unidad}
          {metodo.capitulo ? `, ${metodo.capitulo}` : ''}, página {metodo.pagina} del libro
        </p>
        {vida !== undefined && (
          <p className="m-0 flex flex-wrap items-center gap-2 sm:ml-auto">
            <span className="chapa py-1 font-sans text-sm tracking-normal text-tinta">
              <Heart size={15} className="fill-tinta" aria-hidden /> Vida <span className="numero font-bold">{Math.ceil(vida)}%</span>
            </span>
            {vidas !== undefined && (
              <span className="chapa py-1 font-sans text-sm tracking-normal text-tinta">
                Vidas <span className="numero font-bold">{vidas}</span>
              </span>
            )}
            <span>Cada error resta {VIDA_POR_RESPUESTA_INCORRECTA}.</span>
          </p>
        )}
      </div>

      {cargando && (
        <p className="m-0 flex items-center gap-2 text-tenue">
          <PencilLine size={18} className="animate-tambaleo" aria-hidden /> Planteando el problema…
        </p>
      )}
      {sinDatos && (
        <p className="m-0 flex items-center gap-2 rounded-xl border-[length:var(--trazo-fino)] border-menta bg-menta-2 px-3 py-2 text-menta">
          <CheckCircle2 size={18} aria-hidden /> Esta consola ya estaba resuelta en tu partida guardada.
        </p>
      )}

      {actual && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          {/* 1. Problema (solo lectura): cartela de cine mudo + datos en un fotograma. */}
          <section className="tarjeta flex min-w-0 flex-col self-start overflow-hidden max-lg:w-full" aria-labelledby={`${id}-problema`}>
            <header className="intertitulo m-2 rounded-lg px-5 py-4 text-center">
              <h3 id={`${id}-problema`} className="m-0 flex items-center justify-center gap-3 text-xl sm:text-h3">
                <Paso n={1} hecho={resuelto} invertido /> El problema
              </h3>
              <p className="m-0 mt-1 text-sm">Resuélvelo a mano con el método del libro, en tu cuaderno.</p>
            </header>
            <div className="p-4 pt-2 sm:p-5 sm:pt-3 [&_.campo:disabled]:cursor-default [&_.campo:disabled]:border-[length:var(--trazo-fino)] [&_.campo:disabled]:bg-panel-2 [&_.campo:disabled]:shadow-none [&_.editor-control]:hidden">
              <FormularioMetodo campos={campos} valores={valores} errores={{}} onCambio={SIN_EFECTO} deshabilitado />
            </div>
          </section>

          {/* 2–4. Respuesta, foto y verificación */}
          <form onSubmit={verificar} className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0 lg:self-start" noValidate>
            <fieldset
              className={`tarjeta m-0 flex min-w-0 flex-col gap-3 p-4 transition-shadow sm:p-5 ${pasoActual === 2 ? 'shadow-oro' : ''} ${resuelto ? 'animate-colorear border-menta bg-menta-2' : ''}`}
            >
              <legend className="sr-only">Tu respuesta</legend>
              <h3 className="m-0 flex items-center gap-2 text-xl" aria-hidden>
                <Paso n={2} activo={pasoActual === 2} hecho={respondido || resuelto} /> Tu respuesta
              </h3>
              {!resuelto && <p className="m-0 text-sm text-tenue">Debe coincidir desde la parte entera hasta el 3.er decimal.</p>}
              {actual.campos.map((c) => {
                const ok = resuelto || veredicto?.[c] === true ? true : veredicto?.[c] === false ? false : undefined;
                return (
                  <label key={c} className="flex flex-col gap-1.5 text-sm">
                    <span className="flex items-center gap-2 font-display text-base">
                      <NombreResultado clave={c} />
                      {ok === true ? (
                        <span className="chapa border-menta bg-menta-2 font-sans text-sm tracking-normal text-menta">
                          <CheckCircle2 size={14} aria-hidden /> Correcto
                        </span>
                      ) : ok === false ? (
                        <span className="chapa border-hostil font-sans text-sm tracking-normal text-hostil">
                          <XCircle size={14} aria-hidden /> Incorrecto
                        </span>
                      ) : null}
                    </span>
                    <input
                      className={`campo numero min-h-14 text-xl ${ok === true ? 'border-menta bg-menta-2 text-menta disabled:opacity-100' : ''}`}
                      inputMode="decimal"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="0.000"
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
              <fieldset className={`tarjeta m-0 flex min-w-0 flex-col gap-3 p-4 transition-shadow sm:p-5 ${pasoActual === 3 ? 'shadow-oro' : ''}`}>
                <legend className="sr-only">Foto de tu procedimiento</legend>
                <h3 className="m-0 flex items-center gap-2 text-xl" aria-hidden>
                  <Paso n={3} activo={pasoActual === 3} hecho={Boolean(foto)} /> Foto de tu procedimiento
                </h3>
                <p className="m-0 text-sm text-tenue">Obligatoria: tu docente la revisará en el Panel Docente. PNG, JPG o WebP de hasta 8 MB.</p>
                <input
                  id={`${id}-foto`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="peer sr-only"
                  disabled={verificando}
                  onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
                />
                {/* Marco de foto antigua: esquinas de álbum, borde punteado dorado al arrastrar. */}
                <label
                  htmlFor={`${id}-foto`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!verificando && !arrastrando) setArrastrando(true);
                  }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastrando(false);
                    const archivo = e.dataTransfer.files?.[0];
                    if (archivo && !verificando) elegirFoto(archivo);
                  }}
                  className={`relative mx-1 my-1 block cursor-pointer rounded-sm border-[length:var(--trazo-medio)] bg-papel p-3 text-center text-sm transition-transform duration-200 ease-elastico peer-focus-visible:outline-[length:var(--trazo-medio)] peer-focus-visible:outline-offset-4 peer-focus-visible:outline-tinta peer-disabled:cursor-wait ${
                    arrastrando
                      ? 'scale-[1.02] -rotate-1 border-dashed border-ambar-2 bg-ambar-2/15 shadow-oro'
                      : foto
                        ? 'rotate-1 border-tinta shadow-tinta'
                        : 'border-dashed border-tinta shadow-tinta-sm hover:-rotate-1'
                  }`}
                >
                  <EsquinasFoto />
                  <span
                    className={`flex min-h-40 flex-col items-center justify-center gap-2 overflow-hidden rounded-sm p-2 ${urlFoto ? 'bg-panel-2' : 'semitono bg-panel-2'}`}
                  >
                    {urlFoto ? (
                      <img src={urlFoto} alt="Vista previa de tu procedimiento" className="max-h-48 w-full animate-colorear object-contain" />
                    ) : (
                      <>
                        <span className="grid size-12 place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-ambar-2 shadow-tinta-sm">
                          <ImagePlus size={24} className="text-tinta" aria-hidden />
                        </span>
                        <span className="rounded-md bg-papel px-2 font-display text-base text-tinta">Elegir o tomar foto</span>
                        <span className="rounded-md bg-papel px-2 text-tenue max-sm:hidden">o arrastra la imagen hasta este marco</span>
                      </>
                    )}
                  </span>
                  {foto && (
                    <span className="mt-2 flex items-center justify-center gap-1.5 text-tenue">
                      <Camera size={14} className="shrink-0" aria-hidden /> <span className="truncate">{foto.name}</span>
                      <span className="shrink-0 font-semibold text-tinta underline decoration-2 underline-offset-2">cambiar</span>
                    </span>
                  )}
                </label>
                {!props.matricula && (
                  <label className="flex flex-col gap-1.5 font-display text-sm">
                    Matrícula
                    <input className="campo numero font-normal" value={matricula} maxLength={20} inputMode="numeric" autoComplete="off" onChange={(e) => setMatricula(e.target.value)} />
                  </label>
                )}
              </fieldset>
            )}

            {error && actual && (
              <p role="alert" className="m-0 flex items-start gap-2 rounded-xl border-[length:var(--trazo-fino)] border-hostil bg-papel px-3 py-2 text-sm text-hostil">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            {fallos > 0 && !resuelto && (
              <div
                key={fallos}
                role="alert"
                className="flex animate-sacudida items-start gap-3 rounded-xl border-[length:var(--trazo-medio)] border-hostil bg-papel p-3 text-sm text-hostil shadow-tinta-sm"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-hostil text-papel">
                  <HeartCrack size={20} aria-hidden />
                </span>
                <p className="m-0">
                  <strong className="block font-display text-base font-normal">Respuesta incorrecta</strong>
                  Perdiste {VIDA_POR_RESPUESTA_INCORRECTA} de vida
                  {fallos > 1 ? ` (${fallos} intentos fallidos)` : ''}. Revisa tu procedimiento e inténtalo de nuevo.
                </p>
              </div>
            )}
            {resuelto ? (
              <div className="relative flex animate-colorear items-start gap-3 rounded-xl border-[length:var(--trazo-medio)] border-menta bg-menta-2 p-3 text-sm text-menta shadow-tinta-sm">
                <span className="relative grid size-10 shrink-0 animate-estirar place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-menta text-papel">
                  <Check size={22} strokeWidth={3} aria-hidden />
                </span>
                <p className="m-0">
                  <strong className="block font-display text-base font-normal">¡Respuesta correcta!</strong>
                  Consola resuelta{folio ? ` (folio ${folio} en el Panel Docente)` : ''}. La resolución completa está abajo.
                </p>
                {/* Estallido de estrellas doradas */}
                <span className="pointer-events-none absolute -top-3 right-3 flex gap-1" aria-hidden>
                  {[0, 1, 2].map((k) => (
                    <Star
                      key={k}
                      size={k === 1 ? 22 : 16}
                      className="animate-aparecer fill-ambar-2 text-tinta"
                      style={{ animationDelay: `${120 + k * 90}ms` }}
                    />
                  ))}
                </span>
              </div>
            ) : (
              <button
                type="submit"
                className={`btn btn-primario w-full py-3 text-base ${pasoActual === 4 ? 'animate-estirar' : ''}`}
                disabled={verificando || cargando}
              >
                <CheckCircle2 size={18} aria-hidden /> {verificando ? 'Verificando…' : 'Verificar respuesta'}
              </button>
            )}
          </form>
        </div>
      )}

      {error && !actual && (
        <p role="alert" className="m-0 flex items-start gap-2 rounded-xl border-[length:var(--trazo-fino)] border-hostil bg-papel px-3 py-2 text-sm text-hostil">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div ref={resolucionRef} className="flex min-w-0 scroll-mt-4 flex-col gap-6" aria-live="polite">
        {resultado && actual ? (
          <Resolucion slug={metodo.slug} resultado={resultado} entrada={actual.entrada} matricula={matricula} nivel={nivel} onEvidencia={onEvidencia} />
        ) : (
          actual && (
            <div className="semitono rounded-xl border-[length:var(--trazo-fino)] border-dashed border-tinta/40 p-5">
              <p className="m-0 max-w-prose rounded-md bg-panel px-2 py-1 text-sm text-tenue">
                La resolución completa (procedimiento, tabla y gráfica) aparecerá aquí cuando tu respuesta sea correcta.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** Número de paso (secuencia real 1–3): dorado si es el paso actual, palomita si ya se cumplió. */
function Paso({ n, activo, hecho, invertido }: { n: number; activo?: boolean; hecho?: boolean; invertido?: boolean }) {
  const base = 'grid size-8 shrink-0 place-items-center rounded-full border-[length:var(--trazo-medio)] font-display text-sm';
  const estilo = activo
    ? 'animate-rebote border-tinta bg-ambar-2 text-tinta shadow-tinta-sm'
    : hecho
      ? 'border-tinta bg-menta text-papel'
      : invertido
        ? 'border-papel bg-papel text-tinta'
        : 'border-tinta bg-tinta text-papel';
  return (
    <span className={`${base} ${estilo}`} aria-hidden>
      {hecho && !activo ? <Check size={16} strokeWidth={3} /> : n}
    </span>
  );
}

/** Esquinas fotográficas de álbum (triángulos de tinta) sobre las cuatro puntas del marco. */
function EsquinasFoto() {
  const comun = 'pointer-events-none absolute z-10 size-6 bg-tinta';
  return (
    <span aria-hidden>
      <span className={`${comun} -top-1 -left-1 [clip-path:polygon(0_0,100%_0,0_100%)]`} />
      <span className={`${comun} -top-1 -right-1 [clip-path:polygon(0_0,100%_0,100%_100%)]`} />
      <span className={`${comun} -bottom-1 -left-1 [clip-path:polygon(0_0,0_100%,100%_100%)]`} />
      <span className={`${comun} -right-1 -bottom-1 [clip-path:polygon(100%_0,100%_100%,0_100%)]`} />
    </span>
  );
}
