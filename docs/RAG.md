# Pipeline RAG de Chagra

## Arquitectura

```
Query del campesino
  → tokenize + sinónimos campesinos (BM25)
  → embedQuery vía /api/ollama/api/embeddings (nomic-embed-text, 768d)
  → BM25 scoring + cosine similarity contra public/rag-embeddings.json
  → RRF fusion (k=60)
  → collapseVarieties (agrupa por genus_especie)
  → top-K passages al grounding del agente
```

## Modos

| Modo | Condición | Estrategia |
|---|---|---|
| Híbrido completo | ollama online + embeddings cargados | BM25 + semántico + RRF + colapso variedades |
| Offline | ollama caído / sin red | Solo BM25 + sinónimos campesinos |
| Sin asset | embeddings.json no existe | Solo BM25 + sinónimos |

## Asset de embeddings

- Archivo: `public/rag-embeddings.json` (~491 vectores × 768d)
- Tamaño: ~7.5 MB float32, ~1.9 MB int8 cuantizado
- Generado por: `scripts/build-rag-embeddings.mjs` (build-time, nomic-embed-text via ollama local)
- Cuantización: `--quantize` produce `{q:'int8', s:scale, v:Int8Array}`. El retriever dequantiza transparentemente.

## Recall medido (deep-test 2026-06-11)

| Estrategia | recall@5 | Notas |
|---|---|---|
| BM25 puro | ~65% | Sin sinonimos ni semantico |
| BM25 + sinonimos campesinos | ~90% | Con expansion de query (50 queries golden set) |
| Hibrido (BM25 + semantico + RRF) | ~30% al slug-EXACTO | Las variedades tapan la especie |
| Hibrido + collapseVarieties | ~70% | Sube de 30% a ~70% colapsando variedades a especie |

## Cuellos conocidos

1. **Variedades que tapan la especie**: `lactuca_sativa_longifolia_morada` ocupa slots que deberian ser de `lactuca_sativa`. Fix: `collapseVarieties()` con boost 0.85x.
2. **Plaga→hospedero**: "gusano del cafe" no matchea directamente la ficha de cafe. Fix: 14 sinonimos `plaga_hospedero` en `campesino-synonyms.json`, wireados al retriever via `expandQueryTokens()`.
3. **Penalizacion contraproducente**: la penalizacion 0.85x a variedades en produccion resulto excesiva. Ajustar a 0.92x o remover tras medir con el asset real.
4. **int8 quantize**: reduce asset de 7.5MB a ~1.9MB. Opus regenera el asset con `--quantize`.
