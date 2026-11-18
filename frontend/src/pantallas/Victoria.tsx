// Pantalla de victoria: cartela de «Fin» de un corto clásico con estadísticas reales de la partida.
// Es el único momento en que TODO el laboratorio aparece coloreado.
import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Map as IconoMapa, RotateCcw, Trophy } from 'lucide-react';
import { registrarRecord } from '../services/apiClient';
import { formatearTiempo, requeridasResueltas, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { SALAS } from '../juego/mapa';
import { tintes } from '../tokens';
import { MatrazMascota } from '../componentes/MatrazMascota';

interface Props {
  estado: EstadoJuego;
  onNueva: () => void;
  onMapa: () => void;
  onProfesor: () => void;
}

export function Victoria({ estado, onNueva, onMapa, onProfesor }: Props) {
  const resueltas = requeridasResueltas(estado);
  // Récord de tiempo por matrícula: se registra una sola vez al llegar a la pantalla (no en Práctica).
  const [record, setRecord] = useState<{ ms: number; nuevo: boolean } | 'sin-registro' | null>(null);
  const enviado = useRef(false);
  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;
    if (estado.modo === 'practica' || !estado.matricula.trim()) {
      setRecord('sin-registro');
      return;
    }
    registrarRecord({ matricula: estado.matricula, modo: estado.modo, tiempo_ms: estado.tiempoMs, puntos: estado.puntos })
      .then((r) => setRecord({ ms: r.record_ms, nuevo: r.nuevo_record }))
      .catch(() => setRecord('sin-registro'));
  }, [estado.modo, estado.matricula, estado.tiempoMs, estado.puntos]);
  const stats: [string, string][] = [
    ['Problemas resueltos', `${resueltas} de ${TOTAL_REQUERIDAS}`],
    ['Respuestas incorrectas', String(estado.respuestasIncorrectas)],
    ['Puntos de misión', String(estado.puntos)],
    ['Tiempo de misión', formatearTiempo(estado.tiempoMs)],
    ['Golpes recibidos', String(estado.danosRecibidos)],
    ['Vidas perdidas', String(estado.reapariciones)],
    ['Salas reiniciadas', String(estado.salasReiniciadas)],
  ];
  const [principal, ...resto] = stats;
  return (
    <div className="entrada-iris mx-auto flex max-w-3xl flex-col gap-7 py-6 sm:py-8">
      {/* Cartela final con marco doble y la mascota saludando */}
      <header className="intertitulo flex flex-col items-center gap-3 rounded-md px-6 pt-8 pb-7 text-center shadow-tinta-lg sm:px-10">
        <p className="m-0 font-display text-titulo leading-none tracking-wide text-papel sm:text-cartela" aria-hidden>
          Fin
        </p>
        <div className="grid size-24 place-items-center rounded-full border-[length:var(--trazo-medio)] border-papel bg-papel shadow-oro" aria-hidden>
          <MatrazMascota className="h-20 w-auto" />
        </div>
        <p className="m-0 font-display text-base tracking-wide">OMEGA desconectada</p>
        <h1 className="m-0 text-h2 sm:text-h1">Laboratorio recuperado</h1>
        <p className="m-0 max-w-xl text-base sm:text-xl">
          Recuperaste las seis salas, desactivaste los ocho escudos de ecuaciones diferenciales resolviéndolos a mano y derrotaste al núcleo OMEGA.
        </p>
      </header>

      {/* Tira de película: las seis salas, ya coloreadas a mano */}
      <div className="flex flex-col gap-0" aria-label="Salas recuperadas" role="group">
        <div className="tira-pelicula h-4 rounded-b-none" aria-hidden />
        <ul className="m-0 grid list-none grid-cols-2 gap-1.5 bg-tinta px-1.5 py-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {SALAS.map((s, i) => (
            <li
              key={s.id}
              className="animate-colorear flex min-h-20 items-end rounded-sm border-[length:var(--trazo-fino)] border-papel p-1.5"
              style={{ backgroundColor: tintes[s.id], animationDelay: `${0.5 + i * 0.18}s` }}
            >
              <span className="w-full rounded-sm border border-tinta bg-papel px-1.5 py-0.5 text-sm leading-tight font-semibold text-tinta">{s.nombre}</span>
            </li>
          ))}
        </ul>
        <div className="tira-pelicula h-4 rounded-t-none" aria-hidden />
      </div>

      <p
        className={`m-0 flex flex-wrap items-center gap-2 rounded-lg border-[length:var(--trazo-medio)] border-tinta px-4 py-3 ${record && record !== 'sin-registro' && record.nuevo ? 'bg-ambar-2 shadow-oro' : 'bg-panel'}`}
        aria-live="polite"
      >
        <Trophy size={20} aria-hidden />
        {record === null && 'Registrando tu récord…'}
        {record === 'sin-registro' && (estado.modo === 'practica' ? 'La Práctica no registra récord.' : 'No se pudo registrar el récord (falta la matrícula o no hay conexión).')}
        {record && record !== 'sin-registro' && (
          <>
            {record.nuevo ? <strong>¡Nuevo récord!</strong> : 'Tu récord:'} <span className="numero font-bold">{formatearTiempo(record.ms)}</span>
            {!record.nuevo && <span className="text-tenue">(esta misión: {formatearTiempo(estado.tiempoMs)})</span>}
          </>
        )}
      </p>

      <dl className="fotograma m-0 grid gap-x-6 gap-y-0 p-5 sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-3 border-b-[length:var(--trazo-fino)] border-dashed border-tinta pb-3 sm:col-span-2">
          <dt className="font-display tracking-wide">{principal[0]}</dt>
          <dd className="numero m-0 text-h3 whitespace-nowrap sm:text-h2">{principal[1]}</dd>
        </div>
        {resto.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-linea py-2.5">
            <dt className="text-sm text-tenue">{k}</dt>
            <dd className="numero m-0 text-xl">{v}</dd>
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
    </div>
  );
}
