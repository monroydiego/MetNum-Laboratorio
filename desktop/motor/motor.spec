# -*- mode: python ; coding: utf-8 -*-
# PyInstaller: empaqueta backend/app + frontend/dist en la carpeta dist/motor/ (onedir).
# Se ejecuta desde desktop/build.ps1:  pyinstaller desktop/motor/motor.spec
#
# contents_directory='.' deja todo junto a motor.exe, así `database.py` (que calcula sus rutas
# con Path(__file__).parents[2]) guarda la BD en motor/data/ y las fotos en motor/uploads/.
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

RAIZ = Path(SPECPATH).resolve().parents[1]
BACKEND = RAIZ / "backend"
WEB = RAIZ / "frontend" / "dist"

hidden = (
    collect_submodules("app")
    + collect_submodules("uvicorn")
    + ["multipart", "python_multipart"]
)

a = Analysis(
    [str(Path(SPECPATH) / "servidor_escritorio.py")],
    pathex=[str(BACKEND)],
    datas=[(str(WEB), "web")],
    hiddenimports=hidden,
    excludes=["tkinter", "pytest", "matplotlib", "IPython"],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="motor",
    console=True,  # el host .NET lo lanza con CreateNoWindow; así uvicorn tiene stdout válido
    upx=False,
    contents_directory=".",
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    name="motor",
    upx=False,
)
