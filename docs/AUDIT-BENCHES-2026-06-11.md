# Auditoría y endurecimiento de benchmarks — Chagra (2026-06-11)

> Objetivo: dejar de auto-engañarnos con números bonitos. Antes de correr la
> auditoría agroecológica dura, primero hay que arreglar el INSTRUMENTO. Este
> documento dice qué medía mal cada bench, qué se endureció en este PR, y la
> lista de PRUEBAS DURAS que la auditoría agroecológica debe correr.
>
> Regla de oro aplicada: **mejor un número feo real que uno bonito falso.**

## Resumen ejecutivo — el número más importante

| Métrica | Lo que decíamos | Lo REAL (medido en este PR) |
|---|---|---|
| RAG recall@5 | "90%" (hardcodeado) | **35%** sobre las 492 fichas reales (BM25-only) |
| RAG en prod | "híbrido BM25+semántico" | **BM25-only** — `public/rag-embeddings.json` NO existe en prod |
| Atribución de passages | implícita | **69%** de los slots del top-5 salen SIN especie (bug `flattenDoc`) |
| AH% borde-alucinación | una cifra (33% o 25%) | distribución con varianza — hay que reportar media ± σ |

## Alcance auditado

`scripts/bench-*.mjs` (agente-completo, borde-alucinacion, capabilities-A-vs-C,
complejos-juez-independiente, llm-judge, vision-pipeline, vision-ab-rag,
rag-retrieve, agent-loop, nuevos-vs-baseline, qwen3-vs-granite), `scripts/lib/`
(bench-scorer), `eval/` (rag-golden.json, rag-recall.test.js, promptfoo), y la
referencia `Chagra-strategy/ops/MODEL_BENCHMARK_INDEX.md`.

## Veredicto por bench

| Bench / test | Qué mide REALMENTE | ¿Path real? | Determinismo | Juez | Debilidad principal |
|---|---|---|---|---|---|
| `eval/rag-recall.test.js` | recall sobre corpus **sintético** (14 fichas a mano) | NO (corpus inventado) | sí | n/a | **Imprimía "90%" hardcodeado**; rama "híbrida" mockeaba el embedding de query con vector **constante** → no medía recall semántico |
| `eval/rag-recall-real-corpus.test.js` *(NUEVO)* | recall@5 **real** sobre 492 fichas, BM25-only | **SÍ** (mismo `retrieve()` de la PWA) | sí | n/a | recall real = 35%; expone bug de atribución `flattenDoc` |
| `bench-borde-alucinacion` | AH% a config-prod, juez fuerte | SÍ (pipeline prod) | **NO** (granite no determinista) | claude-cli (fuerte) | **Corría 1 vez → cifra única** pese a rebotar 33%/25%. Endurecido con N-reps |
| `bench-agente-completo` | cobertura keyword-flexible + LLM-judge | parcial | seed fijo | **qwen2.5:14b (ROTO en Maxwell)** | El "juez independiente" default devuelve VACÍO en sm_52 → degrada a keyword (control). "Verde" = solo substring |
| `bench-complejos-juez-independiente` | AH% config-prod | SÍ | seed fijo | **qwen2.5:14b (ROTO)** | Mismo juez roto; sin `ANTHROPIC_API_KEY` cae a un juez que no juzga |
| `bench-capabilities-A-vs-C` | lift Δ(C−A) de la curación/grounding | SÍ (grafo vivo) | seed fijo | **qwen2.5:14b (ROTO)** | El Δ se mide con un juez que en Maxwell no produce veredicto creíble |
| `bench-llm-judge` | calidad vía LLM-judge | n/a | — | inyectable | Honesto si se le pasa juez bueno; peligroso con default local |
| `agent-loop-bench` | self-correction loop | **NO si no hay sidecar** | — | — | Tiene `MOCK_RESPONSES`: "verde" puede venir de mocks, no del loop real |
| `bench-vision-pipeline` / `-ab-rag` | grounding visual vs catálogo | SÍ (sidecar real) | — | grafo (reject rate) | Depende de fixtures fuera del repo; razonable |
| `bench-rag-retrieve` | **latencia** BM25 (no calidad) | SÍ (corpus real) | sí | n/a | Honesto — mide ms, no recall. No confundir con calidad |
| `scripts/lib/bench-scorer.mjs` | scoring AH (must/red_flags) | — | — | — | Bien diseñado: independencia forzada, fallback determinístico ROTULADO `control-only` |

## Las 5 debilidades MÁS graves

1. **RAG: 90% hardcodeado vs 35% real.** `rag-recall.test.js` imprimía
   `recall@5 BM25+sinonimos: 90%` — un literal que no salía de ninguna medición.
   El recall real sobre las 492 fichas es **35%** (BM25-only).

2. **El RAG semántico de prod NO existe.** No hay `public/rag-embeddings.json`,
   así que `loadEmbeddings()` devuelve null y prod corre **BM25-only**. Todo
   bench "híbrido" mide un camino que el campesino NO ejercita. Encima, el mock
   "híbrido" usaba un vector de query **constante** (independiente del texto) →
   ranking semántico idéntico para toda query → cero señal de recall.

3. **69% de los passages del top-5 salen sin especie.** `flattenDoc()` (prod)
   solo setea `species_slug` en el nivel raíz de la ficha; los passages de campos
   ANIDADOS (requirements, milestones, failure_modes) quedan sin atribución, así
   que un buen match en contenido anidado NO se le puede atribuir a su cultivo.
   Esto hunde el recall a-nivel-especie. **Hallazgo de PROD** (no tocado aquí).

4. **Varianza ocultada.** `bench-borde-alucinacion` corría una sola vez y
   reportaba una cifra, cuando granite no es determinista (rebota 33%/25% misma
   config) y el juez es todo-o-nada. Una cifra única es engañosa.

