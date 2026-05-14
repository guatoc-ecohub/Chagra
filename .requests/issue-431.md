# Request #431

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/431
- Title: [refine][catalog] brassica_oleracea_capitata_rubra (brassica_oleracea_capitata_rubra) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free post PR #392).

**SPECIES EXISTENTE A REFINAR:** `brassica_oleracea_capitata_rubra` — brassica_oleracea_capitata_rubra ()

Estado actual en `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 111 chars (objetivo ≥200)
- `source_ids` actuales: ['gbif-taxonomic-backbone', 'ica-resolucion-3168-2015']

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
- Thermal zones registradas: ['frio', 'templado']
- Altitud: ?-? msnm
- Propagación principal: semilla
- Notas propagación: Requiere suelos ricos en materia orgánica (humus/compost) para desarrollar un color purpúreo intenso.
- Estrato: no registrado
- Compañeros: no registrado
- Antagonistas: no registrado
- vp actual (para no perder lo bueno que ya hay): "Lección de pigmentos: las antocianinas actúan como protector solar y anticongelante natural en la alta montaña."

CRITERIO ACEPTACIÓN:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud existentes
- [ ] NO alterar otras species (solo `brassica_oleracea_capitata_rubra`)

RESTRICCIONES:
- SOLO modificar `brassica_oleracea_capitata_rubra` (no otras species)
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch refinamiento producción (batch 2 — top-7 de 10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
