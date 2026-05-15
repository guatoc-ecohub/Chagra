# Request #669

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/669
- Title: [refine][catalog] lavandula_angustifolia (lavandula_angustifolia) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `lavandula_angustifolia` — lavandula_angustifolia ()
Estado: vp=179chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `lavandula_angustifolia` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['templado', 'frio']
- Altitud: ?-? msnm
- Propagación: esqueje — Propagación por esquejes semileñosos en verano. Requiere suelos calcáreos y buen drenaje.
- Compañeros: no registrado
- vp actual: "Clásico de la alelopatía: su aroma alcanforado repele polillas y mosquitos mientras atrae abejas, demostrando el equilibrio entre repelencia y atracción en el diseño de la chagra."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `lavandula_angustifolia`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
