# Request #606

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/606
- Title: [refine][catalog] aiphanes_aculeata (aiphanes_aculeata) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `aiphanes_aculeata` — aiphanes_aculeata ()
Estado: vp=159chars (objetivo ≥200), sources=['bernal-2015-plantas-liquenes-colombia', 'powo-kew', 'sib-colombia']

**ACCIÓN:** modificar `aiphanes_aculeata` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido']
- Altitud: ?-? msnm
- Propagación: semilla — Palma espinosa de los valles secos interandinos; tolera suelos pobres y periodos secos prolongados. Frutos usados para refrescos tradicionales en la Costa Caribe.
- Compañeros: no registrado
- vp actual: "Palma rustica de tierras secas: sus frutos son fuente de vitamina A y aceites. Ensenia adaptacion a suelos pobres y periodos de sequia en el Caribe colombiano."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `aiphanes_aculeata`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
