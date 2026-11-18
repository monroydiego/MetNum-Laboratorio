// Pantalla de sala: encabezado + barra de estado + canvas del juego + bitácora de problemas.
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { CheckCircle2, Circle, Clock, Shield } from 'lucide-react';
import { JuegoCanvas, type Indicacion } from '../juego/JuegoCanvas';
import { SALAS, indiceSala, nombreRespaldo, ROMANOS, type Consola, type Sala as SalaDef } from '../juego/mapa';
import {
  consecuenciaDano,
  escudosCaidos,
  progresoSala,
  requeridasResueltas,
  salaCompleta,
  restanteTerminal,
  VIDA_POR_TERMINAL_VENCIDA,
  TOTAL_REQUERIDAS,
  VIDA_POR_RESPUESTA_INCORRECTA,
  VIDAS_MAX,
  type Accion,
  type EstadoJuego,
} from '../juego/estado';
import { useCatalogo } from '../catalogo/contexto';
import { sonar } from '../juego/sonido';
import { color, tintes } from '../tokens';
import { Dialogo } from '../componentes/Dialogo';
import { CuentaTerminal, Hud } from '../componentes/Hud';
import { PanelMetodo } from '../componentes/PanelMetodo';
import type { TonoAviso } from '../App';

interface Props {
  estado: EstadoJuego;
  despachar: Dispatch<Accion>;
  pausaExterna: boolean;
  onVictoria: () => void;
  avisar: (texto: string, tono?: TonoAviso) => void;
}

const ACENTOS: Record<number, string> = { 1: color.primario, 2: color.azul, 3: color.ambar, 4: color.escudo };
const MENSAJE_REINICIO = `Perdiste tus ${VIDAS_MAX} vidas: la sala se reinicia. Sus problemas cambian y vuelven a quedar sin resolver.`;

