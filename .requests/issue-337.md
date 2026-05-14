# Request #337

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/337
- Title: [chore][catalog] Batch 15: Frutos secos + nueces andinas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 15: Frutos secos + nueces andinas. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier B frutos secos:
  1. chachafruto pepa (Erythrina edulis Triana ex Micheli — semilla)
  2. nogal andino nuez (Juglans neotropica Diels)
  3. macadamia (Macadamia integrifolia Maiden & Betche)
  4. almendro tropical (Terminalia catappa L.)
  5. avellano andino (Gevuina avellana Molina)
  6. castaña sajina (Castanea sativa Mill.)
  7. maní (Arachis hypogaea L.)
  8. soja (Glycine max (L.) Merr.)
  9. ajonjolí (Sesamum indicum L.)
 10. pistacho (Pistacia vera L.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plants of the World Online Kew
  - Catálogo Plantas Colombia (para especies nativas)
  - Agrosavia
  - GBIF
  Nogal andino Juglans neotropica está en Libro Rojo VU — flag conservación.

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 15 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
