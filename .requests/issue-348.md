# Request #348

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/348
- Title: [chore][catalog] Batch 19: Forrajes pasto tropical agroforestería — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 19: Forrajes pasto tropical agroforestería.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B forrajes:
  1. pasto pará (Brachiaria mutica (Forssk.) Stapf)
  2. pasto guinea (Megathyrsus maximus (Jacq.) B.K.Simon & S.W.L.Jacobs)
  3. brachiaria decumbens (Urochloa decumbens (Stapf) R.D.Webster)
  4. estrella africana (Cynodon plectostachyus (K.Schum.) Pilg.)
  5. king grass (Pennisetum purpureum × P. typhoides cv. king)
  6. maralfalfa (Pennisetum spp. cv. maralfalfa)
  7. pasto gigante (Pennisetum purpureum Schumach.)
  8. pasto mombasa (Megathyrsus maximus cv. mombasa)
  9. pasto cuba 22 (Pennisetum purpureum cv. cuba 22)
 10. raigrás italiano (Lolium multiflorum Lam.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia ganadería tropical
  - Plants of the World Online Kew
  - GBIF
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

Prioridad: P2.

Contexto: Batch 19 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
