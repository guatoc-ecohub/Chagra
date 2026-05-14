# Request #369

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/369
- Title: [chore][catalog] Batch 29: Especies hídricas + humedales altoandinos — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 29: Especies hídricas + humedales altoandinos.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B humedales + ribera:
  1. enea (Typha latifolia L.)
  2. junco común (Juncus effusus L.)
  3. carrizo (Phragmites australis (Cav.) Trin. ex Steud.)
  4. agua-pez (Polygonum hydropiperoides Michx.)
  5. eichhornia / jacinto agua (Eichhornia crassipes (Mart.) Solms — verificar invasive)
  6. lemna (Lemna minor L.)
  7. azolla (Azolla filiculoides Lam.)
  8. peryphas (Limosella aquatica L.)
  9. nupha (Nuphar advena (Aiton) W.T.Aiton)
 10. ranúnculo acuático (Ranunculus aquatilis L.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH humedales Colombia
  - Catálogo Plantas Colombia
  - GBIF
  - Plants of the World Online Kew
  ATENCIÓN: marcar invasoras con invasive_risk:alto (Eichhornia es invasora declarada Colombia).
  Wikipedia NO. Mínimo 2 source_ids verificables.

Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar GBIF)
  - geolocalización ANONIMIZADA endémicas amenazadas
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Libro Rojo / Resolución 1912/2017
  - valor_pedagogico Colombia-context

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P1.

Contexto: Batch 29 de 31. Cierre del catálogo target 400 species
(157 base+22 batches+50 estos cinco ≈ 380-410).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
