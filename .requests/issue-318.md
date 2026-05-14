# Request #318

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/318
- Title: [chore][catalog] Batch 5: Frutales nativos andinos comestibles (Tier A) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Driver Cruz Verde — TIER A comestibles nativos páramo + borde páramo.

Foco Batch 5: frutales nativos andinos comestibles. Bajo impacto sobre
ecosistema páramo (silvestres / agroforestería tradicional).

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A:
  1. mortiño / agraz (Vaccinium meridionale Sw.) — VERIFICAR si ya existe
  2. agraz Vaccinium floribundum Kunth — distinguir vs meridionale
  3. papayuela (Vasconcellea pubescens A.DC.)
  4. uchuva / aguaymanto (Physalis peruviana L.)
  5. tomate de árbol (Solanum betaceum Cav.)
  6. mora andina (Rubus glaucus Benth.)
  7. fresa silvestre andina (Fragaria vesca L. variantes andinas)
  8. sauco (Sambucus peruviana Kunth)
  9. chuva (Solanum quitoense Lam. — lulo / naranjilla)
 10. durazno criollo / pesgua (Hesperomeles obtusifolia (Pers.) Lindl. —
     OJO especie nativa, NO Prunus persica exótica)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas y Líquenes de Colombia (Bernal et al. 2015+)
  - Mora/uchuva: Agrosavia + UNAL Programa Frutales Andinos
  - Mortiño: IAvH 2018+ estudios conservación
  - Sauco: Jardín Botánico de Bogotá colección viva
  - Plants of the World Online Kew
  - GBIF
  - Peer-reviewed Caldasia/Acta Biológica Colombiana

Para CADA species:
  - conservation_status: VERIFICAR Libro Rojo Colombia (varios endémicos
    están VU/NT en Cruz Verde-Sumapaz)
  - geolocalización ANONIMIZADA para nativos páramo (NO coords específicas)
  - valor_pedagogico: vincular a saberes muiscas / sistemas tradicionales
  - thermal_zones: la mayoría frío + páramo_bajo

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P0 (Cruz Verde priority).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
