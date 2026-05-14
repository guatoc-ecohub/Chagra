# Request #347

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/347
- Title: [chore][catalog] Batch 18: Tubérculos y raíces no-andinos extendidos — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 18: Tubérculos y raíces no-andinos extendidos.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier B raíces complementarias:
  1. batata blanca (Ipomoea batatas (L.) Lam. cv. blanca)
  2. batata morada (Ipomoea batatas cv. morada)
  3. jícama (Pachyrhizus erosus (L.) Urb.)
  4. daikon (Raphanus sativus L. var. longipinnatus)
  5. rábano rojo (Raphanus sativus L. var. sativus)
  6. betarraga azucarera (Beta vulgaris L. subsp. vulgaris var. altissima)
  7. chirivía (Pastinaca sativa L.)
  8. alcachofa (Cynara cardunculus L. var. scolymus)
  9. hinojo bulbo (Foeniculum vulgare Mill. var. azoricum)
 10. achocha (Cyclanthera pedata (L.) Schrad.)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Plants of the World Online Kew
  - GBIF
  - Catálogo Plantas Colombia (para nativas)
  - Agrosavia
  Wikipedia NO. Mínimo 2 source_ids verificables. Si una species no tiene
  2 fuentes Tier A/B, OMITIR — mejor 8 rigurosas que 10 con ruido.

Para CADA species:
  - thermal_zones precisos (no inventar)
  - altitud_msnm rangos reales (verificar GBIF)
  - geolocalización ANONIMIZADA endémicas amenazadas Cruz Verde-Sumapaz
  - source_ids mínimo 2 Tier A/B
  - conservation_status según Libro Rojo / Resolución 1912/2017
  - valor_pedagogico Colombia-context

CRITERIOS + RESTRICCIONES: templates/species-batch-prompt.md.

Prioridad: P2.

Contexto: Batch 18 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
