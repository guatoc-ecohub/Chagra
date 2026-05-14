# Request #334

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/334
- Title: [chore][catalog] Batch 14: Flores comestibles colombianas — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 14: Flores comestibles colombianas. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier B flores comestibles:
  1. cresta de gallo (Celosia argentea var. cristata L.)
  2. capuchina (Tropaeolum majus L.)
  3. pensamiento (Viola × wittrockiana Gams.)
  4. violeta tricolor (Viola tricolor L.)
  5. flor calabaza (Cucurbita maxima Duchesne — flor comestible)
  6. flor naranjilla (Solanum quitoense Lam. — flor comestible)
  7. borraja (Borago officinalis L.)
  8. crisantemo edible (Chrysanthemum × morifolium Ramat. var. edibles)
  9. hibisco (Hibiscus sabdariffa L. — variedad flor de Jamaica)
 10. saúco flor (Sambucus peruviana Kunth — flores)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plants of the World Online Kew
  - GBIF
  - Plantas Útiles Colombia
  - Agrosavia ornamentales

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 14 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
