# Escape del Laboratorio Numérico II — Edición DELUXE (monorepo)

Videojuego educativo de Métodos Numéricos con **Modo de Comprobación / Auditoría Docente**.

Monorepo: `frontend/` (React + TypeScript + Tailwind, el juego) y `backend/` (FastAPI + Clean Architecture + SQLite, motor numérico y Modo Comprobación). El juego HTML/JS original se eliminó (recuperable con git); sus capturas siguen en `src/codigo_fuente/capturas/`.

## Reglas del proyecto (obligatorias)

Vienen de `src/codigo_fuente/context/INSTRUCCIONES.md` y aplican a cualquier método o resolución de problema:

1. **Formato del libro:** sigue estrictamente el formato de resolución que el *Libro de Métodos Numéricos* (`src/codigo_fuente/context/Libro-Metodos-Numericos.pdf`) define para CADA método.
2. **Sin fuentes externas:** no uses web, ejemplos externos ni conocimiento ajeno al libro para resolver problemas. Todo sale del PDF.
3. **Variables del libro:** usa solo variables que aparezcan o se mencionen en el libro. Una variable inventada hace que la respuesta no sea aceptada.
4. **Nombres de métodos del libro:** no cambies ni inventes nombres de métodos o procedimientos.

## Fase Actual: Rediseño Visual (UI-Only)

> Sección temporal. Se elimina al cerrar la fase.

- **Skill activa por defecto:** `ui-only-guard`. Aplícala antes de CADA edición en `frontend/` y ejecuta su verificación al terminar.
- **Prohibido tocar:** `backend/`, `frontend/src/services/`, `frontend/src/types/`, `frontend/src/catalogo/`, `frontend/src/juego/estado.ts`, `frontend/src/juego/mapa.ts`, `frontend/src/juego/motor/logica.ts`. Nada de lógica de negocio, cálculos, estado del juego ni contratos.
- **Área permitida:** `frontend/src/tokens.ts`, `frontend/src/index.css`, `frontend/index.html`, `frontend/src/pantallas/`, `frontend/src/componentes/`, `frontend/src/juego/JuegoCanvas.tsx`, `frontend/src/juego/motor/dibujo.ts`.
- **Delegación:** las tareas de interfaz y Canvas van al agente `canvas-ui` (`.claude/agents/canvas-ui.md`).
- **Dirección artística «Cinta de Plata»:** corto animado *rubber hose* en blanco y negro de 1930 (tinta sobre plata, grano, rayones, sombras duras, guantes blancos, movimiento elástico). OMEGA es lo único a todo color (rojo); cada sala recuperada se colorea a mano con su tinte (`tintes` en `tokens.ts`); dorado = foco de atención. `App.tsx` se permite solo para la cabecera visual. Todo valor visual sale de los tokens de `tokens.ts` / `index.css`; durante esta fase sustituye a la descripción de «Diseño visual» de más abajo.

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

