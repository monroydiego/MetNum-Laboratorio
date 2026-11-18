import type { PasoDTO } from '../types/numericos';
import { Latex } from './Latex';

/**
 * Procedimiento paso a paso en el formato del libro (descripción + fórmula KaTeX).
 * Cada paso es un fotograma numerado de la cinta: borde de tinta y número en el canto.
 */
export function PasosKatex({ pasos }: { pasos: PasoDTO[] }) {
  if (!pasos.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-label="Procedimiento">
      <h3 className="m-0 text-xl">Procedimiento</h3>
      <ol role="list" className="m-0 flex list-none flex-col gap-3 p-0">
        {pasos.map((p, i) => (
          <li
            key={i}
            className="flex min-w-0 overflow-hidden rounded-xl border-(length:--trazo-medio) border-tinta bg-panel shadow-tinta-sm"
          >
            <span
              aria-hidden
              className="flex w-10 shrink-0 flex-col items-center gap-1 bg-tinta pt-2.5 font-display text-base text-papel"
            >
              {i + 1}
              <span className="h-1.5 w-3 rounded-xs bg-fondo" />
              <span className="h-1.5 w-3 rounded-xs bg-fondo" />
            </span>
            <div className="min-w-0 flex-1 px-4 py-3">
              <span className="sr-only">Paso {i + 1}. </span>
              {p.descripcion && <p className="m-0 text-sm text-tenue">{p.descripcion}</p>}
              {p.latex && <Latex latex={p.latex} display />}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
