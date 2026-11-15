# Escape del Laboratorio Numérico II — Edición DELUXE (monorepo)

Videojuego educativo de Métodos Numéricos con **Modo de Comprobación / Auditoría Docente**.

Monorepo: `frontend/` (React + TypeScript + Tailwind, el juego) y `backend/` (FastAPI + Clean Architecture + SQLite, motor numérico y Modo Comprobación). El juego HTML/JS original se eliminó (recuperable con git); sus capturas siguen en `src/codigo_fuente/capturas/`.

## Reglas del proyecto (obligatorias)

Vienen de `src/codigo_fuente/context/INSTRUCCIONES.md` y aplican a cualquier método o resolución de problema:

1. **Formato del libro:** sigue estrictamente el formato de resolución que el *Libro de Métodos Numéricos* (`src/codigo_fuente/context/Libro-Metodos-Numericos.pdf`) define para CADA método.
2. **Sin fuentes externas:** no uses web, ejemplos externos ni conocimiento ajeno al libro para resolver problemas. Todo sale del PDF.
3. **Variables del libro:** usa solo variables que aparezcan o se mencionen en el libro. Una variable inventada hace que la respuesta no sea aceptada.
4. **Nombres de métodos del libro:** no cambies ni inventes nombres de métodos o procedimientos.

## Stack Técnico

- **Frontend (`frontend/`):** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, KaTeX, HTML5 Canvas.
- **Backend (`backend/`):** Python 3.12+, FastAPI, Uvicorn, Pydantic, SymPy, mpmath, NumPy, SQLAlchemy 2.x.
- **Persistencia:** SQLite (`backend/data/auditoria_docente.db`) + evidencias fotográficas en `backend/uploads/evidencias/`.

## Comandos Principales

- Frontend + backend juntos: `npm run dev` (raíz)
- Solo frontend: `npm run dev:front` · Solo backend: `npm run dev:back`
- Pruebas unitarias matemáticas: `npm run test:back` (`./backend/.venv/bin/pytest backend/tests/`)
- Build / typecheck frontend: `npm run build:front`

## Convenciones Arquitectónicas

- `backend/app/` sigue **Clean Architecture**: `domain` → `use_cases` → `infrastructure` → `presentation`. Ver skill `clean-arch-guard`.
- Los valores numéricos de las iteraciones se transportan y almacenan como `str` para preservar precisión. Ver skill `precision-numerica`.
- Contratos Pydantic ↔ TypeScript: ver skill `sync-contratos`.
- Tareas especializadas: delegar en los sub-agentes `.claude/agents/math-engine.md`, `canvas-ui.md` y `qa-auditor.md`.
- Idioma de UI, comentarios y documentación: español.
- Commits al estilo del repo: `feat: …`, `feat(docs): …`, `init(docs): …`.
- Antes de dar algo por terminado: `npm run test:back` y `npm run build:front` deben pasar.

## Motor numérico (métodos del libro)

Cada método: función en `backend/app/use_cases/<modulo>.py` (bucle explícito, variables del libro) → adaptador `@registrar` en `backend/app/presentation/metodos/<modulo>.py` → `POST /api/calcular/{slug}`. Esquemas de entrada en `presentation/schemas_<modulo>.py` (espejo `frontend/src/types/entradas/<modulo>.ts`); salida común `ResultadoOut` en `schemas.py` (espejo `frontend/src/types/numericos.ts`). `GET /api/metodos` publica el catálogo con el JSON Schema de entrada y el ejemplo del libro. Utilidades comunes en `use_cases/_comun.py` (`num`, `fmt` a 9 decimales, `error_libro`). Error del libro: Є = |x_{i+1} − x_i| (absoluto, no porcentual).

- `interpolacion.py` (Unidad I · 1): `interpolacion-lineal`, `newton-adelante`, `newton-atras`, `diferencias-divididas`, `lagrange`
- `raices.py` (Unidad I · 2): `grafico`, `bisectriz`, `punto-fijo`, `newton-raphson`, `falsa-posicion`, `secante`
- `sistemas.py` (Unidad II · 3): `montante`, `gauss-jordan`, `eliminacion-gaussiana`, `gauss-seidel`, `jacobi`, `raices-polinomios`
- `minimos_cuadrados.py` (Unidad II · 4): `linea-recta`, `cuadratica`, `cubica`, `lineal-con-funcion`, `cuadratica-con-funcion`
- `integracion.py` (Unidad III · 5): `trapezoidal`, `newton-cotes-cerradas`, `newton-cotes-abiertas`, `tablas-newton-cotes`, `simpson-1-3`, `simpson-3-8`
- `edos.py` (Unidad IV · 6): `euler-adelante`, `euler-atras`, `euler-modificado`, `runge-kutta-2`, `runge-kutta-3`, `runge-kutta-4-simpson-1-3`, `runge-kutta-4-simpson-3-8`, `runge-kutta-orden-superior`

Decisiones ante erratas/huecos del libro (aprobadas por el usuario): se implementa la fórmula impresa y los tests documentan la diferencia con el número impreso (RK2, y₁ de RK3, Bisectriz filas 5–6, signo de y″ en Orden Superior, tabla NC Cerradas n=8/9 corregida); Euler hacia Atrás usa y_{n+1}=y_n dentro de f (como Euler Modificado p.66); Raíces de Polinomios = divisores + División Sintética + fórmula general; 3/8 de Simpson solo n=3. Desfase del PDF: página del libro N = página PDF N+7.

## Estructura

- `src/codigo_fuente/context/arch/` contiene la documentación de arquitectura, stack, skills y plugins de referencia.
- `src/codigo_fuente/context/` contiene el libro y las instrucciones; no modificar.
- Frontend: `src/juego/` (mapa de sectores/salas → slugs, estado + localStorage, motor Canvas con rAF), `src/pantallas/`, `src/componentes/` (PanelMetodo genera el formulario desde el JSON Schema de `/api/metodos`), `src/services/apiClient.ts`. Tokens de diseño en `src/index.css` (`@theme`) y `src/tokens.ts`.
