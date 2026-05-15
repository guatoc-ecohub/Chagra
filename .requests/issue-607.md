# Request #607

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/607
- Title: [refine][catalog] raphanus_sativus_sativus (raphanus_sativus_sativus) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `raphanus_sativus_sativus` — raphanus_sativus_sativus ()
Estado: vp=159chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar `raphanus_sativus_sativus` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Variedad de raiz roja de ciclo ultra rapido (25-35 dias). Siembra directa escalonada cada 10-15 dias para cosecha continua.
- Compañeros: no registrado
- vp actual: "Variedad de raiz roja clasica: su color intenso indica presencia de antocianinas. Ciclo mas corto del huerto, ideal para ensenar germinacion y cosecha a ninos."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `raphanus_sativus_sativus`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