5. **Jueces "independientes" rotos en Maxwell.** `bench-agente-completo`,
   `-complejos-juez-independiente` y `-capabilities-A-vs-C` defaultean a
   `qwen2.5:14b`, que el propio `bench-scorer.mjs` documenta como **devuelve
   respuesta VACÍA en sm_52**. Sin `ANTHROPIC_API_KEY` no hay juez real → el
   número o es keyword-only (control) o queda sin juzgar. "Verde" no significa
   nada. (Documentado; el fix runtime — flippear default a `claude-cli` como hace
   borde — se deja para un PR aparte porque no es testeable sin GPU.)

## Qué se endureció en este PR (capa bench/test, prod intacto)

- **`eval/rag-recall.test.js`**: eliminado el "90%" hardcodeado; corpus
  re-rotulado como **SINTÉTICO**; la rama "híbrida" se renombró a **smoke test de
  infraestructura** (afirma solo que el pipeline RRF no crashea, NO un recall),
  documentando que el vector de query mock es constante.
- **`eval/rag-recall-real-corpus.test.js` (NUEVO)**: mide recall@5 **real** sobre
  las 492 fichas de `public/cycle-content/`, con el MISMO `retrieve()` de la PWA,
  match a nivel especie (el catálogo usa slugs de variedad, el golden de especie).
  Número MEDIDO (35%), guardarraíl de regresión fijado **por debajo** del valor
  observado (0.30), y diagnóstico de atribución (69% sin especie). Honesto y
  reproducible, sin GPU.
- **`scripts/lib/bench-stats.mjs` (NUEVO) + test**: `summarizeReps` (media, σ
  muestral, rango, IC95) y `formatRepSummary` que **avisa explícitamente cuando
  n=1** ("varianza NO medible").
- **`bench-borde-alucinacion.mjs`**: refactor a N repeticiones (`BENCH_REPS`,
  seed distinto por rep). El summary ahora trae `ah_pct_per_rep`, media, σ, min,
  max e IC95. Default `BENCH_REPS=1` (retrocompatible) pero el bloque de varianza
  siempre está, y la consola dice claramente que una corrida no es evidencia.
- **`eval/borde-traps-hard.json` (NUEVO) + test de esquema**: 6 trampas DURAS que
  faltaban: especie/variedad **inexistente**, plaga **inventada**, **dosis
  peligrosa** (2 kg sulfato de cobre/L; semilla de higuerilla a un niño), **dosis
  de biopreparado inventada**, y **premisa falsa explícita** ("glifosato orgánico
  cura la gota"). Cada prompt con `must_include` + `red_flags` para el juez AH.

Resultado: `npx vitest run eval/ scripts/__tests__/` → **365 tests verdes**;
`eslint --max-warnings=0` limpio en lo tocado.

## PRUEBAS DURAS para la auditoría agroecológica (lista accionable)

Estas son las corridas que la auditoría debe ejecutar con el instrumento ya
endurecido (todas necesitan el host alpha: ollama + granite + juez):

1. **Recall real BM25** (sin GPU, ya corre en CI):
   `vitest run eval/rag-recall-real-corpus.test.js` → leer el 35% y el 69% de
   atribución. **Decisión pendiente**: ¿se arregla `flattenDoc` (prod) para
   atribuir passages anidados? ¿se generan embeddings reales?
2. **Recall semántico REAL** (cierra el gap del mock): correr
   `node scripts/build-rag-embeddings.mjs` (genera `public/rag-embeddings.json`
   con nomic-embed-text), luego re-medir recall@5 híbrido con el test real. Hoy
   es **0 evidencia** porque el asset no existe.
3. **Borde-alucinación con VARIANZA**: `BENCH_REPS=5 JUDGE_PROVIDER=claude-cli
   node scripts/bench-borde-alucinacion.mjs` → reportar **media ± σ**, no una
   cifra. Repetir con `PROMPTS_FILE=eval/borde-traps-hard.json` (las trampas
   nuevas: especie inexistente, dosis peligrosa, premisa falsa).
4. **Trampas duras nuevas**: `PROMPTS_FILE=eval/borde-traps-hard.json
   JUDGE_PROVIDER=claude-cli BENCH_REPS=5 node scripts/bench-borde-alucinacion.mjs`
   — cada FAIL aquí es una fuga de seguridad real (dosis tóxica confirmada,
   binomio inventado, premisa falsa validada).
5. **Re-juzgar los 3 benches del juez roto** con juez fuerte: correr
   `bench-agente-completo`, `bench-complejos-juez-independiente` y
   `bench-capabilities-A-vs-C` con `JUDGE_PROVIDER=claude-cli` (o `anthropic` con
   key). Los números actuales con qwen2.5:14b NO son confiables.
6. **agent-loop sin mocks**: correr `agent-loop-bench` con sidecar REAL
   levantado y verificar que el verde no viene de `MOCK_RESPONSES`.
7. **Visión anti-binomio-inventado**: `bench-vision-ab-rag` / `bench-vision-pipeline`
   con fixtures reales → `hallucination_rate` (binomios que no existen en el
   catálogo) es la métrica de seguridad.

## Lo que NO se tocó (a propósito)

- Lógica de prod (`ragRetriever.js`, `flattenDoc`, `outputGuards`, `llmRouter`):
  los hallazgos #2 y #3 son de prod y se documentan, NO se parchean en un PR de
  endurecimiento de benches.
- Default de juez de los 3 benches con qwen2.5:14b: se documenta como deuda; el
  fix (flippear a claude-cli) va en PR aparte porque no es testeable sin GPU.
