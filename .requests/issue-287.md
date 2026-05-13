# Request #287

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/287
- Title: [feat] AgentScreen: tooltip + estado deshabilitado del toggle TTS cuando navegador no soporta speechSynthesis
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: feat Scope: AgentScreen Descripcion: src/services/ttsService.js linea ~speak() retorna null silencioso si window.speechSynthesis no esta disponible (caso Safari iOS algunos modos PWA). Pero el toggle Volume2/VolumeX en AgentScreen.jsx lineas 269-282 sigue activable sin indicar que TTS no funciona. Fix: agregar isSupported() en ttsService.js que retorne !!window.speechSynthesis (mismo patron que isSpeaking() existente). En AgentScreen, hacer disabled={!ttsSupported} y title='Tu navegador no soporta sintesis de voz' al boton TTS cuando no hay soporte. Criterios: si speechSynthesis es undefined, el boton TTS se ve grayed/disabled con tooltip explicativo; si esta disponible, comportamiento actual sin cambios. Restricciones: no romper el flow speak() / stop() actual, mantener ttsEnabled state. Prioridad: baja Contexto: previene confusion 'por que no hay voz' en demos a usuarios iOS.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
