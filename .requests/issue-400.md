# Request #400

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/400
- Title: [test][catalog] Solanum phureja (papa criolla) — single-species test Nemotron #2
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

**TEST PIPELINE — UNA SOLA SPECIES.** Nemotron-3-super-free + template reforzado v2026-05-14.

**SPECIES:** Solanum phureja Juz. & Bukasov — **Papa criolla** (yema de huevo)

Razones:
- Cultivo emblemático Cundinamarca (Fedepapa: 2,832 ha región)
- Tier A directo (GBIF + POWO + Agrosavia + CIP)
- Cultivo prehispánico muisca andino
- NO duplicada en catálogo (verificar)
- Defendible 100% si Diana profundiza
- Cubre dolor PND Petro: importación 13.2M ton granos → soberanía papa nativa colombiana

**REGLAS TEMPLATE v2026-05-14:**

1. Schema v3.1 estricto
2. **valor_pedagogico ≥ 200 chars** con 4 elementos:
   a) Distribución Cundinamarca/Boyacá + altitud 2500-3200 msnm + thermal_zone frío
   b) Manejo agronómico: tubérculo-semilla, ciclo corto 90-120 días, rotación con leguminosas
   c) Contexto cultural muisca/andino: cultivo ancestral, consumo cotidiano sopa
   d) Citación fuente Tier A (Agrosavia, Cenicafé, CIP, Bernal 2015, GBIF)
3. **Sources Tier A obligatorios** (catalogados):
   - \`agrosavia-sol-andina\` (Tier A) o \`agrosavia-estrella\` (Tier A) si aplica papa
   - \`cip-2006-ghislain\` (Tier A) — Centro Internacional Papa
   - \`nustez-rodriguez-2024-unal\` (Tier A) — investigación papa UNAL
   - \`gbif-taxonomic-backbone\` (Tier A)
4. **thermal_zones=frio** (NO paramo: papa criolla 2500-3200 msnm, no >2800)
5. **conservation_status:** LC IUCN (cultivar comercial, no amenazado)
6. **Self-check pre-PR** (6 ítems)

CRITERIO ACEPTACIÓN:
- [ ] valor_pedagogico ≥ 200 chars con 4 elementos
- [ ] ≥1 source Tier A
- [ ] thermal_zones=frio coherente altitud
- [ ] conservation_status presente
- [ ] JSON parseable + validador semántico OK

RESTRICCIONES:
- NO modificar otras species
- NO inventar source_ids
- NO Wikipedia única
- NO platitudes

Prioridad P1. Test #2 paralelo (junto con #398 Polylepis + #399 PR draft).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
