import { Dialogo } from './Dialogo';

export function Ayuda({ onCerrar }: { onCerrar: () => void }) {
  const filas: [string, string][] = [
    ['WASD / flechas', 'Moverte por la sala. También puedes hacer clic en el suelo o usar los controles táctiles.'],
    ['E', 'Activar el módulo cercano y abrir su problema.'],
    ['F', 'Cruzar la puerta cuando TODOS los problemas de la sala estén resueltos.'],
    ['Espacio', 'Disparar a OMEGA una vez desactivados sus 8 escudos (los métodos de ecuaciones diferenciales).'],
    ['T', 'Abrir el modo profesor (cualquier método, datos libres).'],
    ['H', 'Mostrar esta ayuda.'],
    ['M', 'Activar o silenciar el sonido.'],
    ['Esc', 'Cerrar la ventana abierta.'],
  ];
  return (
    <Dialogo titulo="Cómo jugar" onCerrar={onCerrar} ancho="md">
      <div className="flex flex-col gap-4">
        <p className="m-0 text-tenue">
          Tienes <strong className="text-tinta">5 vidas de 100 puntos</strong>. Los centinelas quitan 12 puntos al tocarte, los rayos de OMEGA 17 y cada
          respuesta incorrecta 5. Al llegar a 0 pierdes una vida y reapareces en la entrada. Si pierdes las 5 vidas, la sala se reinicia: sus problemas
          cambian y vuelven a quedar sin resolver. Cada problema resuelto recarga 7 puntos.
        </p>
        <p className="m-0 text-tenue">
          Cada módulo te plantea un problema. Resuélvelo a mano con el método del libro, sube la <strong className="text-tinta">foto de tu procedimiento</strong>{' '}
          (obligatoria, la revisa tu docente) y escribe tu resultado: cuenta como correcto solo si coincide desde la parte entera hasta el 3.er decimal. Al
          acertar se muestra la resolución completa. Todos los problemas de una sala son obligatorios para pasar a la siguiente.
        </p>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {filas.map(([k, v]) => (
              <tr key={k} className="border-b border-linea/60">
                <th scope="row" className="py-2 pr-4 text-left align-top font-normal whitespace-nowrap">
                  <kbd className="kbd">{k}</kbd>
                </th>
                <td className="py-2 text-tenue">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="m-0 text-sm text-tenue">Tu avance se guarda automáticamente en este navegador.</p>
      </div>
    </Dialogo>
  );
}
