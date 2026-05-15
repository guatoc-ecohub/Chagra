# Request #655

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/655
- Title: [refine][catalog] zingiber_officinale (zingiber_officinale) — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**REFINAMIENTO species existente con Nemotron**.
**SPECIES:** `zingiber_officinale` — zingiber_officinale ()
Estado: vp=175chars (objetivo ≥200), sources=['perez-arbelaez-1947-plantas-utiles', 'gbif-taxonomic-backbone']

**ACCIÓN:** modificar `zingiber_officinale` en `catalog/chagra-catalog-seed-v3.1.json`:
1. `valor_pedagogico` ≥200 chars con 4 elementos:
   a) Distribución Colombia (departamentos + altitud + thermal_zone)
   b) Manejo agronómico (propagación + ciclo + asociaciones + plagas)
   c) Contexto cultural muisca/andino/campesino si aplica
   d) Citación Tier A explícita
2. `source_ids` ≥4 Tier A: gbif-taxonomic-backbone, powo-kew, agrosavia-*, ica/nrc según.
3. Coherencia thermal/altitud/propagation.

**DATOS VERIFICADOS (NO INVENTAR):**
- Thermal: ['calido', 'templado']
- Altitud: ?-? msnm
- Propagación: rizoma — Se propaga mediante trozos de rizoma con al menos una yema. Requiere suelos sueltos y ricos en materia organica. Cultivo tradicional en la zona cafetera colombiana.
- Compañeros: no registrado
- vp actual: "Rizoma medicinal por excelencia: el jengibre ensena como las plantas almacenan compuestos bioactivos en sus organos subterraneos, base de la farmacopea tradicional colombiana."

CRITERIO: vp≥200, ≥1 Tier A, JSON parseable, solo `zingiber_officinale`.
RESTRICCIONES: NO inventar, NO Wikipedia única, NO platitudes.

Prioridad P1. Batch 5.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
