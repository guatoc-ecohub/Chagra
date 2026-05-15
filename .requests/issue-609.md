# Request #609

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/609
- Title: [refine][catalog] brassica_oleracea_acephala_lacinato (brassica_oleracea_acephala_lacinato) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `brassica_oleracea_acephala_lacinato` — brassica_oleracea_acephala_lacinato ()
Estado: vp=160chars (objetivo ≥200), sources=['gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar `brassica_oleracea_acephala_lacinato` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Planta semi-perenne en Choachí; se puede cosechar hoja por hoja durante meses.
- Compañeros: no registrado
- vp actual: "Lección de arquitectura: a diferencia del repollo, sus hojas crecen abiertas sobre un tallo central persistente, permitiendo la 'cosecha de abajo hacia arriba'."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `brassica_oleracea_acephala_lacinato`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
