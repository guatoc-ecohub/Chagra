# Request #351

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/351
- Title: [chore][catalog] Batch 22: Resistencia hídrica + sequía pisos tropical seco — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 22: Resistencia hídrica + sequía pisos tropical seco.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B xerófitas/CAM:
  1. nopal (Opuntia ficus-indica (L.) Mill.)
  2. agave americano (Agave americana L.)
  3. sábila penca (Aloe vera (L.) Burm.f. — verificar duplicación)
  4. vetiver (Chrysopogon zizanioides (L.) Roberty)
  5. acacia mangium (Acacia mangium Willd.)
  6. mezquite (Prosopis juliflora (Sw.) DC.)
  7. yuca brava (Manihot esculenta Crantz var. bitter)
  8. cardón guajiro (Stenocereus griseus (Haw.) Buxb.)
  9. hibisco jamaica (Hibiscus sabdariffa L. — verificar duplicación)
 10. tuna (Opuntia spp.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia zona seca caribe
  - Plants of the World Online Kew
  - GBIF
  - IAvH zonas secas Colombia
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

Contexto: Batch 22 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
