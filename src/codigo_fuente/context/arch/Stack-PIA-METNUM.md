### **1\. Stack Tecnológico Consolidado**

| Capa | Tecnología | Rol en el Sistema |
| :---- | :---- | :---- |
| **Frontend Core** | **React 19 \+ TypeScript \+ Vite** | Gestión de estado del juego, máquina de estados de niveles y tipado estricto de contratos HTTP. |
| **Estilos e Iconos** | **Tailwind CSS v4 \+ Lucide React** | Interfaz del juego (HUD), tablas de convergencia y vista del Panel de Auditoría Docente. |
| **Motor Visual 2D** | **HTML5 Canvas (requestAnimationFrame)** | Renderizado de planos cartesianos, trayectorias y exportación automática de capturas (canvas.toBlob()). |
| **Notación Matemática** | **KaTeX (katex)** | Renderizado de funciones, derivadas y matrices en formato LaTeX dentro de la UI. |
| **Backend API** | **Python 3.12+ \+ FastAPI \+ Uvicorn** | API REST con validación estricta (Pydantic), endpoints multipart/form-data y Swagger (/docs). |
| **Motor Numérico** | **mpmath \+ decimal \+ SymPy \+ NumPy** | Cálculo de precisión arbitraria, parseo simbólico seguro de funciones y derivación analítica. |
| **Base de Datos** | **SQLite \+ SQLAlchemy 2.0** | Persistencia local autocontenida en archivo .db con soporte nativo para columnas JSON. |
| **File Storage** | **Local Filesystem \+ FastAPI StaticFiles** | Almacenamiento físico de fotografías de procedimiento y capturas del canvas en backend/uploads/. |
| **Orquestación** | **Concurrently** | Ejecución simultánea de Vite y Uvicorn desde la raíz con un solo comando (npm run dev). |

### **2\. Estructura del Monorepo (Clean Architecture)**

Plaintext  
juego-metodos-numericos/  
├── .gitignore                        \# Ignora .venv, node\_modules, \*.db y uploads/  
├── package.json                      \# Orquestador raíz (npm run dev)  
├── backend/  
│   ├── requirements.txt  
│   ├── data/                         \# Se crea al iniciar; contiene auditoria\_docente.db  
│   ├── uploads/  
│   │   └── evidencias/               \# Fotografías físicas guardadas por UUID  
│   ├── tests/                        \# Pruebas unitarias de precisión (pytest)  
│   └── app/  
│       ├── main.py                   \# Entrypoint FastAPI, CORS y montaje de StaticFiles  
│       ├── domain/                   \# CAPA 1: Entidades puras e interfaces (Cero dependencias)  
│       │   ├── entities.py           \# Iteracion, ResultadoNumerico, EvidenciaPartida  
│       │   └── repositories.py       \# Interfaces abstractas (ABC): IEvidenciaRepo, IFileStorage  
│       ├── use\_cases/                \# CAPA 2: Lógica de negocio y algoritmos puros  
│       │   ├── raices.py             \# Bisección, Newton-Raphson, Secante, Punto Fijo  
│       │   ├── sistemas.py           \# Jacobi, Gauss-Seidel  
│       │   ├── edos.py               \# Euler, Runge-Kutta 4 (RK4)  
│       │   └── gestionar\_evidencia.py\# Orquesta guardado de imágenes \+ registro en BD  
│       ├── infrastructure/           \# CAPA 3: Implementaciones técnicas y librerías  
│       │   ├── math\_parser.py        \# Evaluador seguro y derivadas con SymPy \+ mpmath  
│       │   ├── database.py           \# Engine de SQLite y sesión de SQLAlchemy  
│       │   ├── sqlite\_repo.py        \# Implementación de IEvidenciaRepo en SQLite  
│       │   └── local\_storage.py      \# Implementación de IFileStorage en disco  
│       └── presentation/             \# CAPA 4: Controladores HTTP y DTOs  
│           ├── schemas.py            \# Modelos Pydantic (Entrada/Salida JSON)  
│           ├── routes\_calculo.py     \# POST /api/calcular/{metodo}  
│           └── routes\_docente.py     \# POST y GET /api/evidencias (Modo Comprobación)  
└── frontend/  
    ├── package.json  
    ├── vite.config.ts  
    └── src/  
        ├── types/  
        │   └── numericos.ts          \# Interfaces TypeScript (espejo de schemas.py)  
        ├── services/  
        │   └── apiClient.ts          \# Cliente HTTP (fetch) para cálculos y envío de FormData  
        ├── canvas/  
        │   └── PlanoCartesiano.tsx   \# Motor gráfico 2D con exportador a Blob PNG  
        ├── components/  
        │   ├── FormulaLatex.tsx      \# Wrapper de KaTeX  
        │   ├── TablaIteraciones.tsx  \# Desglose paso a paso de convergencia  
        │   ├── ModalComprobacion.tsx \# Subida de foto del procedimiento \+ captura automática  
        │   └── PanelDocente.tsx      \# Vista de auditoría comparativa (Foto vs Canvas vs Tabla)  
        └── App.tsx

