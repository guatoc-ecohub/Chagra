# Request #632

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/632
- Title: [refine][catalog] elettaria_cardamomum (elettaria_cardamomum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `elettaria_cardamomum` — elettaria_cardamomum ()
Estado: vp=167chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'powo-kew']

**ACCIÓN:** modificar `elettaria_cardamomum` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: rizoma — Propagacion por division de rizomas. Requiere sombra y alta humedad ambiental. Sus semillas se usan como especia aromatica en infusiones y reposteria tradicional.
- Compañeros: no registrado
- vp actual: "Especia de sombra: el cardamomo ensena como los cultivos de sotobosque generan alto valor economico sin necesidad de tumbar el dosel arboreo, modelo de agroforesteria."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `elettaria_cardamomum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
