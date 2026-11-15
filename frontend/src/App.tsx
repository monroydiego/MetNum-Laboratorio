// Raíz de la aplicación: pantallas del juego, modales globales y atajos T/H/M.
import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, DoorOpen, FlaskConical, HelpCircle, Map as IconoMapa, Volume2, VolumeX } from 'lucide-react';
import { ProveedorCatalogo } from './catalogo/ProveedorCatalogo';
import { guardarSonidoActivo, useEstadoJuego } from './juego/estado';
import { fijarSonido, sonar, sonidoActivo } from './juego/sonido';
import { Aviso } from './componentes/Aviso';
import { Ayuda } from './componentes/Ayuda';
import { ModoProfesor } from './componentes/ModoProfesor';
import { PanelDocente } from './componentes/PanelDocente';
import { Inicio } from './pantallas/Inicio';
import { MapaSector } from './pantallas/MapaSector';
import { Sala } from './pantallas/Sala';
import { Victoria } from './pantallas/Victoria';
import type { IdSala } from './juego/mapa';

export type TonoAviso = 'info' | 'exito' | 'peligro';
type Pantalla = 'inicio' | 'mapa' | 'sala' | 'victoria';
type Modal = 'profesor' | 'docente' | 'ayuda' | null;

function esCampoEditable(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

export default function App() {
  return (
    <ProveedorCatalogo>
      <Juego />
    </ProveedorCatalogo>
  );
}

function Juego() {
  const [estado, despachar] = useEstadoJuego();
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [modal, setModal] = useState<Modal>(null);
  const [sonido, setSonido] = useState(sonidoActivo());
  const [aviso, setAviso] = useState<{ texto: string; tono: TonoAviso; id: number } | null>(null);

  const avisar = useCallback((texto: string, tono: TonoAviso = 'info') => setAviso({ texto, tono, id: Date.now() + Math.random() }), []);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const alternarSonido = useCallback(() => {
    const nuevo = !sonidoActivo();
    fijarSonido(nuevo);
    guardarSonidoActivo(nuevo);
    setSonido(nuevo);
    if (nuevo) sonar('clic');
  }, []);

  // Atajos globales: T modo profesor, H ayuda, M sonido. Esc lo gestiona cada <dialog>.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || esCampoEditable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'm') return alternarSonido();
      if (document.querySelector('dialog[open]')) return;
      if (k === 't') setModal('profesor');
      else if (k === 'h') setModal('ayuda');
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [alternarSonido]);

  function entrar(id: IdSala) {
    despachar({ tipo: 'entrarSala', sala: id });
    setPantalla('sala');
    sonar('puerta');
  }

  const modales = (
    <>
      {modal === 'profesor' && <ModoProfesor matricula={estado.matricula} onCerrar={() => setModal(null)} />}
      {modal === 'docente' && <PanelDocente matriculaInicial="" onCerrar={() => setModal(null)} />}
      {modal === 'ayuda' && <Ayuda onCerrar={() => setModal(null)} />}
      <Aviso mensaje={aviso} onFin={cerrarAviso} />
    </>
  );

  if (pantalla === 'inicio') {
    return (
      <>
        <Inicio
          estado={estado}
          onContinuar={() => setPantalla(estado.victoria ? 'victoria' : 'mapa')}
          onNueva={(m) => {
            despachar({ tipo: 'nuevaPartida', matricula: m });
            setPantalla('mapa');
            sonar('clic');
          }}
          onProfesor={() => setModal('profesor')}
          onDocente={() => setModal('docente')}
        />
        {modales}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-linea bg-panel/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2.5 sm:px-6">
          <button type="button" className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left text-tinta" onClick={() => setPantalla('inicio')}>
            <span className="grid size-9 place-items-center rounded-xl bg-primario text-white shadow-sm">
              <FlaskConical size={20} aria-hidden />
            </span>
            <span className="font-display text-base leading-tight font-semibold max-sm:sr-only sm:text-lg">Laboratorio Numérico II</span>
          </button>

          {/* Navegación del juego: plano y sala actual, como pestañas. */}
          <nav className="flex gap-1 rounded-full bg-panel-2 p-1" aria-label="Juego">
            {(['mapa', 'sala'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-current={pantalla === p ? 'page' : undefined}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 py-1.5 font-display text-sm font-semibold transition-colors ${
                  pantalla === p ? 'bg-panel text-primario shadow-sm' : 'bg-transparent text-tenue hover:text-tinta'
                }`}
                onClick={() => (p === 'sala' ? entrar(estado.salaActual) : setPantalla('mapa'))}
              >
                {p === 'mapa' ? <IconoMapa size={15} aria-hidden /> : <DoorOpen size={15} aria-hidden />}
                {p === 'mapa' ? 'Plano' : 'Sala'}
              </button>
            ))}
          </nav>

          {/* Herramientas: docentes a la izquierda, preferencias a la derecha. */}
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className="btn btn-fantasma" onClick={() => setModal('profesor')} title="Modo profesor (T)">
              <FlaskConical size={16} aria-hidden /> <span className="max-md:sr-only">Modo profesor</span>
            </button>
            <button type="button" className="btn btn-fantasma" onClick={() => setModal('docente')}>
              <ClipboardList size={16} aria-hidden /> <span className="max-md:sr-only">Panel Docente</span>
            </button>
            <span className="mx-1 h-6 w-px bg-linea" aria-hidden />
            <button type="button" className="btn btn-fantasma px-2.5" onClick={() => setModal('ayuda')} title="Ayuda (H)">
              <HelpCircle size={18} aria-hidden /> <span className="sr-only">Ayuda</span>
            </button>
            <button
              type="button"
              className="btn btn-fantasma px-2.5"
              onClick={alternarSonido}
              aria-pressed={sonido}
              title={sonido ? 'Silenciar (M)' : 'Activar sonido (M)'}
            >
              {sonido ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
              <span className="sr-only">Sonido</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[100rem] flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {pantalla === 'mapa' && <MapaSector estado={estado} onEntrar={entrar} />}
        {pantalla === 'sala' && (
          <Sala
            estado={estado}
            despachar={despachar}
            pausaExterna={modal !== null}
            onVictoria={() => setPantalla('victoria')}
            avisar={avisar}
          />
        )}
        {pantalla === 'victoria' && (
          <Victoria
            estado={estado}
            onNueva={() => {
              despachar({ tipo: 'nuevaPartida', matricula: estado.matricula });
              setPantalla('mapa');
            }}
            onMapa={() => setPantalla('mapa')}
            onProfesor={() => setModal('profesor')}
          />
        )}
      </main>
      {modales}
    </div>
  );
}
