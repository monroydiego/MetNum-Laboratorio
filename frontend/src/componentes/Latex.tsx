import { memo } from 'react';
import { claveALatex, esTextoPlano, latexAHtml, pareceNumero } from '../utilidades/latex';

interface Props {
  latex: string;
  display?: boolean;
  className?: string;
}

/** Fórmula KaTeX; si no se puede renderizar, muestra el texto original. */
export const Latex = memo(function Latex({ latex, display = false, className }: Props) {
  const html = latexAHtml(latex, display);
  if (html === null) return <code className={className}>{latex}</code>;
  const Etiqueta = display ? 'div' : 'span';
  return <Etiqueta className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});

/**
 * Celda con el string EXACTO enviado por Python (nunca Number()).
 * Números: tal cual en mono. Vacío "": en blanco. null: guion. Resto: KaTeX.
 */
export const ValorCelda = memo(function ValorCelda({ valor }: { valor: string | null | undefined }) {
  if (valor === null || valor === undefined) return <span className="text-tenue" aria-label="sin valor">—</span>;
  if (valor === '') return null;
  if (pareceNumero(valor)) return <span className="numero">{valor}</span>;
  if (esTextoPlano(valor)) return <span className="numero">{valor}</span>;
  return <Latex latex={valor} />;
});

/** Nombre de un valor de resultado (Є, g(x), y_1…) renderizado con KaTeX si procede. */
export function NombreResultado({ clave }: { clave: string }) {
  const tex = claveALatex(clave);
  if (tex === null) return <span>{clave}</span>;
  return <Latex latex={tex} />;
}
