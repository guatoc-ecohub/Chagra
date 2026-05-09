# Request #232

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/232
- Title: [perf] Implementar MEDIA_CACHE LRU eviction
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

## Tipo\n\nperf\n\n## Scope\n\nsync/telemetry\n\n## Descripción\n\nImplementar política de evicción LRU (Least Recently Used) para la caché de medios en PWA Chagra, asegurando que el almacenamiento IndexedDB no crezca indefinidamente y se mantengan los activos más recientemente usados.\n\n## Criterios de aceptación\n\n- [ ] Implementar mapa LRU tracking con timestamp de último acceso por file ID\n- [ ] Definir tamaño máximo de caché configurable (ej: 100MB default)\n- [ ] Cuando se excede límite, eliminar porcentaje de menos usados (ej: 20% más viejos)\n- [ ] Exponer métricas en telemetry: tamaño actual, hits/misses, evicciones\n- [ ] Integrar evicción en write path (insert) y startup (check quota)\n\n## Restricciones\n\nNo modificar src/db/dbCore.js, syncManager.js, payloadService.js, public/sw.js. No bumpear versión ni CACHE_NAME.\n\n## Prioridad\n\nmedia\n\n## Contexto\n\nReferencia: queue 056.4 — spec en repo privado Chagra-strategy.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
