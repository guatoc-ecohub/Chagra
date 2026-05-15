# Request #629

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/629
- Title: [refine][catalog] illicium_verum (illicium_verum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `illicium_verum` — illicium_verum ()
Estado: vp=165chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'powo-kew']

**ACCIÓN:** modificar `illicium_verum` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Arbol de lento crecimiento que produce frutos en forma de estrella, ricos en anetol. Cultivado en zonas altas de Colombia como aromatica medicinal.
- Compañeros: no registrado
- vp actual: "Fruto estrella: el anis estrella ensena como la morfologia del fruto revela su parentesco y su uso como expectorante natural en la farmacopea tradicional colombiana."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `illicium_verum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
