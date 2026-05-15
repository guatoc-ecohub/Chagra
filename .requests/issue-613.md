# Request #613

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/613
- Title: [refine][catalog] curcuma_longa (curcuma_longa) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `curcuma_longa` — curcuma_longa ()
Estado: vp=161chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `curcuma_longa` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: rizoma — Propagacion por trozos de rizoma. Requiere 8-10 meses para cosecha. El rizoma se usa como colorante natural y antiinflamatorio en la cocina y medicina tradicional colombiana.
- Compañeros: no registrado
- vp actual: "Colorante natural: la curcuma demuestra como los pigmentos vegetales (curcumina) tienen propiedades medicinales antiinflamatorias y usos tintoreos tradicionales."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `curcuma_longa`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
