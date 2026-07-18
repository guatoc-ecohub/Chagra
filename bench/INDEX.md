# INDEX de Benches y Tests - Chagra

> ARCHIVO GENERADO. Fuente de verdad: `bench/index.json`. Regenerar con
> `node bench/run.mjs --regen-index`. No editar a mano (un test verifica
> que este sincronizado).

Generado: 2026-07-18. Entradas: 18 (14 benches/meta + 4 suites de test).

## Como se usa

```bash
node bench/run.mjs --list            # lista todo (benches + suites) con infra y ultima corrida
node bench/run.mjs --history         # tendencia (mejora/empeora) por bench y modelo
node bench/run.mjs <id>              # corre UN bench/suite por id (o sufijo unico)
node bench/run.mjs --all             # corre TODO lo ejecutable que tenga su infra
node bench/run.mjs --all --dry-run   # muestra que correria, sin ejecutar
node bench/run.mjs --regen-index     # regenera este INDEX.md desde index.json
```

Infra: `gpu` (Quadro M6000 sm_52), `ollama` (:11434), `sidecar` (:7880),
`claude-cli` (suscripcion del operador), `anthropic-key`, `fixtures-privadas`
(viven en el repo privado Chagra-strategy), `corpus` (public/cycle-content),
`ninguna` (deterministas, corren en CI).

## Benches

_Ultima corrida y tendencia (datos vivos): `node bench/run.mjs --list` y `--history`._

