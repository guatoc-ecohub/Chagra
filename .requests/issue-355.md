# Request #355

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/355
- Title: [chore][catalog] Batch 26: Especies amenazadas Cruz Verde-Sumapaz Libro Rojo — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 26: Especies amenazadas Cruz Verde-Sumapaz Libro Rojo.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A endémicas amenazadas (geolocalización ANONIMIZADA):
  1. canelo de páramo (Drimys granadensis L.f. — verificar duplicación con Batch 10)
  2. brunellia bogotensis (Brunellia comocladifolia Humb. & Bonpl.)
  3. encenillo del páramo (Weinmannia paramoensis Cuatrec.)
  4. escallonia paniculata (Escallonia paniculata (Ruiz & Pav.) Schult.)
  5. espeletia uribei (Espeletia uribei Cuatrec.)
  6. espeletia killipii (Espeletia killipii Cuatrec.)
  7. polylepis quadrijuga (Polylepis quadrijuga Bitter)
  8. polylepis sericea (Polylepis sericea — verificar Batch 7)
  9. hesperomeles ferruginea (Hesperomeles ferruginea (Pers.) Benth.)
 10. cinchona pubescens (Cinchona pubescens Vahl — quina)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH (Instituto Humboldt)
  - Libro Rojo Plantas Colombia
  - Catálogo Plantas y Líquenes Colombia
  - Resolución 1912/2017 MinAmbiente
  - Plants of the World Online Kew
  - GBIF (con coords ofuscadas)
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

Contexto: Batch 26 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
