# Arquitectura y Estructura de Carpetas del Proyecto

A continuación se detalla la organización de directorios y archivos del sistema (Clean Architecture en el backend y arquitectura modular en el frontend):

```text
├── .gitignore                        # Ignora .venv, node_modules, *.db y uploads/
├── package.json                      # Orquestador raíz (npm run dev)
├── backend/
│   ├── requirements.txt
│   ├── data/                         # Se crea al iniciar; contiene auditoria_docente.db
│   ├── uploads/
│   │   └── evidencias/               # Fotografías físicas guardadas por UUID
│   ├── tests/                        # Pruebas unitarias de precisión (pytest)
│   └── app/
│       ├── main.py                   # Entrypoint FastAPI, CORS y montaje de StaticFiles
│       ├── domain/                   # CAPA 1: Entidades puras e interfaces (Cero dependencias)
│       │   ├── entities.py           # Iteracion, ResultadoNumerico, EvidenciaPartida
│       │   └── repositories.py       # Interfaces abstractas (ABC): IEvidenciaRepo, IFileStorage
│       ├── use_cases/                # CAPA 2: Lógica de negocio y algoritmos puros
│       │   ├── raices.py             # Bisección, Newton-Raphson, Secante, Punto Fijo
│       │   ├── sistemas.py           # Jacobi, Gauss-Seidel
│       │   ├── edos.py               # Euler, Runge-Kutta 4 (RK4)
│       │   └── gestionar_evidencia.py# Orquesta guardado de imágenes + registro en BD
│       ├── infrastructure/           # CAPA 3: Implementaciones técnicas y librerías
│       │   ├── math_parser.py        # Evaluador seguro y derivadas con SymPy + mpmath
│       │   ├── database.py           # Engine de SQLite y sesión de SQLAlchemy
│       │   ├── sqlite_repo.py        # Implementación de IEvidenciaRepo en SQLite
│       │   └── local_storage.py      # Implementación de IFileStorage en disco
│       └── presentation/             # CAPA 4: Controladores HTTP y DTOs
│           ├── schemas.py            # Modelos Pydantic (Entrada/Salida JSON)
│           ├── routes_calculo.py     # POST /api/calcular/{metodo}
│           └── routes_docente.py     # POST y GET /api/evidencias (Modo Comprobación)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── types/
        │   └── numericos.ts          # Interfaces TypeScript (espejo de schemas.py)
        ├── services/
        │   └── apiClient.ts          # Cliente HTTP (fetch) para cálculos y envío de FormData
        ├── canvas/
        │   └── PlanoCartesiano.tsx   # Motor gráfico 2D con exportador a Blob PNG
        ├── components/
        │   ├── FormulaLatex.tsx      # Wrapper de KaTeX
        │   ├── TablaIteraciones.tsx  # Desglose paso a paso de convergencia
        │   ├── ModalComprobacion.tsx # Subida de foto del procedimiento + captura automática
        │   └── PanelDocente.tsx      # Vista de auditoría comparativa (Foto vs Canvas vs Tabla)
        └── App.tsx
```