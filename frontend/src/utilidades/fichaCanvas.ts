// Ficha PNG de respaldo para la evidencia cuando el resultado no trae gráfica.
// Los valores se dibujan con el string EXACTO de Python.
import type { ResultadoNumericoDTO } from '../types/numericos';
import { color, fuente } from '../tokens';

export function fichaResultadoPNG(r: ResultadoNumericoDTO): Promise<Blob | null> {
  const W = 900;
  const entradas = Object.entries(r.resultado);
  const filas = r.filas.slice(0, 12);
  const H = 140 + entradas.length * 30 + (filas.length ? 50 + filas.length * 24 : 0);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  if (!c) return Promise.resolve(null);
  c.fillStyle = color.panel;
  c.fillRect(0, 0, W, H);
  c.fillStyle = color.primario;
  c.fillRect(0, 0, W, 4);
  c.fillStyle = color.tinta;
  c.font = `600 24px ${fuente.display}`;
  c.fillText(r.nombre_libro, 32, 50);
  c.fillStyle = color.tenue;
  c.font = `15px ${fuente.sans}`;
  c.fillText(`Libro de Métodos Numéricos, página ${r.pagina}`, 32, 78);
  let y = 120;
  c.font = `16px ${fuente.mono}`;
  for (const [k, v] of entradas) {
    c.fillStyle = color.tenue;
    c.fillText(`${k} =`, 32, y);
    c.fillStyle = color.tinta;
    c.fillText(v, 32 + c.measureText(`${k} = `).width, y);
    y += 30;
  }
  if (filas.length) {
    y += 20;
    const cols = r.columnas.slice(0, 7);
    const ancho = (W - 64) / Math.max(1, cols.length);
    c.font = `600 14px ${fuente.display}`;
    c.fillStyle = color.tenue;
    cols.forEach((col, j) => c.fillText(col.clave, 32 + j * ancho, y));
    c.font = `13px ${fuente.mono}`;
    c.fillStyle = color.tinta;
    for (const f of filas) {
      y += 24;
      cols.forEach((col, j) => {
        const v = f[col.clave] ?? '—';
        c.fillText(v.length > 16 ? v.slice(0, 15) + '…' : v, 32 + j * ancho, y);
      });
    }
  }
  return new Promise((resolver) => canvas.toBlob((b) => resolver(b), 'image/png'));
}
