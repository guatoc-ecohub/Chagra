# Request #628

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/628
- Title: [refine][catalog] aloe_vera (aloe_vera) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `aloe_vera` — aloe_vera ()
Estado: vp=164chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `aloe_vera` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido', 'templado']
- Altitud: ?-? msnm
- Propagación: hijuelos — Propagación vegetativa por brotes basales (hijuelos). Separar cuando tengan 3-4 hojas y dejar secar la herida 24 h antes de plantar.
- Compañeros: no registrado
- vp actual: "La farmacia en una hoja: enseña suculencia, adaptación a sequía, y el uso tradicional del gel como cicatrizante en la medicina casera colombiana de tierras cálidas."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `aloe_vera`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
