# Request #675

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/675
- Title: [refine][catalog] cyclanthera_pedata (cyclanthera_pedata) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `cyclanthera_pedata` — cyclanthera_pedata ()
Estado: vp=184chars (objetivo ≥200), sources=['powo-kew', 'gbif-taxonomic-backbone', 'sib-colombia']

**ACCIÓN:** modificar `cyclanthera_pedata` en `catalog/chagra-catalog-seed-v3.1.json`:
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
- Propagación: semilla — Cucurbitacea trepadora de crecimiento vigoroso. Requiere espaldera o tutores. Los frutos se consumen verdes rellenos o en guisos tradicionales andinos.
- Compañeros: no registrado
- vp actual: "Cucurbitacea nativa de los Andes subestimada. Ensenia el valor de las especies tradicionales subutilizadas en la seguridad alimentaria y la importancia de conservar germoplasma and..."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `cyclanthera_pedata`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
