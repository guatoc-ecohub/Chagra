# Bench de embedders

- Graph: chagra_kg
- Generated at: 2026-07-15T05:27:46.743Z
- Baseline production embedder: snowflake-arctic-embed2 (scripts/build-rag-embeddings.mjs default)
- Installed models: snowflake-arctic-embed2:latest

## Dataset

- Species docs: 742
- Queries RegionalLabel: 203
- Queries nombres_comunes: 2268
- Hard cases: 21

## Results

- Baseline row: snowflake-arctic-embed2:latest

| Model | recall@1 | delta | recall@5 | delta | MRR | delta | hard@1 | hard@5 | hard MRR | doc embed ms | query embed ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| snowflake-arctic-embed2:latest | 38.4% | +0 | 64.5% | +0 | 0.4853 | +0 | 0% | 0% | 0 | 880.7 | 695.9 |

## Confusables

### papa, papaya y papayuela

| Query | Expected |
|---|---|
| papa | solanum_tuberosum |
| papa criolla | solanum_phureja |
| papaya | carica_papaya |
| papayuela | vasconcellea_pubescens |

### siete passiflora

| Query | Expected |
|---|---|
| maracuya | passiflora_edulis_flavicarpa |
| gulupa | passiflora_edulis_morada |
| granadilla | passiflora_ligularis |
| curuba | passiflora_tripartita_mollissima |
| badea | passiflora_quadrangularis |
| cholupa | passiflora_maliformis |
| curuba de castilla | passiflora_tripartita_mollissima |

### solanum betaceum vs lycopersicum

| Query | Expected |
|---|---|
| tomate | solanum_lycopersicum |
| tomate de arbol | solanum_betaceum |
| tomate de palo | solanum_betaceum |

### brassica oleracea

| Query | Expected |
|---|---|
| repollo blanco | brassica_oleracea_capitata_alba |
| brocoli | brassica_oleracea_italica |
| coliflor | brassica_oleracea_botrytis |
| coles de bruselas | brassica_oleracea_gemmifera |
| kale rizado | brassica_oleracea_acephala_curly |

### arracacha y yuca

| Query | Expected |
|---|---|
| arracacha | arracacia_xanthorrhiza |
| yuca | manihot_esculenta |

## Notes

- The benchmark is read only.
- If phase 2 does not fit, phase 1 is still valid and actionable.
- No em dash is used in user facing text.

