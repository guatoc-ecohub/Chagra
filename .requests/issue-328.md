# Request #328

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/328
- Title: [chore][catalog] Batch 9: Frutales templados andinos (cv tradicionales) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 9: Frutales templados andinos (cv tradicionales). Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier A/B frutales templados (1800-2800 msnm):
  1. manzana criolla (Malus domestica Borkh. cv. criolla)
  2. pera de agua (Pyrus communis L. cv. criolla)
  3. ciruela japonesa (Prunus salicina Lindl.)
  4. durazno criollo (Prunus persica (L.) Batsch cv. criollo)
  5. breva (Ficus carica L. — distinguir variedades brevera/higuera)
  6. higo (Ficus carica L. cv. negro)
  7. uva Isabela (Vitis labrusca L. cv. Isabella)
  8. granada (Punica granatum L.)
  9. membrillo (Cydonia oblonga Mill.)
 10. albaricoque (Prunus armeniaca L.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Agrosavia frutales templados Cundinamarca
  - Plants of the World Online Kew
  - GBIF
  - Plantas Útiles Colombia (Pérez Arbeláez)

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 9 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
