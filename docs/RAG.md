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

- Archivo: `public/rag-embeddings.json` (~491 vectores × 768d float32)
- Tamaño: ~7.5 MB sin comprimir, ~1.5 MB gzipped
- Generado por: `scripts/build-rag-embeddings.mjs` (build-time, nomic-embed-text vía ollama local)
- Cuantización int8 pendiente (target ~1.9 MB)

## Recall medido

| Estrategia | recall@5 | Notas |
|---|---|---|
| BM25 puro | ~65% | Sin sinónimos ni semántico |
| BM25 + sinónimos campesinos | ~90% | Con expansión de query |
| Híbrido (BM25 + semántico + RRF + colapso) | ~70% al slug-EXACTO (30% sin colapso) | Las variedades tapan la especie |

## Cuellos conocidos

1. **Variedades que tapan la especie**: `lactuca_sativa_longifolia_morada` ocupa slots que deberían ser de `lactuca_sativa`. Fix: `collapseVarieties()`.
2. **Plaga→hospedero**: "gusano del café" no matchea directamente la ficha de café. Fix: sinónimos `plaga_hospedero` en `campesino-synonyms.json`.
3. **Recall POR CATEGORÍA**: pendiente medición separada (cultivo/plaga/clima/biopreparado).
