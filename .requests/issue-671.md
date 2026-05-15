# Request #671

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/671
- Title: [refine][catalog] alocasia_macrorrhizos (alocasia_macrorrhizos) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `alocasia_macrorrhizos` — alocasia_macrorrhizos ()
Estado: vp=180chars (objetivo ≥200), sources=['bernal-2015-plantas-liquenes-colombia', 'powo-kew', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `alocasia_macrorrhizos` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido']
- Altitud: ?-? msnm
- Propagación: tuberculo — Se propaga plantando hijos o secciones de cormo con yemas. Tolerante a sombra y suelos humedos. Cultivo tradicional de la chagra indigena amazonica y del Pacifico.
- Compañeros: no registrado
- vp actual: "Cultivo de seguridad alimentaria del tropico humedo: sus cormos ricos en almidon sostienen comunidades indigenas del Pacifico y Amazonia. Ensenia sistemas agroforestales de chagra."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `alocasia_macrorrhizos`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