### Cluster: model-comparison
_Comparan calidad de modelos sobre prompts del dominio (species/biopreparados/plagas) por keyword-matching flexible + latencia + recursos._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `model-compare` | Corre una suite de prompts (definida en data/bench-suites/*.json) contra una lista de modelos via Ollama /api/generate y puntua por keyword-matching flexible. Reemplaza a bench-nuevos-vs-baseline y bench-qwen3-vs-granite (mismo motor,... | Bench LLM | gpu, ollama | `node bench/run.mjs model-compare` |
| `agente-completo` | Bench LARGO (50 prompts) del pipeline de prod completo, con sidecar para grounding + post-validate. --judge activa juez qwen2.5:14b. Dispara bench-llm-judge al terminar. | Bench LLM | gpu, ollama, sidecar | `node bench/run.mjs agente-completo` |

### Cluster: anti-hallucination
_Miden alucinacion real (AH% = FAIL/total) con must_include + red_flags y juez independiente._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `borde-alucinacion` **[NO ROMPER]** | Busca el BORDE de alucinacion de granite3.3:8b a CONFIG-PROD con juez FUERTE INDEPENDIENTE (claude-cli). 27 trampas (12 V1 + 15 V2). BENCH_REPS>1 da media +- stddev. Contrato publico sellado: exports + env vars + paths de salida estables. | Bench LLM | gpu, ollama, sidecar, claude-cli, fixtures-privadas | `node bench/run.mjs borde-alucinacion` |
| `complejos-juez-independiente` | Re-bench HONESTO de 10 prompts complejos rotativos a CONFIG-PROD. Juez Anthropic (Haiku) si hay API key, si no determinstico. Comparte helpers de sidecar/GPU con capabilities via lib/bench-sidecar.mjs. | Bench LLM | gpu, ollama, sidecar, fixtures-privadas | `node bench/run.mjs complejos-juez-independiente` |
| `agro-rotatorio` | Bench diario rotativo para detectar huecos base-variedad en el grafo agroecologico y alucinaciones del agente. Capa A audita paridad TARGETS_PEST/USED_AS_BIOPREPARADO/SUSCEPTIBLE_TO por base, variedad y genero. Capa B genera 50 preguntas... | Bench LLM | corpus | `node bench/run.mjs agro-rotatorio` |
| `capabilities-A-vs-C` | Bench HONESTO de capacidades: CONFIG A (granite CRUDO) vs CONFIG C (pipeline de prod). Reporta LIFT C-A por capability. Pool generado por gen-bench-capabilities-pool.mjs. Requiere generar primero el pool (gen-bench-capabilities-pool.mjs),... | Bench LLM | gpu, ollama, sidecar, anthropic-key | `node scripts/gen-bench-capabilities-pool.mjs > pool.json && node scripts/bench-capabilities-A-vs-C.mjs --pool pool.json` |
| `rescore-claude-cli` | Re-juzga un JSONL existente de capabilities-A-vs-C con claude-cli (suscripcion del operador). NO genera respuestas nuevas. Requiere --jsonl y --pool, por eso no tiene cmd por defecto. | Meta | claude-cli | `JUDGE_PROVIDER=claude-cli node scripts/bench-rescore-claude-cli.mjs --jsonl <file> --pool <pool>` |

### Cluster: vision
_Reconocimiento de especies desde fotos + grounding del sidecar (validate_visual_match)._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `vision-pipeline` | Bench V-02: pipeline de grounding de vision. Mide validation_rate y rejection_rate (anti-halluc). NO inyecta RAG al prompt. | Bench vision | gpu, ollama, sidecar, fixtures-privadas | `node bench/run.mjs vision-pipeline` |
| `vision-ab-rag` | Bench V-03: A/B test inyectando el catalogo (binomials) al prompt (variante A) vs SPECIES_PROMPT vanilla (variante B). Mide la reduccion de alucinacion del RAG-by-prompt. | Bench vision | gpu, ollama, sidecar, fixtures-privadas | `node bench/run.mjs vision-ab-rag` |

### Cluster: rag
_Latencia del retrieve BM25 sobre el corpus real._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `rag-retrieve` | Mide retrieve(query, topK) sobre el corpus real (491+ species). Cold load + warm p50/p95. Consolidado de 3 archivos a 1 (loader hook ahora inline via data: URL). NOTA: ejecucion completa bajo Node puro necesita shim import.meta.env (gap... | Bench latencia | corpus | `node bench/run.mjs rag-retrieve` |

### Cluster: grafo
_Cobertura de la capa de conocimiento (Apache AGE chagra_kg): que tanto del catalogo canonico esta como arista en el grafo (capa Co)._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `grafo-cobertura` | READ-ONLY. Mide que fraccion de las relaciones del catalogo canonico (especie->plaga, companeras, antagonistas, especie->biopreparado) estan como arista en Apache AGE (chagra_kg, capa Co). Cuantifica los holes (relacion conocida por el... | bench-grafo | age | `node bench/run.mjs grafo-cobertura` |
| `prueba-tomate` **[NO ROMPER]** | CANDADO de la auditoria 2026-06-17. READ-ONLY: para cada cultivo con plaga ligada verifica que el grafo conecte la cadena agronomica (cultivo -SUSCEPTIBLE_TO-> plaga <-CONTROLS/TREATS- control/biopreparado), con la semantica CORRECTA (no... | bench-grafo | age | `node bench/run.mjs prueba-tomate` |

### Cluster: judge
_Smoke + ranking del LLM-judge._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `llm-judge` | Smoke test del LLM-judge + ranking. Se ejecuta automaticamente tras agente-completo. Acepta --from <jsonl> para juzgar una corrida real. | Bench LLM | gpu, ollama | `node bench/run.mjs llm-judge` |

### Cluster: nocturno
_Bench largo de FarmProcess con escenarios + eliminacion temprana._

| id | que hace | tipo | infra | ejecutar |
|---|---|---|---|---|
| `nocturno-farm-process` | Bench nocturno de FarmProcess con escenarios smoke (2) o full (20+), checkpointing y eliminacion temprana de modelos fallidos. Delega en lib/bench-nocturno-runner.mjs. | Bench LLM | gpu, ollama | `node bench/run.mjs nocturno-farm-process` |

## Suites de test

| id | que cubre | infra | ejecutar | CI |
|---|---|---|---|---|
| `suite-unit-ci` | El subconjunto EXACTO que corre .github/workflows/unit-tests.yml en cada PR a main. Determinista (sin GPU/red/crypto). Es el gate vitest del repo. | ninguna | `node bench/run.mjs suite-unit-ci`  (o directo: `npm run test:unit -- tests/unit/exampleQuestions.entrypoint.test.jsx tests/unit/outputGuards.test.js tests/unit/catalog-count.test.js src/components/__tests__/QuickChipsBar.smoke.test.jsx src/components/__tests__/ChipsToolbar.smoke.test.jsx`) | `.github/workflows/unit-tests.yml` |
| `suite-unit-full` | Toda la suite vitest (src/**, tests/unit/**, eval/**, scripts/__tests__/**, bench/__tests__/**). ~380 tests. 2 tests de vision son CI-flaky por SubtleCrypto, por eso CI corre solo el subconjunto de suite-unit-ci. | ninguna | `node bench/run.mjs suite-unit-full`  (o directo: `npm run test:unit`) | - |
| `suite-bench-framework` | Tests del runner/indice/historial (bench/__tests__) + libs de bench (scripts/__tests__/bench-*). Deterministas, sin GPU/red. Garantizan indice consistente + lectura de historial. (Excluye el test de fixtures privadas que depende del repo... | ninguna | `node bench/run.mjs suite-bench-framework`  (o directo: `npm run test:unit -- bench/__tests__/ scripts/__tests__/bench-runner.test.mjs scripts/__tests__/bench-ollama.test.mjs scripts/__tests__/bench-summary.test.mjs scripts/__tests__/bench-scorer.test.mjs scripts/__tests__/bench-stats.test.mjs scripts/__tests__/bench-checkout-guard.test.mjs scripts/__tests__/bench-sidecar.test.mjs scripts/__tests__/bench-model-compare.test.mjs`) | - |
| `suite-e2e-offline` | Suite Playwright (35 specs). El gate canonico es tests/offline.spec.js (contrato offline-first: IndexedDB pending_transactions + transicion Online). Corre en .github/workflows/playwright.yml. | ninguna | `node bench/run.mjs suite-e2e-offline`  (o directo: `npm run test:e2e`) | `.github/workflows/playwright.yml` |

## Historial

Cada corrida estandarizada escribe un JSON con esquema fijo (v1) en
`bench/history/`. Campos: `schema, bench, date (ISO), model, config, commit,
metrics{}, passCount, failCount, passPct, notes, seed`. La direccion de
cada metrica (mas alto/mas bajo = mejor) vive en `METRIC_DIRECTION`
(`bench/lib/history.mjs`), y de ahi sale el veredicto mejora/empeora.

Consultar tendencia:

```bash
node bench/run.mjs --history                 # todas las series bench::modelo
node bench/run.mjs --history borde-alucinacion  # filtra por bench
```

Emitir un registro desde un bench:

```js
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';
writeHistoryRecord(buildHistoryRecord({
  bench: 'borde-alucinacion', model: 'granite3.3:8b', config: 'PROD',
  metrics: { ah_pct: 16.0, pass_pct: 84.0 }, passCount: 21, failCount: 4,
}));
```

---

_Reingenieria de benches 2026-06-15: framework componible (lib compartida +
benches delgados), salida estandarizada e indice unico. Ver `bench/README.md`._
