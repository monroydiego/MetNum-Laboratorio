// Espejo de backend/app/presentation/schemas.py (skill sync-contratos).
// Precisión alta => string (NUNCA convertir con Number() para mostrar).
// Coordenadas de gráfica y errores => number.
// Entradas por módulo: ./entradas/<modulo>.ts (espejo de schemas_<modulo>.py).

export interface ColumnaDTO {
  clave: string;
  latex: string;
}

export interface PasoDTO {
  descripcion: string;
  latex: string;
}

export interface MatrizDTO {
  titulo: string;
  filas: string[][];
  pivote: [number, number] | null;
  nota: string | null;
}

export interface SerieDTO {
  nombre: string;
  tipo: 'linea' | 'puntos';
  puntos: [number, number][];
}

export interface ResultadoNumericoDTO {
  metodo: string;
  nombre_libro: string;
  pagina: number;
  columnas: ColumnaDTO[];
  filas: Record<string, string | null>[];
  pasos: PasoDTO[];
  matrices: MatrizDTO[];
  resultado: Record<string, string>;
  errores: number[];
  series: SerieDTO[];
  advertencias: string[];
}

/** JSON Schema (Pydantic) del cuerpo de entrada; se usa para generar formularios. */
export interface EsquemaEntrada {
  title?: string;
  type?: string;
  properties: Record<string, EsquemaPropiedad>;
  required?: string[];
  $defs?: Record<string, unknown>;
}

export interface EsquemaPropiedad {
  title?: string;
  description?: string;
  type?: string;
  default?: unknown;
  anyOf?: EsquemaPropiedad[];
  items?: EsquemaPropiedad | { type?: string; items?: EsquemaPropiedad };
  enum?: (string | number)[];
  minimum?: number;
  maximum?: number;
  $ref?: string;
}

export interface MetodoInfoDTO {
  slug: string;
  nombre_libro: string;
  pagina: number;
  unidad: number;
  capitulo: string;
  esquema_entrada: EsquemaEntrada;
  ejemplo: Record<string, unknown>;
}

export interface ErrorDTO {
  detail: string;
}

// ---- Modo Comprobación Docente (backend/app/presentation/routes_docente.py) ----

export interface EvidenciaDTO {
  id: number;
  matricula: string;
  nivel: number;
  metodo: string;
  funcion: string;
  resultado_exacto: string;
  error: number | null;
  iteraciones_json: Record<string, string | null>[];
  foto_procedimiento_url: string;
  foto_canvas_url: string;
  fecha_registro: string;
}

/** Campos del FormData de POST /api/evidencias (archivos: foto_procedimiento, foto_canvas). */
export interface EvidenciaFormCampos {
  matricula: string;
  nivel: string;
  metodo: string;
  funcion: string;
  resultado_exacto: string;
  error: string; // vacío si el método no reporta Є
  iteraciones_json: string; // JSON.stringify(filas)
}
