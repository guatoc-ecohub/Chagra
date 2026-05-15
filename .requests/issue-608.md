# Request #608

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/608
- Title: [refine][catalog] pisum_sativum_andina (pisum_sativum_andina) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `pisum_sativum_andina` — pisum_sativum_andina ()
Estado: vp=159chars (objetivo ≥200), sources=['gbif-taxonomic-backbone', 'powo-kew', 'agrosavia-leguminosas-andinas', 'nrc-1989-cultivos-andinos']

**ACCIÓN:** modificar `pisum_sativum_andina` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['frio']
- Altitud: ?-? msnm
- Propagación: semilla — Siembra directa en surcos a 3-5 cm de profundidad. Variedad de crecimiento indeterminado; requiere tutorado con ramas de aliso o cerca de maiz.
- Compañeros: no registrado
- vp actual: "Variedad altoandina de arveja adaptada a climas frios. Ensenia el valor de las leguminosas en la rotacion y el aporte de proteina vegetal en la dieta chiguana."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `pisum_sativum_andina`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
