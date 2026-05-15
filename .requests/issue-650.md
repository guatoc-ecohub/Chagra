# Request #650

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/650
- Title: [refine][catalog] cucurbita_maxima (cucurbita_maxima) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `cucurbita_maxima` — cucurbita_maxima ()
Estado: vp=171chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'fao-ecocrop']

**ACCIÓN:** modificar `cucurbita_maxima` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido', 'templado', 'frio']
- Altitud: ?-? msnm
- Propagación: semilla — Siembra directa en sitio definitivo. Necesita buen espacio para sus guias rastreras. Las flores masculinas se cosechan temprano en la manana para consumo.
- Compañeros: no registrado
- vp actual: "En la milpa andina, sus flores rellenas de queso y huevo son patrimonio culinario de Cundinamarca. La planta entera enseña el sistema de 'tres hermanas' con maiz y frijol."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `cucurbita_maxima`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
