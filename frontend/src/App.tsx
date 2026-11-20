// Raíz de la aplicación: pantallas del juego, modales globales y atajos T/H/M.
import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, DoorOpen, FlaskConical, HelpCircle, Lock, LogOut, Map as IconoMapa, Volume2, VolumeX } from 'lucide-react';
import { ProveedorCatalogo } from './catalogo/ProveedorCatalogo';
import { guardarSonidoActivo, useEstadoJuego } from './juego/estado';
import { fijarSonido, sonar, sonidoActivo } from './juego/sonido';
import { Aviso } from './componentes/Aviso';
import { MatrazMascota } from './componentes/MatrazMascota';
import { AccesoDocente } from './componentes/AccesoDocente';
import { Ayuda } from './componentes/Ayuda';
import { AjusteLetra } from './componentes/AjusteLetra';
import { cerrarSesionDocente, sesionDocente } from './services/apiClient';
import { ModoProfesor } from './componentes/ModoProfesor';
import { PanelDocente } from './componentes/PanelDocente';
import { Inicio } from './pantallas/Inicio';
import { MapaSector } from './pantallas/MapaSector';
import { Sala } from './pantallas/Sala';
import { Victoria } from './pantallas/Victoria';
import type { IdSala } from './juego/mapa';

export type TonoAviso = 'info' | 'exito' | 'peligro';
type Pantalla = 'inicio' | 'mapa' | 'sala' | 'victoria';
type Modal = 'profesor' | 'docente' | 'ayuda' | 'acceso' | null;
type Herramienta = 'profesor' | 'docente';
const NOMBRE_HERRAMIENTA = { profesor: 'Modo profesor', docente: 'Panel Docente' } as const;

