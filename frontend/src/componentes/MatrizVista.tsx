import type { MatrizDTO } from '../types/numericos';
import { ValorCelda } from './Latex';
import { pareceNumero } from '../utilidades/latex';

interface Props {
  matriz: MatrizDTO;
  /** Fuerza que la primera fila sea de encabezados (p. ej. tablas-newton-cotes). */
  primeraFilaEncabezado?: boolean;
}

/** Heurística: la primera fila es encabezado si no tiene números y la segunda sí. */
function detectarEncabezado(filas: string[][]): boolean {
  if (filas.length < 2) return false;
  const [f0, f1] = filas;
  const numerica = (f: string[]) => f.some((s) => s !== '' && pareceNumero(s));
  return !numerica(f0) && numerica(f1);
}

export function MatrizVista({ matriz, primeraFilaEncabezado }: Props) {
  const conEncabezado = primeraFilaEncabezado ?? detectarEncabezado(matriz.filas);
  const encabezado = conEncabezado ? matriz.filas[0] : null;
  const cuerpo = conEncabezado ? matriz.filas.slice(1) : matriz.filas;
  const desfase = conEncabezado ? 1 : 0;
  const [pf, pc] = matriz.pivote ?? [-1, -1];

  const filasCuerpo = cuerpo.map((fila, i) => (
    <tr key={i}>
      {fila.map((celda, j) => {
        const esPivote = i + desfase === pf && j === pc;
        return (
          <td
            key={j}
            className={`text-right whitespace-nowrap ${conEncabezado ? '' : 'px-3 py-1.5'} ${
              esPivote ? 'relative z-0 font-semibold' : ''
            }`}
            aria-label={esPivote ? `Pivote: ${celda}` : undefined}
          >
            {esPivote ? (
              <span className="inline-block rounded-md border-(length:--trazo-fino) border-tinta bg-ambar-2 px-1.5 shadow-tinta-sm">
                <ValorCelda valor={celda} />
              </span>
            ) : (
              <ValorCelda valor={celda} />
            )}
          </td>
        );
      })}
    </tr>
  ));

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-center gap-2 font-display text-base">
        {matriz.titulo}
        {matriz.pivote && (
          <span className="chapa bg-ambar-2 font-sans text-tinta">
            <span aria-hidden className="size-2 rounded-full border border-tinta bg-panel" /> pivote
          </span>
        )}
      </figcaption>
      <div className="overflow-x-auto pr-1 pb-2">
        {conEncabezado ? (
          // Tabla con encabezados (p. ej. tablas de Newton–Cotes): tabla de fotograma.
          <div className="inline-block rounded-xl border-(length:--trazo-medio) border-tinta bg-panel shadow-tinta-sm">
            <table className="tabla-cine w-auto overflow-visible rounded-none border-0 text-sm">
              <thead>
                <tr>
                  {(encabezado ?? []).map((h, j) => (
                    <th key={j} scope="col" className="text-right whitespace-nowrap">
                      <ValorCelda valor={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{filasCuerpo}</tbody>
            </table>
          </div>
        ) : (
          // Matriz: corchetes de tinta gruesa dibujados a los lados.
          <div className="relative inline-block px-2 py-1">
            <span aria-hidden className="absolute inset-y-0 left-0 w-2.5 rounded-l-sm border-y-(length:--trazo-grueso) border-l-(length:--trazo-grueso) border-tinta" />
            <span aria-hidden className="absolute inset-y-0 right-0 w-2.5 rounded-r-sm border-y-(length:--trazo-grueso) border-r-(length:--trazo-grueso) border-tinta" />
            <table className="border-collapse text-sm">
              <tbody>{filasCuerpo}</tbody>
            </table>
          </div>
        )}
      </div>
      {matriz.nota && <p className="m-0 text-sm text-tenue">{matriz.nota}</p>}
    </figure>
  );
}
