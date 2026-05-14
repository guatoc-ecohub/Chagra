# Request #316

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/316
- Title: [chore][catalog] Batch 4: Cereales y granos andinos (Tier A Cruz Verde) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Driver Cruz Verde — TIER A comestibles andinos bajo impacto + leguminosas.

Foco Batch 4: cereales/pseudocereales andinos + leguminosas tradicionales
(1800-3400 msnm). Parte de sistema chagra muisca + jardín andino.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A:
  1. quinua (Chenopodium quinoa Willd.)
  2. amaranto (Amaranthus caudatus L.)
  3. kiwicha (Amaranthus caudatus L. var. — distinguir vs amaranto si aplica)
  4. maíz capio (Zea mays L. var. capio)
  5. frijol cargamanto (Phaseolus vulgaris L. cv. cargamanto)
  6. frijol nuña / pop-bean (Phaseolus vulgaris L. cv. nuña)
  7. tarwi / chocho (Lupinus mutabilis Sweet)
  8. haba (Vicia faba L.)
  9. arveja (Pisum sativum L. var. andina)
 10. lenteja andina (Lens culinaris Medik. var. andina)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas y Líquenes de Colombia (Bernal et al. 2015+)
  - Cultivos Andinos Subexplotados (NRC 1989)
  - Quinua: FAO 2013 año internacional + Mujica 1992 reviews
  - Plantas Útiles Colombia (Pérez Arbeláez 1947)
  - Agrosavia fichas técnicas leguminosas andinas
  - GBIF
  - Plants of the World Online Kew

Para CADA species:
  - thermal_zones precisos (frío para haba/arveja, frío_alto/páramo para
    quinua/kiwicha)
  - altitud_msnm con rangos reales (NO inventar)
  - roles_in_guild: muchas leguminosas son fijadoras de N
  - propagation: semilla, métodos tradicionales colombianos

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P0 (Cruz Verde priority).

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