/** Botón de herramienta sobre la cartela negra de la cabecera (texto blanco, hover plata). */
const BOTON_CABECERA =
  'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-3 font-display text-sm tracking-wide text-papel transition-colors hover:bg-papel/15';

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
  // Docente con sesión vigente (correo) y herramienta que pidió el acceso.
  const [docente, setDocente] = useState<string | null>(null);
  const [destino, setDestino] = useState<Herramienta>('docente');
  const [aviso, setAviso] = useState<{ texto: string; tono: TonoAviso; id: number } | null>(null);

  const avisar = useCallback((texto: string, tono: TonoAviso = 'info') => setAviso({ texto, tono, id: Date.now() + Math.random() }), []);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    let vigente = true;
    sesionDocente().then((d) => vigente && setDocente(d?.correo ?? null));
    return () => {
      vigente = false;
    };
  }, []);

  /** Modo profesor y Panel Docente: con sesión se abren; sin ella piden correo y contraseña. */
  const abrirHerramienta = useCallback(
    (h: Herramienta) => {
      if (docente) setModal(h);
      else {
        setDestino(h);
        setModal('acceso');
      }
    },
    [docente],
  );

  const salirDocente = useCallback(() => {
    void cerrarSesionDocente();
    setDocente(null);
    setModal(null);
    avisar('Sesión docente cerrada.', 'info');
  }, [avisar]);

  const sesionExpirada = useCallback(() => {
    setDocente(null);
    setDestino('docente');
    setModal('acceso');
  }, []);

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
      if (k === 't') abrirHerramienta('profesor');
      else if (k === 'h') setModal('ayuda');
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [alternarSonido, abrirHerramienta]);

  function entrar(id: IdSala) {
    despachar({ tipo: 'entrarSala', sala: id });
    setPantalla('sala');
    sonar('puerta');
  }

  const modales = (
    <>
      {modal === 'acceso' && (
        <AccesoDocente
          destino={NOMBRE_HERRAMIENTA[destino]}
          onCerrar={() => setModal(null)}
          onAcceso={(correo) => {
            setDocente(correo);
            setModal(destino);
          }}
        />
      )}
      {modal === 'profesor' && docente && <ModoProfesor matricula={estado.matricula} onCerrar={() => setModal(null)} />}
      {modal === 'docente' && docente && (
        <PanelDocente correo={docente} onCerrar={() => setModal(null)} onSalir={salirDocente} onSesionExpirada={sesionExpirada} />
      )}
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
          docente={docente}
          onNueva={(m, modo) => {
            despachar({ tipo: 'nuevaPartida', matricula: m, modo });
            setPantalla('mapa');
            sonar('clic');
          }}
          onProfesor={() => abrirHerramienta('profesor')}
          onDocente={() => abrirHerramienta('docente')}
        />
        {/* La portada no tiene cabecera: la tuerca va fija en la esquina superior derecha. */}
        <AjusteLetra tono="oscuro" className="fixed top-3 right-3 z-30" />
        {modales}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Cabecera: cartela negra de cine mudo con perforaciones de cinta en el borde inferior. */}
      <header className="sticky top-0 z-30 bg-tinta text-papel">
        <div className="mx-auto flex w-full max-w-[100rem] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="group flex cursor-pointer items-center gap-2.5 rounded-full border-0 bg-transparent p-0 pr-2 text-left text-papel"
            onClick={() => setPantalla('inicio')}
            title="Volver a la portada"
          >
            <span className="grid size-11 place-items-center rounded-full border-[length:var(--trazo-medio)] border-papel bg-papel shadow-oro-sm transition-transform duration-150 ease-elastico group-hover:-rotate-6">
              <MatrazMascota quieta className="h-9 w-auto" />
            </span>
            <span className="flex flex-col leading-none max-sm:sr-only">
              <span className="font-display text-lg tracking-wide">Laboratorio Numérico II</span>
              <span className="mt-1 text-sm text-primario-2">Escape del laboratorio</span>
            </span>
          </button>

          {/* Navegación del juego: plano y sala actual, como pestañas de cartela. */}
          <nav className="flex gap-1 rounded-full border-[length:var(--trazo-fino)] border-papel/60 p-1" aria-label="Juego">
            {(['mapa', 'sala'] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-current={pantalla === p ? 'page' : undefined}
                className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 px-3.5 py-1 font-display text-sm tracking-wide transition-colors ${
                  pantalla === p ? 'bg-ambar-2 text-tinta' : 'bg-transparent text-papel hover:bg-papel/15'
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
            <button type="button" className={BOTON_CABECERA} onClick={() => abrirHerramienta('profesor')} title="Modo profesor (T)">
              {docente ? <FlaskConical size={16} aria-hidden /> : <Lock size={16} aria-hidden />} <span className="max-md:sr-only">Modo profesor</span>
            </button>
            <button type="button" className={BOTON_CABECERA} onClick={() => abrirHerramienta('docente')}>
              {docente ? <ClipboardList size={16} aria-hidden /> : <Lock size={16} aria-hidden />} <span className="max-md:sr-only">Panel Docente</span>
            </button>
            {docente && (
              <button type="button" className={`${BOTON_CABECERA} px-2.5`} onClick={salirDocente} title="Cerrar sesión docente">
                <LogOut size={16} aria-hidden /> <span className="sr-only">Cerrar sesión docente</span>
              </button>
            )}
            <span className="mx-1 h-6 w-0.5 rounded-full bg-papel/40" aria-hidden />
            <button type="button" className={`${BOTON_CABECERA} px-2.5`} onClick={() => setModal('ayuda')} title="Ayuda (H)">
              <HelpCircle size={18} aria-hidden /> <span className="sr-only">Ayuda</span>
            </button>
            <button
              type="button"
              className={`${BOTON_CABECERA} px-2.5`}
              onClick={alternarSonido}
              aria-pressed={sonido}
              title={sonido ? 'Silenciar (M)' : 'Activar sonido (M)'}
            >
              {sonido ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />}
              <span className="sr-only">Sonido</span>
            </button>
            <AjusteLetra />
          </div>
        </div>
        <div className="tira-pelicula h-3.5 rounded-none border-t border-papel/25" aria-hidden />
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
              despachar({ tipo: 'nuevaPartida', matricula: estado.matricula, modo: estado.modo });
              setPantalla('mapa');
            }}
            onMapa={() => setPantalla('mapa')}
            onProfesor={() => abrirHerramienta('profesor')}
          />
        )}
      </main>
      {modales}
    </div>
  );
}
