---
name: ui-only-guard
description: Guardia de la fase de Rediseño Visual (UI-Only). Úsala ANTES de cada edición en frontend/ para verificar que solo se tocan archivos visuales, que ningún archivo de lógica, cálculo, estado o contrato cambia, y que todo valor visual sale de los tokens de tokens.ts / index.css.
---

# ui-only-guard — Rediseño visual sin tocar la lógica

Esta fase es **estrictamente visual y de experiencia de usuario**. Un cambio de lógica, cálculo, estado del juego o contrato de datos es un defecto de esta fase, aunque "mejore" algo.

## 1. Verificación previa a CADA edición

Antes de llamar a Edit/Write, comprueba la ruta contra estas listas.

**Prohibido (no editar, ni siquiera para "arreglar un detalle"):**

- `backend/` (todo)
- `frontend/src/services/`
- `frontend/src/types/`
- `frontend/src/catalogo/`
- `frontend/src/juego/estado.ts`
- `frontend/src/juego/mapa.ts`
- `frontend/src/juego/motor/logica.ts`
- `package.json`, `package-lock.json`, `vite.config.*`, `tsconfig*.json` (salvo que el usuario lo pida explícitamente, p. ej. para una fuente local)

**Permitido:**

- `frontend/src/tokens.ts`
- `frontend/src/index.css`
- `frontend/index.html` (fuentes, `theme-color`, favicon)
- `frontend/src/pantallas/`
- `frontend/src/componentes/`
- `frontend/src/App.tsx` (solo cabecera/estructura visual: clases, markup, iconos; nunca estado, handlers ni rutas)
- `frontend/src/juego/JuegoCanvas.tsx`
- `frontend/src/juego/motor/dibujo.ts`
- `frontend/public/` (solo recursos gráficos: svg, png, fuentes)

Si un cambio visual parece requerir tocar un archivo prohibido, **detente y pregunta al usuario**; no lo resuelvas por tu cuenta.

## 2. Qué se puede cambiar dentro de un archivo permitido

Los archivos de `pantallas/`, `componentes/` y `JuegoCanvas.tsx` mezclan vista y comportamiento. Dentro de ellos:

- ✅ JSX/markup, `className`, estilos, iconos, textos de presentación, orden visual, animaciones, accesibilidad (aria, foco, contraste), llamadas de dibujo.
- ❌ Handlers que cambian estado del juego, llamadas a `apiClient`, cálculos o redondeos de números, validaciones, props/firmas exportadas que otros archivos consumen, claves de `localStorage`, valores de reglas (vidas, daño, umbrales).
- ❌ Convertir con `Number()`/`toFixed()` los strings numéricos que llegan del backend (ver skill `precision-numerica`). Las tablas muestran el string exacto.
- En `dibujo.ts` solo cambia **cómo** se dibuja, nunca **qué** posición, colisión o estado se calcula. Las funciones exportadas conservan su firma.

## 3. Sistema visual centralizado en tokens

Todo valor visual se declara una sola vez como token y se consume desde ahí:

| Categoría | DOM (Tailwind / CSS) | Canvas |
|---|---|---|
| Color | `@theme { --color-* }` en `index.css` | `color` en `tokens.ts` |
| Tipografía | `--font-*`, `--text-*` | `fuente` |
| Trazos / bordes | `--trazo-*` | `trazo` |
| Sombras | `--shadow-*` | `sombra` |
| Radios | `--radius-*` | `radio` |
| Movimiento | `--animate-*`, `--ease-*`, `--duracion-*` | `movimiento` |
| Espaciado | escala de Tailwind (no valores arbitrarios sueltos) | — |

Reglas:

1. **Sin hexadecimales sueltos** en `.tsx` ni en `dibujo.ts`: usa `color.*`, `conAlfa()` o clases `bg-*/text-*/border-*`. Si falta un color, añádelo a la vez en `tokens.ts` **y** en `@theme` con el mismo nombre.
2. `tokens.ts` y `index.css` son espejo: mismo nombre, mismo valor. Cambiar uno sin el otro es un defecto.
3. No renombres ni borres tokens existentes (los usan componentes que no estás tocando); cambia su valor o añade tokens nuevos.
4. Rojo (`hostil`, `omega`) solo para lo hostil/error. La paleta de series de gráficas nunca lo usa.
5. Toda animación respeta `prefers-reduced-motion` (CSS) y `prefiereMovimientoReducido()` (Canvas).
6. Contraste mínimo AA: texto normal ≥ 4.5:1 sobre `panel` y `fondo`.

## 4. Verificación posterior

Antes de dar una tarea por terminada:

```bash
git status --porcelain            # ninguna ruta prohibida debe aparecer
git diff --stat -- backend frontend/src/services frontend/src/types frontend/src/catalogo \
  frontend/src/juego/estado.ts frontend/src/juego/mapa.ts frontend/src/juego/motor/logica.ts   # debe salir vacío
npm run build:front               # typecheck + build
npm run test:back                 # debe seguir pasando (no se tocó, pero se confirma)
```

Si el diff de rutas prohibidas no está vacío, revierte esos cambios antes de continuar.
