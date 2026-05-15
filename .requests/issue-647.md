# Request #647

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/647
- Title: [refine][catalog] solanum_tuberosum_sabanera (solanum_tuberosum_sabanera) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `solanum_tuberosum_sabanera` — solanum_tuberosum_sabanera ()
Estado: vp=171chars (objetivo ≥200), sources=['perez-rodriguez-gomez-2008', 'nustez-rodriguez-2024-unal']

**ACCIÓN:** modificar `solanum_tuberosum_sabanera` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: tuberculo (semilla asexual) — Variedad tradicional del altiplano cundiboyacense. Ciclo largo (5-7 meses). Requiere periodos de dormancia antes de resiembra.
- Compañeros: no registrado
- vp actual: "Variedad andina tradicional del altiplano. Ensenanza del ciclo largo de la papa de ano y la importancia de las variedades nativas en la soberania alimentaria de la sabana."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `solanum_tuberosum_sabanera`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
