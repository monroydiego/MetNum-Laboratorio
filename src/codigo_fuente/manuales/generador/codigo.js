// Anexo de código fuente: pega literalmente cada archivo ejecutable del proyecto en un recuadro.
// Incluye solo lo esencial para ejecutar el sistema. Excluye dependencias (node_modules, .venv), compilados (dist),
// datos locales (data, uploads), pruebas, bloqueos de paquetes, configuración de asistentes (.claude) y documentación.
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '../../../..');

const EXT = new Set(['.py', '.ts', '.tsx', '.css']);
const OMITIR = new Set(['node_modules', '.venv', '__pycache__', 'dist', 'data', 'uploads', 'tests', '.claude', '.git', 'public']);

function recorrer(dir) {
  const abs = path.join(RAIZ, dir);
  const salida = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (OMITIR.has(e.name)) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...recorrer(rel));
    else if (EXT.has(path.extname(e.name))) salida.push(rel);
  }
  return salida;
}

const contenido = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
const carpeta = (rel) => path.dirname(rel).replace(/\\/g, '/');

// Grupos en el orden en que se presentan. Cada grupo: título, archivos.
function grupos() {
  const g = [];
  g.push({ titulo: 'C.1 Configuración y arranque', archivos: [
    'package.json', 'frontend/package.json', 'frontend/vite.config.ts', 'frontend/tsconfig.json', 'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json', 'frontend/index.html', 'backend/requirements.txt',
  ] });
  const back = recorrer('backend/app');
  const subcarpetas = [...new Set(back.map(carpeta))];
  const nombresBack = {
    'backend/app': 'C.2 Backend: aplicación principal',
    'backend/app/domain': 'C.3 Backend: capa de dominio',
    'backend/app/use_cases': 'C.4 Backend: casos de uso y métodos del libro',
    'backend/app/infrastructure': 'C.5 Backend: infraestructura',
    'backend/app/presentation': 'C.6 Backend: presentación (rutas y esquemas)',
    'backend/app/presentation/metodos': 'C.7 Backend: adaptadores de los métodos',
  };
  for (const s of subcarpetas) g.push({ titulo: nombresBack[s] || `Backend: ${s}`, archivos: back.filter((f) => carpeta(f) === s) });
  const front = recorrer('frontend/src');
  const nombresFront = {
    'frontend/src': 'C.8 Frontend: raíz, tokens y estilos',
    'frontend/src/catalogo': 'C.9 Frontend: catálogo de métodos',
    'frontend/src/componentes': 'C.10 Frontend: componentes',
    'frontend/src/juego': 'C.11 Frontend: estado del juego y Canvas',
    'frontend/src/juego/motor': 'C.12 Frontend: motor del juego',
    'frontend/src/pantallas': 'C.13 Frontend: pantallas',
    'frontend/src/services': 'C.14 Frontend: cliente HTTP',
    'frontend/src/types': 'C.15 Frontend: contratos de datos',
    'frontend/src/types/entradas': 'C.16 Frontend: contratos de entrada por método',
    'frontend/src/utilidades': 'C.17 Frontend: utilidades',
  };
  for (const s of [...new Set(front.map(carpeta))]) g.push({ titulo: nombresFront[s] || `Frontend: ${s}`, archivos: front.filter((f) => carpeta(f) === s) });
  return g;
}

const existentes = (grupo) => grupo.archivos.filter((f) => fs.existsSync(path.join(RAIZ, f)) && contenido(f).trim());

// Conteo previo, sin construir bloques (para el texto introductorio del anexo).
function resumen() {
  let archivos = 0, lineas = 0;
  for (const g of grupos()) for (const f of existentes(g)) { archivos++; lineas += contenido(f).split('\n').length; }
  return { archivos, lineas };
}

module.exports = (c) => {
  const out = [];
  let archivos = 0, lineas = 0;
  for (const grupo of grupos()) {
    const validos = existentes(grupo);
    if (!validos.length) continue;
    out.push(c.H2(grupo.titulo));
    for (const f of validos) {
      const txt = contenido(f);
      const n = txt.split('\n').length;
      archivos++; lineas += n;
      out.push(c.H3(f.replace(/\\/g, '/')));
      out.push(...c.CODIGO(txt.split('\n')));
    }
  }
  console.log('anexo de código:', archivos, 'archivos,', lineas, 'líneas');
  return { bloques: out, archivos, lineas };
};
module.exports.resumen = resumen;
