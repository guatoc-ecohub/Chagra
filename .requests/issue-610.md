# Request #610

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/610
- Title: [refine][catalog] beta_vulgaris_conditiva (beta_vulgaris_conditiva) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `beta_vulgaris_conditiva` — beta_vulgaris_conditiva ()
Estado: vp=160chars (objetivo ≥200), sources=['gbif-taxonomic-backbone', 'ica-resolucion-3168-2015', 'restrepo-1996-abc-agricultura-organica']

**ACCIÓN:** modificar `beta_vulgaris_conditiva` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Los glomérulos contienen varias semillas; el trasplante debe ser muy cuidadoso para no dañar la raíz incipiente.
- Compañeros: no registrado
- vp actual: "Lección sobre almacenamiento de energía: muestra cómo la planta guarda azúcares y nutrientes en su raíz hipocotila para sobrevivir al invierno (o épocas secas)."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `beta_vulgaris_conditiva`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
