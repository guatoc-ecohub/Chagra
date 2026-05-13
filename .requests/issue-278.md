# Request #278

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/278
- Title: [fix] AgentScreen callLLM usa parser SSE en vez de NDJSON — chat IA no streamea
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: AgentScreen Descripcion: src/components/AgentScreen/AgentScreen.jsx implementa callLLM (líneas 104-153) con fetch manual y parser que filtra por line.startsWith('data: ') (formato SSE). Pero Ollama /api/chat con stream:true devuelve NDJSON (un objeto JSON por línea, sin prefijo 'data: '). Resultado: ningún chunk pasa el filtro, fullContent queda vacío, setStreamingContent nunca actualiza, la UI muestra 'Pensando...' indefinidamente y el mensaje final también queda vacío. Fix: reemplazar callLLM por uso de streamOllama de src/services/ollamaStream.js (mismo patrón que TelemetryAlerts.jsx línea 471). Criterios: chat IA muestra respuesta token-por-token con efecto typewriter, streamingContent se actualiza, mensaje final se persiste vía addTurn. Restricciones: no tocar ollamaStream.js, no tocar TelemetryAlerts.jsx, mantener historial de addTurn intacto, mantener parseIntent y ActionConfirmModal. Prioridad: alta Contexto: bug bloqueante para demo del 2026-05-19 (reunión Diana Posada MinAgricultura). Sin fix el Asistente IA está completamente roto.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
