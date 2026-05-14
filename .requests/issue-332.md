# Request #332

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/332
- Title: [chore][catalog] Batch 13: Cercas vivas tradicionales colombianas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 13: Cercas vivas tradicionales colombianas. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier A/B cercas vivas:
  1. matarratón (Gliricidia sepium (Jacq.) Kunth ex Walp.)
  2. nacedero (Trichanthera gigantea (Bonpl.) Nees)
  3. quiebrabarrigo (Trichanthera gigantea — verificar si es distinto a nacedero)
  4. chiló (Erythrina rubrinervia Kunth)
  5. tigridia (Tigridia pavonia (L.f.) DC.)
  6. croton ornamental (Codiaeum variegatum (L.) Rumph. ex A.Juss.)
  7. bambú nativo (Guadua angustifolia Kunth)
  8. buddleja arbórea (Buddleja americana L.)
  9. acanto andino (Acanthus mollis L.)
 10. mortiño cerca (Vaccinium meridionale Sw. — verificar duplicación)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plantas Útiles Colombia (Pérez Arbeláez)
  - Restrepo Rivera 2005
  - Catálogo Plantas Colombia
  - GBIF
  - Agrosavia silvopastoreo

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 13 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
