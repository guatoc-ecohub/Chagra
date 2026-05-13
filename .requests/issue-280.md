# Request #280

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/280
- Title: [fix] TelemetryAlerts: reemplazar mensaje de developer por UX cuando falta token HA
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: TelemetryAlerts Descripcion: src/components/TelemetryAlerts.jsx línea 268 setea setError('VITE_HA_ACCESS_TOKEN no configurado en el archivo .env') cuando falta el token HA. Ese mensaje es de developer y se muestra al usuario final si la PWA queda sin token. Cambiar por mensaje UX neutro tipo 'Telemetría no disponible. Verifica configuración con el administrador.' Criterios: el error visible al usuario no menciona variables de entorno ni archivos .env; el console.warn técnico puede mantenerse para debug. Restricciones: no tocar la lógica de detección (mantener if !HA_TOKEN). Prioridad: media Contexto: demo 2026-05-19, evitar leaks de info técnica/developer en pantalla de Diana.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
