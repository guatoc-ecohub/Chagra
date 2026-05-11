# Request #241

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/241
- Title: [feat] Añadir vista UI de telemetría de comandos de voz
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

## Tipo\nfeat\n\n## Scope\nui\n\n## Descripción\nAñadir vista de telemetría de comandos de voz en la UI con tabla de eventos y métricas agregadas, más toggle en Settings para habilitar/deshabilitar la telemetría y configurar el período de retención de datos (TTL).\n\nLa infraestructura de captura ya existe (issue #239, PR #240 mergeado). Este issue se enfoca en la visualización y configuración por parte del usuario.\n\n## Criterios de aceptación\n- [ ] Crear nueva ruta/página de telemetría en UI (ej. /telemetry o /admin/voice-telemetry)\n- [ ] Mostrar resumen ejecutivo de la sesión actual: número de grabaciones, transcripciones exitosas/fallidas, tasa de éxito global\n- [ ] Mostrar métricas agregadas: duración total y promedio de grabaciones, longitud promedio de texto transcripciones, número promedio de entidades extraídas\n- [ ] Crear tabla de eventos con columnas: fecha, tipo de evento (recording_started, transcription_done, etc.), duración/entidades guardadas, nivel (info/warn/error)\n- [ ] Añadir botón para exportar telemetría en CSV\n- [ ] Añadir botón para exportar telemetría en JSON\n- [ ] Añadir botón para limpiar telemetría local (con confirmación de usuario)\n- [ ] Crear toggle en Settings para habilitar/deshabilitar telemetría de comandos de voz\n- [ ] Añadir selector en Settings para configurar período de retención (TTL): 1 día, 7 días, 30 días, nunca\n- [ ] Persistir configuración de telemetría (habilitado/deshabilitado + TTL) en localStorage\n- [ ] Integrar con sistema de configuración existente en Chagra (Settings)\n- [ ] UI debe ser responsive y funcional en móvil (offline-first)\n\n## Restricciones\nNo modificar src/db/dbCore.js, syncManager.js, payloadService.js, public/sw.js. No bumpear version ni CACHE_NAME.\n\n## Prioridad\nmedia\n\n## Contexto\nEste issue complementa el issue #239 (PR #240 mergeado) que implementó la infraestructura de captura de telemetría (servicio voiceTelemetry.js, integración en VoiceCapture.jsx). Ahora se necesita la capa de UI para visualizar estos datos y permitir configuración por parte del usuario.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
