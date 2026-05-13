# Request #286

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/286
- Title: [fix] agentIntentParser: regex de registrar_aplicacion captura verbo en vez de producto
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: agentIntentParser Descripcion: src/services/agentIntentParser.js lineas 88-94 define el extract de registrar_aplicacion con regex 'const productMatch = text.match(/(?:de\\s+)?(\\w+(?:\\s+\\w+)?)/i);' — captura primer 1-2 palabras del texto que tipicamente son el verbo 'aplicar' u 'aplicación', no el producto. Repro: 'aplicar caldo bordelés' captura 'aplicar', no 'caldo bordelés'. Fix: ajustar regex para skipear verbos comunes antes del capture, e.g.: 'const productMatch = text.match(/(?:aplic\\S+|fertiliz\\S+|abon\\S+)\\s+(?:de\\s+)?(\\w+(?:\\s+\\w+)?)/i);'. Criterios: 'aplicar caldo bordelés' captura 'caldo bordelés'; 'aplicar de neem foliar' captura 'neem foliar' o 'neem'; 'fertilice con compost' captura 'compost'. Restricciones: no romper los otros 3 intents (registrar_cosecha/riego/observacion), mantener compatibilidad con tests existentes si los hay. Prioridad: media Contexto: el intent extract llena el campo notes del log que se commitea — captura incorrecta queda en bitacora como 'Aplicación: aplicar' (confuso).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
