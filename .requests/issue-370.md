# Request #370

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/370
- Title: [chore][catalog] Batch 30: Especies invasoras catalogadas Colombia (IAvH) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 30: Especies invasoras catalogadas Colombia (IAvH).

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A invasoras DECLARADAS — TODAS con invasive_risk:alto + category:especies_invasoras:
  1. retamo espinoso (Ulex europaeus L.)
  2. retamo liso (Genista monspessulana (L.) L.A.S.Johnson)
  3. eucalipto plantación (Eucalyptus globulus Labill.)
  4. ojo de poeta (Thunbergia alata Bojer ex Sims)
  5. pasto puntero (Hyparrhenia rufa (Nees) Stapf)
  6. caña brava (Arundo donax L.)
  7. kikuyo (Cenchrus clandestinus (Hochst. ex Chiov.) Morrone)
  8. hortensia silvestre (Hydrangea macrophylla (Thunb.) Ser.)
  9. lechuga acuática (Pistia stratiotes L.)
 10. helecho marranero (Pteridium aquilinum (L.) Kuhn var. caudatum)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - IAvH Catálogo Invasoras Colombia (línea base oficial)
  - Resolución MinAmbiente sobre invasoras
  - Plants of the World Online Kew
  - GBIF
  TODAS con flag invasive_risk:alto + category:especies_invasoras +
  source_ids[0] = IAvH catálogo invasoras + nota pedagógica para operador.
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

Contexto: Batch 30 de 31. Cierre del catálogo target 400 species
(157 base+22 batches+50 estos cinco ≈ 380-410).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
