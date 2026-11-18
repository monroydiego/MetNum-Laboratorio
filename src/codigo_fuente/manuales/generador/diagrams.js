// Diagramas en escala de grises (SVG -> PNG con rsvg-convert).
const fs = require('fs');
const { execSync } = require('child_process');
const F = 'font-family="Liberation Sans, Arial, sans-serif"';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" ${F} font-size="${o.size || 14}" fill="${o.fill || '#262626'}" text-anchor="${o.anchor || 'middle'}" ${o.bold ? 'font-weight="bold"' : ''} ${o.italic ? 'font-style="italic"' : ''}>${esc(s)}</text>`;
const box = (x, y, w, h, title, lines = [], o = {}) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${o.fill || '#F2F2F2'}" stroke="${o.stroke || '#595959'}" stroke-width="${o.sw || 1.5}" ${o.dash ? 'stroke-dasharray="6 4"' : ''}/>`;
  const ty = o.top ? y + 22 : y + h / 2 - (lines.length * 9) + 5;
  s += txt(x + w / 2, o.top ? y + 22 : (lines.length ? y + 24 : y + h / 2 + 5), title, { bold: true, size: o.size || 14 });
  lines.forEach((l, i) => (s += txt(x + w / 2, y + 46 + i * 18, l, { size: 12.5, fill: '#404040' })));
  return s;
};
const arrow = (x1, y1, x2, y2, label = '', o = {}) => {
  let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || '#404040'}" stroke-width="1.6" ${o.dash ? 'stroke-dasharray="6 4"' : ''} marker-end="url(#a)"/>`;
  if (o.both) s = s.replace('marker-end="url(#a)"', 'marker-end="url(#a)" marker-start="url(#b)"');
  if (label) s += `<rect x="${(x1 + x2) / 2 - label.length * 3.4 - 4}" y="${(y1 + y2) / 2 - 17}" width="${label.length * 6.8 + 8}" height="17" fill="#FFFFFF" opacity="0.92"/>` + txt((x1 + x2) / 2, (y1 + y2) / 2 - 4, label, { size: 11.5, fill: '#404040' });
  return s;
};
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#404040"/></marker><marker id="b" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M10 0L0 5L10 10z" fill="#404040"/></marker></defs><rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`;
const out = (name, w, h, body) => {
  fs.writeFileSync(`diag/${name}.svg`, svg(w, h, body));
  execSync(`rsvg-convert -w ${w * 2} -o diag/${name}.png diag/${name}.svg`);
  console.log('diagrama', name);
};

// D1. Arquitectura general
out('d1-arquitectura', 1060, 520, [
  box(20, 40, 300, 440, 'Navegador', [], { top: true, fill: '#FAFAFA', dash: true }),
  txt(170, 84, 'React 19 + TypeScript', { size: 12, fill: '#595959' }),
  box(40, 100, 260, 60, 'Pantallas', ['Inicio, Plano, Sala, Victoria']),
  box(40, 176, 260, 60, 'Componentes', ['Paneles, diálogos, formularios']),
  box(40, 252, 260, 70, 'Estado del juego', ['useReducer + localStorage']),
  box(40, 338, 260, 60, 'Motor Canvas', ['Dibujo y lógica de la sala']),
  box(40, 414, 260, 50, 'services/apiClient.ts', [], { fill: '#E6E6E6' }),
  box(370, 190, 170, 100, 'Vite :5173', ['Sirve el frontend', 'Proxy /api y /uploads'], { fill: '#E6E6E6' }),
  box(600, 40, 250, 440, 'Backend FastAPI :8000', [], { top: true, fill: '#FAFAFA', dash: true }),
  box(620, 100, 210, 60, 'presentation', ['Rutas y esquemas Pydantic']),
  box(620, 176, 210, 60, 'use_cases', ['Métodos del libro y reglas']),
  box(620, 252, 210, 60, 'domain', ['Entidades y repositorios (ABC)']),
  box(620, 328, 210, 60, 'infrastructure', ['SQLAlchemy, disco, SymPy']),
  box(870, 90, 170, 70, 'SQLite', ['auditoria_docente.db'], { fill: '#E6E6E6' }),
  box(870, 200, 170, 70, 'Disco', ['uploads/evidencias/'], { fill: '#E6E6E6' }),
  arrow(300, 439, 370, 250, 'fetch', { both: false }),
  arrow(540, 240, 600, 240, 'HTTP', { both: true }),
  arrow(830, 358, 870, 130, 'SQL'),
  arrow(830, 372, 870, 240, 'archivos'),
  txt(530, 505, 'Los números y las tablas de cada método se calculan en el backend; el navegador solo los presenta.', { size: 12, fill: '#595959', italic: true }),
].join(''));

