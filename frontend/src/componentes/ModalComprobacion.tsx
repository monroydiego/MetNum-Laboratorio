// Modo Comprobación Docente: foto del procedimiento + captura automática del canvas,
// matrícula y nivel. Envía multipart a POST /api/evidencias.
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ImageOff, Send } from 'lucide-react';
import { Dialogo } from './Dialogo';
import { enviarEvidencia, mensajeDeError } from '../services/apiClient';
import type { EvidenciaDTO, EvidenciaFormCampos, ResultadoNumericoDTO } from '../types/numericos';
import { resumenEntrada } from '../utilidades/esquema';

interface Props {
  resultado: ResultadoNumericoDTO;
  entrada: Record<string, unknown>;
  matriculaInicial: string;
  nivelInicial: number;
  obtenerCaptura: () => Promise<Blob | null>;
  onCerrar: () => void;
  onEnviada?: (e: EvidenciaDTO, matricula: string) => void;
}

const RE_NUMERO_PY = /^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;

/** Valor de Є para el campo `error`: debe ser un número que Python pueda leer con float(), o vacío. */
function errorParaEvidencia(r: ResultadoNumericoDTO): string {
  const clave = Object.keys(r.resultado).find((k) => /^(Є|ε|E_?a|error)/i.test(k.trim()));
  const candidato = clave ? r.resultado[clave].replace('%', '').trim() : '';
  if (RE_NUMERO_PY.test(candidato)) return candidato;
  if (r.errores.length) return String(r.errores[r.errores.length - 1]);
  return '';
}

