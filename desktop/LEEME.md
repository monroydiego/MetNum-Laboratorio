# Versión de escritorio (Windows · .NET 10 + WebView2)

Genera **un solo `LaboratorioNumerico.exe`** que abre el juego en una ventana nativa, sin navegador,
sin Node y sin Python instalados en la máquina del alumno.

## Cómo funciona

```
LaboratorioNumerico.exe  (WinForms .NET 10, autocontenido, un solo archivo)
 ├─ WebView2 ──────────────► http://127.0.0.1:48650/        (juego: frontend/dist)
 └─ motor.zip (incrustado)                  └─ /api, /uploads (FastAPI: backend/app)
      └─ se extrae en %LOCALAPPDATA%\LaboratorioNumerico\motor\motor.exe  (PyInstaller)
```

- `motor/servidor_escritorio.py` importa `backend/app` **sin modificarlo** y monta `frontend/dist`
  en el mismo origen, así funcionan las rutas relativas `/api` y la cookie del Panel Docente.
- El host elige el puerto 48650 (fijo, para que la partida guardada en `localStorage` no se pierda);
  si está ocupado, usa uno libre.
- El motor corre dentro de un *Job Object*: al cerrar la ventana (o si el host se cae) Windows lo termina.
- Una sola instancia a la vez (BD SQLite compartida).
- La cámara solo se permite al propio juego (foto del procedimiento). Los enlaces externos se abren
  en el navegador del sistema. **F11** = pantalla completa.

### Dónde quedan los datos (`%LOCALAPPDATA%\LaboratorioNumerico\`)

| Carpeta              | Contenido                                                          |
| -------------------- | ------------------------------------------------------------------ |
| `motor\data\`        | `auditoria_docente.db` (evidencias, récords, cuenta docente)       |
| `motor\uploads\`     | fotos de procedimientos                                            |
| `WebView2\`          | perfil del navegador (partida guardada en `localStorage`)          |
| `logs\motor.log`     | salida del motor (para diagnosticar si no arranca)                 |

Al publicar una versión nueva del `.exe`, el motor se reemplaza y `data\` y `uploads\` se conservan.

## Generar el .exe (en Windows x64)

Requisitos: Node.js 20+, Python 3.12+ y SDK de .NET 10.

```powershell
npm run build:exe
# o:  powershell -ExecutionPolicy Bypass -File desktop\build.ps1
```

Resultado: `desktop\dist\LaboratorioNumerico.exe` (~110 MB).

Opciones: `-SaltarFrontend` (reusa `frontend\dist`) y `-SaltarMotor` (reusa `desktop\artifacts\motor.zip`,
útil si solo cambió el código C#).

> PyInstaller no hace compilación cruzada: el motor **debe** empaquetarse en Windows. El host .NET
> sí compila desde Linux/macOS (`EnableWindowsTargeting`), pero sin un `motor.zip` de Windows no sirve.

## Requisito en la máquina destino

**Microsoft Edge WebView2 Runtime**. Windows 11 y Windows 10 actualizados ya lo traen. Si falta,
la aplicación lo avisa y ofrece abrir la página de descarga.

## Estructura

```
desktop/
├─ build.ps1                        # frontend → PyInstaller → motor.zip → dotnet publish
├─ motor/
│  ├─ servidor_escritorio.py        # FastAPI + frontend estático en un mismo origen
│  └─ motor.spec                    # PyInstaller (onedir, contents_directory='.')
└─ LaboratorioNumerico.Desktop/     # .NET 10 WinForms + Microsoft.Web.WebView2
   ├─ Program.cs                    # instancia única
   ├─ VentanaPrincipal.cs           # pantalla de carga + WebView2
   ├─ MotorLocal.cs                 # extracción, puerto, arranque y espera de /api/salud
   ├─ TrabajoWindows.cs             # Job Object (KILL_ON_JOB_CLOSE)
   └─ icono.ico / icono.svg
```
