# Request #314

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/314
- Title: [chore][catalog] Batch 3: Tubérculos andinos comestibles páramo (Tier A) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species nuevas a catalog/chagra-catalog-seed-v3.1.json (schema
v3.1). Driver Cruz Verde — TIER A comestibles páramo bajo impacto.

Foco Batch 3: tubérculos andinos tradicionales (1800-3400 msnm), núcleo
del sistema chagra muisca / jardín andino. Evidencia documental MinAmbiente
delimitación páramo Cruz Verde.

Lista priorizada (NO duplicar — verificar contra IDs actuales catálogo):

Tier A (comestibles andino bajo impacto):
  1. cubio (Tropaeolum tuberosum Ruiz & Pav.) — VERIFICAR si ya existe
  2. ulluco / olluco (Ullucus tuberosus Caldas)
  3. oca (Oxalis tuberosa Molina)
  4. ibia / ñame andino (Dioscorea trifida L.f. variantes andinas)
  5. mashua (Tropaeolum tuberosum subsp.) — distinguir de cubio
  6. papa criolla amarilla (Solanum phureja Juz. & Bukasov)
  7. papa Sabanera (Solanum tuberosum subsp. andigenum var. Sabanera)
  8. achira (Canna edulis Ker Gawl.)
  9. yacón (Smallanthus sonchifolius (Poepp.) H.Rob.)
 10. arracacha (Arracacia xanthorrhiza Bancr.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas y Líquenes de Colombia (Bernal et al. 2015+)
  - Cultivos Andinos Subexplotados (NRC 1989) — Tier B
  - Plantas Útiles de Colombia (Pérez Arbeláez 1947) — Tier B
  - Rebozo de la Cordillera (Mayer 1985) — Tier B
  - GBIF
  - Agrosavia fichas técnicas
  - Plants of the World Online Kew

Para CADA species reportar:
  - thermal_zones: incluir "paramo" para las que aplican
  - altitud_msnm.optimo_min y optimo_max realistas (NO inventar)
  - valor_pedagogico: vincular a sistema chagra muisca cuando aplique
  - conservation_status: VU/NT si está en Libro Rojo Colombia
  - geolocalización ANONIMIZADA para endémicas (solo thermal_zone + altitud)

CRITERIOS + RESTRICCIONES: ver templates/species-batch-prompt.md.

Prioridad: P0 (Cruz Verde priority batch).

Contexto: Batch 3 de 31, alimenta evidencia MinAmbiente delimitación
páramo Cruz Verde + ADR-039 (sustitución agroecológica).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
