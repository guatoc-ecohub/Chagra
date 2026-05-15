# Request #661

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/661
- Title: [refine][catalog] vasconcellea_pubescens (vasconcellea_pubescens) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `vasconcellea_pubescens` — vasconcellea_pubescens ()
Estado: vp=176chars (objetivo ≥200), sources=['powo-kew', 'gbif-colombia', 'agrosavia-tibaitata']

**ACCIÓN:** modificar `vasconcellea_pubescens` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Planta dioica (individuos macho y hembra); requiere un macho por cada 5-8 hembras para polinizacion. Crecimiento rapido, vida corta (4-6 anos).
- Compañeros: no registrado
- vp actual: "Dioecia visible: la papayuela ensena la diferencia entre plantas masculinas y femeninas. Sus frutos cocidos en almibar son memoria viva de la cocina tradicional cundiboyacense."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `vasconcellea_pubescens`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
