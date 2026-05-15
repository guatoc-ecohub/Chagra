# Request #611

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/611
- Title: [refine][catalog] tropaeolum_tuberosum_mashua (tropaeolum_tuberosum_mashua) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `tropaeolum_tuberosum_mashua` — tropaeolum_tuberosum_mashua ()
Estado: vp=161chars (objetivo ≥200), sources=['agrosavia-manual-tuberculos-andinos-2017', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `tropaeolum_tuberosum_mashua` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['frio', 'paramo']
- Altitud: ?-? msnm
- Propagación: tuberculo — Subespecie silvestre de mayor altitud y resistencia a heladas que el cubio. Contenido de isotiocianatos mas alto, lo que le confiere mayor accion nematicida.
- Compañeros: no registrado
- vp actual: "Variedad de paramo del genero Tropaeolum. Ensenanza de adaptacion altitudinal y compuestos alelopaticos naturales (isotiocianatos) en la chagra de alta montanya."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `tropaeolum_tuberosum_mashua`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
