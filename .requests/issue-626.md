# Request #626

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/626
- Title: [refine][catalog] ipomoea_batatas_blanca (ipomoea_batatas_blanca) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `ipomoea_batatas_blanca` — ipomoea_batatas_blanca ()
Estado: vp=163chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar `ipomoea_batatas_blanca` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['templado', 'calido']
- Altitud: ?-? msnm
- Propagación: esqueje (bejuco) — Variedad de pulpa blanca y textura harinosa, menos dulce que la naranja. Preferida para preparaciones saladas y frituras.
- Compañeros: no registrado
- vp actual: "Variedad de batata de pulpa blanca que muestra la diversidad intraespecifica de este cultivo global. Ensenia seleccion varietal por textura y contenido de almidon."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `ipomoea_batatas_blanca`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
