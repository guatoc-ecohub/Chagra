# Request #244

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/244
- Title: [feat] Agregar índice compuesto asset_id+timestamp en IDB schema v9
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Schema bump v9 en src/db/dbCore.js agregando index compuesto asset_id+timestamp en STORES.LOGS. Queries timeline ordenadas hacen sort en memoria sobre asset_id+timestamp separados. Index compuesto permite query eficiente usando IDBKeyRange.bound. Criterios: Bump DB_VERSION de 8 a 9. En onupgradeneeded agregar caso oldVersion menor a 9 que crea index asset_id_timestamp compuesto. El index usa asset_id y timestamp con unique false. NO eliminar indexes existentes. NO modificar otros stores. Migration path v8 a v9 transparente sin pérdida de datos. tests/offline.spec.js agrega caso de test. Query usando index retorna logs en rango. Performance baja de 100ms a menos de 20ms con 10K logs. Restricciones: no modificar src/db/dbCore.js fuera del scope. NO bumpear DB_VERSION sin migration test. No modificar syncManager.js, payloadService.js, public/sw.js. No bumpear version ni CACHE_NAME. Prioridad alta. Contexto: sub-tarea del roadmap 056 Chagra Scalability hasta 10K plantas.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
