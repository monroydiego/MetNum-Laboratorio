// Puerta del Modo profesor y del Panel Docente: correo + contraseña contra el servidor (sesión por cookie).
import { useId, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, LogIn, RefreshCw } from 'lucide-react';
import { Dialogo } from './Dialogo';
import { iniciarSesionDocente, mensajeDeError } from '../services/apiClient';

interface Props {
  /** Qué se abrirá al entrar, para el subtítulo. */
  destino: 'Modo profesor' | 'Panel Docente';
  onAcceso: (correo: string) => void;
  onCerrar: () => void;
}

export function AccesoDocente({ destino, onAcceso, onCerrar }: Props) {
  const id = useId();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const d = await iniciarSesionDocente(correo.trim(), clave);
      onAcceso(d.correo);
    } catch (err) {
      setError(mensajeDeError(err));
      setClave('');
      setEnviando(false);
    }
  }

  return (
    <Dialogo titulo="Acceso docente" subtitulo={`Identifícate para abrir el ${destino}.`} ancho="sm" acento="ambar" onCerrar={onCerrar}>
      <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-correo`} className="font-display text-sm tracking-wide">
            Correo
          </label>
          <input
            id={`${id}-correo`}
            type="email"
            className="campo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-clave`} className="font-display text-sm tracking-wide">
            Contraseña
          </label>
          <span className="relative">
            <input
              id={`${id}-clave`}
              type={verClave ? 'text' : 'password'}
              className="campo pr-12"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            <button
              type="button"
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-tinta hover:bg-panel-2"
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verClave}
            >
              {verClave ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </span>
        </div>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="m-0 rounded-lg border-[length:var(--trazo-medio)] border-hostil bg-papel px-3 py-2 text-sm text-hostil animate-sacudida"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex items-center gap-1.5 text-sm text-tenue">
            <KeyRound size={14} aria-hidden /> Solo personal docente.
          </p>
          <button type="submit" className="btn btn-primario" disabled={enviando || !correo.trim() || !clave}>
            {enviando ? <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <LogIn size={16} aria-hidden />} Entrar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
