import { useEffect } from 'react';

interface Props {
  mensaje: { texto: string; tono: 'info' | 'exito' | 'peligro'; id: number } | null;
  onFin: () => void;
}

/** Cartela por tono: tinta (info), el verde que regresa (éxito) y el rojo de OMEGA (peligro). */
const TONOS = {
  info: 'bg-tinta',
  exito: 'bg-menta',
  peligro: 'bg-hostil animate-sacudida',
} as const;

/** Aviso flotante breve (aria-live) para mensajes del juego, como intertítulo de cine mudo. */
export function Aviso({ mensaje, onFin }: Props) {
  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(onFin, 3100);
    return () => window.clearTimeout(t);
  }, [mensaje, onFin]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      {mensaje && (
        <div key={mensaje.id} className="animate-aparecer">
          <p className={`intertitulo m-0 max-w-xl rounded-md px-5 py-3 text-center font-display text-sm tracking-wide text-papel shadow-tinta ${TONOS[mensaje.tono]}`}>
            {mensaje.texto}
          </p>
        </div>
      )}
    </div>
  );
}
