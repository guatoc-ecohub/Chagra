# Request #547

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/547
- Title: [refine][catalog] trichanthera_gigantea (trichanthera_gigantea) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free).

**SPECIES EXISTENTE A REFINAR:** `trichanthera_gigantea` — trichanthera_gigantea ()

Estado actual `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 139 chars (objetivo ≥200)
- `source_ids` actuales: ['perez-arbelaez-1947-plantas-utiles', 'humboldt-flora-alto-andina']

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
- Thermal zones: ['calido', 'templado']
- Altitud: ?-? msnm
- Propagación principal: ?
- Notas propagación: Especie emblematica para proteccion de nacimientos de agua. Cerca viva tradicional en zonas cafeteras y ganaderas. Hojas forrajeras para rumiantes con alto contenido proteico.
- Estrato: alto
- Compañeros: no registrado
- Antagonistas: no registrado
- vp actual: "El que nace del agua: la cerca viva que protege las quebradas. Ensenia la relacion entre vegetacion riparia y calidad del agua en la finca."

CRITERIO:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud
- [ ] SOLO `trichanthera_gigantea` (no otras species)

RESTRICCIONES:
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch 4 refinamiento producción.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
