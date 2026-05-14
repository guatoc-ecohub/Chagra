# Request #368

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/368
- Title: [chore][catalog] Batch 28: Páramo Sumapaz endémicas Tier A Cruz Verde extendido — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 28: Páramo Sumapaz endémicas Tier A Cruz Verde extendido.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A endémicas Sumapaz + Cruz Verde-Sumapaz complementario:
  1. frailejón rosado (Espeletia uribei Cuatrec. — verificar Batch 26)
  2. frailejón blanco (Espeletia barclayana Cuatrec.)
  3. frailejón negro (Espeletia killipii — verificar Batch 26)
  4. romero blanco (Diplostephium revolutum S.F.Blake)
  5. valeriana de páramo (Valeriana plantaginea Kunth)
  6. cardo de páramo (Geranium dieckei R.Knuth)
  7. clavito de páramo (Halenia weddelliana Gilg)
  8. pegamosco (Calceolaria sumapazensis Pennell)
  9. miel de páramo (Lupinus sumapazensis C.P.Sm.)
 10. licopodio andino (Lycopodium clavatum L. var. andino)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH endémicas páramo Cruz Verde-Sumapaz
  - Libro Rojo Plantas Colombia
  - Catálogo Plantas Colombia (Bernal et al.)
  - Plants of the World Online Kew
  Geolocalización ANONIMIZADA OBLIGATORIA.
  Wikipedia NO. Mínimo 2 source_ids verificables.

Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar GBIF)
  - geolocalización ANONIMIZADA endémicas amenazadas
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Libro Rojo / Resolución 1912/2017
  - valor_pedagogico Colombia-context

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P0.

Contexto: Batch 28 de 31. Cierre del catálogo target 400 species
(157 base+22 batches+50 estos cinco ≈ 380-410).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
