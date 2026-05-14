# Request #401

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/401
- Title: [test][catalog] Vaccinium meridionale (mortiño) — single-species test Nemotron #3
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**TEST PIPELINE — UNA SOLA SPECIES.** Nemotron-3-super-free + template reforzado v2026-05-14.

**SPECIES:** Vaccinium meridionale Sw. — **Mortiño**, agraz, arándano andino

Razones:
- Endémico bosques altoandinos Cordillera Oriental (Cundinamarca, Boyacá, Santander)
- Driver Cruz Verde-Sumapaz directo (bosques 2500-3600 msnm)
- Tier A directo (GBIF + POWO + IAvH + Pérez Arbeláez 1947 Tier B)
- Uso ancestral muisca: medicinal antidiarreico + consumo fresco
- NO duplicada en catálogo (verificar)
- Especie nativa con potencial restauración páramo

**REGLAS TEMPLATE v2026-05-14:**

1. Schema v3.1 estricto
2. **valor_pedagogico ≥ 200 chars** con 4 elementos:
   a) Distribución Colombia (Cundinamarca + Boyacá + Santander, bosques altoandinos, 2500-3600 msnm)
   b) Manejo agronómico: propagación estacas semileñosas, sombra parcial bajo aliso/encenillo
   c) Contexto muisca: uso tradicional medicinal antidiarreico + consumo fresco frutos azulado-negros
   d) Citación: Pérez Arbeláez 1947 (Tier B) + GBIF + POWO + IAvH
3. **Sources Tier A obligatorios:**
   - \`gbif-taxonomic-backbone\` (Tier A)
   - \`powo-kew\` (Tier A)
   - \`bernal-2015-plantas-liquenes-colombia\` (Tier B)
   - \`perez-arbelaez-1947-plantas-utiles\` (Tier B — uso tradicional)
4. **thermal_zones=frio** (2500-3600 msnm; transición frío-páramo)
5. **conservation_status:** LC (no amenazado pero localmente declinante)
6. **roles_in_guild:** atractor_polinizador + frutal_nativo
7. **Self-check pre-PR** (6 ítems)

CRITERIO ACEPTACIÓN:
- [ ] valor_pedagogico ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A
- [ ] thermal_zones=frio + altitud 2500-3600
- [ ] roles_in_guild incluye atractor_polinizador
- [ ] JSON parseable + validador semántico OK

RESTRICCIONES:
- NO modificar otras species
- NO inventar source_ids
- NO Wikipedia única
- NO platitudes

Prioridad P1. Test #3 paralelo.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
