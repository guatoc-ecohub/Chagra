# Request #389

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/389
- Title: [test][catalog] Single species test — Polylepis quadrijuga Cruz Verde con template reforzado
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**ESTE ES UN ISSUE DE PRUEBA — UNA SOLA SPECIES, NO BATCH DE 10.**

Objetivo: validar si el pipeline opencode/big-pickle puede cumplir el
template reforzado 2026-05-14 (\`Chagra-strategy/templates/species-batch-prompt.md\`)
o si hay que pivotar a metodología humano + LLM asistido. Auditoría master
detectó 91% species del catálogo con valor_pedagogico <200 chars.

**SPECIES SOLICITADA (1 sola):**

**Polylepis quadrijuga Bitter** — Coloradito, queñoa de páramo Cruz Verde

Razones para elegirla:
- Cubre driver estratégico Cruz Verde-Sumapaz (proceso delimitación MinAmbiente)
- Endémica de Colombia, Tier A directo (POWO Kew + GBIF + IAvH)
- Especie amenazada Libro Rojo (status documentado) → ejercita la regla
  geolocalización anonimizada (solo thermal_zone + altitud_msnm rango)
- No está duplicada en el catálogo actual (verificar)

**REGLAS A CUMPLIR (template reforzado v2026-05-14):**

1. Schema v3.1 estrictamente — ver \`catalog/schema-v3.1.json\`
2. **valor_pedagogico ≥ 200 chars** con los 4 elementos obligatorios:
   a) Distribución Colombia (Cordillera Oriental, complejos páramos)
   b) Manejo agronómico/restauración (propagación, sustrato)
   c) Contexto cultural muisca/andino (uso ancestral si aplica)
   d) Citación fuente Tier A explícita
3. **Al menos 1 source Tier A** — usar IDs ya catalogados en \`sources-seed.json\`:
   - \`gbif-taxonomic-backbone\` (Tier A)
   - \`powo-kew\` (Tier A)
   - \`bernal-2015-plantas-liquenes-colombia\` (Tier B)
   - \`ica-resolucion-3168-2015\` (Tier A — si aplica)
   - Y/o agregar a sources-seed.json el ID nuevo con tier explícito
4. **thermal_zones=paramo** + altitud_min ≥ 2800 (Polylepis quadrijuga
   crece 2800-3800 msnm aproximadamente — VERIFICAR antes de poner)
5. **conservation_status**: reflejar estatus IUCN/Libro Rojo Colombia real
6. **geolocalización anonimizada** — solo thermal_zone + rango altitud,
   sin coordenadas específicas
7. **Self-check pre-PR** (6 ítems del template) — ejecutar mentalmente
   antes de generar el JSON

CRITERIO ACEPTACIÓN:
- [ ] valor_pedagogico ≥ 200 chars (contar caracteres explícito)
- [ ] Al menos 1 source Tier A en source_ids
- [ ] thermal_zones=paramo coherente con altitud_min ≥ 2800
- [ ] conservation_status refleja Libro Rojo Colombia (probablemente VU/EN)
- [ ] Sin coords específicas (solo rango altitud + thermal_zone)
- [ ] JSON parseable: \`python3 -m json.tool\`
- [ ] Validador semántico pasa: \`node scripts/validate-catalog.mjs --seed-mode\`

RESTRICCIONES:
- NO modificar otras species existentes — solo APPEND a array species
- NO inventar source_ids — si necesitás uno nuevo, agregalo simultáneo
  en \`sources-seed.json\` con tier asignado
- NO usar Wikipedia como única fuente
- NO platitudes ("planta nativa hermosa") — datos verificables sí o sí

Prioridad: alta P1.

Contexto: si Polylepis quadrijuga generada cumple los 6 criterios del
self-check, validamos pipeline para reanudar batches. Si NO cumple,
pivotamos a "Lili agroecóloga + LLM asistido" como recomienda audit
master \`audit/2026-05-14-valor-real-producto/00-master-audit.md\` en
Chagra-strategy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
