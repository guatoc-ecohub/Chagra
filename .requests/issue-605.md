# Request #605

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/605
- Title: [refine][catalog] eryngium_foetidum (eryngium_foetidum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `eryngium_foetidum` — eryngium_foetidum ()
Estado: vp=159chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'sib-colombia']

**ACCIÓN:** modificar `eryngium_foetidum` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido', 'templado', 'frio']
- Altitud: ?-? msnm
- Propagación: semilla — Germinacion lenta; siembra directa o en bandeja. Una vez establecido, se resiembra solo con facilidad en el huerto.
- Compañeros: no registrado
- vp actual: "Hierba nativa de las Americas cuyo aroma intenso es parte vital del 'hogao' colombiano. Enseña la relevancia de las especias locales frente a las introducidas."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `eryngium_foetidum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
