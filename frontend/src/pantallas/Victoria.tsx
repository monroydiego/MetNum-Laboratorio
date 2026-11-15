// Pantalla de victoria con estadísticas reales de la partida.
import { FlaskConical, Map as IconoMapa, RotateCcw } from 'lucide-react';
import { extrasResueltas, formatearTiempo, requeridasResueltas, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { SALAS } from '../juego/mapa';

interface Props {
  estado: EstadoJuego;
  onNueva: () => void;
  onMapa: () => void;
  onProfesor: () => void;
}

export function Victoria({ estado, onNueva, onMapa, onProfesor }: Props) {
  const resueltas = requeridasResueltas(estado);
  const totalExtras = SALAS.flatMap((s) => s.consolas).filter((c) => c.tipo === 'extra' || c.tipo === 'consulta').length;
  const stats: [string, string][] = [
    ['Métodos obligatorios resueltos', `${resueltas} de ${TOTAL_REQUERIDAS}`],
    ['Terminales opcionales', `${extrasResueltas(estado)} de ${totalExtras}`],
    ['Puntos de misión', String(estado.puntos)],
    ['Tiempo de misión', formatearTiempo(estado.tiempoMs)],
    ['Golpes recibidos', String(estado.danosRecibidos)],
    ['Reapariciones', String(estado.reapariciones)],
  ];
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 py-8">
      <header className="flex flex-col gap-3">
        <p className="m-0 font-display text-base text-menta">OMEGA desconectada</p>
        <h1 className="m-0 text-h2 sm:text-h1">Laboratorio recuperado</h1>
        <p className="m-0 text-xl text-tenue">
          Recuperaste los cuatro sectores, desactivaste los tres escudos con cálculos reales y derrotaste al núcleo OMEGA.
        </p>
      </header>
      <dl className="m-0 grid gap-3 sm:grid-cols-2">
        {stats.map(([k, v], i) => (
          <div key={k} className={`flex flex-col gap-1 rounded-xl border px-5 py-4 ${i === 0 ? 'border-cian-2 bg-cian/5 sm:col-span-2' : 'border-linea bg-panel'}`}>
            <dt className="text-sm text-tenue">{k}</dt>
            <dd className={`numero m-0 ${i === 0 ? 'text-h2 text-cian' : 'text-xl'}`}>{v}</dd>
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
