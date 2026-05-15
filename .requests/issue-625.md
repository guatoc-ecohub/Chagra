# Request #625

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/625
- Title: [refine][catalog] vanilla_planifolia (vanilla_planifolia) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `vanilla_planifolia` — vanilla_planifolia ()
Estado: vp=162chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `vanilla_planifolia` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: esqueje — Propagacion por esquejes de tallo. Orquidea trepadora que requiere arbol tutor (espaldera viva). Requiere polinizacion manual para produccion comercial de vainas aromaticas.
- Compañeros: no registrado
- vp actual: "Polinizacion manual: la vainilla ensena la relacion simbiotica entre orquideas y polinizadores nativos, y la tecnica tradicional de beneficio del fruto aromatico."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `vanilla_planifolia`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
