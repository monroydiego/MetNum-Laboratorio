// Formulario generado a partir de esquema_entrada (JSON Schema de Pydantic).
import { useId, type ClipboardEvent } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CampoFormulario, ValorCampo, ValoresFormulario } from '../utilidades/esquema';

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
          className="size-5 accent-cian"
          checked={Boolean(valor)}
          onChange={(e) => onCambio(e.target.checked)}
        />
      );
      break;
    case 'opciones':
      control = (
        <select {...comunes} className="campo" value={String(valor ?? '')} onChange={(e) => onCambio(e.target.value)}>
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
          className="campo"
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
          className="campo font-mono text-sm"
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
          className="campo"
          value={String(valor ?? '')}
          onChange={(e) => onCambio(e.target.value)}
        />
      );
  }

  const esGrupo = campo.tipo === 'lista' || campo.tipo === 'matriz';
  const Envoltura = esGrupo ? 'fieldset' : 'div';
  return (
    <Envoltura className={`m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0 ${ancho ? 'sm:col-span-2' : ''} ${campo.tipo === 'booleano' ? 'flex-row items-center gap-3' : ''}`}>
      {esGrupo ? (
        <legend className="mb-1.5 p-0 text-sm font-semibold">
          {campo.etiqueta}
          {!campo.requerido && !/opcional/i.test(campo.etiqueta) && <span className="font-normal text-tenue"> (opcional)</span>}
        </legend>
      ) : (
        <label htmlFor={id} className="text-sm font-semibold">
          {campo.etiqueta}
          {!campo.requerido && !/opcional/i.test(campo.etiqueta) && <span className="font-normal text-tenue"> (opcional)</span>}
        </label>
      )}
      {control}
      {campo.ayuda && !/^opcional\.?$/i.test(campo.ayuda) && (
        <p id={idAyuda} className="m-0 text-sm text-tenue">
          {campo.ayuda.charAt(0).toUpperCase() + campo.ayuda.slice(1)}
        </p>
      )}
      {error && (
        <p id={idError} className="m-0 text-sm text-hostil">
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
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
        {lista.map((v, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="numero w-6 text-right text-sm text-tenue" aria-hidden>
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
              className="campo numero w-28"
              value={v}
              onChange={(e) => onCambio(lista.map((x, k) => (k === i ? e.target.value : x)))}
              onPaste={(e) => pegar(i, e)}
            />
            <button
              type="button"
              className="btn btn-fantasma size-9 min-h-0 px-0"
              disabled={disabled || lista.length <= 1}
              onClick={() => onCambio(lista.filter((_, k) => k !== i))}
              aria-label={`Quitar valor ${i}`}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <div>
        <button type="button" className="btn" disabled={disabled} onClick={() => onCambio([...lista, ''])}>
          <Plus size={16} aria-hidden /> Agregar valor
        </button>
        <span className="ml-3 text-sm text-tenue max-sm:hidden">También puedes pegar valores separados por coma.</span>
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
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-1">
          Filas
          <button type="button" className="btn btn-fantasma size-8 min-h-0 px-0" disabled={disabled || m.length <= 1} onClick={() => onCambio(m.slice(0, -1))} aria-label="Quitar fila">
            <Minus size={15} aria-hidden />
          </button>
          <span className="numero w-5 text-center">{m.length}</span>
          <button type="button" className="btn btn-fantasma size-8 min-h-0 px-0" disabled={disabled} onClick={() => onCambio([...m, Array(cols).fill('')])} aria-label="Agregar fila">
            <Plus size={15} aria-hidden />
          </button>
        </span>
        <span className="flex items-center gap-1">
          Columnas
          <button type="button" className="btn btn-fantasma size-8 min-h-0 px-0" disabled={disabled || cols <= 1} onClick={() => onCambio(m.map((f) => f.slice(0, -1)))} aria-label="Quitar columna">
            <Minus size={15} aria-hidden />
          </button>
          <span className="numero w-5 text-center">{cols}</span>
          <button type="button" className="btn btn-fantasma size-8 min-h-0 px-0" disabled={disabled} onClick={() => onCambio(m.map((f) => [...f, '']))} aria-label="Agregar columna">
            <Plus size={15} aria-hidden />
          </button>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse border-x-2 border-tenue/60">
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
                      className="campo numero w-20 text-right"
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
  );
}