### **3\. Inicialización del Entorno**

#### **A. Backend (Python \+ SQLite)**

Bash  
mkdir \-p juego-metodos-numericos/backend/{data,uploads/evidencias,tests,app/{domain,use\_cases,infrastructure,presentation}}  
cd juego-metodos-numericos/backend

python \-m venv .venv  
source .venv/bin/activate

pip install fastapi "uvicorn\[standard\]" pydantic sympy mpmath numpy sqlalchemy python-multipart pytest  
pip freeze \> requirements.txt

#### **B. Frontend (React \+ TypeScript \+ Tailwind v4)**

Bash  
cd ..  
npm create vite@latest frontend \-- \--template react-ts  
cd frontend

npm install tailwindcss @tailwindcss/vite lucide-react katex  
npm install \-D @types/katex

Configura frontend/vite.config.ts:  
TypeScript  
import { defineConfig } from 'vite';  
import react from '@vitejs/plugin-react';  
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({  
  plugins: \[react(), tailwindcss()\],  
});

Agrega en frontend/src/index.css:  
CSS  
@import "tailwindcss";  
@import "katex/dist/katex.min.css";

#### **C. Orquestación en la Raíz**

En juego-metodos-numericos/package.json:  
Bash  
cd ..  
npm init \-y  
npm install \-D concurrently

JSON  
{  
  "name": "juego-metodos-numericos",  
  "private": true,  
  "scripts": {  
    "dev:front": "npm \--prefix frontend run dev",  
    "dev:back": "./backend/.venv/bin/uvicorn app.main:app \--app-dir backend \--reload \--port 8000",  
    "dev": "concurrently \-n \\"FRONT,BACK\\" \-c \\"cyan,yellow\\" \\"npm run dev:front\\" \\"npm run dev:back\\""  
  }  
}

### **4\. Piezas Clave de Integración**

#### **Persistencia en SQLite (backend/app/infrastructure/database.py)**

Guarda los resultados exactos como texto (String) para no truncar decimales de mpmath, el historial completo en JSON y las rutas relativas de las fotografías:

Python  
from datetime import datetime, timezone  
from sqlalchemy import create\_engine, Column, Integer, String, Float, DateTime, JSON  
from sqlalchemy.orm import declarative\_base, sessionmaker

DATABASE\_URL \= "sqlite:///./data/auditoria\_docente.db"

engine \= create\_engine(DATABASE\_URL, connect\_args={"check\_same\_thread": False})  
SessionLocal \= sessionmaker(autocommit=False, autoflush=False, bind=engine)  
Base \= declarative\_base()

class EvidenciaModel(Base):  
    \_\_tablename\_\_ \= "evidencias\_comprobacion"

    id \= Column(Integer, primary\_key=True, index=True)  
    matricula \= Column(String(20), index=True, nullable=False)  
    nivel \= Column(Integer, nullable=False)  
    metodo \= Column(String(50), nullable=False)  
    funcion \= Column(String(255), nullable=False)  
    resultado\_exacto \= Column(String(120), nullable=False)  \# Preserva precisión de mpmath/Decimal  
    error\_porcentual \= Column(Float, nullable=False)  
    iteraciones\_json \= Column(JSON, nullable=False)          \# Tabla completa de iteraciones  
    foto\_procedimiento\_url \= Column(String(255), nullable=False)  
    foto\_canvas\_url \= Column(String(255), nullable=False)  
    fecha\_registro \= Column(DateTime, default=lambda: datetime.now(timezone.utc))

#### **Exposición de Imágenes y CORS (backend/app/main.py)**

Python  
from pathlib import Path  
from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware  
from fastapi.staticfiles import StaticFiles  
from app.infrastructure.database import Base, engine

Path("data").mkdir(exist\_ok=True)  
Path("uploads/evidencias").mkdir(parents=True, exist\_ok=True)  
Base.metadata.create\_all(bind=engine)

app \= FastAPI(title="Motor Numérico & Auditoría Docente")

app.add\_middleware(  
    CORSMiddleware,  
    allow\_origins=\["http\://localhost:5173"\],  
    allow\_methods=\["\*"\],  
    allow\_headers=\["\*"\],  
)

\# Permite que React cargue las fotos directamente vía \<img src="http\://localhost:8000/uploads/evidencias/..." /\>  
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

