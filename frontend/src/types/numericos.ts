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

/** GET /api/metodos/{slug}/problema: problema aleatorio verificado (cuerpo listo para /api/calcular/{slug}). */
export interface ProblemaDTO {
  slug: string;
  entrada: Record<string, unknown>;
  /** Valores que el alumno debe capturar (vacío en métodos de consulta). */
  campos_respuesta: string[];
}

/** POST /api/problemas/revisar: si los datos ya no cumplen las restricciones del método, llegan otros. */
export interface RevisionDTO extends ProblemaDTO {
  reemplazado: boolean;
}

/** POST /api/problemas/verificar (multipart con la foto obligatoria): la resolución solo llega si es correcta. */
export interface VerificacionDTO {
  correcta: boolean;
  campos: Record<string, boolean>;
  resultado: ResultadoNumericoDTO | null;
  /** Folio del intento (con la foto del procedimiento) en el Panel Docente. */
  folio: number;
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
  /** "" en los intentos de respuesta del juego (solo llevan la foto del procedimiento). */
  foto_canvas_url: string;
  /** Intento del juego: ¿respuesta correcta? (null = evidencia del Modo Comprobación). */
  correcta: boolean | null;
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
