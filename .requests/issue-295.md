# Request #295

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/295
- Title: [feat] Banner 'nueva versión disponible' cuando Service Worker detecta CACHE_NAME nuevo
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: feat Scope: Service Worker + UI Descripcion: Cuando el Service Worker activa una nueva version (CACHE_NAME bump), actualmente no hay feedback al usuario — la PWA sigue corriendo el bundle viejo hasta que el usuario hace hard-reload manualmente. Implementar banner discreto top-right que aparece cuando SW dispara evento 'controllerchange' o cuando waiting worker existe (registration.waiting). Banner muestra texto Nueva version disponible con boton Actualizar que ejecuta registration.waiting?.postMessage({type 'SKIP_WAITING'}) seguido de window.location.reload(). Criterios: tras deploy de nueva version y refresh de la PWA, el operador ve banner en lugar de seguir con bundle stale; click en boton aplica update; banner desaparece tras update exitoso. Restricciones: no modificar public/sw.js (solo agregar event listener en el cliente React, el SW ya hace skipWaiting cuando se le pide), no hacer reload automatico (operador decide cuando). Implementacion sugerida componente nuevo src/components/UpdateAvailableBanner.jsx montado al top de App.jsx. Prioridad: alta Contexto: demo 2026-05-19 — evita reportes de bugs ya resueltos por bundle cacheado y muestra que la app esta viva.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
