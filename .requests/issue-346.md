# Request #346

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/346
- Title: [chore][catalog] Batch 17: Hortalizas fruto y flor — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 17: Hortalizas fruto y flor.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A/B fruto/flor:
  1. tomate larga vida (Solanum lycopersicum L. var. larga vida)
  2. pimentón rojo (Capsicum annuum L. var. grossum)
  3. ají dulce (Capsicum chinense Jacq. var. dulce)
  4. berenjena (Solanum melongena L.)
  5. calabaza moranga (Cucurbita maxima Duchesne)
  6. calabacín (Cucurbita pepo L. var. cylindrica)
  7. pepino cohombro (Cucumis sativus L. cv. cohombro)
  8. sandía (Citrullus lanatus (Thunb.) Matsum. & Nakai)
  9. melón (Cucumis melo L.)
 10. okra (Abelmoschus esculentus (L.) Moench)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia fichas hortalizas
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

Contexto: Batch 17 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
