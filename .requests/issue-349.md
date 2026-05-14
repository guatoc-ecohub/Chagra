# Request #349

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/349
- Title: [chore][catalog] Batch 20: Sistemas chagra muisca complementario Cruz Verde — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 20: Sistemas chagra muisca complementario Cruz Verde.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A nativas culturales/etnobotánicas:
  1. yopo (Anadenanthera peregrina (L.) Speg.)
  2. ololiuqui (Turbina corymbosa (L.) Raf.)
  3. maíz capia (Zea mays L. cv. capia)
  4. ñame andino (Dioscorea trifida L.f. var. andina)
  5. cuminolo (Vasconcellea cundinamarcensis V.M.Badillo)
  6. yacón silvestre (Smallanthus uvedalia (L.) Mack.)
  7. miel de coronilla (Salvia palifolia Kunth)
  8. ipecacuana (Carapichea ipecacuanha (Brot.) L.Andersson)
  9. coquito (Caesalpinia spinosa (Molina) Kuntze)
 10. balsamina (Momordica charantia L.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plantas Útiles Colombia (Pérez Arbeláez)
  - Etnobotánica muisca Ardila 2015
  - Catálogo Plantas Colombia
  - IAvH
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

Prioridad: P0.

Contexto: Batch 20 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
