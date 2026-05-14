# Request #327

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/327
- Title: [chore][catalog] Batch 8: Hortalizas hoja extendidas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 8: Hortalizas hoja extendidas. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier A/B hortalizas hoja (mayoría introducidas tradicionales):
  1. acelga (Beta vulgaris L. var. cicla)
  2. col rizada/kale (Brassica oleracea L. var. acephala)
  3. repollo (Brassica oleracea L. var. capitata)
  4. nabo (Brassica rapa L. var. rapa)
  5. remolacha (Beta vulgaris L. var. conditiva)
  6. zanahoria (Daucus carota L. subsp. sativus)
  7. apio (Apium graveolens L.)
  8. perejil (Petroselinum crispum (Mill.) Fuss)
  9. cebollín (Allium schoenoprasum L.)
 10. puerro (Allium ampeloprasum L. var. porrum)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia fichas hortalizas
  - Plants of the World Online Kew
  - GBIF
  - Catálogo Plantas Colombia (para variedades naturalizadas)

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 8 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