export function Sala({ estado, despachar, pausaExterna, onVictoria, avisar }: Props) {
  const sala = SALAS[indiceSala(estado.salaActual)];
  const { estado: estadoCatalogo, porSlug } = useCatalogo();
  const [consolaAbierta, setConsolaAbierta] = useState<number | null>(null);
  const [indicacion, setIndicacion] = useState<Indicacion>({ tecla: null, texto: '' });
  const historiaPendiente = !estado.historiasVistas.includes(sala.id);

  const nombre = useCallback((slug: string) => porSlug.get(slug)?.nombre_libro ?? nombreRespaldo(slug), [porSlug]);
  const etiquetas = useMemo(() => sala.consolas.map((c) => nombre(c.slug)), [sala, nombre]);
  const disponibles = useMemo(
    () => sala.consolas.map((c) => estadoCatalogo !== 'listo' || porSlug.has(c.slug)),
    [sala, estadoCatalogo, porSlug],
  );

  const completa = salaCompleta(estado, sala);
  const escudos = escudosCaidos(estado, sala);
  const contrarreloj = estado.modo === 'contrarreloj';
  const pausado = pausaExterna || consolaAbierta !== null || historiaPendiente;
  // Contrarreloj: el récord es el tiempo TOTAL, así que el reloj sigue corriendo dentro de las terminales.
  const relojPausado = pausaExterna || historiaPendiente || (consolaAbierta !== null && !contrarreloj);

  // Cronómetro de la misión (solo mientras se juega y la pestaña está visible).
  useEffect(() => {
    if (relojPausado || estado.victoria) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') despachar({ tipo: 'tiempo', ms: 1000 });
    }, 1000);
    return () => window.clearInterval(id);
  }, [relojPausado, estado.victoria, despachar]);

  // Contrarreloj: si vence el tiempo de una terminal sin resolver, se restan 35 de vida y su contador se restablece.
  const vigente = useRef({ estado, alVencida: (_slug: string) => {} });
  useEffect(() => {
    vigente.current = { estado, alVencida };
  });
  useEffect(() => {
    if (!contrarreloj) return;
    const id = window.setInterval(() => {
      const { estado: e, alVencida: vencer } = vigente.current;
      const ahora = Date.now();
      const vencida = sala.consolas.find((c) => restanteTerminal(e, c.slug, ahora) === 0);
      if (vencida) vencer(vencida.slug);
    }, 1000);
    return () => window.clearInterval(id);
  }, [contrarreloj, sala]);

  function alVencida(slug: string) {
    avisarDano(VIDA_POR_TERMINAL_VENCIDA, `Se acabó el tiempo de «${nombre(slug)}»`);
    if (consolaAbierta !== null && sala.consolas[consolaAbierta]?.slug === slug) setConsolaAbierta(null);
    despachar({ tipo: 'terminalVencida', slug });
    sonar('dano');
  }

  /** E sobre una terminal: se abre y, en Contrarreloj, arranca su contador de 30 minutos. */
  function abrirConsola(i: number) {
    setConsolaAbierta(i);
    despachar({ tipo: 'iniciarTerminal', slug: sala.consolas[i].slug, ahora: Date.now() });
  }

  function alPuerta() {
    if (!completa) {
      const { hechas, total } = progresoSala(estado, sala);
      avisar(`Puerta bloqueada: faltan ${total - hechas} problemas por resolver (todos son obligatorios).`, 'peligro');
      sonar('error');
      return;
    }
    const siguiente = SALAS[indiceSala(sala.id) + 1];
    if (!siguiente) return;
    sonar('puerta');
    despachar({ tipo: 'entrarSala', sala: siguiente.id });
  }

  function alResolver(consola: Consola) {
    if (estado.resueltos.includes(consola.slug)) return;
    despachar({ tipo: 'resolver', slug: consola.slug, esEscudo: consola.tipo === 'escudo' });
    sonar('resuelto');
    if (consola.tipo === 'escudo') {
      const restantes = sala.consolas.filter((c) => c.slug !== consola.slug && !estado.resueltos.includes(c.slug)).length;
      avisar(restantes ? `Escudo desactivado. Quedan ${restantes}.` : 'Escudos abiertos: cierra el panel y dispara con Espacio.', 'exito');
    } else {
      avisar(`${nombre(consola.slug)} resuelto: +7 de vida.`, 'exito');
    }
  }

  /** Aviso común de daño (golpe o respuesta incorrecta) según lo que provoca en las vidas. */
  function avisarDano(cantidad: number, motivo: string) {
    if (estado.modo === 'practica') {
      avisar(`${motivo}: en práctica no pierdes vida.`, 'info');
      return;
    }
    const consecuencia = consecuenciaDano(estado, cantidad);
    if (consecuencia === 'salaReiniciada') {
      setConsolaAbierta(null);
      avisar(MENSAJE_REINICIO, 'peligro');
    } else if (consecuencia === 'vidaPerdida') {
      const quedan = estado.vidas - 1;
      avisar(`${motivo}: perdiste una vida. ${quedan === 1 ? 'Te queda 1 vida' : `Te quedan ${quedan} vidas`}.`, 'peligro');
    } else {
      avisar(`${motivo}: −${cantidad} de vida. Vida: ${Math.ceil(estado.energia - cantidad)}%`, 'peligro');
    }
  }

  function alDano(cantidad: number) {
    avisarDano(cantidad, sala.esJefe ? 'Rayo de OMEGA' : 'Golpe de un centinela');
    despachar({ tipo: 'dano', cantidad });
    sonar('dano');
  }

  /** Respuesta incorrecta en una consola: resta 5 de vida (con las mismas reglas de las vidas). */
  function alIncorrecta() {
    avisarDano(VIDA_POR_RESPUESTA_INCORRECTA, 'Respuesta incorrecta');
    despachar({ tipo: 'respuestaIncorrecta' });
    sonar('dano');
  }

  function alImpacto() {
    const restante = estado.omegaVida - 1;
    despachar({ tipo: 'impactoOmega' });
    sonar('resuelto');
    if (restante > 0) avisar(`Impacto en OMEGA. ${restante === 1 ? 'Le queda 1 núcleo' : `Le quedan ${restante} núcleos`}.`, 'exito');
    else {
      avisar('OMEGA desconectada.', 'exito');
      sonar('victoria');
      window.setTimeout(onVictoria, 900);
    }
  }

  const consola = consolaAbierta !== null ? sala.consolas[consolaAbierta] : null;
  const global = requeridasResueltas(estado);
  const { hechas, total } = progresoSala(estado, sala);

  return (
    <div className="flex flex-col gap-4">
      {/* Encabezado de la sala como intertítulo de cine mudo. El sello se colorea con el tinte de la sala al recuperarla. */}
      <header className="intertitulo flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md px-5 py-4 shadow-tinta sm:px-6">
        <span
          aria-hidden
          className={`grid size-14 shrink-0 place-items-center rounded-full border-[length:var(--trazo-medio)] border-papel font-display text-h3 text-tinta shadow-oro-md max-sm:size-11 max-sm:text-xl ${
            completa ? 'animate-colorear' : 'bg-papel'
          }`}
          style={completa ? { backgroundColor: tintes[sala.id] } : undefined}
        >
          {indiceSala(sala.id) + 1}
        </span>
        <div className="min-w-48 flex-1">
          <p className="m-0 text-sm">
            Sala {indiceSala(sala.id) + 1} de {SALAS.length}, Sector {ROMANOS[sala.sector]}, Unidad {ROMANOS[sala.sector]}
          </p>
          <h1 className="m-0 text-h3 sm:text-h2">{sala.nombre}</h1>
          <p className="m-0 max-w-3xl">{sala.descripcion}</p>
        </div>
        <span className="chapa relative z-10 px-3 py-1 text-sm text-tinta">
          <span className="numero font-semibold text-tinta">
            {hechas}/{total}
          </span>{' '}
          <span className="font-sans text-tinta">problemas</span>
        </span>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <section aria-label={`Sala ${sala.nombre}`} className="flex min-w-0 flex-col gap-3">
          <Hud energia={estado.energia} vidas={estado.vidas} tiempoMs={estado.tiempoMs}
            terminales={contrarreloj ? sala.consolas.filter((c) => c.slug in estado.terminales).map((c) => ({ nombre: nombre(c.slug), slug: c.slug, inicio: estado.terminales[c.slug] })) : undefined} omegaVida={sala.esJefe ? estado.omegaVida : null} />
          <JuegoCanvas
            key={`${sala.id}-${estado.salasReiniciadas}`}
            sala={sala}
            resueltos={estado.resueltos}
            omegaVida={estado.omegaVida}
            energia={estado.energia}
            puertaAbierta={completa}
            escudosCaidos={escudos}
            etiquetas={etiquetas}
            disponibles={disponibles}
            nombreJugador={estado.matricula || 'Agente'}
            acento={ACENTOS[sala.sector]}
            pausado={pausado}
            onConsola={abrirConsola}
            onPuerta={alPuerta}
            onDano={alDano}
            onImpacto={alImpacto}
            onAviso={(t) => avisar(t)}
            onSonido={(s) => sonar(s)}
            onIndicacion={setIndicacion}
          />
          <p className="tarjeta m-0 flex min-h-11 flex-wrap items-center gap-2 px-4 py-2 text-sm" aria-live="polite">
            {indicacion.tecla && <kbd className="kbd">{indicacion.tecla}</kbd>}
            <span>{indicacion.texto}</span>
            <span className="ml-auto hidden items-center gap-2 text-tenue lg:flex">
              <kbd className="kbd">E</kbd> activar <kbd className="kbd">F</kbd> puerta
              {sala.esJefe && (
                <>
                  <kbd className="kbd">Espacio</kbd> disparar
                </>
              )}
            </span>
          </p>
        </section>

        <Bitacora sala={sala} estado={estado} nombre={nombre} disponibles={disponibles} global={global} />
      </div>

      {historiaPendiente && (
        <Dialogo
          titulo={sala.historia.titulo}
          subtitulo={`${sala.nombre}, Sector ${ROMANOS[sala.sector]}`}
          ancho="sm"
          acento={sala.esJefe ? 'hostil' : 'primario'}
          onCerrar={() => despachar({ tipo: 'historiaVista', sala: sala.id })}
        >
          <p className="mt-0 text-base">{sala.historia.texto}</p>
          <p className="text-sm text-tenue">
            Muévete con <kbd className="kbd">WASD</kbd> o flechas, activa los módulos con <kbd className="kbd">E</kbd> y cruza la puerta con <kbd className="kbd">F</kbd>.
            Tienes {VIDAS_MAX} vidas de 100 puntos: si las pierdes todas, la sala se reinicia con problemas nuevos.
          </p>
          <div className="flex justify-end">
            <button type="button" className="btn btn-primario" autoFocus onClick={() => despachar({ tipo: 'historiaVista', sala: sala.id })}>
              Entrar a la sala
            </button>
          </div>
        </Dialogo>
      )}

      {consola && (
        <Dialogo
          titulo={nombre(consola.slug)}
          subtitulo={
            contrarreloj && consola.slug in estado.terminales ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} aria-hidden /> Tiempo de la terminal: <CuentaTerminal inicio={estado.terminales[consola.slug]} />. Si se acaba, pierdes {VIDA_POR_TERMINAL_VENCIDA} de vida.
              </span>
            ) : consola.tipo === 'escudo'
              ? 'Escudo de OMEGA: resuelve el problema a mano, sube la foto de tu procedimiento y escribe tu resultado.'
              : `${sala.nombre}: resuelve el problema a mano, sube la foto de tu procedimiento y escribe tu resultado.`
          }
          acento={consola.tipo === 'escudo' ? 'escudo' : 'primario'}
          completo
          onCerrar={() => setConsolaAbierta(null)}
        >
          <PanelMetodo
            key={`${consola.slug}-${estado.salasReiniciadas}`}
            slug={consola.slug}
            modo="consola"
            matricula={estado.matricula}
            nivel={indiceSala(sala.id) + 1}
            problema={estado.problemas[consola.slug]}
            yaResuelto={estado.resueltos.includes(consola.slug)}
            vida={estado.energia}
            vidas={estado.vidas}
            onProblema={(problema) => despachar({ tipo: 'problema', slug: consola.slug, problema })}
            onIncorrecta={alIncorrecta}
            onResuelto={() => alResolver(consola)}
            onMatricula={(m) => despachar({ tipo: 'matricula', valor: m })}
            onEvidencia={(_, m) => {
              if (!estado.matricula) despachar({ tipo: 'matricula', valor: m });
            }}
          />
        </Dialogo>
      )}
    </div>
  );
}

