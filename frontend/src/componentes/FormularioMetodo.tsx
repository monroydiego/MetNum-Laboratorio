// Formulario generado a partir de esquema_entrada (JSON Schema de Pydantic).
import { useId, type ClipboardEvent } from 'react';
import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react';
import type { CampoFormulario, ValorCampo, ValoresFormulario } from '../utilidades/esquema';

/** Campo deshabilitado (problema de solo lectura o cargando): se lee como dato impreso, no como gris. */
const CAMPO_LECTURA = 'disabled:cursor-not-allowed disabled:text-tinta disabled:opacity-100';

/** Hoja de laboratorio: renglones de lápiz detrás de listas y matrices. */
const HOJA = {
  backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 2.45rem, var(--color-linea) 2.45rem calc(2.45rem + 1px))',
} as const;

interface Props {
  campos: CampoFormulario[];
  valores: ValoresFormulario;
  errores: Record<string, string>;
  onCambio: (clave: string, valor: ValorCampo) => void;
  deshabilitado?: boolean;
}

export function FormularioMetodo({ campos, valores, errores, onCambio, deshabilitado }: Props) {
  // Campos cortos en rejilla; listas, matrices y JSON a todo lo ancho.
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {campos.map((c) => (
        <Campo key={c.clave} campo={c} valor={valores[c.clave]} error={errores[c.clave]} onCambio={(v) => onCambio(c.clave, v)} deshabilitado={deshabilitado} />
      ))}
    </div>
  );
}

interface PropsCampo {
  campo: CampoFormulario;
  valor: ValorCampo | undefined;
  error?: string;
  onCambio: (v: ValorCampo) => void;
  deshabilitado?: boolean;
}

