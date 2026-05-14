# Request #338

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/338
- Title: [chore][catalog] Batch 16: Especies piso tropical bajo (0-500 msnm) — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 16: Especies piso tropical bajo (0-500 msnm). Driver Cruz Verde delimitación MinAmbiente.

Lista priorizada (verificar no-duplicación):

Tier B tropical bajo:
  1. coco (Cocos nucifera L.)
  2. chontaduro (Bactris gasipaes Kunth)
  3. asaí (Euterpe oleracea Mart.)
  4. corozo (Aiphanes aculeata Willd.)
  5. caña agria (Costus spicatus (Jacq.) Sw.)
  6. bore (Alocasia macrorrhizos (L.) G.Don)
  7. chambó (Eutera enbacca — verificar nombre científico)
  8. ñame blanco (Dioscorea alata L.)
  9. cocona (Solanum sessiliflorum Dunal)
 10. piña piña (Renealmia alpinia (Rottb.) Maas)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Catálogo Plantas Colombia (Bernal et al.)
  - Plants of the World Online Kew
  - GBIF
  - Agrosavia frutales tropicales

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 16 de 31. Cadencia 1-2 batches/día con pausa validación
Lili cada 5 batches. Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar con GBIF)
  - geolocalización ANONIMIZADA para nativos amenazados Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Resolución 1912/2017 MinAmbiente + Libro Rojo
  - valor_pedagogico Colombia-context

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
