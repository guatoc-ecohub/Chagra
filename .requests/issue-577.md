# Request #577

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/577
- Title: [refine][catalog] brassica_rapa_var_rapa (brassica_rapa_var_rapa) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free).

**SPECIES EXISTENTE A REFINAR:** `brassica_rapa_var_rapa` — brassica_rapa_var_rapa ()

Estado actual `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 151 chars (objetivo ≥200)
- `source_ids` actuales: ['gbif-taxonomic-backbone', 'powo-kew', 'ica-resolucion-3168-2015']

**ACCIÓN:** modificar entry existente para que cumpla template v2026-05-14:
1. Reescribir `valor_pedagogico` a ≥ 200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación fuente Tier A explícita
2. Actualizar `source_ids` a ≥4 catalogadas Tier A canónicas:
   - `gbif-taxonomic-backbone`, `powo-kew`
   - `agrosavia-sol-andina` o `agrosavia-manual-*` según aplique
   - `ica-resolucion-3168-2015` o `nrc-1989-cultivos-andinos` según relevancia
3. Verificar coherencia: thermal_zones + altitud_msnm + propagation
4. Self-check 6 ítems del template antes commit

**DATOS VERIFICADOS (extraídos de ficha actual — NO INVENTAR):**
- Thermal zones: ['frio', 'templado']
- Altitud: ?-? msnm
- Propagación principal: semilla
- Notas propagación: Siembra directa a chorrillo. Ciclo rapido (60-80 dias). Tanto la raiz como las hojas son comestibles.
- Estrato: no registrado
- Compañeros: no registrado
- Antagonistas: no registrado
- vp actual: "Leccion de aprovechamiento integral: el nabo demuestra que una misma planta puede generar alimento de la raiz y de la hoja, minimizando el desperdicio."

CRITERIO:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud
- [ ] SOLO `brassica_rapa_var_rapa` (no otras species)

RESTRICCIONES:
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch 4 refinamiento producción.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