// D2. Capas
out('d2-capas', 1000, 470, [
  box(60, 30, 880, 80, 'presentation (CAPA 4)', ['routes_calculo.py, routes_docente.py, routes_auth.py, routes_records.py, schemas*.py, metodos/*.py'], { fill: '#E6E6E6' }),
  box(60, 140, 880, 80, 'use_cases (CAPA 2)', ['interpolacion.py, raices.py, sistemas.py, minimos_cuadrados.py, integracion.py, edos.py, generador_problemas.py, ...'], { fill: '#F2F2F2' }),
  box(60, 250, 880, 80, 'domain (CAPA 1)', ['entities.py, funciones.py (ErrorMetodo), repositories.py (interfaces ABC)'], { fill: '#D9D9D9' }),
  box(60, 360, 880, 80, 'infrastructure (CAPA 3)', ['database.py, sqlite_repo.py, local_storage.py, math_parser.py, seguridad.py, dataseeding.py'], { fill: '#E6E6E6' }),
  arrow(500, 110, 500, 140, 'usa'),
  arrow(500, 220, 500, 250, 'depende de'),
  arrow(500, 360, 500, 330, 'implementa'),
].join(''));

// D3. Secuencia de verificación
const lifelines = [['Jugador', 90], ['Frontend', 290], ['API verificar', 520], ['Motor + reglas', 740], ['SQLite y disco', 920]];
const seq = (steps, ll, w, h) => [
  ...ll.map(([n, x]) => box(x - 80, 20, 160, 38, n, [], { fill: '#E6E6E6' }) + `<line x1="${x}" y1="58" x2="${x}" y2="${h - 20}" stroke="#8C8C8C" stroke-dasharray="5 4"/>`),
  ...steps.map(([a, b, t, dash], i) => arrow(ll[a][1], 100 + i * 46, ll[b][1], 100 + i * 46, `${i + 1}. ${t}`, { dash })),
].join('');
out('d3-verificacion', 1000, 470, seq([
  [0, 1, 'Escribe respuesta y sube foto'],
  [1, 2, 'POST multipart (slug, entrada, respuesta, matrícula, foto)'],
  [2, 3, 'Revisa restricciones y ejecuta el método'],
  [3, 2, 'Resultado del libro', true],
  [2, 3, 'Compara parte entera y 3 decimales'],
  [2, 4, 'Guarda la foto y registra el intento'],
  [2, 1, 'Veredicto, folio y resolución si es correcta', true],
  [1, 0, 'Muestra resultado; si falla, resta 5 de vida', true],
], lifelines, 1000, 470));

// D4. Autenticación docente
const ll4 = [['Docente', 100], ['Frontend', 330], ['API /docente', 580], ['SQLite', 860]];
out('d4-autenticacion', 1000, 470, seq([
  [0, 1, 'Abre Panel Docente o Modo profesor'],
  [1, 2, 'POST /login (correo, clave)'],
  [2, 3, 'Busca docente y verifica hash scrypt'],
  [2, 3, 'Guarda hash SHA-256 del token y expiración'],
  [2, 1, 'Set-Cookie sesion_docente (HttpOnly, Strict)', true],
  [1, 2, 'GET /evidencias con la cookie'],
  [2, 3, 'exigir_docente consulta la sesión'],
  [2, 1, 'Datos protegidos o 401', true],
], ll4, 1000, 470));

