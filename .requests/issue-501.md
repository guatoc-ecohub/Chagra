# Request #501

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/501
- Title: [refine][catalog] psidium_guajava_manzana (psidium_guajava_manzana) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron** (modelo opencode/nemotron-3-super-free).

**SPECIES EXISTENTE A REFINAR:** `psidium_guajava_manzana` — psidium_guajava_manzana ()

Estado actual `catalog/chagra-catalog-seed-v3.1.json`:
- `valor_pedagogico` actual: 128 chars (objetivo ≥200)
- `source_ids` actuales: ['fao-ecocrop', 'gbif-taxonomic-backbone', 'restrepo-1996-abc-agricultura-organica']

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

**DATOS VERIFICADOS A USAR (NO INVENTAR — extraídos de la ficha actual):**
- Thermal zones: ['calido', 'templado']
- Altitud: ?-? msnm
- Propagación principal: injerto
- Notas propagación: Variedad seleccionada por su menor contenido de semillas y mayor tamaño; muy rústica pero sensible a las heladas directas del páramo.
- Estrato: no registrado
- Compañeros: no registrado
- Antagonistas: no registrado
- vp actual (no perder lo bueno): "Lección de rusticidad: planta adaptada a suelos marginales que provee altísima nutrición (Vitamina C) con mínimo manejo externo."

CRITERIO:
- [ ] vp ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A (idealmente ≥4)
- [ ] JSON parseable
- [ ] Coherente con thermal/altitud
- [ ] SOLO `psidium_guajava_manzana` (no otras species)

RESTRICCIONES:
- NO inventar datos sin fuente
- NO Wikipedia única
- NO platitudes

Prioridad P1. Batch 3 refinamiento producción.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
