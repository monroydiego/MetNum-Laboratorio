// Pantalla de sala: canvas del juego + HUD + bitácora de la misión.
import { useCallback, useEffect, useMemo, useState, type Dispatch } from 'react';
import { CheckCircle2, Circle, CircleDashed, Map as IconoMapa, Shield } from 'lucide-react';
import { JuegoCanvas, type Indicacion } from '../juego/JuegoCanvas';
import { SALAS, indiceSala, nombreRespaldo, ROMANOS, type Consola, type Sala as SalaDef } from '../juego/mapa';
import {
  escudosCaidos,
  progresoSala,
  requeridasResueltas,
  salaCompleta,
  TOTAL_REQUERIDAS,
  type Accion,
  type EstadoJuego,
} from '../juego/estado';
import { useCatalogo } from '../catalogo/contexto';
import { sonar } from '../juego/sonido';
import { color } from '../tokens';
import { Dialogo } from '../componentes/Dialogo';
import { Hud } from '../componentes/Hud';
import { PanelMetodo } from '../componentes/PanelMetodo';
import type { TonoAviso } from '../App';

interface Props {
  estado: EstadoJuego;
  despachar: Dispatch<Accion>;
  pausaExterna: boolean;
  onMapa: () => void;
  onVictoria: () => void;
  avisar: (texto: string, tono?: TonoAviso) => void;
}

const ACENTOS: Record<number, string> = { 1: color.cian, 2: color.ambar, 3: color.menta, 4: color.escudo };

