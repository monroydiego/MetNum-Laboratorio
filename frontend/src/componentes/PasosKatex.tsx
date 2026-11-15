import type { PasoDTO } from '../types/numericos';
import { Latex } from './Latex';

/** Procedimiento paso a paso en el formato del libro (descripción + fórmula KaTeX). */
export function PasosKatex({ pasos }: { pasos: PasoDTO[] }) {
  if (!pasos.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Procedimiento">
      <h3 className="text-base">Procedimiento</h3>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {pasos.map((p, i) => (
          <li key={i} className="rounded-lg border border-linea bg-panel-2/60 px-4 py-3">
            {p.descripcion && <p className="m-0 text-sm text-tenue">{p.descripcion}</p>}
            {p.latex && <Latex latex={p.latex} display />}
          </li>
        ))}
      </ol>
    </section>
  );
}
