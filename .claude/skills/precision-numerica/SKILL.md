---
name: precision-numerica
description: Reglas estrictas para implementar algoritmos de métodos numéricos en Python con precisión arbitraria y evaluación simbólica segura. Úsala al crear o editar código en backend/app/use_cases/ o backend/app/infrastructure/math_parser.py.
---

Al programar métodos numéricos en este proyecto, cumple obligatoriamente estas reglas:

1. **Algoritmos desde cero:** Implementa explícitamente los bucles iterativos (`while` / `for`), criterios de paro y cálculo de error aproximado/porcentual ($E_a = \left|\frac{x_{actual} - x_{anterior}}{x_{actual}}\right| \times 100$). Prohibido delegar el método completo a funciones caja negra como `scipy.optimize.root`.
2. **Parseo seguro con SymPy:** Nunca uses `eval()` ni `exec()`. Convierte las expresiones en texto del usuario mediante `sympy.parse_expr` con transformaciones estándar y obtén derivadas analíticas con `sympy.diff`.
3. **Control de precisión:** Ejecuta las operaciones críticas con `mpmath` (configurando `mp.dps = 50` para el valor de referencia) o `decimal.Decimal`.
4. **Preservación de dígitos en JSON:** Devuelve los valores numéricos de cada iteración (`x_actual`, `f_x`, `raiz_exacta`) serializados como `str` para evitar pérdida de precisión IEEE 754 al cruzar hacia el frontend. Usa `float` únicamente para los arreglos de coordenadas `(x, y)` destinados a graficarse en el Canvas.

**Nota de proyecto:** Las reglas del libro de texto de `CLAUDE.md` (formato de resolución, variables y nombres de métodos del libro) tienen prioridad sobre cualquier convención general.
