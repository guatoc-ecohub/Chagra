# Request #367

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/367
- Title: [chore][catalog] Batch 27: Ornamentales nativas + tradescantias colombianas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 27: Ornamentales nativas + tradescantias colombianas.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B ornamentales nativas:
  1. crotón colombiano (Codiaeum variegatum var. pictum)
  2. tradescantia espiga (Tradescantia spathacea Sw.)
  3. lirio del valle (Convallaria majalis L.)
  4. clavellina (Caesalpinia pulcherrima (L.) Sw.)
  5. zinnia (Zinnia elegans Jacq.)
  6. amapola (Papaver somniferum L. var. ornamental)
  7. buganvilla (Bougainvillea spectabilis Willd.)
  8. heliconia (Heliconia rostrata Ruiz & Pav.)
  9. ave del paraíso (Strelitzia reginae Banks)
 10. orquídea Cattleya trianae (Cattleya trianae Linden & Rchb.f., flor nacional Colombia)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas Colombia (Bernal et al.)
  - Plants of the World Online Kew
  - GBIF
  - Jardín Botánico Bogotá colección viva
  Wikipedia NO. Mínimo 2 source_ids verificables.

Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar GBIF)
  - geolocalización ANONIMIZADA endémicas amenazadas
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Libro Rojo / Resolución 1912/2017
  - valor_pedagogico Colombia-context

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 27 de 31. Cierre del catálogo target 400 species
(157 base+22 batches+50 estos cinco ≈ 380-410).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
