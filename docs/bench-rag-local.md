# Bench RAG Local (retriever cliente, corpus local) — Documentación

## ¿Qué mide este benchmark?

Este benchmark mide el **retriever cliente** (`src/services/ragRetriever.js`, BM25 + semántico)
contra un **corpus LOCAL de fichas**: `public/cycle-content/manifest.json` (501 fichas) +
`public/rag-embeddings.json`. NO consulta ningún endpoint de producción.

## ATENCIÓN: este instrumento NO mide producción

Renombrado desde `medir-rag-prod.mjs`. Pese a su nombre anterior, el script siempre
recuperó con `ragRetriever.js` y un mock que sirve archivos locales del repo; la variable
`PROD_BASE_URL` se imprimía pero nunca se usaba para ninguna recuperación. Por eso:

- **Los 44% y 58% históricos se midieron contra corpus local**, no contra los 5.906
  `corpus_chunks` del RAG server-side (nomic-embed-text 768d sobre pgvector).
- Si definís `PROD_BASE_URL`, el script **falla (exit 64)** en vez de imprimir la variable
  y medir otra cosa en silencio.

Para medir producción de verdad (endpoint server-side, `corpus_chunks` en pgvector) hace
falta otro harness; no está construido (ver `INFORME-RAG-DELTA-PROD-2026-08-07.md`).

## Contexto del bug (por qué existen 44% y 58%)

**Antes del PR #2860:**
- El stub de `getAllSpecies()` devolvía `[]`
- El tier-gate FAIL-CLOSED filtraba el corpus a solo 77 especies (CROP_TAXONOMY)
- Especies críticas (yuca, plátano, tomate, cacao, aguacate) tenían 0% recall
- recall@5 medido (corpus local): 44%

**Después del PR #2860:**
- El stub devuelve las 501 especies del manifest real
- El tier-gate permite el corpus completo
- recall@5 esperado (corpus local): 58%

## Cómo correrlo

```bash
# Desde la raíz del repo
node scripts/bench/medir-rag-local.mjs

# Cambiar el mínimo de especies requerido
MIN_SPECIES=450 node scripts/bench/medir-rag-local.mjs

# Cambiar timeout
TIMEOUT_MS=60000 node scripts/bench/medir-rag-local.mjs
```

## Salida

El script genera:
1. **JSON con métricas**: `docs/bench-rag-local.json` — contiene fecha, commit, speciesCount, recall@5/10, delta, veredicto, y detalles por query
2. **Consola**: Imprime progreso, métricas, y veredicto

## Veredictos

- **PASS**: recall@5 ≥ 58% (cumple expected)
- **NEUTRAL**: 44% ≤ recall@5 < 58% (mejoró pero no llega al expected)
- **FAIL**: recall@5 < 44% (empeoró vs baseline)
- **ABORTED**: speciesCount < 400 (bug persiste)

## Notas importantes

- El script VERIFICA el número de especies ANTES de medir
- Si detecta <400 especies, ABORTA y no mide (indica bug del stub)
- NO inventa cifras: lo que mide es corpus local, y lo dice
- Usa 30 preguntas agro reales del golden set (subset de `eval/rag-golden.json`)

## Archivos relacionados

- Script: `scripts/bench/medir-rag-local.mjs`
- Manifest: `public/cycle-content/manifest.json` (501 especies)
- Golden set: `eval/rag-golden.json` (50 queries)
- PR #2860: `fix(bench): stub getAllSpecies con 501 especies del manifest real`
- Diagnóstico del etiquetado falso: `INFORME-RAG-DELTA-PROD-2026-08-07.md` (Chagra-strategy)
