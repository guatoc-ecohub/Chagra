# Request #612

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/612
- Title: [refine][catalog] tigridia_pavonia (tigridia_pavonia) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `tigridia_pavonia` — tigridia_pavonia ()
Estado: vp=161chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `tigridia_pavonia` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: ? — Herbacea bulbosa ornamental de flores vistosas. Cada flor abre al amanecer y se cierra al atardecer (un solo dia de vida). Uso en bordes de cerca viva.
- Compañeros: no registrado
- vp actual: "Reloj del huerto: cada flor abre al amanecer y vive solo un dia. Ensenia la sincronizacion de la planta con el ciclo solar y la importancia de los polinizadores."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `tigridia_pavonia`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
