# Request #246

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/246
- Title: [fix] offline.spec.js - Importar DB_VERSION de dbCore.js y corregir selector UI
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: tests Descripcion: Importar DB_NAME y DB_VERSION de dbCore.js y cambiar selector de Dashboard a Cola de tareas Criterios: importar DB_VERSION, usar getByText(Cola de tareas), test pasa en CI Restricciones: no tocar dbCore.js syncManager.js payloadService.js sw.js Prioridad: alta Contexto: test fallaba por mismatch version IDB y selector inexistente

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
