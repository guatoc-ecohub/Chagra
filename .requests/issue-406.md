# Request #406

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/406
- Title: [refine][catalog] phaseolus_vulgaris (Frijol arbustivo / voluble) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free post PR #392).

**SPECIES EXISTENTE A REFINAR:** `phaseolus_vulgaris` — Frijol arbustivo / voluble (Phaseolus vulgaris L.)

Estado actual en `catalog/chagra-catalog-seed-v3.1.json`:
- valor_pedagogico actual <200 chars (audit 77 species producción)
- source_ids actuales requieren upgrade a Tier A canónicas

**ACCIÓN:** modificar entry existente para que cumpla template reforzado v2026-05-14:
1. Reescribir `valor_pedagogico` a ≥ 200 chars con 4 elementos obligatorios:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación fuente Tier A explícita
2. Actualizar `source_ids` a estos catalogados:
      - `nrc-1989-cultivos-andinos`
   - `agrosavia-leguminosas-andinas`
   - `gbif-taxonomic-backbone`
   - `ica-resolucion-3168-2015`
3. Verificar coherencia: thermal_zones + altitud_msnm + propagation
4. Self-check 6 ítems del template antes commit

**DATOS CLAVE A INCLUIR** (verificables, NO INVENTAR):
Fijador N₂ ~50-80kg/ha, variedades Colombia Cargamanto/Bola Roja/Radical, sistema 3 hermanas maíz+frijol+ahuyama, asociación rhizobium leguminosarum, Cundinamarca cinturón productivo Fómeque-Choachí

CRITERIO ACEPTACIÓN:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A
- [ ] JSON parseable
- [ ] Validador semántico OK

RESTRICCIONES:
- SOLO modificar `phaseolus_vulgaris` (no otras species)
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch refinamiento producción (10/10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)


---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
