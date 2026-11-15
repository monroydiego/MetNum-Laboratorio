## Laboratorio
## Emmanuel Carrillo Loera 2067988

# Escape del Laboratorio Numérico II — Edición DELUXE

Videojuego educativo de Métodos Numéricos. La IA OMEGA tomó el laboratorio: recupera los cuatro sectores resolviendo, en cada consola, un método del *Libro de Métodos Numéricos* con su formato de resolución, tabla, gráfica y procedimiento. Incluye modo profesor y Modo Comprobación Docente (foto del procedimiento + captura de la gráfica, consultables en el Panel Docente).

## Arranque

Requisitos: Node.js 20+ y Python 3.12+.

```bash
npm install
npm --prefix frontend install
python3 -m venv backend/.venv
./backend/.venv/bin/pip install -r backend/requirements.txt

npm run dev        # juego en http://localhost:5173 + motor en http://localhost:8000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Frontend y backend juntos |
| `npm run dev:front` / `npm run dev:back` | Solo uno de los dos |
| `npm run test:back` | Pruebas de los 36 métodos contra los ejemplos del libro (pytest + mpmath) |
| `npm run build:front` | Typecheck y build del frontend |

## Estructura

- `frontend/`: React 19, TypeScript, Vite, Tailwind CSS v4, KaTeX, Canvas.
- `backend/`: FastAPI con Clean Architecture (`domain` → `use_cases` → `infrastructure` → `presentation`), SymPy, mpmath y SQLite.
  - `POST /api/calcular/{metodo}`: un endpoint por método del libro.
  - `GET /api/metodos`: catálogo con el esquema de entrada y el ejemplo del libro.
  - `POST` y `GET /api/evidencias`: Modo Comprobación Docente.
- `src/codigo_fuente/context/`: libro e instrucciones del proyecto.
- `src/codigo_fuente/capturas/`: capturas de la versión original.

Más detalles en `LEEME_PRIMERO.txt` y `CLAUDE.md`.
