// Pantalla de victoria con estadísticas reales de la partida.
import { FlaskConical, Map as IconoMapa, RotateCcw } from 'lucide-react';
import { formatearTiempo, requeridasResueltas, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';

interface Props {
  estado: EstadoJuego;
  onNueva: () => void;
  onMapa: () => void;
  onProfesor: () => void;
}

export function Victoria({ estado, onNueva, onMapa, onProfesor }: Props) {
  const resueltas = requeridasResueltas(estado);
  const stats: [string, string][] = [
    ['Problemas resueltos', `${resueltas} de ${TOTAL_REQUERIDAS}`],
    ['Respuestas incorrectas', String(estado.respuestasIncorrectas)],
    ['Puntos de misión', String(estado.puntos)],
    ['Tiempo de misión', formatearTiempo(estado.tiempoMs)],
    ['Golpes recibidos', String(estado.danosRecibidos)],
    ['Vidas perdidas', String(estado.reapariciones)],
    ['Salas reiniciadas', String(estado.salasReiniciadas)],
  ];
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
      <header className="flex flex-col gap-3">
        <p className="m-0 font-display text-base text-menta">OMEGA desconectada</p>
        <h1 className="m-0 text-h2 sm:text-h1">Laboratorio recuperado</h1>
        <p className="m-0 text-xl text-tenue">
          Recuperaste las seis salas, desactivaste los ocho escudos de ecuaciones diferenciales resolviéndolos a mano y derrotaste al núcleo OMEGA.
        </p>
      </header>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        {stats.map(([k, v], i) => (
          <div key={k} className={`flex flex-col gap-1 rounded-xl border px-5 py-4 ${i === 0 ? 'border-primario-2 bg-primario/5 sm:col-span-2' : 'tarjeta'}`}>
            <dt className="text-sm text-tenue">{k}</dt>
            <dd className={`numero m-0 ${i === 0 ? 'text-h2 text-primario' : 'text-xl'}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primario" onClick={onNueva}>
          <RotateCcw size={16} aria-hidden /> Volver a jugar
        </button>
        <button type="button" className="btn" onClick={onMapa}>
          <IconoMapa size={16} aria-hidden /> Ver el plano
        </button>
        <button type="button" className="btn" onClick={onProfesor}>
          <FlaskConical size={16} aria-hidden /> Modo profesor
        </button>
      </div>
    </main>
  );
}
