# Request #393

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/393
- Title: [test][catalog] Polylepis quadrijuga single-species con Nemotron + template reforzado v2
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**ESTE ES TEST DE PIPELINE — UNA SOLA SPECIES, no batch de 10.**
**Modelo opencode: nemotron-3-super-free (post merge PR #392).**

Objetivo: validar si Nvidia Nemotron Super 3 puede generar species cumpliendo
el template reforzado 2026-05-14 (\`Chagra-strategy/templates/species-batch-prompt.md\`)
mejor que big-pickle. Big-pickle reportó cola larga + silent failures
(PR #390 QUEUED 15+ min sin progreso) en auditoría master valor real
producto.

**SPECIES SOLICITADA (1 sola):**

**Polylepis quadrijuga Bitter** — Coloradito, queñoa de páramo Cruz Verde

Razones:
- Cubre driver Cruz Verde-Sumapaz (delimitación MinAmbiente)
- Endémica Colombia, Tier A directo (POWO Kew + GBIF + IAvH)
- Amenazada Libro Rojo → ejercita regla geolocalización anonimizada
- No duplicada en catálogo actual

**REGLAS A CUMPLIR (template reforzado v2026-05-14):**

1. Schema v3.1 estricto — ver \`catalog/schema-v3.1.json\`
2. **valor_pedagogico ≥ 200 chars** con 4 elementos obligatorios:
   a) Distribución Colombia (Cordillera Oriental, complejos páramos)
   b) Manejo agronómico/restauración (propagación, sustrato)
   c) Contexto cultural muisca/andino si aplica
   d) Citación fuente Tier A explícita
3. **Al menos 1 source Tier A** — IDs catalogados en \`sources-seed.json\`:
   - \`gbif-taxonomic-backbone\` (Tier A)
   - \`powo-kew\` (Tier A)
   - \`bernal-2015-plantas-liquenes-colombia\` (Tier B)
   - Y/o agregar a sources-seed.json el ID nuevo con tier explícito
4. **thermal_zones=paramo** + altitud_min ≥ 2800 (Polylepis quadrijuga 2800-3800 msnm)
5. **conservation_status**: refleja IUCN/Libro Rojo Colombia
6. **geolocalización anonimizada** — solo thermal_zone + rango altitud
7. **Self-check pre-PR** (6 ítems del template)

CRITERIO ACEPTACIÓN:
- [ ] valor_pedagogico ≥ 200 chars (contar caracteres explícito)
- [ ] Al menos 1 source Tier A en source_ids
- [ ] thermal_zones=paramo coherente con altitud_min ≥ 2800
- [ ] conservation_status refleja Libro Rojo (VU/EN)
- [ ] Sin coords específicas (solo rango altitud)
- [ ] JSON parseable: \`python3 -m json.tool\`
- [ ] Validador semántico: \`node scripts/validate-catalog.mjs --seed-mode\`

RESTRICCIONES:
- NO modificar otras species
- NO inventar source_ids
- NO usar Wikipedia como única fuente
- NO platitudes

Prioridad: alta P1.

Contexto: si Nemotron genera Polylepis cumpliendo los 6 criterios, validamos
pipeline. Si NO cumple, plan B: opencode/minimax-m2.5-free. Si tampoco,
pivot a Lili + Claude/Gemini asistido (humano + LLM).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
