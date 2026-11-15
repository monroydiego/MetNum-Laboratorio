// Resolución completa de un método (resultado, procedimiento KaTeX, matrices, tabla, gráficas) + Modo Comprobación.
import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import type { EvidenciaDTO, ResultadoNumericoDTO, SerieDTO } from '../types/numericos';
import { fichaResultadoPNG } from '../utilidades/fichaCanvas';
import { NombreResultado, ValorCelda } from './Latex';
import { MatrizVista } from './MatrizVista';
import { ModalComprobacion } from './ModalComprobacion';
import { PasosKatex } from './PasosKatex';
import { PlanoCartesiano, type PlanoHandle } from './PlanoCartesiano';
import { TablaResultado } from './TablaResultado';

interface Props {
  slug: string;
  resultado: ResultadoNumericoDTO;
  entrada: Record<string, unknown>;
  matricula: string;
  nivel: number;
  onEvidencia?: (e: EvidenciaDTO, matricula: string) => void;
}

export function Resolucion({ slug, resultado, entrada, matricula, nivel, onEvidencia }: Props) {
  const [comprobando, setComprobando] = useState(false);
  const planoRef = useRef<PlanoHandle>(null);
  const convergenciaRef = useRef<PlanoHandle>(null);

  const seriesConvergencia = useMemo<SerieDTO[]>(
    () => (resultado.errores.length >= 2 ? [{ nombre: 'Error por iteración', tipo: 'linea', puntos: resultado.errores.map((e, i) => [i + 1, e]) }] : []),
    [resultado],
  );
  const seriesPlano = useMemo(() => resultado.series ?? [], [resultado]);

  const obtenerCaptura = useCallback(async () => {
    if (seriesPlano.length && planoRef.current) return planoRef.current.exportarPNG();
    if (seriesConvergencia.length && convergenciaRef.current) return convergenciaRef.current.exportarPNG();
    return fichaResultadoPNG(resultado);
  }, [seriesPlano, seriesConvergencia, resultado]);

  return (
    <>
      <VistaResultado resultado={resultado} />
      <PasosKatex pasos={resultado.pasos} />
      {resultado.matrices.length > 0 && (
        <section className="flex flex-col gap-4" aria-label="Matrices">
          {resultado.matrices.map((m, i) => (
            <MatrizVista key={i} matriz={m} primeraFilaEncabezado={slug === 'tablas-newton-cotes' ? true : undefined} />
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
          Envía la foto de tu procedimiento hecho a mano para que tu docente lo compare con esta resolución.
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
  );
}

export function VistaResultado({ resultado }: { resultado: ResultadoNumericoDTO }) {
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
            <div key={k} className="flex flex-col gap-1 rounded-lg border border-primario-2/60 bg-primario/5 px-4 py-3">
              <dt className="text-sm text-tenue">
                <NombreResultado clave={k} />
              </dt>
              <dd className="m-0 text-xl break-all text-primario">
                <ValorCelda valor={v} />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
