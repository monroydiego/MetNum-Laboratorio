/** Matrícula del alumno: exactamente 7 dígitos. Misma regla que backend/app/domain/matricula.py. */
export const MATRICULA_DIGITOS = 7;
export const MENSAJE_MATRICULA = 'La matrícula debe tener exactamente 7 dígitos numéricos (sin letras ni símbolos).';

/** Quita lo que no sea dígito y recorta a 7 caracteres. */
export function limpiarMatricula(valor: string): string {
  return valor.replace(/[^0-9]/g, '').slice(0, MATRICULA_DIGITOS);
}

/** Vale solo si son exactamente 7 dígitos (sin espacios alrededor). */
export function esMatriculaValida(valor: string): boolean {
  return /^[0-9]{7}$/.test(valor.trim());
}
