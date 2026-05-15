# Request #614

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/614
- Title: [refine][catalog] cytisus_monspessulanus (cytisus_monspessulanus) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `cytisus_monspessulanus` — cytisus_monspessulanus ()
Estado: vp=161chars (objetivo ≥200), sources=['humboldt-invasoras-andes', 'mongabay-retamo-2024', 'res-684-2018-mads']

**ACCIÓN:** modificar `cytisus_monspessulanus` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Especial cuidado con el banco de semillas; el fuego estimula la germinación masiva.
- Compañeros: no registrado
- vp actual: "SE BUSCA: El 'Falso Nativo'. Engaña con flores amarillas bonitas pero destruye el equilibrio químico del páramo. Su erradicación es un acto de soberanía hídrica."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `cytisus_monspessulanus`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
