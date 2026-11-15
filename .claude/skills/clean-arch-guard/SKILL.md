---
name: clean-arch-guard
description: Valida la separación de capas de Clean Architecture en backend/app/ y el manejo correcto de SQLite y fotografías en el Modo Comprobación Docente.
---

Respeta la regla de dependencia de Clean Architecture en `backend/app/`:

1. **`domain/` (Capa interna):** Solo dataclasses/entidades puras (`Iteracion`, `ResultadoNumerico`, `EvidenciaPartida`) y clases abstractas (`ABC`) para repositorios (`IEvidenciaRepo`, `IFileStorage`). Cero imports de `fastapi`, `sqlalchemy` o `sympy`.
2. **`use_cases/`:** Orquesta la lógica de negocio y los algoritmos matemáticos. Depende únicamente de `domain/`.
3. **`infrastructure/`:** Implementa los contratos usando `SQLAlchemy + SQLite` (`auditoria_docente.db`), almacenamiento físico en `backend/uploads/evidencias/` mediante UUIDs, y adaptadores de `SymPy`. Nunca guardes archivos binarios (BLOBs) dentro de SQLite; almacena solo la ruta relativa (`/uploads/evidencias/...`).
4. **`presentation/`:** Endpoints de FastAPI, validaciones Pydantic (`schemas.py`) y manejo de `UploadFile` / `FormData`.
