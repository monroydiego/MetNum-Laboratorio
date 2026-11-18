import type { ColumnaDTO } from '../types/numericos';
import { Latex, ValorCelda } from './Latex';

interface Props {
  columnas: ColumnaDTO[];
  filas: Record<string, string | null>[];
  titulo?: string;
}

/**
 * Tabla de iteraciones: muestra los strings EXACTOS enviados por Python (sin Number()).
 * Estilo «tabla de fotograma»: cabecera de tinta fija, filas alternas en plata y la
 * última fila (el resultado) resaltada en dorado suave.
 */
export function TablaResultado({ columnas, filas, titulo = 'Tabla de iteraciones' }: Props) {
  if (!columnas.length || !filas.length) return null;
  const ultima = filas.length - 1;
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h3 className="m-0 text-xl">{titulo}</h3>
      <div
        className="max-h-[28rem] overflow-auto rounded-xl border-(length:--trazo-medio) border-tinta bg-panel shadow-tinta-sm"
        tabIndex={0}
        role="region"
        aria-label={`${titulo} (desplazable)`}
      >
        <table className="tabla-cine overflow-visible rounded-none border-0 text-sm">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.clave} scope="col" className="sticky top-0 z-10 text-right whitespace-nowrap">
                  {c.latex ? <Latex latex={c.latex} /> : <span>{c.clave}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const final = i === ultima && filas.length > 1;
              return (
                <tr key={i} className={final ? '' : '[&:hover>td]:bg-ambar-2/15'}>
                  {columnas.map((c) => (
                    <td
                      key={c.clave}
                      className={`text-right whitespace-nowrap ${
                        final ? 'border-t-(length:--trazo-fino) border-t-tinta bg-ambar-2/30 font-semibold' : ''
                      }`}
                    >
                      <ValorCelda valor={f[c.clave]} />
                    </td>
                  ))}
                </tr>
              );
            })}
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
