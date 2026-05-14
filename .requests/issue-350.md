# Request #350

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/350
- Title: [chore][catalog] Batch 21: Aromáticas tradicionales colombianas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 21: Aromáticas tradicionales colombianas.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B aromáticas/condimentarias:
  1. hierba limón / limoncillo (Cymbopogon citratus (DC.) Stapf)
  2. citronela (Cymbopogon nardus (L.) Rendle)
  3. jengibre (Zingiber officinale Roscoe)
  4. cúrcuma (Curcuma longa L.)
  5. comino criollo (Cuminum cyminum L. — verificar duplicación)
  6. cardamomo (Elettaria cardamomum (L.) Maton)
  7. vainilla (Vanilla planifolia Jacks. ex Andrews)
  8. anís estrella (Illicium verum Hook.f.)
  9. anís verde (Pimpinella anisum L.)
 10. hierbabuena criolla (Mentha × villosa Huds.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plantas Útiles Colombia
  - GBIF
  - Plants of the World Online Kew
  - Agrosavia
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

Contexto: Batch 21 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
