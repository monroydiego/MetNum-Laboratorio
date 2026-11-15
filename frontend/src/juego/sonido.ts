// Efectos de sonido sintetizados con Web Audio (sin archivos externos).
import { leerSonidoActivo } from './estado';

export type TipoSonido = 'clic' | 'resuelto' | 'puerta' | 'dano' | 'disparo' | 'victoria' | 'omega' | 'error';

let activo = leerSonidoActivo();
let contexto: AudioContext | null = null;

const FRECUENCIAS: Record<TipoSonido, [number, number]> = {
  clic: [450, 600],
  resuelto: [430, 880],
  puerta: [275, 520],
  dano: [170, 60],
  disparo: [980, 300],
  victoria: [660, 1320],
  omega: [100, 260],
  error: [300, 180],
};

export function sonidoActivo(): boolean {
  return activo;
}

export function fijarSonido(valor: boolean): void {
  activo = valor;
}

export function sonar(tipo: TipoSonido = 'clic'): void {
  if (!activo) return;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === 'suspended') void contexto.resume();
    const t = contexto.currentTime;
    const osc = contexto.createOscillator();
    const ganancia = contexto.createGain();
    osc.type = tipo === 'dano' ? 'sawtooth' : tipo === 'disparo' ? 'square' : 'sine';
    const [a, b] = FRECUENCIAS[tipo];
    osc.frequency.setValueAtTime(a, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, b), t + 0.16);
    ganancia.gain.setValueAtTime(0.0001, t);
    ganancia.gain.exponentialRampToValueAtTime(tipo === 'dano' ? 0.035 : 0.025, t + 0.015);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(ganancia);
    ganancia.connect(contexto.destination);
    osc.start(t);
    osc.stop(t + 0.23);
  } catch {
    // Audio no disponible: se ignora.
  }
}
