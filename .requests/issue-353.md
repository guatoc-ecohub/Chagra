# Request #353

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/353
- Title: [chore][catalog] Batch 24: Abonos verdes regenerativos altura — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 24: Abonos verdes regenerativos altura.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B leguminosas regenerativas:
  1. nabo blanco forrajero (Brassica rapa L. var. rapa cv. forraje)
  2. mostaza criolla (Brassica juncea (L.) Czern.)
  3. vicia sativa (Vicia sativa L. — verificar duplicación)
  4. fenogreco (Trigonella foenum-graecum L.)
  5. mucuna enana (Mucuna pruriens (L.) DC. var. utilis)
  6. tagasaste (Cytisus proliferus L.f.)
  7. cratylia (Cratylia argentea (Desv.) Kuntze)
  8. leucaena (Leucaena leucocephala (Lam.) de Wit)
  9. sesbania (Sesbania sesban (L.) Merr.)
 10. gliricidia (Gliricidia sepium — verificar duplicación con matarratón Batch 13)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia silvopastoreo Cenicafé
  - Restrepo Rivera 2005
  - Plants of the World Online Kew
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

Contexto: Batch 24 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
