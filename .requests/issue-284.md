# Request #284

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/284
- Title: [fix] AgentScreen: auto-scroll del chat con scrollIntoView en mensajes nuevos + streaming
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: fix Scope: AgentScreen Descripcion: src/components/AgentScreen/AgentScreen.jsx linea 35 declara chatEndRef y linea 360 lo monta como <div ref={chatEndRef} /> al final del chat, pero NUNCA se llama scrollIntoView. Cuando llegan mensajes nuevos o cuando streamingContent actualiza, el chat NO se autoscrollea — el usuario tiene que hacer scroll manual. Fix: agregar useEffect que llame chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) cuando cambian messages.length o streamingContent. Criterios: enviar mensaje y respuesta IA hace que el chat se desplace al final automaticamente sin intervencion del usuario. Restricciones: no tocar ChatHistory.jsx, no modificar la estructura de messages. Prioridad: media Contexto: demo 2026-05-19 con Diana — UX pulida del chat IA mejora percepcion sin riesgo.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
