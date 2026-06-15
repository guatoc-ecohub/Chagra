# BENCH_INVENTORY.md - Inventario de Benchmarks de Chagra

> ACTUALIZADO 2026-06-15 (reingenieria). El inventario original (auditoria de
> solapamientos, abajo) sigue valido como ANALISIS. La CONSOLIDACION ya se
> ejecuto: ver `bench/INDEX.md` (catalogo vivo), `bench/run.mjs` (ejecucion +
> historial) y `bench/README.md` (como funciona el framework). Cambios hechos:
>
> - Framework componible: libs compartidas en `scripts/lib/` (bench-runner,
>   bench-ollama, bench-summary, bench-scorer, bench-stats, bench-sidecar) +
>   benches delgados que las reusan. CERO duplicacion nueva.
> - `bench-model-compare.mjs` (NUEVO, parametrizable por suite) reemplaza a
>   `bench-nuevos-vs-baseline.mjs` y `bench-qwen3-vs-granite.mjs` (ELIMINADOS).
>   Las suites viven en `data/bench-suites/*.json`. Scoring: keyword flexible
>   (no literal).
> - `bench-rag-retrieve.mjs`: 3 archivos -> 1 (loader hook inline via data: URL).
>   Se eliminaron `.loader.mjs` y `.register.mjs`. Tambien arregla el import JSON.
> - `bench-complejos-juez-independiente.mjs` y `bench-capabilities-A-vs-C.mjs`
>   ahora usan `scripts/lib/bench-sidecar.mjs` (helpers de sidecar/GPU/generador
>   que estaban COPIADOS x3). `bench-borde-alucinacion.mjs` NO se toco (contrato
>   sellado, "NO ROMPER").
> - Salida estandarizada: cada corrida puede emitir un JSON con esquema fijo v1
>   a `bench/history/`. La tendencia (mejora/empeora) por bench y modelo se
>   consulta con `node bench/run.mjs --history`.
>
> PENDIENTE honesto: `bench-agente-completo.mjs` aun tiene su pipeline inline
> (unloadModel/sampleResources/callOllama propios); no se rewireo a los libs por
> riesgo (1345 lineas, pipeline de sidecar especifico) - candidato a fase 2.
> `bench-rag-retrieve.mjs` corre la consolidacion pero la ejecucion completa bajo
> Node puro necesita un shim de `import.meta.env` (gap PRE-EXISTENTE en main).

---

**Fecha (analisis original)**: 2026-06-14  
**Propósito**: Auditar los 15 scripts `bench-*.mjs` para identificar propósito, entradas, métricas y solapamientos reales.  
**Scope**: Solo scripts principales en `scripts/` (excluye `lib/` y `__tests__/`).

---

## Índice

