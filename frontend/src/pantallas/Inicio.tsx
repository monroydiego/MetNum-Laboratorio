// Pantalla de inicio: historia, continuar / nueva partida y matrícula opcional.
import { useId, useState, type FormEvent } from 'react';
import { ClipboardList, FlaskConical, Play, PlugZap, RotateCcw } from 'lucide-react';
import { useCatalogo } from '../catalogo/contexto';
import { requeridasResueltas, TOTAL_REQUERIDAS, type EstadoJuego } from '../juego/estado';
import { SALAS } from '../juego/mapa';

interface Props {
  estado: EstadoJuego;
  onContinuar: () => void;
  onNueva: (matricula: string) => void;
  onProfesor: () => void;
  onDocente: () => void;
}

export function Inicio({ estado, onContinuar, onNueva, onProfesor, onDocente }: Props) {
  const id = useId();
  const [matricula, setMatricula] = useState(estado.matricula);
  const [confirmar, setConfirmar] = useState(false);
  const catalogo = useCatalogo();
  const hayPartida = estado.enCurso;
  const sala = SALAS.find((s) => s.id === estado.salaActual);

  function nueva(e: FormEvent) {
    e.preventDefault();
    if (hayPartida && !confirmar) {
      setConfirmar(true);
      return;
    }
    onNueva(matricula);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-10 px-5 py-10">
      <header className="flex flex-col gap-4">
        <p className="m-0 flex items-center gap-2 font-display text-base text-cian">
          <FlaskConical size={20} aria-hidden /> Edición DELUXE
        </p>
        <h1 className="m-0 text-h2 sm:text-h1">Escape del Laboratorio Numérico II</h1>
        <p className="m-0 max-w-2xl text-xl text-tenue">
          La IA <span className="font-semibold text-omega">OMEGA</span> secuestró el laboratorio. Recorre sus cuatro sectores, esquiva a los centinelas y resuelve
          cada consola con los métodos del libro para recuperar la instalación.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
        <form onSubmit={nueva} className="flex flex-col gap-5 rounded-xl border border-linea bg-panel p-5">
          {hayPartida && (
            <div className="flex flex-col gap-3 border-b border-linea pb-5">
              <p className="m-0 text-tenue">
                Partida guardada{estado.matricula ? ` de ${estado.matricula}` : ''}: {requeridasResueltas(estado)} de {TOTAL_REQUERIDAS} consolas, en {sala?.nombre}.
              </p>
              <div>
                <button type="button" className="btn btn-primario" onClick={onContinuar} autoFocus>
                  <Play size={16} aria-hidden /> Continuar partida
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-mat`} className="text-sm font-semibold">
              Matrícula <span className="font-normal text-tenue">(opcional)</span>
            </label>
            <input
              id={`${id}-mat`}
              className="campo numero max-w-xs"
              value={matricula}
              maxLength={20}
              inputMode="numeric"
              autoComplete="off"
              onChange={(e) => setMatricula(e.target.value)}
              aria-describedby={`${id}-ayuda`}
            />
            <p id={`${id}-ayuda`} className="m-0 text-sm text-tenue">
              Se usa para firmar tus evidencias en el Modo Comprobación Docente.
            </p>
          </div>
          {confirmar && (
            <p role="alert" className="m-0 rounded-lg border border-ambar/50 bg-ambar/10 px-3 py-2 text-sm text-ambar">
              Empezar de nuevo borra el avance guardado. Pulsa otra vez «Nueva partida» para confirmar.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={hayPartida ? 'btn' : 'btn btn-primario'}>
              {hayPartida ? <RotateCcw size={16} aria-hidden /> : <Play size={16} aria-hidden />} Nueva partida
            </button>
            {confirmar && (
              <button type="button" className="btn btn-fantasma" onClick={() => setConfirmar(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <h2 className="m-0 text-base">Controles</h2>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-tenue">
              <li><kbd className="kbd">WASD</kbd> o flechas para moverte</li>
              <li><kbd className="kbd">E</kbd> activar consola, <kbd className="kbd">F</kbd> cruzar puerta</li>
              <li><kbd className="kbd">Espacio</kbd> disparar a OMEGA</li>
              <li><kbd className="kbd">T</kbd> modo profesor, <kbd className="kbd">H</kbd> ayuda, <kbd className="kbd">M</kbd> sonido</li>
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn justify-start" onClick={onProfesor}>
              <FlaskConical size={16} aria-hidden /> Modo profesor
            </button>
            <button type="button" className="btn justify-start" onClick={onDocente}>
              <ClipboardList size={16} aria-hidden /> Panel Docente
            </button>
          </div>
          <p className="m-0 flex items-start gap-2 text-sm text-tenue" aria-live="polite">
            {catalogo.estado === 'cargando' && 'Conectando con el servidor de cálculo…'}
            {catalogo.estado === 'listo' && `Servidor de cálculo listo: ${catalogo.metodos.length} métodos disponibles.`}
            {catalogo.estado === 'error' && (
              <span className="text-hostil">
                <PlugZap size={14} className="mr-1 inline" aria-hidden />
                {catalogo.error}
              </span>
            )}
          </p>
        </aside>
      </div>
    </main>
  );
}
