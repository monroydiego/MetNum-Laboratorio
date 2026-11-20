// Menú principal: cartela de título, selección de modo de juego (tres carteles de película),
// matrícula, partida guardada y zona docente protegida con acceso.
import { useId, useState, type ComponentType, type FormEvent } from 'react';
import { Check, ClipboardList, Clapperboard, Compass, FlaskConical, Lock, Play, PlugZap, RotateCcw, Timer } from 'lucide-react';
import { useCatalogo } from '../catalogo/contexto';
import { LIMITE_TERMINAL_MS, requeridasResueltas, VIDA_POR_TERMINAL_VENCIDA, TOTAL_REQUERIDAS, VIDAS_MAX, type EstadoJuego, type ModoJuego } from '../juego/estado';
import { SALAS } from '../juego/mapa';
import { esMatriculaValida, limpiarMatricula, MATRICULA_DIGITOS, MENSAJE_MATRICULA } from '../juego/matricula';
import { MatrazMascota } from '../componentes/MatrazMascota';

interface Props {
  estado: EstadoJuego;
  /** Correo del docente con sesión vigente, o null. */
  docente: string | null;
  onContinuar: () => void;
  onNueva: (matricula: string, modo: ModoJuego) => void;
  onProfesor: () => void;
  onDocente: () => void;
}

interface FichaModo {
  id: ModoJuego;
  nombre: string;
  etiqueta: string;
  lema: string;
  reglas: string[];
  Icono: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
}

const MINUTOS = LIMITE_TERMINAL_MS / 60000;

const MODOS_FICHA: FichaModo[] = [
  {
    id: 'campana',
    nombre: 'Campaña',
    etiqueta: 'La historia completa',
    lema: 'Recupera el laboratorio sala por sala hasta desconectar a OMEGA.',
    reglas: [`${SALAS.length} salas en orden`, `${VIDAS_MAX} vidas por sala`, 'Sin límite de tiempo'],
    Icono: Clapperboard,
  },
  {
    id: 'contrarreloj',
    nombre: 'Contrarreloj',
    etiqueta: `${MINUTOS} min por terminal`,
    lema: 'Cada terminal tiene su reloj, y tu tiempo total es tu récord.',
    reglas: [`El reloj de cada terminal inicia al pulsar E (${MINUTOS} min)`, `Si se agota: −${VIDA_POR_TERMINAL_VENCIDA} de vida y el reloj se restablece`, 'Tu récord es el tiempo de toda la misión'],
    Icono: Timer,
  },
  {
    id: 'practica',
    nombre: 'Práctica',
    etiqueta: 'Sin riesgo',
    lema: 'Entra a cualquier sala y ensaya los métodos sin perder vidas.',
    reglas: ['Todas las salas abiertas', 'Golpes y errores no restan vida', 'Tus intentos se registran igual'],
    Icono: Compass,
  },
];

