# Request #352

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/352
- Title: [chore][catalog] Batch 23: Café arábica variedades + frutales altura media — schema v3.1
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Tipo: chore Scope: catalog Descripcion:

Agregar 10 species a catalog/chagra-catalog-seed-v3.1.json (schema v3.1).
Foco Batch 23: Café arábica variedades + frutales altura media.

Lista priorizada (verificar no-duplicación contra catálogo actual):

Tier A/B variedades caficultura:
  1. café caturra (Coffea arabica L. cv. Caturra)
  2. café castillo (Coffea arabica cv. Castillo — Cenicafé)
  3. café típica (Coffea arabica cv. Típica)
  4. café geisha (Coffea arabica cv. Geisha)
  5. aguacate hass altura (Persea americana Mill. cv. Hass altura)
  6. lulo de Castilla (Solanum quitoense var. Castilla)
  7. granadilla (Passiflora ligularis Juss.)
  8. badea (Passiflora quadrangularis L.)
  9. chirimoya (Annona cherimola Mill.)
 10. feijoa (Acca sellowiana (O.Berg) Burret)

FUENTES OBLIGATORIAS (mínimo 2 Tier A/B):
  - Cenicafé (Centro Nacional de Investigaciones de Café)
  - Agrosavia frutales altura
  - Plants of the World Online Kew
  - GBIF
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

Prioridad: P1.

Contexto: Batch 23 de 31. Cadencia 1-2 batches/día con validación humana
Lili cada 5 batches según template.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
