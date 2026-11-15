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

  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-base font-semibold font-display">{matriz.titulo}</figcaption>
      <div className="overflow-x-auto">
        <table className={`border-collapse text-sm ${conEncabezado ? '' : 'border-x-2 border-tenue/60'}`}>
          {encabezado && (
            <thead>
              <tr>
                {encabezado.map((h, j) => (
                  <th key={j} scope="col" className="border-b border-linea px-3 py-1.5 text-left font-normal text-tenue">
                    <ValorCelda valor={h} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {cuerpo.map((fila, i) => (
              <tr key={i}>
                {fila.map((celda, j) => {
                  const esPivote = i + desfase === pf && j === pc;
                  return (
                    <td
                      key={j}
                      className={`px-3 py-1.5 text-right whitespace-nowrap ${
                        esPivote ? 'rounded bg-ambar/15 outline-2 -outline-offset-2 outline-ambar text-ambar' : ''
                      }`}
                      aria-label={esPivote ? `Pivote: ${celda}` : undefined}
                    >
                      <ValorCelda valor={celda} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {matriz.nota && <p className="text-sm text-tenue">{matriz.nota}</p>}
    </figure>
  );
}
