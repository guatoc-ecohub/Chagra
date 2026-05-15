# Request #433

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/433
- Title: [refine][catalog] solanum_lycopersicum_san_marzano (solanum_lycopersicum_san_marzano) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free post PR #392).

**SPECIES EXISTENTE A REFINAR:** `solanum_lycopersicum_san_marzano` — solanum_lycopersicum_san_marzano ()

Estado actual en `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 111 chars (objetivo ≥200)
- `source_ids` actuales: ['gbif-taxonomic-backbone', 'restrepo-1996-abc-agricultura-organica']

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
- Thermal zones registradas: ['templado', 'frio']
- Altitud: ?-? msnm
- Propagación principal: semilla
- Notas propagación: Crecimiento determinado; cosecha concentrada en un periodo corto.
- Estrato: medio
- Compañeros: ['petroselinum_crispum', 'cymbopogon_citratus', 'melissa_officinalis', 'urtica_dioica', 'lactuca_sativa_capitata']
- Antagonistas: ['foeniculum_vulgare', 'solanum_phureja', 'brassica_oleracea_capitata_alba', 'brassica_oleracea_sabauda', 'brassica_oleracea_capitata_rubra', 'brassica_oleracea_acephala_lacinato', 'brassica_oleracea_acephala_curly', 'brassica_oleracea_acephala_red_russian']
- vp actual (para no perder lo bueno que ya hay): "Lección de procesamiento: su bajo contenido de agua y pulpa densa lo hacen el estándar para conservas y salsas."

CRITERIO ACEPTACIÓN:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud existentes
- [ ] NO alterar otras species (solo `solanum_lycopersicum_san_marzano`)

RESTRICCIONES:
- SOLO modificar `solanum_lycopersicum_san_marzano` (no otras species)
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch refinamiento producción (batch 2 — top-9 de 10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
