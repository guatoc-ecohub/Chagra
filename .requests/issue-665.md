# Request #665

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/665
- Title: [refine][catalog] festuca_arundinacea (festuca_arundinacea) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `festuca_arundinacea` — festuca_arundinacea ()
Estado: vp=177chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'agrosavia-forrajeras-2022', 'restrepo-2005-agroecologia']

**ACCIÓN:** modificar `festuca_arundinacea` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: ? — Graminea perenne de alta rusticidad y tolerancia a sequia. Excelente para pastoreo rotacional en el altiplano. Raices profundas (hasta 1m) mejoran estructura del suelo.
- Compañeros: ['trifolium_repens', 'lolium_perenne', 'medicago_sativa']
- vp actual: "La graminea resistente: la festuca ensena la importancia de las raices profundas en la recuperacion de suelos compactados y su papel en la estabilizacion de laderas altoandinas."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `festuca_arundinacea`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
