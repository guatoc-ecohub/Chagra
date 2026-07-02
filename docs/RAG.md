# Pipeline RAG de Chagra

## Arquitectura

```
Query del campesino
  → tokenize + sinónimos campesinos (BM25)
  → embedQuery vía /api/ollama/api/embeddings (snowflake-arctic-embed2, 1024d)
  → BM25 scoring + cosine similarity contra public/rag-embeddings.json
  → fusión por score normalizado (BM25_WEIGHT=1.0, SEMANTIC_WEIGHT=1.5; ver combineResults())
  → collapseVarieties (agrupa por genus_especie)
  → top-K passages al grounding del agente
```

## Modos

| Modo | Condición | Estrategia |
|---|---|---|
| Híbrido completo | ollama online + embeddings cargados | BM25 + semántico + fusión normalizada + colapso variedades |
| Offline | ollama caído / sin red | Solo BM25 + sinónimos campesinos |
| Sin asset | embeddings.json no existe | Solo BM25 + sinónimos |

## Asset de embeddings

- Archivo: `public/rag-embeddings.json` (501 vectores × 1024d, verificado 2026-07-02)
- Tamaño: ~1.7 MB, int8 cuantizado (`{q:'int8', s:scale, v:Int8Array}`)
- Generado por: `scripts/build-rag-embeddings.mjs` (build-time, snowflake-arctic-embed2 via ollama local)
- Cuantización: `--quantize` produce `{q:'int8', s:scale, v:Int8Array}`. El retriever dequantiza transparentemente.
- **El modelo de `build-rag-embeddings.mjs` y el de `embedQuery()` en `ragRetriever.js` DEBEN coincidir** (mismo modelo → misma dimensión). Fuente de verdad: `Chagra-strategy/ops/MODELS.md` fila "embeddings (RAG)".

## Auditoría 2026-07-02 — la fusión híbrida no aportaba nada (root cause + fix)

El PR que introdujo la fusión por score normalizado (`fix/rag-hibrido`) medía **+0.0pp**
de recall@5 entre BM25-only e Híbrido — MRR idéntico a 4 decimales. Causa raíz:
`embedQuery()` (runtime) quedó con `model: 'nomic-embed-text'` (768d) mientras que
`public/rag-embeddings.json` (el corpus) está indexado con `snowflake-arctic-embed2`
(1024d) desde los PR #1825/#1828. `cosineSimilarity()` descarta cualquier par de
vectores de longitud distinta (`a.length !== b.length` → devuelve 0), así que el
score semántico daba 0 para los 501 slugs y la fusión colapsaba al ranking puro de
BM25. Fix: `embedQuery()` vuelve a usar `snowflake-arctic-embed2` (coincide con el
corpus real y con `MODELS.md`); `build-rag-embeddings.mjs` cambia su modelo default
al mismo valor para que una regeneración futura sin `RAG_EMBED_MODEL` explícito no
reintroduzca el desalineamiento. Ver comentario extenso en `embedQuery()`.

## Recall medido — `scripts/bench-rag-retrieve.mjs` (golden set 50 queries, corpus real 501 fichas)

| Estrategia | recall@1 | recall@3 | recall@5 | MRR | Notas |
|---|---|---|---|---|---|
| BM25-only | 14.0% | 28.0% | 40.0% | 0.2370 | Sin cambios respecto al PR original (esperado: el fix no toca BM25) |
| Híbrido, ANTES del fix (`nomic-embed-text` vs corpus 1024d) | 14.0% | 28.0% | 40.0% | 0.2370 | Idéntico a BM25-only — semántico contribuía CERO (root cause de esta auditoría) |
| Híbrido, DESPUÉS del fix (`snowflake-arctic-embed2`, embedder alineado) | **42.0%** | **56.0%** | **64.0%** | **0.5033** | **+28.0pp / +28.0pp / +24.0pp / +0.2663 vs BM25-only.** Medido 2026-07-02 con Ollama real (`OLLAMA_URL`), reproducible (2 corridas idénticas). Registro estandarizado en `bench/history/`. |

Detalle: de las 50 queries, 14 pasan de fallar (BM25) a acertar (híbrido) — casos de paráfrasis/sinónimo que BM25+sinónimos campesinos no cubría (p.ej. "que siembro en tierra fria" → `solanum_tuberosum`, "matamalezas natural" → `allium_cepa`). 2 queries retroceden (G21/G50, "broca en el cafe...") porque el corpus también tiene una ficha de PRÁCTICA (`practica_broca`) que embebe muy cerca de esas queries y le gana a la ficha de especie `coffea_arabica` — no es un bug del embedder, es contenido del corpus que compite; queda anotado como mejora futura, no bloqueante.

(deep-test 2026-06-11, cifras de una corrida anterior sobre un corpus/gold-set distinto — no comparables 1:1 con el bench actual)

| Estrategia | recall@5 | Notas |
|---|---|---|
| BM25 puro | ~65% | Sin sinonimos ni semantico |
| BM25 + sinonimos campesinos | ~90% | Con expansion de query (50 queries golden set) |
| Hibrido (BM25 + semantico + RRF, pre-refactor) | ~30% al slug-EXACTO | Las variedades tapan la especie |
| Hibrido + collapseVarieties | ~70% | Sube de 30% a ~70% colapsando variedades a especie |

## Cuellos conocidos

1. **Variedades que tapan la especie**: `lactuca_sativa_longifolia_morada` ocupa slots que deberian ser de `lactuca_sativa`. Fix: `collapseVarieties()`.
2. **Plaga→hospedero**: "gusano del cafe" no matchea directamente la ficha de cafe. Fix: 14 sinonimos `plaga_hospedero` en `campesino-synonyms.json`, wireados al retriever via `expandQueryTokens()`.
3. **int8 quantize**: reduce asset de ~7.9MB (float32, 1024d) a ~1.7MB. Regenerar el asset con `--quantize`.
4. **Embedder desalineado (RESUELTO 2026-07-02)**: ver sección de auditoría arriba. Cualquier cambio de modelo de embeddings a futuro debe tocar `embedQuery()` Y `build-rag-embeddings.mjs` a la vez, o el híbrido vuelve a degradar en silencio a BM25-only.