// D5. Modelo de datos
const tabla = (x, y, w, nombre, cols) => {
  const h = 34 + cols.length * 22;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF" stroke="#595959" stroke-width="1.5"/><rect x="${x}" y="${y}" width="${w}" height="30" fill="#D9D9D9" stroke="#595959" stroke-width="1.5"/>` + txt(x + w / 2, y + 20, nombre, { bold: true, size: 13.5 }) + cols.map((c, i) => txt(x + 10, y + 52 + i * 22, c, { anchor: 'start', size: 12 })).join('');
};
out('d5-datos', 1000, 520, [
  tabla(20, 20, 400, 'evidencias_comprobacion', ['id  INTEGER  PK', 'matricula  VARCHAR(20)  índice', 'nivel  INTEGER', 'metodo  VARCHAR(60)', 'funcion  VARCHAR(255)', 'resultado_exacto  VARCHAR(500)', 'error  FLOAT  (nulo)', 'iteraciones_json  JSON', 'foto_procedimiento_url  VARCHAR(255)', 'foto_canvas_url  VARCHAR(255)', 'correcta  BOOLEAN  (nulo)', 'fecha_registro  DATETIME']),
  tabla(520, 20, 440, 'records_tiempo', ['id  INTEGER  PK', 'matricula  VARCHAR(20)  índice', 'modo  VARCHAR(20)  campana | contrarreloj', 'tiempo_ms  INTEGER', 'puntos  INTEGER', 'fecha_registro  DATETIME']),
  tabla(520, 220, 440, 'docentes', ['id  INTEGER  PK', 'correo  VARCHAR(120)  único', 'clave_hash  VARCHAR(255)  scrypt$sal$hash']),
  tabla(520, 350, 440, 'sesiones_docente', ['token_hash  VARCHAR(64)  PK  (SHA-256)', 'docente_id  INTEGER  índice', 'expira  DATETIME']),
  arrow(740, 320, 740, 350, 'docente_id', {}),
  txt(220, 470, 'Vínculo lógico por matrícula con records_tiempo (sin clave foránea)', { size: 11.5, fill: '#595959', italic: true }),
  arrow(420, 90, 520, 90, 'matricula', { dash: true, both: true }),
].join(''));

// D6. Estados del reloj de una terminal (Contrarreloj)
out('d6-reloj-terminal', 1000, 360, [
  box(30, 140, 190, 80, 'Sin iniciar', ['Sin contador']),
  box(310, 140, 190, 80, 'En marcha', ['Cuenta de 30:00 a 00:00']),
  box(610, 40, 190, 80, 'Resuelta', ['Contador eliminado'], { fill: '#E6E6E6' }),
  box(610, 240, 190, 80, 'Vencida', ['−35 de vida']),
  arrow(220, 180, 310, 180, 'E sobre la terminal'),
  arrow(500, 160, 610, 90, 'Respuesta correcta'),
  arrow(500, 200, 610, 270, '30 min sin resolver'),
  arrow(610, 290, 125, 220, 'Se restablece', { dash: true }),
  txt(330, 112, 'Cerrar la terminal no detiene el reloj', { size: 12, italic: true, fill: '#595959' }),
].join(''));

// D7. Navegación de pantallas
out('d7-navegacion', 1000, 400, [
  box(30, 150, 150, 70, 'Menú principal', ['Modo, matrícula']),
  box(250, 150, 150, 70, 'Plano', ['Salas y sectores']),
  box(470, 150, 150, 70, 'Sala', ['Canvas, HUD, bitácora']),
  box(690, 150, 150, 70, 'Terminal', ['Problema, foto, respuesta'], { fill: '#E6E6E6' }),
  box(470, 290, 150, 60, 'Victoria', ['Récord y estadísticas'], { fill: '#E6E6E6' }),
  box(30, 30, 150, 70, 'Acceso docente', ['Correo y contraseña']),
  box(250, 30, 150, 70, 'Panel Docente', ['Matrículas y evidencias'], { fill: '#E6E6E6' }),
  box(470, 30, 150, 70, 'Modo profesor', ['Catálogo, datos libres'], { fill: '#E6E6E6' }),
  arrow(180, 185, 250, 185, 'Nueva partida'),
  arrow(400, 185, 470, 185, 'Entrar'),
  arrow(620, 185, 690, 185, 'E', { both: true }),
  arrow(545, 220, 545, 290, 'Desactivar a OMEGA'),
  arrow(105, 150, 105, 100, 'Zona docente'),
  arrow(180, 65, 250, 65, 'Sesión válida'),
  arrow(400, 65, 470, 65, ''),
].join(''));