function Bitacora({
  sala,
  estado,
  nombre,
  disponibles,
  global,
}: {
  sala: SalaDef;
  estado: EstadoJuego;
  nombre: (slug: string) => string;
  disponibles: boolean[];
  global: number;
}) {
  const { hechas, total } = progresoSala(estado, sala);
  return (
    <aside className="tarjeta flex flex-col gap-5 p-5" aria-label="Bitácora de la misión">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-xl">{sala.esJefe ? 'Escudos de OMEGA' : 'Problemas de la sala'}</h2>
          <span className="chapa numero">
            {hechas}/{total}
          </span>
        </div>
        <p className="m-0 text-sm text-tenue">Todos son obligatorios para {sala.esJefe ? 'atacar a OMEGA' : 'abrir la puerta'}.</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {sala.consolas.map((c, i) => {
            const hecha = estado.resueltos.includes(c.slug);
            return (
              <li
                key={c.slug}
                className={`flex items-center gap-2.5 rounded-xl border-[length:var(--trazo-fino)] px-3 py-2 text-sm ${
                  hecha ? 'border-menta bg-menta-2 font-semibold text-menta' : 'border-tinta bg-panel'
                } ${disponibles[i] ? '' : 'semitono border-dashed opacity-70'}`}
              >
                {hecha ? (
                  <CheckCircle2 size={16} aria-label="Resuelto" />
                ) : c.tipo === 'escudo' ? (
                  <Shield size={16} className="text-escudo" aria-label="Escudo activo" />
                ) : (
                  <Circle size={16} className="text-tenue" aria-label="Pendiente" />
                )}
                <span className="min-w-0 flex-1">{nombre(c.slug)}</span>
                {!disponibles[i] && <span className="text-tenue">sin método</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t-[length:var(--trazo-fino)] border-dashed border-tinta pt-4">
        <div className="flex items-baseline justify-between">
          <h3 className="m-0 text-base">Progreso de la misión</h3>
          <span className="numero text-sm">
            {global}/{TOTAL_REQUERIDAS}
          </span>
        </div>
        <div className="medidor" role="progressbar" aria-label="Problemas resueltos en toda la misión" aria-valuemin={0} aria-valuemax={TOTAL_REQUERIDAS} aria-valuenow={global}>
          <div className="medidor-relleno text-tinta" style={{ width: `${(global / TOTAL_REQUERIDAS) * 100}%` }} />
        </div>
        <p className="m-0 text-sm text-tenue">
          Puntos: <span className="numero text-tinta">{estado.puntos}</span>
        </p>
      </div>
    </aside>
  );
}
