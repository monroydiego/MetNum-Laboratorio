// Generación de formularios a partir del JSON Schema de Pydantic (esquema_entrada).
import type { EsquemaEntrada, EsquemaPropiedad } from '../types/numericos';

export type TipoCampo = 'texto' | 'entero' | 'numero' | 'booleano' | 'opciones' | 'lista' | 'matriz' | 'json';
export type TipoElemento = 'texto' | 'entero' | 'numero';

export interface CampoFormulario {
  clave: string;
  etiqueta: string;
  ayuda: string | null;
  tipo: TipoCampo;
  /** Tipo de cada elemento en listas y matrices. */
  elemento: TipoElemento;
  requerido: boolean;
  anulable: boolean;
  porDefecto: unknown;
  opciones: (string | number)[];
  minimo?: number;
  maximo?: number;
}

export type ValorCampo = string | boolean | string[] | string[][];
export type ValoresFormulario = Record<string, ValorCampo>;

function resolverRef(p: EsquemaPropiedad, defs: Record<string, unknown> | undefined): EsquemaPropiedad {
  if (p.$ref && defs) {
    const nombre = p.$ref.split('/').pop() ?? '';
    const def = defs[nombre] as EsquemaPropiedad | undefined;
    if (def) return { ...def, ...p, $ref: undefined, type: def.type ?? p.type };
  }
  return p;
}

function tipoElemento(t: string | undefined): TipoElemento {
  return t === 'integer' ? 'entero' : t === 'number' ? 'numero' : 'texto';
}

/** Separa la descripción "f(a); opcional si se da la función" en etiqueta y ayuda. */
function etiquetaYAyuda(clave: string, p: EsquemaPropiedad, base: EsquemaPropiedad): { etiqueta: string; ayuda: string | null } {
  const desc = (p.description ?? base.description ?? '').trim();
  if (desc) {
    const i = desc.indexOf(';');
    if (i > 0) return { etiqueta: desc.slice(0, i).trim(), ayuda: desc.slice(i + 1).trim() || null };
    return { etiqueta: desc, ayuda: null };
  }
  return { etiqueta: p.title ?? clave, ayuda: null };
}

export function camposDesdeEsquema(esquema: EsquemaEntrada): CampoFormulario[] {
  const requeridos = new Set(esquema.required ?? []);
  const defs = esquema.$defs;
  return Object.entries(esquema.properties ?? {}).map(([clave, original]) => {
    let p = resolverRef(original, defs);
    let anulable = false;
    if (p.anyOf?.length) {
      const variantes = p.anyOf.map((v) => resolverRef(v, defs));
      anulable = variantes.some((v) => v.type === 'null');
      const util = variantes.find((v) => v.type !== 'null') ?? {};
      p = { ...util, title: p.title, description: p.description, default: p.default };
    }
    const { etiqueta, ayuda } = etiquetaYAyuda(clave, original, p);
    let tipo: TipoCampo = 'json';
    let elemento: TipoElemento = 'texto';
    if (p.enum?.length) tipo = 'opciones';
    else if (p.type === 'string') tipo = 'texto';
    else if (p.type === 'integer') tipo = 'entero';
    else if (p.type === 'number') tipo = 'numero';
    else if (p.type === 'boolean') tipo = 'booleano';
    else if (p.type === 'array') {
      const items = resolverRef((p.items ?? {}) as EsquemaPropiedad, defs);
      if (items.type === 'array') {
        tipo = 'matriz';
        elemento = tipoElemento(resolverRef((items.items ?? {}) as EsquemaPropiedad, defs).type);
      } else if (items.type === 'string' || items.type === 'number' || items.type === 'integer') {
        tipo = 'lista';
        elemento = tipoElemento(items.type);
      }
    }
    return {
      clave,
      etiqueta,
      ayuda,
      tipo,
      elemento,
      requerido: requeridos.has(clave),
      anulable,
      porDefecto: original.default ?? p.default,
      opciones: p.enum ?? [],
      minimo: p.minimum,
      maximo: p.maximum,
    };
  });
}

const aTexto = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v));

/** Convierte un valor JSON (default o ejemplo) al valor editable del campo. */
export function valorDesdeJson(campo: CampoFormulario, v: unknown): ValorCampo {
  switch (campo.tipo) {
    case 'booleano':
      return Boolean(v);
    case 'lista':
      return Array.isArray(v) ? v.map(aTexto) : [''];
    case 'matriz':
      return Array.isArray(v) && v.length ? v.map((fila) => (Array.isArray(fila) ? fila.map(aTexto) : [aTexto(fila)])) : [['', ''], ['', '']];
    case 'json':
      return v === undefined || v === null ? '' : JSON.stringify(v, null, 2);
    default:
      return aTexto(v);
  }
}

