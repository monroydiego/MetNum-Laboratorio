import { useEffect } from 'react';

interface Props {
  mensaje: { texto: string; tono: 'info' | 'exito' | 'peligro'; id: number } | null;
  onFin: () => void;
}

const TONOS = {
  info: 'border-primario-2 text-tinta',
  exito: 'border-menta text-menta',
  peligro: 'border-hostil text-hostil',
} as const;

/** Aviso flotante breve (aria-live) para mensajes del juego. */
export function Aviso({ mensaje, onFin }: Props) {
  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(onFin, 3100);
    return () => window.clearTimeout(t);
  }, [mensaje, onFin]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      {mensaje && (
        <p key={mensaje.id} className={`m-0 max-w-xl rounded-lg border bg-panel/95 px-4 py-2.5 text-sm shadow-lg shadow-[#22302d]/15 animate-aparecer ${TONOS[mensaje.tono]}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
