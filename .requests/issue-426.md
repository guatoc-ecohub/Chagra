# Request #426

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/426
- Title: [refine][catalog] viburnum_triphyllum (viburnum_triphyllum) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free post PR #392).

**SPECIES EXISTENTE A REFINAR:** `viburnum_triphyllum` — viburnum_triphyllum ()

Estado actual en `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 103 chars (objetivo ≥200)
- `source_ids` actuales: ['humboldt-flora-alto-andina', 'powo-kew']

**ACCIÓN:** modificar entry existente para que cumpla template reforzado v2026-05-14:
1. Reescribir `valor_pedagogico` a ≥ 200 chars con 4 elementos obligatorios:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación fuente Tier A explícita
2. Actualizar `source_ids` a ≥4 catalogadas Tier A canónicas (preferentemente):
   - `gbif-taxonomic-backbone`
   - `powo-kew`
   - `agrosavia-sol-andina` o `agrosavia-manual-*` según aplique
   - `ica-resolucion-3168-2015` o `nrc-1989-cultivos-andinos` según relevancia
3. Verificar coherencia: thermal_zones + altitud_msnm + propagation
4. Self-check 6 ítems del template antes commit

**DATOS VERIFICADOS A USAR (NO INVENTAR — extraídos de la ficha actual):**
- Thermal zones registradas: ['frio']
- Altitud: ?-? msnm
- Propagación principal: semilla
- Notas propagación: Dispersado por aves; los frutos son fuente de alimento para fauna silvestre.
- Estrato: alto
- Compañeros: ['quercus_humboldtii']
- Antagonistas: ['acacia_melanoxylon']
- vp actual (para no perder lo bueno que ya hay): "La cerca viva perfecta para el chiguano que ama a los pájaros. Sustituye a la acacia negra sin invadir."

CRITERIO ACEPTACIÓN:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud existentes
- [ ] NO alterar otras species (solo `viburnum_triphyllum`)

RESTRICCIONES:
- SOLO modificar `viburnum_triphyllum` (no otras species)
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch refinamiento producción (batch 2 — top-2 de 10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
