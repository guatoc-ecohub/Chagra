# Request #241 — IMPLEMENTED

Implementado en `feat/ui-voice-telemetry`:
- VoiceTelemetryScreen.jsx: página de telemetría con tabla de eventos, métricas agregadas, export CSV/JSON, limpieza con confirmación
- ProfileScreen.jsx: toggle habilitar/deshabilitar telemetría + selector TTL (1d/7d/30d/nunca) + enlace "Ver telemetría"
- voiceTelemetry.js: guard dinámico de enabled + TTL, export getSessionEvents
- App.jsx: ruta `voice_telemetry`, pase de onNavigate a ProfileScreen
