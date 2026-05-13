# Request #294

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/294
- Title: [feat] ttsService: conectar a Kokoro local /api/kokoro/tts como TTS de alta calidad
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: feat Scope: ttsService Descripcion: src/services/ttsService.js usa actualmente window.speechSynthesis (Web Speech API del navegador, voces robóticas, variable según dispositivo). Alpha ahora tiene Kokoro-82M ONNX TTS corriendo en localhost:8088 sirviendo voces neuronales naturales (ef_dora español por default, formato opus 32kbps). Nginx debe proxyear /api/kokoro/ → http://127.0.0.1:8088/ (verificar que existe el location; si no, NO crear desde el cliente — solo asumir que esta o no esta). Implementacion: agregar funcion speakKokoro(text, options) que hace POST a /api/kokoro/tts con body JSON {text, voice='ef_dora', format='opus', lang='es'}, recibe blob opus, lo reproduce con new Audio(URL.createObjectURL(blob)). Mantener speak() actual (Web Speech) como fallback. Exportar isKokoroAvailable() que hace GET /api/kokoro/health al primer uso, cachea resultado, devuelve bool. AgentScreen.jsx y otros consumers usan speakKokoro si esta disponible, fallback a speak. Criterios: si Kokoro responde 200 a /health, las respuestas IA del agente se sintetizan con voz Kokoro natural; si Kokoro no responde, fallback transparente a Web Speech API sin error visible al usuario. Restricciones: NO romper la API actual de ttsService (mantener speak/stop/pause/resume), no agregar nueva dependencia externa, no modificar sw.js. Prioridad: alta Contexto: demo 2026-05-19 — la voz neuronal Kokoro mejora cualitativamente la experiencia del Asistente IA frente a Diana. Endpoint /api/kokoro/ probablemente requiere ser agregado a Nginx config en repo guatoc-nixos por separado; este issue solo cubre el cliente.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
