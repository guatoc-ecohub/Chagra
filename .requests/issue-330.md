# Request #330

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/330
- Title: [chore][catalog] Batch 11: Cobertura suelo + abonos verdes — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 11: Cobertura suelo + abonos verdes. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier B coberturas + N-fixers:
  1. vicia (Vicia sativa L.)
  2. avena forrajera (Avena sativa L.)
  3. trébol blanco (Trifolium repens L.)
  4. alfalfa (Medicago sativa L.)
  5. nabo forrajero (Brassica rapa L. var. rapifera)
  6. raigrás perenne (Lolium perenne L.)
  7. festuca (Festuca arundinacea Schreb.)
  8. lupino tarwi (Lupinus mutabilis Sweet — verificar si ya en #316)
  9. rábano forrajero (Raphanus sativus L. var. oleifer)
 10. frijol terciopelo (Mucuna pruriens (L.) DC.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia ganadería + agroforestería
  - Plants of the World Online Kew
  - Restrepo Rivera 2005 (agroecología colombiana)
  - GBIF

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 11 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
