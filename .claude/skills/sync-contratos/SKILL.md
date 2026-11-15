---
name: sync-contratos
description: Mantiene sincronizados los esquemas Pydantic de Python con las interfaces TypeScript del frontend. Úsala al modificar endpoints, DTOs o llamadas a la API.
---

Cada vez que modifiques `backend/app/presentation/schemas.py` o `frontend/src/types/numericos.ts`:

1. Verifica que cada campo en Pydantic tenga su equivalente exacto (nombre y nulabilidad) en TypeScript.
2. Los campos decimales de alta precisión (`x_actual`, `f_x`, `raiz_exacta`) deben ser `str` en Pydantic y `string` en TypeScript.
3. Los puntos de dibujo (`puntos_curva`) y errores porcentuales deben ser `float` en Pydantic y `number` en TypeScript.
4. Actualiza `frontend/src/services/apiClient.ts` si cambia alguna ruta o parámetro `FormData` del Modo Comprobación.
