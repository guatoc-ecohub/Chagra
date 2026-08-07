# Bench RAG Producción — Documentación

## ¿Qué mide este benchmark?

Este benchmark mide el delta REAL del RAG en producción tras el merge del PR #2860, que arregló un bug donde `getAllSpecies()` devolvía 77 especies en vez de 501 por un stub.

## Contexto del bug

**Antes del PR #2860:**
- El stub de `getAllSpecies()` devolvía `[]`
- El tier-gate FAIL-CLOSED filtraba el corpus a solo 77 especies (CROP_TAXONOMY)
- Especies críticas (yuca, plátano, tomate, cacao, aguacate) tenían 0% recall
- recall@5 medido: 44%

**Después del PR #2860:**
- El stub devuelve las 501 especies del manifest real
- El tier-gate permite el corpus completo
- recall@5 esperado: 58%

## Cómo correrlo

```bash
# Desde la raíz del repo
node scripts/bench/medir-rag-prod.mjs

# Con URL de producción custom
PROD_BASE_URL=https://chagra.app node scripts/bench/medir-rag-prod.mjs

# Cambiar el mínimo de especies requerido
MIN_SPECIES=450 node scripts/bench/medir-rag-prod.mjs

# Cambiar timeout
TIMEOUT_MS=60000 node scripts/bench/medir-rag-prod.mjs
```

## Salida

El script genera:
1. **JSON con métricas**: `docs/bench-rag-prod.json` — contiene fecha, commit, speciesCount, recall@5/10, delta, veredicto, y detalles por query
2. **Consola**: Imprime progreso, métricas, y veredicto

## Veredictos

- **PASS**: recall@5 ≥ 58% (cumple expected)
- **NEUTRAL**: 44% ≤ recall@5 < 58% (mejoró pero no llega al expected)
- **FAIL**: recall@5 < 44% (empeoró vs baseline)
- **ABORTED**: speciesCount < 400 (bug persiste)

## Notas importantes

- El script VERIFICA el número de especies ANTES de medir
- Si detecta <400 especies, ABORTA y no mide (indica bug del stub)
- NO inventa cifras: si no puede alcanzar producción, lo documenta en el reporte
- Usa 30 preguntas agro reales del golden set (subset de `eval/rag-golden.json`)

## Archivos relacionados

- Script: `scripts/bench/medir-rag-prod.mjs`
- Manifest: `public/cycle-content/manifest.json` (501 especies)
- Golden set: `eval/rag-rag-golden.json` (50 queries)
- PR #2860: `fix(bench): stub getAllSpecies con 501 especies del manifest real`
