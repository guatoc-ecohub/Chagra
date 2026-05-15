# Request #653

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/653
- Title: [refine][catalog] pastinaca_sativa (pastinaca_sativa) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `pastinaca_sativa` — pastinaca_sativa ()
Estado: vp=173chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'fao-ecocrop']

**ACCIÓN:** modificar `pastinaca_sativa` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['frio', 'templado']
- Altitud: ?-? msnm
- Propagación: semilla — Germinacion lenta (14-21 dias); semilla pierde viabilidad rapidamente (<1 ano). Las heladas convierten almidones en azucares, mejorando su sabor dulce caracteristico.
- Compañeros: no registrado
- vp actual: "Raiz europea poco conocida en Colombia que demuestra como el frio transforma la quimica de los alimentos. Su sabor dulce post-helada ensena principios de bioquimica vegetal."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `pastinaca_sativa`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
