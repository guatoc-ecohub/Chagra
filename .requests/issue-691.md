# Request #691

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/691
- Title: [refine][catalog] passiflora_edulis_morada — vp ≥200 chars + Tier A sources
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

Refinar `passiflora_edulis_morada` en `catalog/chagra-catalog-seed-v3.1.json`:

1. `valor_pedagogico` ≥ 200 chars con distribución Colombia (departamentos, altitud, thermal_zone), manejo agronómico (propagación, ciclo, asociaciones, plagas), contexto cultural muisca/andino si aplica, citación Tier A explícita.
2. `source_ids` ≥4 Tier A canónicas: `gbif-taxonomic-backbone`, `powo-kew`, `agrosavia-*`, `ica-resolucion-3168-2015` o `nrc-1989-cultivos-andinos`.
3. SOLO modificar `passiflora_edulis_morada` (no otras species).

Coherente con thermal_zones y altitud_msnm existentes. NO inventar.

🤖 Batch slim. Generated with [Claude Code](https://claude.com/claude-code)

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
