# Request #623

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/623
- Title: [refine][catalog] cuminum_cyminum (cuminum_cyminum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `cuminum_cyminum` — cuminum_cyminum ()
Estado: vp=162chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `cuminum_cyminum` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Siembra directa en surcos. Cultivo anual de ciclo corto. Las semillas se usan como condimento esencial en la cocina colombiana (sancocho, frijol, arroz).
- Compañeros: no registrado
- vp actual: "Semilla aromatica: el comino ensena como las plantas concentran aceites esenciales en las semillas, fundamento del condimento en la cocina tradicional colombiana."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `cuminum_cyminum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