export function Inicio({ estado, docente, onContinuar, onNueva, onProfesor, onDocente }: Props) {
  const id = useId();
  const [matricula, setMatricula] = useState(estado.matricula);
  const [avisoMatricula, setAvisoMatricula] = useState('');
  const [modo, setModo] = useState<ModoJuego>(estado.enCurso ? estado.modo : 'campana');
  const [confirmar, setConfirmar] = useState(false);
  const catalogo = useCatalogo();
  const hayPartida = estado.enCurso;
  const sala = SALAS.find((s) => s.id === estado.salaActual);
  const modoGuardado = MODOS_FICHA.find((m) => m.id === estado.modo);

  function nueva(e: FormEvent) {
    e.preventDefault();
    if (matricula && !esMatriculaValida(matricula)) {
      setAvisoMatricula(MENSAJE_MATRICULA);
      return;
    }
    if (hayPartida && !confirmar) {
      setConfirmar(true);
      return;
    }
    onNueva(matricula, modo);
  }

  return (
    <main className="entrada-iris mx-auto flex min-h-dvh max-w-6xl flex-col justify-center gap-7 px-4 py-8 sm:px-5 sm:py-10">
      {/* Cartela de título de un corto clásico: el único momento orquestado es el iris de entrada. */}
      <header className="relative grid items-center gap-y-0 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-x-0">
        <div className="intertitulo relative z-0 flex flex-col gap-4 rounded-sm px-6 pt-8 pb-7 shadow-tinta-lg sm:px-9 md:pr-24">
          <p className="m-0 font-sans text-base italic">Laboratorio Numérico II presenta</p>
          <h1 className="m-0 text-h2 sm:text-h1 lg:text-titulo">Escape del Laboratorio Numérico II</h1>
          <p className="cartel m-0 flex items-center gap-2 self-start text-sm">
            <FlaskConical size={18} aria-hidden /> Edición DELUXE
          </p>
        </div>
        <div
          className="relative z-10 mx-auto grid size-40 place-items-center rounded-full border-[length:var(--trazo-grueso)] border-tinta bg-papel shadow-oro max-md:-order-1 max-md:-mb-8 md:-ml-20 md:size-60"
          aria-hidden
        >
          <div className="rayos absolute inset-1 rounded-full" />
          <MatrazMascota className="relative h-4/5 w-auto" />
        </div>
      </header>

      <p className="m-0 max-w-3xl text-xl text-tenue">
        La IA <span className="font-display tracking-wide text-hostil">OMEGA</span> tomó el laboratorio. Esquiva a los centinelas y resuelve a mano cada
        problema con los métodos del libro para recuperar la instalación.
      </p>

      <form onSubmit={nueva} className="flex flex-col gap-6">
        {/* Selección de modo: tres carteles de película; la tecla ← → cambia de cartel (radio nativo). */}
        <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
          <legend className="mb-3 flex items-center gap-3 p-0 font-display text-h3 tracking-wide">
            <span className="cartel text-sm">Paso 1</span> Elige tu modo de juego
          </legend>
          <div className="grid gap-5 md:grid-cols-3">
            {MODOS_FICHA.map((m, i) => {
              const activo = modo === m.id;
              return (
                <label
                  key={m.id}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className={`tarjeta relative flex cursor-pointer animate-aparecer flex-col gap-3 p-5 transition-transform duration-200 ease-elastico hover:-translate-y-1 hover:-rotate-1 has-[:focus-visible]:-translate-y-1 has-[:focus-visible]:outline-[length:var(--trazo-medio)] has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-tinta ${
                    activo ? 'bg-ambar-2 shadow-oro' : ''
                  }`}
                >
                  <input type="radio" name={`${id}-modo`} value={m.id} checked={activo} onChange={() => setModo(m.id)} className="sr-only" />
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`grid size-14 place-items-center rounded-full border-[length:var(--trazo-medio)] border-tinta shadow-tinta-sm ${activo ? 'bg-papel' : 'bg-panel-2'}`}
                      aria-hidden
                    >
                      <m.Icono size={28} />
                    </span>
                    <span className="chapa text-sm text-tinta">{activo ? <><Check size={14} aria-hidden /> Elegido</> : m.etiqueta}</span>
                  </span>
                  <span className="font-display text-h3 leading-none tracking-wide">{m.nombre}</span>
                  <span className={`text-base ${activo ? 'text-tinta' : 'text-tenue'}`}>{m.lema}</span>
                  <ul className="m-0 mt-auto flex list-none flex-col gap-1 border-t-[length:var(--trazo-fino)] border-dashed border-tinta p-0 pt-3 text-sm">
                    {m.reglas.map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-tinta" aria-hidden /> {r}
                      </li>
                    ))}
                  </ul>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="tarjeta flex flex-col gap-5 p-6" aria-label="Iniciar partida">
            <h2 className="m-0 flex items-center gap-3 text-h3">
              <span className="cartel text-sm">Paso 2</span> A la pantalla
            </h2>
            {hayPartida && (
              <div className="flex flex-col gap-3 border-b-[length:var(--trazo-fino)] border-dashed border-tinta pb-5">
                <p className="m-0 text-tenue">
                  Partida guardada{estado.matricula ? ` de ${estado.matricula}` : ''} · modo <strong className="text-tinta">{modoGuardado?.nombre}</strong>:{' '}
                  {requeridasResueltas(estado)} de {TOTAL_REQUERIDAS} problemas, en {sala?.nombre}.
                </p>
                <div>
                  <button type="button" className="btn btn-primario" onClick={onContinuar} autoFocus>
                    <Play size={16} aria-hidden /> Continuar partida
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-mat`} className="font-display text-sm tracking-wide">
                Matrícula
              </label>
              <input
                id={`${id}-mat`}
                className="campo numero max-w-xs"
                value={matricula}
                maxLength={MATRICULA_DIGITOS}
                inputMode="numeric"
                pattern="[0-9]{7}"
                autoComplete="off"
                aria-invalid={avisoMatricula ? true : undefined}
                onChange={(e) => {
                  const limpia = limpiarMatricula(e.target.value);
                  setMatricula(limpia);
                  setAvisoMatricula(limpia === e.target.value ? '' : MENSAJE_MATRICULA);
                }}
                aria-describedby={`${id}-ayuda ${id}-aviso`}
              />
              <p id={`${id}-ayuda`} className="m-0 text-sm text-tenue">
                Firma las fotos de tus procedimientos que revisa tu docente. Si la dejas vacía, se te pedirá al verificar tu primera respuesta.
              </p>
              {avisoMatricula && (
                <p id={`${id}-aviso`} role="alert" className="m-0 text-sm font-bold text-hostil">
                  {avisoMatricula}
                </p>
              )}
            </div>
            {confirmar && (
              <p role="alert" className="m-0 animate-sacudida rounded-lg border-[length:var(--trazo-medio)] border-tinta bg-ambar-2 px-3 py-2 text-sm text-tinta shadow-tinta-sm">
                Empezar de nuevo borra el avance guardado. Pulsa otra vez el botón para confirmar.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={hayPartida ? 'btn' : 'btn btn-primario'}>
                {hayPartida ? <RotateCcw size={16} aria-hidden /> : <Play size={16} aria-hidden />} Nueva partida: {MODOS_FICHA.find((m) => m.id === modo)?.nombre}
              </button>
              {confirmar && (
                <button type="button" className="btn btn-fantasma" onClick={() => setConfirmar(false)}>
                  Cancelar
                </button>
              )}
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <div className="tarjeta flex flex-col gap-3 p-5">
              <h2 className="m-0 flex items-center gap-2 text-xl">
                <Lock size={18} aria-hidden /> Zona docente
              </h2>
              <p className="m-0 text-sm text-tenue">{docente ? `Sesión abierta: ${docente}` : 'Requiere correo y contraseña de docente.'}</p>
              <button type="button" className="btn justify-start" onClick={onProfesor}>
                <FlaskConical size={16} aria-hidden /> Modo profesor
              </button>
              <button type="button" className="btn justify-start" onClick={onDocente}>
                <ClipboardList size={16} aria-hidden /> Panel Docente
              </button>
            </div>
            <div className="tarjeta flex flex-col gap-2 p-5 text-sm">
              <h2 className="m-0 text-xl">Controles</h2>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-tenue">
                <li><kbd className="kbd">WASD</kbd> o flechas para moverte</li>
                <li><kbd className="kbd">E</kbd> abrir módulo, <kbd className="kbd">F</kbd> cruzar puerta</li>
                <li><kbd className="kbd">Espacio</kbd> disparar a OMEGA</li>
                <li><kbd className="kbd">T</kbd> modo profesor, <kbd className="kbd">H</kbd> ayuda, <kbd className="kbd">M</kbd> sonido</li>
              </ul>
              <p className="m-0 mt-2 flex items-start gap-2 text-tenue" aria-live="polite">
                {catalogo.estado === 'cargando' && 'Conectando con el servidor de cálculo…'}
                {catalogo.estado === 'listo' && `Servidor listo: ${catalogo.metodos.length} métodos.`}
                {catalogo.estado === 'error' && (
                  <span className="text-hostil">
                    <PlugZap size={14} className="mr-1 inline" aria-hidden />
                    {catalogo.error}
                  </span>
                )}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}
