# Request #398

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/398
- Title: [test][catalog] Polylepis quadrijuga single-species — Nemotron post fix runner v3
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**ESTE ES TEST DE PIPELINE — UNA SOLA SPECIES.**
**Modelo opencode: nemotron-3-super-free (post PR #392 + fix runner SIGBUS).**

Objetivo: validar si Nvidia Nemotron Super 3 genera species cumpliendo
template reforzado 2026-05-14 (\`Chagra-strategy/templates/species-batch-prompt.md\`).

Runner github-runner-claude-code online desde 2026-05-14 04:32:36 (post SIGBUS core dump + restart limpio). Listo para nueva ejecución.

**SPECIES SOLICITADA (1 sola):**

**Polylepis quadrijuga Bitter** — Coloradito, queñoa de páramo Cruz Verde

Razones:
- Cubre driver Cruz Verde-Sumapaz (delimitación MinAmbiente)
- Endémica Colombia, Tier A directo (POWO Kew + GBIF + IAvH)
- Amenazada Libro Rojo → ejercita regla geolocalización anonimizada
- No duplicada en catálogo actual

**REGLAS (template reforzado v2026-05-14):**

1. Schema v3.1 estricto — \`catalog/schema-v3.1.json\`
2. **valor_pedagogico ≥ 200 chars** con 4 elementos obligatorios:
   a) Distribución Colombia (Cordillera Oriental, complejos páramos)
   b) Manejo agronómico/restauración (propagación, sustrato)
   c) Contexto cultural muisca/andino si aplica
   d) Citación fuente Tier A explícita
3. **Al menos 1 source Tier A** — IDs ya catalogados (post PR #395 sources tier completo):
   - \`gbif-taxonomic-backbone\` (Tier A)
   - \`powo-kew\` (Tier A)
   - \`bernal-2015-plantas-liquenes-colombia\` (Tier B)
   - \`humboldt-2016-frailejones\` (Tier A — Polylepis cerca)
   - \`libro-rojo-plantas-colombia\` (Tier A — para conservation_status)
4. **thermal_zones=paramo** + altitud_min ≥ 2800 (Polylepis quadrijuga 2800-3800 msnm)
5. **conservation_status**: refleja IUCN/Libro Rojo Colombia (VU/EN)
6. **geolocalización anonimizada** — solo thermal_zone + rango altitud
7. **Self-check pre-PR** (6 ítems del template)

CRITERIO ACEPTACIÓN:
- [ ] valor_pedagogico ≥ 200 chars
- [ ] Al menos 1 source Tier A
- [ ] thermal_zones=paramo coherente altitud_min ≥ 2800
- [ ] conservation_status refleja Libro Rojo
- [ ] Sin coords específicas
- [ ] JSON parseable
- [ ] Validador semántico pasa

RESTRICCIONES:
- NO modificar otras species
- NO inventar source_ids
- NO usar Wikipedia como única fuente
- NO platitudes

Prioridad: alta P1.

Contexto: si Nemotron cumple los 6 criterios, validamos pipeline. Si NO,
plan B: opencode/minimax-m2.5-free. Si tampoco, pivot Lili + Claude/Gemini.

Issue previo cerrado #393 + PR #394 ya CLOSED (runner offline en
intentos anteriores). Este es intento #3 post infrastructure fix.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
