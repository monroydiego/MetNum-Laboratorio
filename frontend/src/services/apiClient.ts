import type {
  DocenteDTO,
  EvidenciaDTO,
  EvidenciaFormCampos,
  MetodoInfoDTO,
  ProblemaDTO,
  RecordDTO,
  ResumenMatriculaDTO,
  ResultadoNumericoDTO,
  RevisionDTO,
  VerificacionDTO,
} from '../types/numericos';

const BASE = '/api';

const MENSAJE_SIN_CONEXION =
  'No hay conexión con el servidor de cálculo. Inicia el backend con «npm run dev:back» y vuelve a intentarlo.';

/** Error de la API con un mensaje listo para mostrar y, si aplica, errores por campo. */
export class ErrorApi extends Error {
  readonly estado: number;
  readonly campos: Record<string, string>;
  readonly sinConexion: boolean;

  constructor(mensaje: string, estado: number, campos: Record<string, string> = {}, sinConexion = false) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.campos = campos;
    this.sinConexion = sinConexion;
  }
}

interface ErrorValidacionPydantic {
  loc?: (string | number)[];
  msg?: string;
}

/** Convierte el `detail` de FastAPI (string o lista de Pydantic) en mensaje + mapa de campos. */
function interpretarDetalle(detail: unknown): { mensaje: string; campos: Record<string, string> } {
  if (typeof detail === 'string') return { mensaje: detail, campos: {} };
  if (Array.isArray(detail)) {
    const campos: Record<string, string> = {};
    const lineas = (detail as ErrorValidacionPydantic[]).map((e) => {
      const ruta = (e.loc ?? []).filter((p) => p !== 'body');
      const campo = ruta.length ? String(ruta[0]) : '';
      const msg = traducirMensajePydantic(e.msg ?? 'valor no válido');
      if (campo && !campos[campo]) campos[campo] = msg;
      return campo ? `«${ruta.join('.')}»: ${msg}` : msg;
    });
    return { mensaje: `Revisa los datos de entrada. ${lineas.join(' ')}`, campos };
  }
  return { mensaje: 'El servidor rechazó los datos sin dar detalles.', campos: {} };
}

function traducirMensajePydantic(msg: string): string {
  const tabla: [RegExp, string][] = [
    [/^Field required$/i, 'este campo es obligatorio.'],
    [/valid integer/i, 'debe ser un número entero.'],
    [/valid number/i, 'debe ser un número.'],
    [/valid string/i, 'debe ser texto.'],
    [/valid list/i, 'debe ser una lista de valores.'],
    [/greater than or equal to (\S+)/i, 'debe ser mayor o igual que $1.'],
    [/less than or equal to (\S+)/i, 'debe ser menor o igual que $1.'],
  ];
  for (const [re, texto] of tabla) {
    const m = msg.match(re);
    if (m) return texto.replace('$1', m[1] ?? '');
  }
  return msg;
}

async function solicitar<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ErrorApi(MENSAJE_SIN_CONEXION, 0, {}, true);
  }

  const tipo = res.headers.get('content-type') ?? '';
  const esJson = tipo.includes('application/json');

  if (!res.ok) {
    // El proxy de Vite responde 500/502/504 sin JSON cuando el backend está apagado.
    if (!esJson && res.status >= 500) throw new ErrorApi(MENSAJE_SIN_CONEXION, res.status, {}, true);
    let cuerpo: unknown = null;
    try {
      cuerpo = esJson ? await res.json() : await res.text();
    } catch {
      cuerpo = null;
    }
    const detalle = cuerpo && typeof cuerpo === 'object' && 'detail' in cuerpo ? (cuerpo as { detail: unknown }).detail : cuerpo;
    if (res.status === 404 && typeof detalle !== 'string') {
      throw new ErrorApi('El servidor no reconoce este recurso. Puede que el método aún no esté registrado.', 404);
    }
    const { mensaje, campos } = interpretarDetalle(detalle);
    throw new ErrorApi(mensaje, res.status, campos);
  }

  if (!esJson) throw new ErrorApi('El servidor respondió en un formato inesperado.', res.status);
  return (await res.json()) as T;
}