export function valoresIniciales(campos: CampoFormulario[]): ValoresFormulario {
  return Object.fromEntries(campos.map((c) => [c.clave, valorDesdeJson(c, c.porDefecto)]));
}

export function valoresDesdeEjemplo(campos: CampoFormulario[], ejemplo: Record<string, unknown>): ValoresFormulario {
  return Object.fromEntries(
    campos.map((c) => [c.clave, valorDesdeJson(c, c.clave in ejemplo ? ejemplo[c.clave] : c.porDefecto)]),
  );
}

function convertirElemento(t: TipoElemento, s: string): string | number {
  // Number() aquí solo prepara la ENTRADA de campos declarados numéricos por el esquema; nunca para mostrar.
  if (t === 'texto') return s.trim();
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : s.trim();
}

export interface ResultadoPayload {
  payload: Record<string, unknown>;
  errores: Record<string, string>;
}

/** Construye el cuerpo JSON para POST /api/calcular/{slug} y valida lo básico en el cliente. */
export function construirPayload(campos: CampoFormulario[], valores: ValoresFormulario): ResultadoPayload {
  const payload: Record<string, unknown> = {};
  const errores: Record<string, string> = {};
  for (const c of campos) {
    const v = valores[c.clave];
    switch (c.tipo) {
      case 'booleano':
        payload[c.clave] = Boolean(v);
        break;
      case 'lista': {
        const lista = (Array.isArray(v) ? (v as string[]) : []).map((s) => s.trim()).filter((s) => s !== '');
        if (!lista.length) {
          if (c.requerido) errores[c.clave] = 'Agrega al menos un valor.';
          else if (c.anulable) payload[c.clave] = null;
          break;
        }
        payload[c.clave] = lista.map((s) => convertirElemento(c.elemento, s));
        break;
      }
      case 'matriz': {
        const m = (Array.isArray(v) ? (v as string[][]) : []).filter((f) => f.some((s) => s.trim() !== ''));
        if (!m.length) {
          if (c.requerido) errores[c.clave] = 'Llena la matriz antes de resolver.';
          else if (c.anulable) payload[c.clave] = null;
          break;
        }
        if (m.some((f) => f.some((s) => s.trim() === ''))) {
          errores[c.clave] = 'Hay celdas vacías en la matriz: complétalas o elimina la fila/columna.';
          break;
        }
        payload[c.clave] = m.map((f) => f.map((s) => convertirElemento(c.elemento, s)));
        break;
      }
      case 'json': {
        const s = String(v ?? '').trim();
        if (!s) {
          if (c.requerido) errores[c.clave] = 'Este campo es obligatorio.';
          else if (c.anulable) payload[c.clave] = null;
          break;
        }
        try {
          payload[c.clave] = JSON.parse(s);
        } catch {
          errores[c.clave] = 'No es JSON válido. Revisa comillas, comas y corchetes.';
        }
        break;
      }
      default: {
        const s = String(v ?? '').trim();
        if (!s) {
          if (c.requerido) errores[c.clave] = 'Este campo es obligatorio.';
          else if (c.anulable) payload[c.clave] = null;
          // Sin valor y con default: se omite para que el backend aplique su default.
          break;
        }
        if (c.tipo === 'entero') {
          if (!/^-?\d+$/.test(s)) {
            errores[c.clave] = 'Debe ser un número entero.';
            break;
          }
          const n = Number.parseInt(s, 10);
          if (c.minimo !== undefined && n < c.minimo) errores[c.clave] = `Debe ser mayor o igual que ${c.minimo}.`;
          else if (c.maximo !== undefined && n > c.maximo) errores[c.clave] = `Debe ser menor o igual que ${c.maximo}.`;
          else payload[c.clave] = n;
        } else if (c.tipo === 'numero') {
          const n = Number(s);
          if (!Number.isFinite(n)) errores[c.clave] = 'Debe ser un número.';
          else payload[c.clave] = n;
        } else if (c.tipo === 'opciones') {
          const op = c.opciones.find((o) => String(o) === s);
          payload[c.clave] = op ?? s;
        } else payload[c.clave] = s;
      }
    }
  }
  return { payload, errores };
}

/** Datos de entrada completos (función + valores) para que el docente pueda reconstruir el problema. */
export function resumenEntrada(payload: Record<string, unknown>): string {
  const partes: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'decimales' || v === null || v === undefined || v === '') continue;
    const texto = Array.isArray(v)
      ? `[${v.map((e) => (Array.isArray(e) ? `[${e.join(', ')}]` : String(e))).join(', ')}]`
      : String(v);
    partes.push(`${k} = ${texto}`);
  }
  return partes.join('; ');
}
