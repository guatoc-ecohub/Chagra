# Request #617

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/617
- Title: [refine][catalog] foeniculum_vulgare_azoricum (foeniculum_vulgare_azoricum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `foeniculum_vulgare_azoricum` — foeniculum_vulgare_azoricum ()
Estado: vp=161chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar `foeniculum_vulgare_azoricum` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Variedad de hinojo seleccionada por su bulbo engrosado en la base de las hojas. Requiere aporque para blanquear el bulbo. Siembra directa por su raiz pivotante sensible al trasplante.
- Compañeros: no registrado
- vp actual: "Variedad de hinojo seleccionada por su bulbo comestible. Ensenia el aporque como tecnica de blanqueado y la diferencia entre la forma silvestre y la domesticada."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `foeniculum_vulgare_azoricum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