export function listarMetodos(): Promise<MetodoInfoDTO[]> {
  return solicitar<MetodoInfoDTO[]>(`${BASE}/metodos`);
}

/** Problema nuevo y distinto cada vez, con datos parecidos a los del libro que cumplen las restricciones del método. */
export function obtenerProblema(slug: string): Promise<ProblemaDTO> {
  return solicitar<ProblemaDTO>(`${BASE}/metodos/${encodeURIComponent(slug)}/problema`);
}

/** Revisa un problema guardado: si ya no cumple las restricciones del método, el servidor lo cambia por otro. */
export function revisarProblema(slug: string, entrada: Record<string, unknown>): Promise<RevisionDTO> {
  return solicitar<RevisionDTO>(`${BASE}/problemas/revisar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, entrada }),
  });
}

export interface DatosVerificacion {
  slug: string;
  entrada: Record<string, unknown>;
  respuesta: Record<string, string>;
  matricula: string;
  nivel: number;
  /** Foto OBLIGATORIA del procedimiento hecho a mano (queda guardada para el docente). */
  foto: Blob;
}

/** Verifica lo que el alumno obtuvo a mano (parte entera y 3 decimales), junto con la foto de su procedimiento. */
export function verificarRespuesta(d: DatosVerificacion): Promise<VerificacionDTO> {
  const form = new FormData();
  form.append('slug', d.slug);
  form.append('entrada', JSON.stringify(d.entrada));
  form.append('respuesta', JSON.stringify(d.respuesta));
  form.append('matricula', d.matricula);
  form.append('nivel', String(d.nivel));
  form.append('foto_procedimiento', d.foto, d.foto instanceof File ? d.foto.name : 'procedimiento.png');
  return solicitar<VerificacionDTO>(`${BASE}/problemas/verificar`, { method: 'POST', body: form });
}

export function calcular(slug: string, payload: Record<string, unknown>): Promise<ResultadoNumericoDTO> {
  return solicitar<ResultadoNumericoDTO>(`${BASE}/calcular/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function enviarEvidencia(
  campos: EvidenciaFormCampos,
  fotoProcedimiento: Blob,
  fotoCanvas: Blob,
): Promise<EvidenciaDTO> {
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) form.append(clave, valor);
  const nombreFoto = fotoProcedimiento instanceof File ? fotoProcedimiento.name : 'procedimiento.png';
  form.append('foto_procedimiento', fotoProcedimiento, nombreFoto);
  form.append('foto_canvas', fotoCanvas, 'grafica.png');
  return solicitar<EvidenciaDTO>(`${BASE}/evidencias`, { method: 'POST', body: form });
}

export function listarEvidencias(limite = 50, matricula?: string): Promise<EvidenciaDTO[]> {
  const params = new URLSearchParams({ limite: String(limite) });
  if (matricula?.trim()) params.set('matricula', matricula.trim());
  return solicitar<EvidenciaDTO[]>(`${BASE}/evidencias?${params.toString()}`);
}

export function registrarRecord(d: { matricula: string; modo: string; tiempo_ms: number; puntos: number }): Promise<RecordDTO> {
  return solicitar<RecordDTO>(`${BASE}/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d),
  });
}

export function listarMatriculas(): Promise<ResumenMatriculaDTO[]> {
  return solicitar<ResumenMatriculaDTO[]>(`${BASE}/docente/matriculas`);
}

// ---- Acceso del docente (sesión por cookie HttpOnly) ----

export function iniciarSesionDocente(correo: string, clave: string): Promise<DocenteDTO> {
  return solicitar<DocenteDTO>(`${BASE}/docente/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, clave }),
  });
}

/** Devuelve el docente con sesión vigente o null (sin sesión / sin conexión). */
export async function sesionDocente(): Promise<DocenteDTO | null> {
  try {
    return await solicitar<DocenteDTO>(`${BASE}/docente/sesion`);
  } catch {
    return null;
  }
}

export async function cerrarSesionDocente(): Promise<void> {
  try {
    await fetch(`${BASE}/docente/logout`, { method: 'POST' });
  } catch {
    // sin conexión: la cookie caduca sola
  }
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ErrorApi) return e.message;
  if (e instanceof Error) return e.message;
  return 'Ocurrió un error inesperado.';
}