function recortar(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function ModalComprobacion({ resultado, entrada, matriculaInicial, nivelInicial, obtenerCaptura, onCerrar, onEnviada }: Props) {
  const id = useId();
  const [matricula, setMatricula] = useState(matriculaInicial);
  const [nivel, setNivel] = useState(String(nivelInicial));
  const [foto, setFoto] = useState<File | null>(null);
  const [urlFoto, setUrlFoto] = useState<string | null>(null);
  const [captura, setCaptura] = useState<Blob | null>(null);
  const [urlCaptura, setUrlCaptura] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState<EvidenciaDTO | null>(null);

  // Captura automática del canvas de la gráfica al abrir.
  useEffect(() => {
    let vigente = true;
    let url: string | null = null;
    obtenerCaptura().then((b) => {
      if (!vigente || !b) return;
      url = URL.createObjectURL(b);
      setCaptura(b);
      setUrlCaptura(url);
    });
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [obtenerCaptura]);

  // URL de vista previa de la foto: se crea al elegirla y se libera al cambiarla o al cerrar.
  const urlFotoRef = useRef<string | null>(null);
  useEffect(() => () => {
    if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current);
  }, []);
  function elegirFoto(archivo: File | null) {
    if (urlFotoRef.current) URL.revokeObjectURL(urlFotoRef.current);
    urlFotoRef.current = archivo ? URL.createObjectURL(archivo) : null;
    setFoto(archivo);
    setUrlFoto(urlFotoRef.current);
  }

  const resultadoTexto = Object.entries(resultado.resultado)
    .map(([k, v]) => `${k} = ${v}`)
    .join('; ');
  const funcion = resumenEntrada(entrada);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const m = matricula.trim();
    if (!m) return setError('Escribe tu matrícula para que el docente identifique la evidencia.');
    if (!/^\d+$/.test(nivel.trim())) return setError('El nivel debe ser un número entero (0 o mayor).');
    if (!foto) return setError('Falta la foto de tu procedimiento en papel. Tómala o elígela desde tu dispositivo.');
    if (!captura) return setError('No se pudo capturar la gráfica. Cierra esta ventana, vuelve a resolver y reintenta.');
    const campos: EvidenciaFormCampos = {
      matricula: m.slice(0, 20),
      nivel: nivel.trim(),
      metodo: recortar(resultado.nombre_libro || resultado.metodo, 60),
      funcion: recortar(funcion, 255),
      resultado_exacto: recortar(resultadoTexto, 500),
      error: errorParaEvidencia(resultado),
      iteraciones_json: JSON.stringify(resultado.filas),
    };
    setEnviando(true);
    try {
      const ev = await enviarEvidencia(campos, foto, captura);
      setEnviada(ev);
      onEnviada?.(ev, m);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialogo titulo="Modo Comprobación Docente" subtitulo={resultado.nombre_libro} onCerrar={onCerrar} ancho="lg">
      {enviada ? (
        <div className="flex flex-col items-start gap-4 py-4">
          <div className="flex animate-colorear items-center gap-3 rounded-xl border-[length:var(--trazo-medio)] border-menta bg-menta-2 px-4 py-3 text-menta shadow-tinta-sm">
            <span className="grid size-10 shrink-0 animate-estirar place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-menta text-papel">
              <CheckCircle2 size={22} aria-hidden />
            </span>
            <p className="m-0 font-display text-xl">Evidencia enviada</p>
          </div>
          <p className="m-0 max-w-prose text-tenue">
            Quedó registrada con el folio <span className="numero font-bold text-tinta">{enviada.id}</span> para la matrícula{' '}
            <span className="numero font-bold text-tinta">{enviada.matricula}</span>. Tu docente la verá en el Panel Docente junto a la gráfica y la tabla.
          </p>
          <button type="button" className="btn btn-primario" onClick={onCerrar}>
            Volver al resultado
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
          <p className="m-0 max-w-prose text-tenue">
            Sube una foto de tu procedimiento hecho a mano. Se envía junto con la captura de la gráfica y la tabla de iteraciones para que tu docente las compare.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-mat`} className="font-display text-sm">
                Matrícula
              </label>
              <input
                id={`${id}-mat`}
                className="campo numero"
                value={matricula}
                maxLength={20}
                autoComplete="off"
                inputMode="numeric"
                onChange={(e) => setMatricula(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-niv`} className="font-display text-sm">
                Nivel
              </label>
              <input id={`${id}-niv`} className="campo numero" type="number" min={0} step={1} value={nivel} onChange={(e) => setNivel(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="m-0 text-base">Foto del procedimiento</h3>
              {/* Marco de foto antigua: el foco (dorado) está aquí hasta que haya foto. */}
              <label
                htmlFor={`${id}-foto`}
                className={`relative m-1 block cursor-pointer rounded-sm border-[length:var(--trazo-medio)] bg-papel p-2.5 text-center text-sm transition-transform duration-200 ease-elastico focus-within:outline-[length:var(--trazo-medio)] focus-within:outline-offset-4 focus-within:outline-tinta ${
                  foto ? '-rotate-1 border-tinta shadow-tinta' : 'border-dashed border-tinta shadow-oro hover:-rotate-1'
                }`}
              >
                <Esquinas />
                <span className={`flex min-h-48 flex-col items-center justify-center gap-2 overflow-hidden rounded-sm p-2 ${urlFoto ? 'bg-panel-2' : 'semitono bg-panel-2'}`}>
                  {urlFoto ? (
                    <img src={urlFoto} alt="Vista previa del procedimiento" className="max-h-64 w-full animate-colorear object-contain" />
                  ) : (
                    <>
                      <span className="grid size-12 place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta bg-ambar-2 shadow-tinta-sm">
                        <Camera size={24} className="text-tinta" aria-hidden />
                      </span>
                      <span className="rounded-md bg-papel px-2 font-display text-tinta">Toca para tomar la foto o elegir una imagen</span>
                    </>
                  )}
                </span>
                <input
                  id={`${id}-foto`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
                />
              </label>
              {foto && <p className="m-0 truncate text-sm text-tenue">{foto.name}</p>}
            </section>
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="m-0 text-base">Captura de la gráfica</h3>
              <div className="relative m-1 rotate-1 rounded-sm border-[length:var(--trazo-medio)] border-tinta bg-papel p-2.5 shadow-tinta">
                <Esquinas />
                <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-sm bg-panel-2 p-2">
                  {urlCaptura ? (
                    <img src={urlCaptura} alt="Captura automática de la gráfica" className="max-h-64 w-full object-contain" />
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-tenue">
                      <ImageOff size={18} className="animate-tambaleo" aria-hidden /> Capturando…
                    </span>
                  )}
                </div>
              </div>
            </section>
          </div>

          <dl className="m-0 grid gap-x-4 gap-y-1 rounded-lg border-[length:var(--trazo-fino)] border-tinta bg-panel-2 p-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="font-display text-tinta">Método</dt>
            <dd className="m-0">{resultado.nombre_libro}</dd>
            <dt className="font-display text-tinta">Datos</dt>
            <dd className="numero m-0 break-all">{recortar(funcion, 255)}</dd>
            <dt className="font-display text-tinta">Resultado</dt>
            <dd className="numero m-0 font-bold break-all">{resultadoTexto || '—'}</dd>
            <dt className="font-display text-tinta">Iteraciones</dt>
            <dd className="m-0">{resultado.filas.length} filas</dd>
          </dl>

          {error && (
            <p role="alert" className="m-0 flex animate-sacudida items-start gap-2 rounded-xl border-[length:var(--trazo-fino)] border-hostil bg-papel px-3 py-2 text-sm text-hostil">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn" onClick={onCerrar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={enviando}>
              <Send size={16} aria-hidden /> {enviando ? 'Enviando…' : 'Enviar evidencia'}
            </button>
          </div>
        </form>
      )}
    </Dialogo>
  );
}

/** Esquinas fotográficas de álbum (triángulos de tinta). */
function Esquinas() {
  const comun = 'pointer-events-none absolute z-10 size-5 bg-tinta';
  return (
    <span aria-hidden>
      <span className={`${comun} -top-1 -left-1 [clip-path:polygon(0_0,100%_0,0_100%)]`} />
      <span className={`${comun} -top-1 -right-1 [clip-path:polygon(0_0,100%_0,100%_100%)]`} />
      <span className={`${comun} -bottom-1 -left-1 [clip-path:polygon(0_0,0_100%,100%_100%)]`} />
      <span className={`${comun} -right-1 -bottom-1 [clip-path:polygon(100%_0,100%_100%,0_100%)]`} />
    </span>
  );
}
