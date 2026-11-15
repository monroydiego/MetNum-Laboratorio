import { Dialogo } from './Dialogo';

export function Ayuda({ onCerrar }: { onCerrar: () => void }) {
  const filas: [string, string][] = [
    ['WASD / flechas', 'Moverte por la sala. También puedes hacer clic en el suelo o usar los controles táctiles.'],
    ['E', 'Activar la consola cercana y abrir su método.'],
    ['F', 'Cruzar la puerta cuando las 5 consolas de la sala estén resueltas.'],
    ['Espacio', 'Disparar a OMEGA una vez desactivados sus 3 escudos.'],
    ['T', 'Abrir el modo profesor (cualquier método, datos libres).'],
    ['H', 'Mostrar esta ayuda.'],
    ['M', 'Activar o silenciar el sonido.'],
    ['Esc', 'Cerrar la ventana abierta.'],
  ];
  return (
    <Dialogo titulo="Cómo jugar" onCerrar={onCerrar} ancho="md">
      <div className="flex flex-col gap-4">
        <p className="m-0 text-tenue">
          Los centinelas quitan 12 de energía al tocarte y los rayos de OMEGA 17. Si tu energía llega a 0, reapareces en la entrada de la sala sin perder
          lo resuelto. Cada método resuelto recarga 7 de energía.
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
