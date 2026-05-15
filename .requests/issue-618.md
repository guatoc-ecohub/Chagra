# Request #618

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/618
- Title: [refine][catalog] solanum_lycopersicum_sungold (solanum_lycopersicum_sungold) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `solanum_lycopersicum_sungold` — solanum_lycopersicum_sungold ()
Estado: vp=162chars (objetivo ≥200), sources=['gbif-taxonomic-backbone', 'agrosavia-manual-biopreparados-2015']

**ACCIÓN:** modificar `solanum_lycopersicum_sungold` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['templado', 'frio']
- Altitud: ?-? msnm
- Propagación: semilla — Indeterminado. Muy vigoroso; requiere espacio y atención al riego para evitar el rajado por dulzor extremo.
- Compañeros: no registrado
- vp actual: "Lección de sabor y color: enseña cómo el color naranja intenso indica altos niveles de azúcares y betacarotenos, siendo el referente mundial de dulzor en tomates."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `solanum_lycopersicum_sungold`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
