# Request #636

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/636
- Title: [refine][catalog] drimys_granadensis (drimys_granadensis) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `drimys_granadensis` — drimys_granadensis ()
Estado: vp=169chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'bernal-2015-plantas-liquenes-colombia', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `drimys_granadensis` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['frio']
- Altitud: ?-? msnm
- Propagación: semilla — Germinación lenta; requiere semilla fresca y sustrato húmedo. Crece como arbolito de hasta 15 m en bosque altoandino.
- Compañeros: no registrado
- vp actual: "Árbol medicinal de los muiscas: su corteza aromática con aroma a canela conecta la botánica altoandina con la medicina tradicional indígena del altiplano cundiboyacense."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `drimys_granadensis`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
