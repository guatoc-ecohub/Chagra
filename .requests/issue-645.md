# Request #645

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/645
- Title: [refine][catalog] vaccinium_floribundum (vaccinium_floribundum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `vaccinium_floribundum` — vaccinium_floribundum ()
Estado: vp=170chars (objetivo ≥200), sources=['powo-kew', 'gbif-colombia', 'humboldt-flora-alto-andina', 'uicn-red-list']

**ACCIÓN:** modificar `vaccinium_floribundum` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['frio', 'paramo']
- Altitud: ?-? msnm
- Propagación: semilla — Especie de paramo no domesticada; su propagacion asistida esta en fase experimental. Depende de dispersion por aves y roedores nativos.
- Compañeros: no registrado
- vp actual: "Centinela del paramo: el agraz marca el limite superior del bosque altoandino. Su presencia indica un ecosistema saludable y es fuente de alimento para la fauna paramuna."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `vaccinium_floribundum`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
