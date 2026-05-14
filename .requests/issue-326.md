# Request #326

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/326
- Title: [chore][catalog] Batch 7: Restauración páramo nativo Cruz Verde-Sumapaz — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 7: Restauración páramo nativo Cruz Verde-Sumapaz. Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier A nativas restauración páramo:
  1. frailejón Espeletia grandiflora Bonpl. & Humb.
  2. frailejón Espeletia argentea Bonpl. & Humb.
  3. polylepis sericea (Wedd.)
  4. encenillo (Weinmannia tomentosa L.f.)
  5. raque (Vallea stipularis L.f.)
  6. hayuelo (Dodonaea viscosa Jacq.)
  7. aliso (Alnus acuminata Kunth)
  8. sauce andino (Salix humboldtiana Willd.)
  9. paja de páramo (Calamagrostis effusa (Kunth) Steud.)
 10. esmeralda chiquita (Hesperomeles goudotiana (Decne.) Killip)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH (Instituto Humboldt) — autoridad páramos
  - Catálogo Plantas y Líquenes de Colombia (Bernal et al. 2015+)
  - Libro Rojo Plantas Colombia
  - Plants of the World Online Kew
  - Restauración Páramo Cruz Verde-Sumapaz peer-reviewed
  Geolocalización ANONIMIZADA endémicas Cruz Verde-Sumapaz.

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P0.

Contexto: Batch 7 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