1. [Solapamientos REALES](#solapamientos-reales)
2. [Catálogo de 15 Benchmarks](#catálogo-de-15-benchmarks)
3. [Consolidación Propuesta](#consolidación-propuesta)

---

## Solapamientos REALES

### 1. bench-rag-retrieve (3 archivos = 1 bench)

**Archivos**: `bench-rag-retrieve.mjs`, `bench-rag-retrieve.loader.mjs`, `bench-rag-retrieve.register.mjs`

**Solapamiento**: Los 3 archivos son el MISMO bench de latencia BM25:
- `bench-rag-retrieve.mjs` → bench principal
- `bench-rag-retrieve.loader.mjs` → loader hook para Node imports (añade `.js` a imports)
- `bench-rag-retrieve.register.mjs` → registrador del loader (7 líneas)

**Métrica**: Latencia del retrieve BM25 (cold load + warm queries p50/p95)

---

### 2. Comparaciones de Modelos (3 benches con solapamiento)

**Archivos**: `bench-agente-completo.mjs`, `bench-nuevos-vs-baseline.mjs`, `bench-qwen3-vs-granite.mjs`

**Solapamiento**:
- Los 3 miden **calidad de modelos** sobre prompts similares
- Comparten categorías: species, biopreparados, plagas
- Usan keyword-matching flexible (sinónimos/lemas) como métrica base
- `bench-agente-completo`: 50 prompts (20 species + 12 biopreparados + 10 plagas + 4 normativa + 4 agroforestería)
- `bench-nuevos-vs-baseline`: 10 prompts (4 species + 3 biopreparados + 3 plagas)
- `bench-qwen3-vs-granite`: 20 prompts (8 species + 6 biopreparados + 6 plagas)

**Métricas**: Keywords matched (%), latencia, VRAM/RAM

---

### 3. Anti-Alucinación (3 benches miden lo mismo con diferente configuración)

**Archivos**: `bench-complejos-juez-independiente.mjs`, `bench-borde-alucinacion.mjs`, `bench-capabilities-A-vs-C.mjs`

**Solapamiento**:
- Los 3 miden **anti-alucinación** con juez independiente
- Usan `must_include` (debe estar) + `red_flags` (NO debe estar)
- `bench-complejos-juez-independiente`: 10 prompts complejos rotativos + config-PROD + juez qwen2.5:14b
- `bench-borde-alucinacion`: 27 trampas adversariales (12 V1 + 15 V2) + config-PROD + juez claude-cli
- `bench-capabilities-A-vs-C`: 66 prompts por capacidad + CONFIG A (crudo) vs CONFIG C (pipeline) + juez Anthropic/ollama

**Métricas**: AH% = FAIL/juzgadas (NO el campo `ah_pct` que históricamente era pass-rate), PASS%, por categoría/axis

---

### 4. Vision (2 benches miden reconocimiento de especies)

**Archivos**: `bench-vision-ab-rag.mjs`, `bench-vision-pipeline.mjs`

**Solapamiento**:
- Los 2 miden **reconocimiento de especies** desde fotos con `llama3.2-vision:11b`
- Ambos validan contra `validate_visual_match` del sidecar
- `bench-vision-ab-rag`: A/B test RAG-by-prompt (injecta catálogo al prompt) vs vanilla
- `bench-vision-pipeline`: pipeline completo (vision → resolveSpeciesId → sidecar validation)

**Métricas**: Parse rate, common_name accuracy, sci_name accuracy, verified_rate, hallucination_rate, latency p50/p95

---

### 5. Re-scoring (1 bench re-utiliza datos de otro)

**Archivos**: `bench-rescore-claude-cli.mjs` (re-utiliza `bench-capabilities-A-vs-C`)

**Solapamiento**:
- Re-puntúa un JSONL existente de `bench-capabilities-A-vs-C` con juez claude-cli
- No genera nuevas respuestas (granite no se toca)
- Solo re-juzga SECUENCIALMENTE en batches de 8 items

**Métricas**: AH% con claude-cli (suscripción del operador), por capability

---

## Catálogo de 15 Benchmarks

### 1. bench-agente-completo.mjs

**Propósito**: Benchmark LARGO del pipeline completo del agente (resolve-entities → enriched prompt → LLM → post-validate).

**Entradas**:
- 50 prompts (20 species + 12 biopreparados + 10 plagas + 4 normativa + 4 agroforestería)
- Modelos: granite3.3:8b, gemma4:e4b, granite3.1-dense:8b, ministral-3:latest, ministral-3:14b (todos compatibles con Maxwell sm_52)
- Sidecar URL (opcional, para resolve-entities + post-validate)

**Métricas**:
- Keywords matched (% con sinónimos/lemas)
- Latencia total (resolve + inference + validate)
- Entities grounded ( AGE)
- Hallucinations (post-validate sidecar)
- VRAM/RAM/Swap peak

**Output**: `data/bench-runs/agente-completo-YYYY-MM-DD.jsonl` + `summary.md`

**LLM-judge opcional**: `--judge` activa evaluación semántica con qwen2.5:14b (independiente del generador).

---

### 2. bench-borde-alucinacion.mjs

**Propósito**: Busca el BORDE de alucinación de granite3.3:8b a CONFIG-PROD, con juez FUERTE INDEPENDIENTE (claude-cli, Claude Code subscription).

**Entradas**:
- 27 trampas adversariales (12 V1 + 15 V2) en `TEST_PROMPTS_BORDE_ALUCINACION_*.json`
- Fixture categorizada: toxicidad, receta-exacta, falsa-cura, altitud, otras
- CHAGRA_MCP_TOKEN (sidecar resolve-entities + post-validate)
- Opcional: `BENCH_APPLY_GUARDS=0` (crudo sin guards para medir delta)
- Opcional: `BENCH_REPS=N` (varianza con N reps, default 1)

**Métricas**:
- **AH% (alucinación REAL) = FAIL/juzgadas = 100 − PASS%** (métrica primaria)
- PASS% = aciertos/juzgadas
- Por categoría (toxicidad, receta-exacta, falsa-cura, altitud, otras)
- Por eje (confusion_toxica, dosis_biopreparado, etc.)
- Por región (Caribe, Andina, etc.)

**Output**: `data/bench-runs/borde-alucinacion-YYYY-MM-DD.jsonl` + `summary.json`

**Juez**: claude-cli (default) o scorer determinístico (sin GPU). Genera reps separadas `*.rep1.jsonl`, `*.rep2.jsonl`, etc.

---

### 3. bench-capabilities-A-vs-C.mjs

**Propósito**: Bench HONESTO de capacidades: CONFIG A (granite CRUDO) vs CONFIG C (pipeline completo de prod).

**Entradas**:
- Pool de 66 prompts por capacidad (generado por `gen-bench-capabilities-pool.mjs`)
- `--pool <path>` (archivo JSON con prompts + must_include + red_flags)
- CHAGRA_MCP_TOKEN (sidecar)
- Juez: Anthropic (Haiku) si hay API key, scorer determinístico si no

**Métricas**:
- AH% = FAIL/juzgadas (PASS/total como acierto)
- LIFT C−A por capability (cuánto aporta el pipeline)
- Tabla por capability: A pass/total vs C pass/total

**Output**: `data/bench-runs/capabilities-A-vs-C-YYYY-MM-DD.jsonl` + `summary.json`

**Fases**:
1. FASE 1: generar (granite) todas las respuestas primero
2. FASE 2: juzgar (qwen2.5:14b) una vez cargado

---

### 4. bench-complejos-juez-independiente.mjs

**Propósito**: Re-bench HONESTO de 10 prompts complejos rotativos a CONFIG-PROD con juez INDEPENDIENTE.

**Entradas**:
- 10 prompts complejos en `TEST_PROMPTS_COMPLEJOS_ROTATIVOS_2026-05-30.json`
- GENERADOR: granite3.1-dense:8b, temp 0.3, seed 42, max_tokens 768 (= ROUTES.chat_complex)
- JUEZ: qwen2.5:14b (familia distinta a granite, estable en Maxwell sm_52)
- CHAGRA_MCP_TOKEN (sidecar)

**Métricas**:
- AH% = FAIL/juzgadas (PASS si todos must_include + cero red_flags)
- Por prompt: must_covered/must_total, red_flags_hit
- Latencia de generación

**Output**: `data/bench-runs/complejos-juez-independiente-YYYY-MM-DD.jsonl` + `summary.json`

**Vigilancia térmica**: GPU < 88°, pausa si sobrepasa.

---

### 5. bench-llm-judge.mjs

**Propósito**: Smoke test LLM-judge + ranking (se ejecuta automáticamente tras `bench-agente-completo`).

**Entradas**:
- `--from <path>` (JSONL de bench, opcional — si no hay, usa mock 10 prompts)
- Juez: gemma3:4b (default) o JUDGE_MODEL
- TARGET_MODEL: granite3.1-dense:8b (modelo a evaluar si el JSONL es per-model)

**Métricas**:
- Factualidad (0-100)
- Claridad colombiana (0-100)
- Anti-alucinación (0-100)
- Completitud (0-100)
- Promedio global (0-100)

**Output**: `data/bench-judge-scores/YYYY-MM-DD.jsonl` + `summary.md`

**Fix 2026-06-03**: parseFromArg acepta `--from <path>` (separado) Y `--from=<path>`.

---

### 6. bench-nocturno-farm-process.mjs

**Propósito**: Bench nocturno de FarmProcess con escenarios smoke + full, checkpointing y eliminación temprana de modelos fallidos.

**Entradas**:
- Escenarios: smoke (2) o full (20+) desde `lib/bench-nocturno-scenarios.mjs`
- Modelos: PRIMARY_MODELS (default) o BENCH_MODELS
- Ollama chat URL
- `--smoke-only` (solo smoke) o `--resume` (continuar desde checkpoint)

**Métricas**:
- Por capability: avg_score (0-1), samples
- Por modelo: eliminated? (si), elimination_reason
- Manifest + state JSONL

**Output**: `data/bench-runs/farm-process-<runid>/manifest.json` + `state.json` + `results.jsonl` + `summary.md`

---

### 7. bench-nuevos-vs-baseline.mjs

**Propósito**: Smoke test 4 modelos nuevos vs baseline granite3.1.

**Entradas**:
- 10 prompts (4 species + 3 biopreparados + 3 plagas)
- Modelos: ministral-3:latest, ministral-3:14b, deepseek-r1:14b, qwen2.5:30b, granite3.1-dense:8b (baseline)

**Métricas**:
- Keywords matched (%)
- Latencia avg
- Ganador por prompt

**Output**: `data/bench-runs/nuevos-vs-baseline-YYYY-MM-DD.jsonl` + `summary.md`

**Maxwell sm_5.2**: Documenta error si detecta incompatibilidad.

---

### 8. bench-qwen3-vs-granite.mjs

**Propósito**: Smoke test comparativo qwen2.5:14b vs granite3.1-dense:8b.

**Entradas**:
- 20 prompts (8 species + 6 biopreparados + 6 plagas)
- Modelos: qwen2.5:14b, granite3.1-dense:8b

**Métricas**:
- Keywords matched (%)
- Latencia avg
- Ganador por prompt

**Output**: `data/bench-runs/qwen3-vs-granite-YYYY-MM-DD.jsonl` + `summary.md`

---

### 9. bench-rag-retrieve.mjs (+ loader + register)

**Propósito**: Benchmark de latencia del retrieve BM25 (cold load + warm queries).

**Entradas**:
- Corpus: 491+ species en `public/cycle-content/`
- 10 queries (species)
- Loader hook (via `--import`)

**Métricas**:
- Cold load: primera query (manifest + 491 fetches + tokenize)
- Warm: 10 queries × 3 iteraciones (p50/p95/max/avg)
- Memoria extra estimada del pre-tokenize

**Output**: Console only (no persiste archivos)

**Uso**: `node --import ./scripts/bench-rag-retrieve.register.mjs scripts/bench-rag-retrieve.mjs`

---

### 10. bench-rescore-claude-cli.mjs

**Propósito**: Re-puntúa un JSONL existente del bench capabilities-A-vs-C con juez claude-cli (suscripción del operador).

**Entradas**:
- `--jsonl <path>` (JSONL de capabilities-A-vs-C)
- `--pool <path>` (pool de prompts para must_include/red_flags)
- CHAGRA_MCP_TOKEN (claude-cli no la necesita)
- BATCH_SIZE=8 (default)

**Métricas**:
- AH% re-calculada con claude-cli
- Por capability: A vs C lift
- Secuencial (un solo claude-cli a la vez)

**Output**: `<baseline>.rescore-cli.<ts>.jsonl` + `summary.json`

---

### 11. bench-summary-diff.mjs

**Propósito**: Compara dos summary.md y emite gate GREEN/YELLOW/RED (BENCH-1, issue #260).

**Entradas**:
- `--baseline=<path>` (summary.md baseline)
- `--current=<path>` (summary.md current)

**Métricas extraídas**:
- Parse rate, accuracy, hallucination rate, latency p50/p95
- Reglas:
  - RED: parse_rate ↓>2pp OR accuracy ↓>5pp OR halluc ↑>3pp OR latency p95 ↑
  - YELLOW: deltas negativos menores
  - GREEN: todos neutros o positivos

**Output**: Console tabla + gate (exit codes: GREEN=0, YELLOW=1, RED=2, NO-DATA=3)

---

### 12. bench-vision-ab-rag.mjs

**Propósito**: Bench V-03 audit visión — A/B test RAG-by-prompt vs vanilla.

**Entradas**:
- Fixtures: ground-truth (66) + extended (opcional) = hasta N fotos
- Vision model: llama3.2-vision:11b (default)
- CHAGRA_MCP_TOKEN (sidecar validate_visual_match)
- Catalog hint: ~4900 binomials inyectados al prompt (variante A)

**Métricas**:
- Parse rate (JSON válido)
- Common name accuracy
- Sci name accuracy (binomial)
- Verified rate (sidecar)
- **Hallucination rate (rejected entre in-catalog)** — clave
- No binomial
- Latency p50/p95

**Output**: `data/bench-runs/vision-ab-rag-<ts>/raw.jsonl` + `summary.md`

**Variantes**:
- A (con RAG): prompt enriched con `<CATALOGO_CHAGRA>` (binomials + nombre común)
- B (sin RAG): SPECIES_PROMPT vanilla (igual a `src/services/aiService.js:recognizeSpecies`)

---

### 13. bench-vision-pipeline.mjs

**Propósito**: Bench V-02 audit visión — pipeline completo (vision → resolveSpeciesId → sidecar validate_visual_match).

**Entradas**:
- Fixtures: ground-truth (66 fotos)
- Vision model: llama3.2-vision:11b (default)
- CHAGRA_MCP_TOKEN (sidecar validate_visual_match)

**Métricas adicionales** vs crudo:
- **validation_rate**: % con `_grounded.status === "verified"`
- **rejection_rate**: % con `_grounded.status === "rejected"` (anti-halluc clave)
- sidecar_latency_ms p50/p95

**Output**: `data/bench-runs/vision-pipeline-<ts>/raw.jsonl` + `summary.md`

**Diferencia con bench-vision-ab-rag**: NO inyecta RAG al prompt, solo mide el pipeline de grounding.

---

## Consolidación Propuesta

### Problema Actual

- **15 scripts** bench-*.mjs con **solapamientos significativos**:
  - 3 archivos para 1 bench (rag-retrieve)
  - 3 benches comparan modelos con prompts similares (agente-completo, nuevos-vs-baseline, qwen3-vs-granite)
  - 3 benches miden anti-alucinación con diferente configuración (complejos-juez-independiente, borde-alucinacion, capabilities-A-vs-C)
  - 2 benches miden visión (vision-ab-rag, vision-pipeline)

- **Métrica inconsistente**: El campo `ah_pct` históricamente era PASS/total (pass-rate), NO alucinación, pero se leía como alucinación (mordió 3 veces según memoria feedback-bench-borde-ah-field-is-passrate).

### Propuesta: Harness Composable

**Runner común** (`scripts/lib/bench-runner.mjs`):
- Correr cualquier suite de prompts sobre cualquier modelo(s)
- Métrica honesta: AH = FAIL/total (siempre), PASS = acierto/total
- Guardar JSONL + summary.md estándar
- Vigilancia térmica GPU < 88°
- Checkpointing y reanudación

**Suites por dominio** (`data/bench-suites/`):
1. **model-comparison**: prompts de species/biopreparados/plagas → keywords-matching + latencia
2. **anti-hallucination**: trampas adversariales + complejos + capabilities → must_include + red_flags
3. **vision**: fixtures fotos → recognition + validation_rate + rejection_rate
4. **rag-retrieve**: queries BM25 → latencia cold/warm
5. **nocturno-farm-process**: escenarios smoke/full → elimination temprana + capability scores

**Configuraciones** (`data/bench-configs/`):
- CONFIG A (crudo): solo granite, sin grounding/guards
- CONFIG C (pipeline): resolve-entities → enriched prompt → guards → post-validate
- CONFIG-PROD: granite3.3:8b, temp 0.3, seed 42, max_tokens 768

**Métricas estandarizadas**:
- **AH% (alucinación REAL)**: FAIL/juzgadas = 100 − PASS%
- **PASS%**: aciertos/juzgadas
- Por categoría/axis/eje/región
- Varianza con BENCH_REPS>1 (media ± stddev, IC95)

### Beneficios

1. **Reducir 15 scripts a 1 runner + 5 suites** → mantenimiento más simple
2. **Métrica consistente**: AH% siempre significa FAIL/total (nunca pass-rate)
3. **Composición fácil**: mezclar suites (ej: anti-hallucination + vision) en una corrida
4. **Checkpointing**: reanudar benches largos sin perder progreso
5. **Reutilización**: mismos prompts, diferentes configs (A vs C, con/without guards)

---

## Referencias

- ADR-045: MCP servers y chagra-dev tools
- ADR-048: Modo supervisor multi-finca (bench nocturno)
- Memoria feedback-bench-borde-ah-field-is-passrate: métrica AH mal etiquetada
- Memoria feedback-sidecar-bench-misses-pwa-rag-path: fidelidad a prod en doctrine + confusion_warnings

---

**Fin del inventario** - Generado automáticamente para task #7012
