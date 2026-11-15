Aquí tienes el **Paso 2: Instalación de Plugins Oficiales, Servidores de Lenguaje (LSP) y Hooks de Verificación**.  
Los plugins LSP de Claude Code requieren que los binarios de los servidores de lenguaje estén instalados en tu sistema para conectarse a ellos y darte diagnósticos de tipos en tiempo real.

### **1\. Instalar los Binarios LSP en Arch Linux**

Ejecuta este comando en tu terminal para instalar los servidores de lenguaje de Python y TypeScript de forma nativa:

Bash  
sudo pacman \-S pyright typescript-language-server typescript

### **2\. Instalar los Plugins Oficiales en Claude Code**

Abre claude dentro de la raíz de tu proyecto (juego-metodos-numericos/) y ejecuta los siguientes comandos desde el catálogo oficial de Anthropic (claude-plugins-official):

Plaintext  
/plugin install pyright-lsp@claude-plugins-official  
/plugin install typescript-lsp@claude-plugins-official  
/plugin install frontend-design@claude-plugins-official

* **pyright-lsp y typescript-lsp:** Analizan tus archivos en segundo plano. Si modificas un tipo en backend/app/presentation/schemas.py y se rompe la compatibilidad con frontend/src/types/numericos.ts, Claude recibe la alerta del compilador al instante sin tener que correr scripts manuales.  
* **frontend-design:** Carga directrices avanzadas de diseño de interfaces para React y Tailwind CSS v4, ideal para construir el HUD del juego, las tablas de iteraciones y el Panel Docente sin caer en estilos genéricos.

*(Nota: Tras instalar los plugins LSP, reinicia tu sesión de Claude Code con /exit y vuelve a entrar con claude para que ambos servidores de lenguaje se inicialicen).*

### **3\. Configurar el Hook de Pruebas Automáticas (.claude/settings.json)**

Para blindar la precisión matemática de tus algoritmos, crea el archivo .claude/settings.json en la raíz del proyecto. Este hook ejecutará pytest automáticamente cada vez que Claude cree o edite un archivo dentro de backend/app/use\_cases/:

Bash  
mkdir \-p .claude  
cat \<\< 'EOF' \> .claude/settings.json  
{  
  "hooks": {  
    "PostToolUse": \[  
      {  
        "matcher": "Write\|Edit",  
        "hooks": \[  
          {  
            "type": "command",  
            "command": "bash \-c 'if \[\[ \\"\$CLAUDE\_TOOL\_INPUT\_FILE\_PATH\\" \== \*\\"backend/app/use\_cases/\\"\* \]\]; then ./backend/.venv/bin/pytest backend/tests/ \-q; fi'"  
          }  
        \]  
      }  
    \]  
  }  
}  
EOF

### **4\. Comprobación del Paso 2**

Dentro de Claude Code, ejecuta:

Plaintext  
/plugin

En la pestaña **Installed**, verifica que pyright-lsp, typescript-lsp y frontend-design aparezcan habilitados y sin errores de binario faltante.  
Avísame cuando los tengas activos y pasamos al **Paso 3: Creación de las Skills y los Sub-Agentes**.