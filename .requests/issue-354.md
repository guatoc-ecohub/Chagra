# Request #354

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/354
- Title: [chore][catalog] Batch 25: Polinizadores nativos colombianos no-duplicados — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 25: Polinizadores nativos colombianos no-duplicados.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A/B atractores nativos:
  1. azulejo (Petrea volubilis L.)
  2. iresina (Iresine herbstii Hook.)
  3. escallonia (Escallonia myrtilloides L.f.)
  4. gypsofila (Gypsophila paniculata L.)
  5. viola tricolor andina (Viola arvensis Murray)
  6. aster colombiano (Aster cordifolius L.)
  7. bidens andino (Bidens andicola Kunth)
  8. helichrysum (Helichrysum bracteatum (Vent.) Andrews)
  9. achicoria silvestre (Cichorium intybus L.)
 10. crotalaria (Crotalaria spectabilis Roth)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH
  - Catálogo Plantas Colombia
  - GBIF
  - Jardín Botánico Bogotá
  Wikipedia NO. Mínimo 2 source_ids verificables. Si una species no tiene
  2 fuentes Tier A/B, OMITIR — mejor 8 rigurosas que 10 con ruido.

Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar GBIF)
  - geolocalización ANONIMIZADA endémicas amenazadas Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Libro Rojo / Resolución 1912/2017
  - valor_pedagogico Colombia-context

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P1.

Contexto: Batch 25 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
