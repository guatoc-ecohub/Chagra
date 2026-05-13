# Request #279

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/279
- Title: [feat] ErrorBoundary granular alrededor de AgentScreen y TelemetryAlerts
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: feat Scope: ErrorBoundary Descripcion: src/components/ErrorBoundary.jsx existe y se usa en src/main.jsx envolviendo toda la app, pero un crash en módulo IA tumba la UI entera y obliga a Reload. Para demo del 2026-05-19 necesitamos error boundaries granulares que aíslen fallos del módulo IA del resto de la app. Wrappear con ErrorBoundary los siguientes subárboles: (a) AgentScreen en su punto de montaje (src/App.jsx, buscar render de AgentScreen), (b) TelemetryAlerts en src/components/AssetsDashboard.jsx u otro sitio que lo monte, (c) AIStreamPanel si aparece embebido fuera de TelemetryAlerts/AgentScreen. Criterios: si AgentScreen lanza error, el resto de la app sigue navegable; el ErrorBoundary muestra el fallback existente con botones Reset/Reload; mismo para TelemetryAlerts. Restricciones: no modificar ErrorBoundary.jsx, no quitar el ErrorBoundary global de main.jsx (queda como red de seguridad). Prioridad: alta Contexto: demo 2026-05-19 con Diana Posada MinAgricultura. Si Ollama hipa 30s en vivo, sin boundaries granulares la app se ve en blanco.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
