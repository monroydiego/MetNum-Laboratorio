import katex from 'katex';

const cache = new Map<string, string>();

/** Renderiza LaTeX a HTML con KaTeX (throwOnError: false). Devuelve null si KaTeX no pudo. */
export function latexAHtml(latex: string, modoDisplay = false): string | null {
  const clave = (modoDisplay ? 'D:' : 'I:') + latex;
  const enCache = cache.get(clave);
  if (enCache !== undefined) return enCache;
  let html: string | null;
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: modoDisplay,
      strict: 'ignore',
      output: 'htmlAndMathml',
    });
    if (html.includes('katex-error')) html = null;
  } catch {
    html = null;
  }
  if (cache.size > 2000) cache.clear();
  if (html !== null) cache.set(clave, html);
  return html;
}

/** Regla del contrato: una celda "parece número" si cumple este patrón (entero, decimal o fracción). */
const RE_NUMERO = /^-?\d+(\.\d+)?(\/\d+)?$/;

export function pareceNumero(valor: string): boolean {
  return RE_NUMERO.test(valor.trim());
}

/** Signos sueltos o texto corto que se muestran tal cual. */
export function esTextoPlano(valor: string): boolean {
  const v = valor.trim();
  if (/^[+\-−±]$/.test(v)) return true;
  // Palabra suelta de 3+ letras (p. ej. "ambas"): texto, no variables en cursiva.
  if (/^\p{L}{3,}$/u.test(v)) return true;
  // Palabras con espacios y sin notación matemática: texto normal.
  return /\s/.test(v) && /^[\p{L}\s.,;:()¿?¡!'"0-9-]+$/u.test(v) && !/[\\^_{}]/.test(v);
}

/**
 * Convierte la clave de `resultado` (p. ej. "Є", "g(x)", "y_1", "y′_1") a LaTeX.
 * Devuelve null si conviene mostrarla como texto (frases).
 */
export function claveALatex(clave: string): string | null {
  const c = clave.trim();
  if (!c) return null;
  if (/\s/.test(c) && !/[\\^_{}]/.test(c)) return null;
  if (/^\p{L}{4,}$/u.test(c)) return null; // palabra completa: texto
  return c.replace(/′/g, "'").replace(/Є/g, '\\text{Є}');
}