**Problemas aleatorios (generador):** al entrar a cada método el frontend pide `GET /api/metodos/{slug}/problema[?semilla=n]` y llena el formulario con un problema NUEVO (botón «Problema nuevo» para otro). Generadores en `use_cases/generador_problemas.py` (uno por slug, datos pequeños parecidos a los del libro y a las Actividades Fundamentales de `context/MC` y `context/OR`; trigonometría/Ln solo donde el curso la usa). Cada generador garantiza las restricciones del método (Newton adelante/atrás: h uniforme y x dentro del intervalo; Diferencias Divididas: h todos distintos; Bisectriz: f(a)>0>f(b); Falsa Posición/Gráfico: cambio de signo; Punto Fijo: |g'|<1 y converge; Newton–Raphson/Secante: convergen sin dividir entre cero; Gauss–Seidel/Jacobi: diagonal dominante (o reordenable); Montante/Gauss–Jordán/Eliminación: pivotes no nulos; Simpson 1/3: n par; Simpson 3/8: n=3; Newton–Cotes: n dentro de la tabla; mín. cuadrados: x crecientes, sin polos y columnas independientes; EDO: f finita en el recorrido). Antes de mostrarse, todo problema pasa por `presentation/problemas.py`: valida el esquema, comprueba las restricciones del método en `use_cases/restricciones.py` (`incumplimientos(slug, datos, crear_funcion)`), ejecuta el método real y descarta el candidato si falla, no converge o copia el ejemplo del libro; si un candidato no cumple se CAMBIAN los datos (se sortea otro), nunca se muestra un aviso de «no se puede resolver». Los problemas guardados en la partida se revisan con `POST /api/problemas/revisar` (si ya no cumplen, se reemplazan). Al agregar un método nuevo hay que añadir su generador y su regla en `restricciones.py` (`test_generador_problemas.py` falla si faltan).

**Flujo de las consolas (juego):** el jugador NO obtiene la solución automática. Cada módulo plantea un problema (`PanelProblema.tsx`, guardado en la partida en `estado.problemas` hasta resolverlo), el jugador lo resuelve a mano, sube OBLIGATORIAMENTE la foto de su procedimiento y escribe su resultado; `POST /api/problemas/verificar` (multipart: slug, entrada, respuesta, matricula, nivel, foto_procedimiento) lo compara con el motor (`use_cases/respuesta_problema.py`: parte entera y 3 decimales, redondeo o truncado) y registra el intento con su foto en `evidencias_comprobacion` (columna `correcta`, `foto_canvas_url` vacío; foto en disco, nunca BLOB) para el Panel Docente. Correcta → se entrega la resolución completa (`Resolucion.tsx`) y la consola queda resuelta; incorrecta → NO se entrega la resolución y se restan 5 de vida (`VIDA_POR_RESPUESTA_INCORRECTA`). Vidas: 5 de 100 puntos (`VIDAS_MAX`, `energia`); al perder las 5 se reinicia la sala actual (sus problemas se borran y se marcan sin resolver; `salasReiniciadas`). TODOS los problemas de una sala son obligatorios (no hay opcionales ni paneles de consulta en el juego). Salas: Interpolación (5), Ecuaciones no lineales (6), Ecuaciones lineales (5, sin Raíces de Polinomios), Mínimos cuadrados (5), Integración (5: Trapezoidal, NC cerradas, NC abiertas, Simpson 1/3 y 3/8) y Ecuaciones diferenciales (8 escudos del jefe OMEGA: Euler adelante/atrás/modificado, RK2, RK3, RK4 1/3, RK4 3/8 y Orden Superior). El Modo profesor sigue permitiendo cualquier método del catálogo con datos libres.

**Diseño visual:** laboratorio claro (tokens `primario` verde matraz, `ambar`, `menta`, `hostil`, `escudo`, `azul` en `index.css` y `tokens.ts`; fuentes Outfit / Atkinson Hyperlegible / JetBrains Mono). El personaje, los drones centinela y el diseño de los módulos en `juego/motor/dibujo.ts` se conservan del diseño original.

Decisiones ante erratas/huecos del libro (aprobadas por el usuario): se implementa la fórmula impresa y los tests documentan la diferencia con el número impreso (RK2, y₁ de RK3, Bisectriz filas 5–6, signo de y″ en Orden Superior, tabla NC Cerradas n=8/9 corregida); Euler hacia Atrás usa y_{n+1}=y_n dentro de f (como Euler Modificado p.66); Raíces de Polinomios = divisores + División Sintética + fórmula general; 3/8 de Simpson solo n=3. Desfase del PDF: página del libro N = página PDF N+7.

## Estructura

- `src/codigo_fuente/context/arch/` contiene la documentación de arquitectura, stack, skills y plugins de referencia.
- `src/codigo_fuente/context/` contiene el libro, las instrucciones y las carpetas `MC/` (medio curso) y `OR/` (ordinario) con las diapositivas y Actividades Fundamentales; no modificar.
- Frontend: `src/juego/` (mapa de sectores/salas → slugs, estado + localStorage, motor Canvas con rAF), `src/pantallas/`, `src/componentes/` (PanelMetodo genera el formulario desde el JSON Schema de `/api/metodos`), `src/services/apiClient.ts`. Tokens de diseño en `src/index.css` (`@theme`) y `src/tokens.ts`.
