# Request #429

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/429
- Title: [refine][catalog] passiflora_tripartita_mollissima (passiflora_tripartita_mollissima) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free post PR #392).

**SPECIES EXISTENTE A REFINAR:** `passiflora_tripartita_mollissima` — passiflora_tripartita_mollissima ()

Estado actual en `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 108 chars (objetivo ≥200)
- `source_ids` actuales: ['powo-kew', 'sib-colombia', 'gbif-taxonomic-backbone']

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
- Notas propagación: Requiere poda de formación constante para evitar enmarañamiento; es la más resistente al frío.
- Estrato: no registrado
- Compañeros: no registrado
- Antagonistas: no registrado
- vp actual (para no perder lo bueno que ya hay): "Lección de adaptación altitudinal: es la única pasiflora comercial que prospera por encima de los 2500 msnm."

CRITERIO ACEPTACIÓN:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud existentes
- [ ] NO alterar otras species (solo `passiflora_tripartita_mollissima`)

RESTRICCIONES:
- SOLO modificar `passiflora_tripartita_mollissima` (no otras species)
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch refinamiento producción (batch 2 — top-5 de 10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
