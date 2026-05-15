# Request #666

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/666
- Title: [refine][catalog] cynara_cardunculus_scolymus (cynara_cardunculus_scolymus) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `cynara_cardunculus_scolymus` — cynara_cardunculus_scolymus ()
Estado: vp=178chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'fao-ecocrop']

**ACCIÓN:** modificar `cynara_cardunculus_scolymus` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: hijuelos — Se propaga por hijuelos (rebrotes de la corona) o por semilla. Planta perenne que produce durante 3-5 anos. El capitulo o cabeza floral inmadura es la parte comestible.
- Compañeros: no registrado
- vp actual: "Leccion de morfologia floral: lo que consumimos es una inflorescencia inmadura. Ensenia la diferencia entre flor y fruto, y el concepto de domesticacion de un cardo mediterraneo."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `cynara_cardunculus_scolymus`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
