# Request #331

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/331
- Title: [chore][catalog] Batch 12: Árboles sombra agroforestería café/cacao — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 12: Árboles sombra agroforestería café/cacao. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier A/B árboles agroforestería:
  1. guamo macheto (Inga edulis Mart.)
  2. nogal cafetero (Cordia alliodora (Ruiz & Pav.) Oken)
  3. cedro andino (Cedrela odorata L.)
  4. roble andino (Quercus humboldtii Bonpl.)
  5. arrayán (Myrcianthes leucoxyla (Ortega) McVaugh)
  6. cedrón (Aloysia citrodora Palau)
  7. samán (Samanea saman (Jacq.) Merr.)
  8. tilo americano (Tilia americana L.)
  9. chachafruto (Erythrina edulis Triana ex Micheli)
 10. caracolí (Anacardium excelsum (Bertero ex Kunth) Skeels)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas Colombia (Bernal et al.)
  - Agroforestería tropical Beer 1987
  - Agrosavia sombra cafetales
  - Plants of the World Online Kew

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 12 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
