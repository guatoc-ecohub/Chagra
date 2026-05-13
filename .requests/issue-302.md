# Request #302

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/302
- Title: [chore] JSDoc completo a servicios IA core (aiService, voiceService, ollamaStream)
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: servicios IA Descripcion: Agregar JSDoc completo (params, returns, throws, examples) a las funciones exportadas de src/services/aiService.js, src/services/voiceService.js, src/services/ollamaStream.js. Mismo patron que el aplicado en #215 a dateFormatter.js. Las funciones ya tienen comentarios parciales — completar y normalizar. Criterios: cada funcion exportada tiene su bloque JSDoc con @param tipados (incluyendo @typedef si requiere), @returns descrito, @throws si aplica, y una o dos lineas de descripcion del proposito. Restricciones: no modificar la logica ni las firmas de las funciones; solo agregar/normalizar JSDoc. No tocar archivos fuera de los 3 mencionados. Prioridad: baja Contexto: mejora de mantenibilidad. Aunque es P3, opencode lo resuelve en pocos minutos.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
