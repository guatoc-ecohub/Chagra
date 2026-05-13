# Request #285

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/285
- Title: [fix] AgentScreen callLLM: mensajes de error específicos por status code (no string genérico)
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: AgentScreen Descripcion: src/components/AgentScreen/AgentScreen.jsx linea 126 hace 'if (!response.ok) throw new Error("LLM no disponible");' — mensaje genérico para todos los failure modes. Fix: distinguir por response.status: 401/403 = 'Sesion expirada, recarga la app'; 500/502/503 = 'IA no disponible, intenta de nuevo en un momento'; AbortError o timeout = 'Tiempo agotado, conexion lenta'; otros = 'Error al consultar IA (codigo: <status>)'. Criterios: el catch de handleSubmit propaga el mensaje al setError (linea 204), el usuario ve un mensaje accionable. Restricciones: no tocar ollamaStream.js, no agregar nueva dependencia. Prioridad: media Contexto: demo 2026-05-19 — si IA hipa en vivo, evitar mensaje opaco. Coordina con PR #283 (parser SSE → NDJSON) que ya esta merged.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
