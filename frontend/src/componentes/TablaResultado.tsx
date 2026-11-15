import type { ColumnaDTO } from '../types/numericos';
import { Latex, ValorCelda } from './Latex';

interface Props {
  columnas: ColumnaDTO[];
  filas: Record<string, string | null>[];
  titulo?: string;
}

/** Tabla de iteraciones: muestra los strings EXACTOS enviados por Python (sin Number()). */
export function TablaResultado({ columnas, filas, titulo = 'Tabla de iteraciones' }: Props) {
  if (!columnas.length || !filas.length) return null;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h3 className="text-base">{titulo}</h3>
      <div className="max-h-[28rem] overflow-auto rounded-lg border border-linea" tabIndex={0}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-panel-2">
            <tr>
              {columnas.map((c) => (
                <th key={c.clave} scope="col" className="border-b border-linea px-3 py-2 text-left font-normal whitespace-nowrap text-tenue">
                  {c.latex ? <Latex latex={c.latex} /> : <span>{c.clave}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="odd:bg-white/[0.015] hover:bg-primario/5">
                {columnas.map((c) => (
                  <td key={c.clave} className="border-b border-linea/60 px-3 py-1.5 whitespace-nowrap">
                    <ValorCelda valor={f[c.clave]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Tabla genérica a partir de filas (las columnas salen de las claves). Usada en el Panel Docente. */
export function TablaDesdeFilas({ filas }: { filas: Record<string, string | null>[] }) {
  if (!filas.length) return <p className="text-sm text-tenue">Sin iteraciones registradas.</p>;
  const claves = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  return (
    <TablaResultado titulo="Tabla enviada" columnas={claves.map((k) => ({ clave: k, latex: '' }))} filas={filas} />
  );
}
