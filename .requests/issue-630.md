# Request #630

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/630
- Title: [refine][catalog] matricaria_chamomilla (matricaria_chamomilla) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `matricaria_chamomilla` — matricaria_chamomilla ()
Estado: vp=165chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'pamplona-roger-2006-plantas-medicinales']

**ACCIÓN:** modificar `matricaria_chamomilla` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Resiembra natural prolifica; las semillas germinan sobre la superficie del suelo con luz. Se recomienda no cubrirlas.
- Compañeros: no registrado
- vp actual: "La infusion mas antigua del mundo. En la chagra chiguana, ensena el valor de las plantas indicadoras: su presencia senala suelos compactados que necesitan aireacion."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `matricaria_chamomilla`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
