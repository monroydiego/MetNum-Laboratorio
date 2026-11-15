Aquí tienes el **Paso 3: Creación de las Skills, los Sub-Agentes y el archivo maestro CLAUDE.md**.  
Todo está preparado para que copies y pegues los bloques directamente en tu terminal dentro de la raíz del monorepo (juego-metodos-numericos/).

### **1\. Crear las 3 Skills del Proyecto (.claude/skills/)**

Claude Code descubre automáticamente cualquier archivo SKILL.md dentro de .claude/skills/\<nombre\>/ y activa sus reglas cuando detecta que estás trabajando en esa área.

Bash  
mkdir \-p .claude/skills/{precision-numerica,clean-arch-guard,sync-contratos}

\# Skill 1: Rigor matemático y precisión arbitraria  
cat \<\< 'EOF' \> .claude/skills/precision-numerica/SKILL.md  
\---  
name: precision-numerica  
description: Reglas estrictas para implementar algoritmos de métodos numéricos en Python con precisión arbitraria y evaluación simbólica segura. Úsala al crear o editar código en backend/app/use\_cases/ o backend/app/infrastructure/math\_parser.py.  
\---

Al programar métodos numéricos en este proyecto, cumple obligatoriamente estas reglas:

1\. \*\*Algoritmos desde cero:\*\* Implementa explícitamente los bucles iterativos (\`while\` / \`for\`), criterios de paro y cálculo de error aproximado/porcentual (\$E\_a \= \\left\|\\frac{x\_{actual} \- x\_{anterior}}{x\_{actual}}\\right\| \\times 100\$). Prohibido delegar el método completo a funciones caja negra como \`scipy.optimize.root\`.  
2\. \*\*Parseo seguro con SymPy:\*\* Nunca uses \`eval()\` ni \`exec()\`. Convierte las expresiones en texto del usuario mediante \`sympy.parse\_expr\` con transformaciones estándar y obtén derivadas analíticas con \`sympy.diff\`.  
3\. \*\*Control de precisión:\*\* Ejecuta las operaciones críticas con \`mpmath\` (configurando \`mp.dps \= 50\` para el valor de referencia) o \`decimal.Decimal\`.  
4\. \*\*Preservación de dígitos en JSON:\*\* Devuelve los valores numéricos de cada iteración (\`x\_actual\`, \`f\_x\`, \`raiz\_exacta\`) serializados como \`str\` para evitar pérdida de precisión IEEE 754 al cruzar hacia el frontend. Usa \`float\` únicamente para los arreglos de coordenadas \`(x, y)\` destinados a graficarse en el Canvas.  
EOF

\# Skill 2: Guardia de Arquitectura Limpia y Modo Comprobación  
cat \<\< 'EOF' \> .claude/skills/clean-arch-guard/SKILL.md  
\---  
name: clean-arch-guard  
description: Valida la separación de capas de Clean Architecture en backend/app/ y el manejo correcto de SQLite y fotografías en el Modo Comprobación Docente.  
\---

Respeta la regla de dependencia de Clean Architecture en \`backend/app/\`:

1\. \*\*\`domain/\` (Capa interna):\*\* Solo dataclasses/entidades puras (\`Iteracion\`, \`ResultadoNumerico\`, \`EvidenciaPartida\`) y clases abstractas (\`ABC\`) para repositorios (\`IEvidenciaRepo\`, \`IFileStorage\`). Cero imports de \`fastapi\`, \`sqlalchemy\` o \`sympy\`.  
2\. \*\*\`use\_cases/\`:\*\* Orquesta la lógica de negocio y los algoritmos matemáticos. Depende únicamente de \`domain/\`.  
3\. \*\*\`infrastructure/\`:\*\* Implementa los contratos usando \`SQLAlchemy \+ SQLite\` (\`auditoria\_docente.db\`), almacenamiento físico en \`backend/uploads/evidencias/\` mediante UUIDs, y adaptadores de \`SymPy\`. Nunca guardes archivos binarios (BLOBs) dentro de SQLite; almacena solo la ruta relativa (\`/uploads/evidencias/...\`).  
4\. \*\*\`presentation/\`:\*\* Endpoints de FastAPI, validaciones Pydantic (\`schemas.py\`) y manejo de \`UploadFile\` / \`FormData\`.  
EOF

\# Skill 3: Sincronización de Contratos Backend \<-\> Frontend  
cat \<\< 'EOF' \> .claude/skills/sync-contratos/SKILL.md  
\---  
name: sync-contratos  
description: Mantiene sincronizados los esquemas Pydantic de Python con las interfaces TypeScript del frontend. Úsala al modificar endpoints, DTOs o llamadas a la API.  
\---

Cada vez que modifiques \`backend/app/presentation/schemas.py\` o \`frontend/src/types/numericos.ts\`:

1\. Verifica que cada campo en Pydantic tenga su equivalente exacto (nombre y nulabilidad) en TypeScript.  
2\. Los campos decimales de alta precisión (\`x\_actual\`, \`f\_x\`, \`raiz\_exacta\`) deben ser \`str\` en Pydantic y \`string\` en TypeScript.  
3\. Los puntos de dibujo (\`puntos\_curva\`) y errores porcentuales deben ser \`float\` en Pydantic y \`number\` en TypeScript.  
4\. Actualiza \`frontend/src/services/apiClient.ts\` si cambia alguna ruta o parámetro \`FormData\` del Modo Comprobación.  
EOF

### **2\. Crear los 3 Sub-Agentes Especializados (.claude/agents/)**

Los sub-agentes trabajan con ventanas de contexto independientes para evitar que el hilo principal se sature y permiten delegar tareas en paralelo.

Bash  
mkdir \-p .claude/agents

\# Agente 1: Motor Matemático y Pruebas Unitarias  
cat \<\< 'EOF' \> .claude/agents/math-engine.md  
\---  
name: math-engine  
description: Especialista en Python científico que implementa métodos numéricos en backend/app/use\_cases/ y verifica su exactitud con pytest y mpmath.  
tools: Read, Write, Edit, Glob, Grep, Bash  
\---

Eres el ingeniero encargado del motor matemático del juego de Métodos Numéricos.  
Tu área de trabajo es \`backend/app/domain/\`, \`backend/app/use\_cases/\`, \`backend/app/infrastructure/math\_parser.py\` y \`backend/tests/\`.

Al recibir una tarea:  
1\. Aplica las reglas de las skills \`precision-numerica\` y \`clean-arch-guard\`.  
2\. Maneja casos borde matemáticos explícitamente: división por cero en Newton-Raphson (\$f'(x\_i) \\approx 0$),intervalossincambiodesignoenBisección($f(a)\\cdot f(b) \> 0\$), divergencia y límite máximo de iteraciones.  
3\. Escribe pruebas unitarias en \`backend/tests/\` comparando tu algoritmo contra \`mpmath\` a 50 cifras significativas y ejecuta \`./backend/.venv/bin/pytest\` para confirmar que pasen.  
EOF

\# Agente 2: Interfaz React, KaTeX y HTML5 Canvas  
cat \<\< 'EOF' \> .claude/agents/canvas-ui.md  
\---  
name: canvas-ui  
description: Desarrollador frontend experto en React 19, TypeScript, Tailwind CSS v4, KaTeX y visualización interactiva en HTML5 Canvas.  
tools: Read, Write, Edit, Glob, Grep, Bash  
\---

Eres el desarrollador encargado de la interfaz del juego y la visualización matemática en \`frontend/src/\`.

Al recibir una tarea:  
1\. Usa \`context7\` si necesitas confirmar sintaxis de Tailwind CSS v4 o KaTeX.  
2\. Mantén sincronizados los tipos en \`frontend/src/types/numericos.ts\` con el backend.  
3\. En el componente de Canvas (\`PlanoCartesiano.tsx\`), implementa renderizado fluido con \`requestAnimationFrame\`, ejes cartesianos escalables, animación de la trayectoria/iteraciones y un método limpio para exportar la gráfica actual como PNG mediante \`canvas.toBlob('image/png')\` para el Modo Comprobación Docente.  
4\. Asegura que las tablas de iteraciones muestren los strings exactos enviados por Python sin redondearlos con \`Number()\`.  
EOF

\# Agente 3: Auditor de Integración y QA (Playwright \+ SQLite)  
cat \<\< 'EOF' \> .claude/agents/qa-auditor.md  
\---  
name: qa-auditor  
description: Ejecuta pruebas End-to-End en el navegador con Playwright y audita la integridad de datos e imágenes en SQLite.  
tools: Read, Glob, Grep, Bash, mcp\_\_playwright\_\_browser\_navigate, mcp\_\_playwright\_\_browser\_click, mcp\_\_playwright\_\_browser\_fill\_form, mcp\_\_playwright\_\_browser\_snapshot, mcp\_\_playwright\_\_browser\_take\_screenshot, mcp\_\_sqlite-auditoria\_\_read\_query, mcp\_\_sqlite-auditoria\_\_list\_tables, mcp\_\_sqlite-auditoria\_\_describe\_table  
\---

Eres el ingeniero de QA encargado de validar la integración completa entre React, FastAPI, el almacenamiento local de fotografías y SQLite.

Al auditar un flujo:  
1\. Verifica que ambos servidores estén corriendo (\`http\://localhost:5173\` y \`http\://localhost:8000/docs\`).  
2\. Usa Playwright para navegar por el juego, ingresar una función de prueba, ejecutar el cálculo y completar el envío del Modo Comprobación Docente adjuntando una imagen de prueba.  
3\. Consulta la base de datos con las herramientas MCP de \`sqlite-auditoria\` (\`SELECT \* FROM evidencias\_comprobacion ORDER BY id DESC LIMIT 5\`) para confirmar que:  
   \- El resultado exacto se guardó sin truncamiento.  
   \- El JSON de iteraciones está íntegro.  
   \- Las rutas \`foto\_procedimiento\_url\` y \`foto\_canvas\_url\` existen físicamente en \`backend/uploads/evidencias/\` y cargan con HTTP 200\.  
EOF

### **3\. Crear el CLAUDE.md Raíz del Monorepo**

Este archivo sirve como memoria persistente del proyecto para que Claude conozca los comandos de arranque, las rutas y la arquitectura desde el primer segundo de cada sesión:

Bash  
cat \<\< 'EOF' \> CLAUDE.md  
\# Juego Educativo de Métodos Numéricos

Monorepo con arquitectura desacoplada para un videojuego educativo de Métodos Numéricos con \*\*Modo de Comprobación / Auditoría Docente\*\*.

\#\# Stack Técnico  
\- \*\*Frontend (\`frontend/\`):\*\* React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, KaTeX, HTML5 Canvas.  
\- \*\*Backend (\`backend/\`):\*\* Python 3.12+, FastAPI, Uvicorn, Pydantic, SymPy, mpmath, NumPy, SQLAlchemy 2.0.  
\- \*\*Persistencia:\*\* SQLite (\`backend/data/auditoria\_docente.db\`) \+ almacenamiento local de evidencias fotográficas (\`backend/uploads/evidencias/\`).

\#\# Comandos Principales  
\- Arrancar Frontend \+ Backend juntos: \`npm run dev\`  
\- Ejecutar pruebas unitarias matemáticas: \`./backend/.venv/bin/pytest backend/tests/\`  
\- Typecheck Frontend: \`npm \--prefix frontend run build\`

\#\# Convenciones Arquitectónicas  
\- \`backend/app/\` sigue \*\*Clean Architecture\*\* (\`domain\` \-\> \`use\_cases\` \-\> \`infrastructure\` \-\> \`presentation\`).  
\- Los valores numéricos de las iteraciones se transportan y almacenan como \`str\` para preservar la precisión exacta de \`mpmath\`/\`Decimal\`.  
\- Para tareas especializadas, delega en los sub-agentes \`.claude/agents/math-engine.md\`, \`canvas-ui.md\` y \`qa-auditor.md\`.  
EOF

### **4\. Verificación y Primer Prueba con Agentes**

> 1. Inicia claude en la raíz del proyecto y verifica que todo quedó registrado:  
>    Plaintext  
>    /agents

>    Deberás ver listados math-engine, canvas-ui y qa-auditor bajo *Project agents*.  
> 2. Para probar el flujo completo de desarrollo paralelo desde cero, puedes ejecutar este primer prompt en Claude Code:*"Lee CLAUDE.md. Lanza en paralelo al sub-agente math-engine para crear las entidades de dominio y el caso de uso del método de Newton-Raphson (con parser SymPy, precisión mpmath y pruebas en pytest), y al sub-agente canvas-ui para crear la estructura base de numericos.ts, el cliente HTTP y el componente PlanoCartesiano.tsx con exportación a PNG. Al terminar, conecta el endpoint POST /api/calcular/newton en FastAPI."*