function Campo({ campo, valor, error, onCambio, deshabilitado }: PropsCampo) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const ancho = campo.tipo === 'lista' || campo.tipo === 'matriz' || campo.tipo === 'json';
  const describe = [campo.ayuda ? idAyuda : '', error ? idError : ''].filter(Boolean).join(' ') || undefined;
  const comunes = { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describe, disabled: deshabilitado };

  let control;
  switch (campo.tipo) {
    case 'booleano':
      control = (
        <input
          {...comunes}
          type="checkbox"
          className="size-5 cursor-pointer accent-tinta"
          checked={Boolean(valor)}
          onChange={(e) => onCambio(e.target.checked)}
        />
      );
      break;
    case 'opciones':
      control = (
        <select {...comunes} className={`campo ${CAMPO_LECTURA}`} value={String(valor ?? '')} onChange={(e) => onCambio(e.target.value)}>
          {!campo.requerido && <option value="">Sin elegir</option>}
          {campo.opciones.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
      );
      break;
    case 'entero':
      control = (
        <input
          {...comunes}
          type="number"
          inputMode="numeric"
          step={1}
          min={campo.minimo}
          max={campo.maximo}
          className={`campo numero ${CAMPO_LECTURA}`}
          value={String(valor ?? '')}
          onChange={(e) => onCambio(e.target.value)}
        />
      );
      break;
    case 'lista':
      control = <EditorLista {...comunes} valores={Array.isArray(valor) ? (valor as string[]) : ['']} onCambio={onCambio} etiqueta={campo.etiqueta} />;
      break;
    case 'matriz':
      control = <EditorMatriz {...comunes} valores={Array.isArray(valor) ? (valor as string[][]) : [['']]} onCambio={onCambio} etiqueta={campo.etiqueta} />;
      break;
    case 'json':
      control = (
        <textarea
          {...comunes}
          rows={4}
          spellCheck={false}
          className={`campo font-mono text-sm ${CAMPO_LECTURA}`}
          value={String(valor ?? '')}
          onChange={(e) => onCambio(e.target.value)}
        />
      );
      break;
    default:
      control = (
        <input
          {...comunes}
          type="text"
          inputMode={campo.tipo === 'numero' ? 'decimal' : undefined}
          autoComplete="off"
          spellCheck={false}
          className={`campo ${campo.tipo === 'numero' ? 'numero' : ''} ${CAMPO_LECTURA}`}
          value={String(valor ?? '')}
          onChange={(e) => onCambio(e.target.value)}
        />
      );
  }

  const esGrupo = campo.tipo === 'lista' || campo.tipo === 'matriz';
  const Envoltura = esGrupo ? 'fieldset' : 'div';
  return (
    <Envoltura
      className={`m-0 flex min-w-0 flex-col gap-1.5 ${
        esGrupo
          ? 'rounded-lg border-[length:var(--trazo-fino)] border-tinta bg-panel px-3 pt-1 pb-3 shadow-tinta-sm'
          : 'border-0 p-0'
      } ${ancho ? 'sm:col-span-2' : ''} ${campo.tipo === 'booleano' ? 'flex-row-reverse items-center justify-end gap-3' : ''} ${error ? 'border-hostil' : ''}`}
    >
      {esGrupo ? (
        <legend className="-ml-1 max-w-full rounded-md border-[length:var(--trazo-fino)] border-tinta bg-papel px-2 py-0.5 font-display text-sm text-tinta">
          {campo.etiqueta}
          {!campo.requerido && !/opcional/i.test(campo.etiqueta) && <span className="font-sans text-tenue"> (opcional)</span>}
        </legend>
      ) : (
        <label htmlFor={id} className="font-display text-sm text-tinta">
          {campo.etiqueta}
          {!campo.requerido && !/opcional/i.test(campo.etiqueta) && <span className="font-sans text-tenue"> (opcional)</span>}
        </label>
      )}
      {control}
      {campo.ayuda && !/^opcional\.?$/i.test(campo.ayuda) && (
        <p id={idAyuda} className="m-0 text-sm text-tenue">
          {campo.ayuda.charAt(0).toUpperCase() + campo.ayuda.slice(1)}
        </p>
      )}
      {error && (
        <p id={idError} className="m-0 flex items-start gap-1.5 text-sm font-semibold text-hostil">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </Envoltura>
  );
}

interface PropsEditor<T> {
  id: string;
  valores: T;
  onCambio: (v: T) => void;
  etiqueta: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** Lista editable de valores; al pegar "1, 2, 3" se reparte en varias casillas. */
function EditorLista({ id, valores, onCambio, etiqueta, disabled, ...aria }: PropsEditor<string[]>) {
  const lista = valores.length ? valores : [''];
  function pegar(i: number, e: ClipboardEvent<HTMLInputElement>) {
    const texto = e.clipboardData.getData('text');
    if (!/[,;\n\t]/.test(texto)) return;
    e.preventDefault();
    const partes = texto.split(/[,;\n\t]+/).map((s) => s.trim()).filter(Boolean);
    onCambio([...lista.slice(0, i), ...partes, ...lista.slice(i + 1)]);
  }
  return (
    <div className="flex flex-col gap-2">
      <ol className="m-0 flex list-none flex-wrap gap-x-3 gap-y-2 rounded-md bg-panel-2/60 p-2" style={HOJA}>
        {lista.map((v, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="numero grid min-w-6 place-items-center rounded-full border-[length:var(--trazo-fino)] border-tinta bg-papel px-1 text-sm text-tinta" aria-hidden>
              {i}
            </span>
            <input
              id={i === 0 ? id : undefined}
              {...aria}
              type="text"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              aria-label={`${etiqueta}, valor ${i}`}
              className={`campo numero w-28 ${CAMPO_LECTURA}`}
              value={v}
              onChange={(e) => onCambio(lista.map((x, k) => (k === i ? e.target.value : x)))}
              onPaste={(e) => pegar(i, e)}
            />
            <button
              type="button"
              className="editor-control btn btn-fantasma size-9 min-h-0 px-0"
              disabled={disabled || lista.length <= 1}
              onClick={() => onCambio(lista.filter((_, k) => k !== i))}
              aria-label={`Quitar valor ${i}`}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <div className="editor-control flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" className="btn" disabled={disabled} onClick={() => onCambio([...lista, ''])}>
          <Plus size={16} aria-hidden /> Agregar valor
        </button>
        <span className="text-sm text-tenue max-sm:hidden">También puedes pegar valores separados por coma.</span>
      </div>
    </div>
  );
}

/** Editor de matriz (filas x columnas) con botones para cambiar dimensiones. */
function EditorMatriz({ id, valores, onCambio, etiqueta, disabled, ...aria }: PropsEditor<string[][]>) {
  const filas = valores.length ? valores : [['']];
  const cols = Math.max(1, ...filas.map((f) => f.length));
  const m = filas.map((f) => Array.from({ length: cols }, (_, j) => f[j] ?? ''));
  const fijar = (i: number, j: number, v: string) => onCambio(m.map((f, a) => (a === i ? f.map((x, b) => (b === j ? v : x)) : f)));

  return (
    <div className="flex flex-col gap-2">
      <div className="editor-control flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-0.5 rounded-full border-[length:var(--trazo-fino)] border-tinta bg-papel pl-2.5">
          Filas
          <button type="button" className="btn btn-fantasma size-8 min-h-0 rounded-full px-0" disabled={disabled || m.length <= 1} onClick={() => onCambio(m.slice(0, -1))} aria-label="Quitar fila">
            <Minus size={15} aria-hidden />
          </button>
          <span className="numero w-5 text-center">{m.length}</span>
          <button type="button" className="btn btn-fantasma size-8 min-h-0 rounded-full px-0" disabled={disabled} onClick={() => onCambio([...m, Array(cols).fill('')])} aria-label="Agregar fila">
            <Plus size={15} aria-hidden />
          </button>
        </span>
        <span className="flex items-center gap-0.5 rounded-full border-[length:var(--trazo-fino)] border-tinta bg-papel pl-2.5">
          Columnas
          <button type="button" className="btn btn-fantasma size-8 min-h-0 rounded-full px-0" disabled={disabled || cols <= 1} onClick={() => onCambio(m.map((f) => f.slice(0, -1)))} aria-label="Quitar columna">
            <Minus size={15} aria-hidden />
          </button>
          <span className="numero w-5 text-center">{cols}</span>
          <button type="button" className="btn btn-fantasma size-8 min-h-0 rounded-full px-0" disabled={disabled} onClick={() => onCambio(m.map((f) => [...f, '']))} aria-label="Agregar columna">
            <Plus size={15} aria-hidden />
          </button>
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        {/* Matriz entre corchetes dibujados a tinta, sobre hoja de laboratorio */}
        <div className="relative inline-block bg-panel-2/60 px-2 py-1" style={HOJA}>
          <span className="pointer-events-none absolute inset-y-0 left-0 w-2.5 rounded-l-sm border-y-[length:var(--trazo-medio)] border-l-[length:var(--trazo-grueso)] border-tinta" aria-hidden />
          <span className="pointer-events-none absolute inset-y-0 right-0 w-2.5 rounded-r-sm border-y-[length:var(--trazo-medio)] border-r-[length:var(--trazo-grueso)] border-tinta" aria-hidden />
          <table className="border-collapse">
            <tbody>
              {m.map((f, i) => (
                <tr key={i}>
                  {f.map((v, j) => (
                    <td key={j} className="p-1">
                      <input
                        id={i === 0 && j === 0 ? id : undefined}
                        {...aria}
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={disabled}
                        aria-label={`${etiqueta}, fila ${i + 1}, columna ${j + 1}`}
                        className={`campo numero w-16 text-right sm:w-20 ${CAMPO_LECTURA}`}
                        value={v}
                        onChange={(e) => fijar(i, j, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
