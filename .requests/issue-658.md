# Request #658

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/658
- Title: [refine][catalog] solanum_quitoense (solanum_quitoense) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `solanum_quitoense` — solanum_quitoense ()
Estado: vp=175chars (objetivo ≥200), sources=['powo-kew', 'gbif-colombia', 'agrosavia-tibaitata', 'sib-colombia']

**ACCIÓN:** modificar `solanum_quitoense` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Requiere sombra en etapas tempranas; sensible a nematodos del genero Meloidogyne. Se asocia bien con platano o maiz como sombra temporal.
- Compañeros: no registrado
- vp actual: "Acidez que refresca: el lulo es el citrico andino por excelencia. Ensea la importancia de la acidez como mecanismo de defensa natural y su valor en la gastronomia tradicional."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `solanum_quitoense`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
