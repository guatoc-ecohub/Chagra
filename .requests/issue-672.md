# Request #672

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/672
- Title: [refine][catalog] beta_vulgaris_altissima (beta_vulgaris_altissima) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `beta_vulgaris_altissima` — beta_vulgaris_altissima ()
Estado: vp=181chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar `beta_vulgaris_altissima` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Variedad de remolacha seleccionada por alto contenido de sacarosa. Raiz blanca alargada; requiere suelos profundos y ricos en potasio para maxima produccion de azucar.
- Compañeros: no registrado
- vp actual: "Leccion de mejoramiento genetico: la betarraga azucarera fue seleccionada durante siglos para concentrar sacarosa, demostrando el poder de la seleccion artificial en la agricultura..."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `beta_vulgaris_altissima`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