export function Sala({ estado, despachar, pausaExterna, onMapa, onVictoria, avisar }: Props) {
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
  const pausado = pausaExterna || consolaAbierta !== null || historiaPendiente;

  // Cronómetro de la misión (solo mientras se juega y la pestaña está visible).
  useEffect(() => {
    if (pausado || estado.victoria) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') despachar({ tipo: 'tiempo', ms: 1000 });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pausado, estado.victoria, despachar]);

  function alPuerta() {
    if (!completa) {
      const { hechas, total } = progresoSala(estado, sala);
      avisar(`Puerta bloqueada: resuelve las ${total - hechas} consolas que faltan para abrirla.`, 'peligro');
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
      avisar(`${nombre(consola.slug)} resuelto: +7 de energía.`, 'exito');
    }
  }

  function alDano(cantidad: number, reaparece: boolean) {
    despachar({ tipo: 'dano', cantidad });
    sonar('dano');
    if (reaparece) avisar('Traje restaurado en el punto de control. Tus métodos resueltos se conservan.', 'peligro');
    else avisar(`Esquiva a los ${sala.esJefe ? 'rayos de OMEGA' : 'centinelas'}. Energía: ${Math.ceil(estado.energia - cantidad)}%`, 'peligro');
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

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label={`Sala ${sala.nombre}`} className="flex min-w-0 flex-col gap-3">
        <div className="relative">
          <JuegoCanvas
            key={sala.id}
            sala={sala}
            resueltos={estado.resueltos}
            omegaVida={estado.omegaVida}
            energia={estado.energia}
            puertaAbierta={completa}
            escudosCaidos={escudos}
            etiquetas={etiquetas}
            disponibles={disponibles}
            nombreJugador={estado.matricula || 'Agente'}
            acento={sala.esJefe ? color.cian : ACENTOS[sala.sector]}
            pausado={pausado}
            onConsola={setConsolaAbierta}
            onPuerta={alPuerta}
            onDano={alDano}
            onImpacto={alImpacto}
            onAviso={(t) => avisar(t)}
            onSonido={(s) => sonar(s)}
            onIndicacion={setIndicacion}
          />
          <Hud energia={estado.energia} tiempoMs={estado.tiempoMs} omegaVida={sala.esJefe ? estado.omegaVida : null} />
        </div>
        <p className="m-0 flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-linea bg-panel px-3 py-2 text-sm" aria-live="polite">
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

      <Bitacora sala={sala} estado={estado} nombre={nombre} disponibles={disponibles} global={global} onMapa={onMapa} />

      {historiaPendiente && (
        <Dialogo
          titulo={sala.historia.titulo}
          subtitulo={`${sala.nombre}, Sector ${ROMANOS[sala.sector]}`}
          ancho="sm"
          acento={sala.esJefe ? 'hostil' : 'cian'}
          onCerrar={() => despachar({ tipo: 'historiaVista', sala: sala.id })}
        >
          <p className="mt-0 text-base">{sala.historia.texto}</p>
          <p className="text-sm text-tenue">
            Muévete con <kbd className="kbd">WASD</kbd> o flechas, activa consolas con <kbd className="kbd">E</kbd> y cruza la puerta con <kbd className="kbd">F</kbd>.
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
            consola.tipo === 'escudo'
              ? 'Escudo de OMEGA: resuélvelo para desactivarlo.'
              : consola.tipo === 'obligatoria'
                ? `Consola de ${sala.nombre}`
                : consola.tipo === 'consulta'
                  ? 'Panel de consulta (opcional)'
                  : 'Terminal opcional: no bloquea la puerta.'
          }
          acento={consola.tipo === 'escudo' ? 'escudo' : 'cian'}
          completo
          onCerrar={() => setConsolaAbierta(null)}
        >
          <PanelMetodo
            slug={consola.slug}
            modo="consola"
            matricula={estado.matricula}
            nivel={indiceSala(sala.id) + 1}
            onResuelto={() => alResolver(consola)}
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
  onMapa,
}: {
  sala: SalaDef;
  estado: EstadoJuego;
  nombre: (slug: string) => string;
  disponibles: boolean[];
  global: number;
  onMapa: () => void;
}) {
  const { hechas, total } = progresoSala(estado, sala);
  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-linea bg-panel p-5" aria-label="Bitácora de la misión">
      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm text-tenue">
          Sector {ROMANOS[sala.sector]}, Unidad {ROMANOS[sala.sector]}
        </p>
        <h2 className="m-0 text-h3">{sala.nombre}</h2>
        <p className="m-0 text-sm text-tenue">{sala.descripcion}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="m-0 text-base">{sala.esJefe ? 'Escudos' : 'Consolas de la sala'}</h3>
          <span className="numero text-sm">
            {hechas}/{total}
          </span>
        </div>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {sala.consolas.map((c, i) => {
            const hecha = estado.resueltos.includes(c.slug);
            const opcional = c.tipo === 'extra' || c.tipo === 'consulta';
            return (
              <li
                key={c.slug}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                  hecha ? 'border-menta/40 text-menta' : 'border-linea'
                } ${disponibles[i] ? '' : 'opacity-60'}`}
              >
                {hecha ? (
                  <CheckCircle2 size={16} aria-label="Resuelta" />
                ) : c.tipo === 'escudo' ? (
                  <Shield size={16} className="text-escudo" aria-label="Escudo activo" />
                ) : opcional ? (
                  <CircleDashed size={16} className="text-ambar" aria-label="Opcional" />
                ) : (
                  <Circle size={16} className="text-tenue" aria-label="Pendiente" />
                )}
                <span className="min-w-0 flex-1">{nombre(c.slug)}</span>
                {opcional && <span className="text-tenue">{c.tipo === 'consulta' ? 'consulta' : 'opcional'}</span>}
                {!disponibles[i] && <span className="text-tenue">sin método</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="m-0 text-base">Progreso de la misión</h3>
          <span className="numero text-sm">
            {global}/{TOTAL_REQUERIDAS}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-linea" role="progressbar" aria-label="Métodos obligatorios resueltos" aria-valuemin={0} aria-valuemax={TOTAL_REQUERIDAS} aria-valuenow={global}>
          <div className="h-full rounded-full bg-cian" style={{ width: `${(global / TOTAL_REQUERIDAS) * 100}%` }} />
        </div>
        <p className="m-0 text-sm text-tenue">Puntos: <span className="numero text-tinta">{estado.puntos}</span></p>
      </div>

      <button type="button" className="btn mt-auto" onClick={onMapa}>
        <IconoMapa size={16} aria-hidden /> Ver plano de la instalación
      </button>
    </aside>
  );
}
