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

## Kill-switch semántico — `VITE_RAG_SEMANTIC`

La capa semántica va **ACTIVADA por defecto** (default seguro de producción):
mejora la resolución folk (papa criolla↔*Solanum phureja*, broca, roya) frente
al puro BM25 / scorer literal — ver la tabla de recall más abajo. Modo extra en
la tabla de arriba: con `VITE_RAG_SEMANTIC=false` (o `0`/`off`/`no`) el retrieve
degrada a solo-BM25.

- **Activar (default):** no hacer nada. Ausente/vacío/cualquier valor distinto
  de los de apagado ⇒ ON. Ver `isSemanticEnabled()` en `ragRetriever.js`.
- **REVERTIR a BM25-only:** ponga `VITE_RAG_SEMANTIC=false` (también valen `0`,
  `off`, `no`) en el `.env` de build y reconstruya (`npm run build`). No requiere
  cambio de código ni deploy de lógica. Con OFF, `retrieveInternal` corta antes
  de `loadEmbeddings()` / `embedQuery()` → cero llamadas a Ollama.
- **Por qué es un kill-switch y no "siempre on":** la semántica embebe la query
  **EN VIVO** vía Ollama. El embed usa `keep_alive: '0s'` para que
  `snowflake-arctic-embed2` (4.6 GB) se descargue tras cada embed y NO co-resida
  sostenidamente con `granite3.3:8b` (~7.2 GB) en la M6000 (12 GiB) — evita el
  `cudaMalloc` OOM que tumba al agente (memoria
  `reference-num-gpu-0-no-fuerza-cpu-ollama-024`; `options.num_gpu:0` NO fuerza
  CPU en Ollama 0.24). El flag es el corte de emergencia si aún así hay presión
  de VRAM en prod.

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

## Reranker LLM-as-judge — medido 2026-07-22 (`scripts/bench-reranker.mjs`)

### Por qué

El bench de embedders mostró recall@1 bajo con recall@3 bastante más alto para
el mejor embedder — un patrón de "el documento correcto SÍ está en el top-K
pero no de primero", que es justo lo que arregla un reranker. Ollama 0.24 no
tiene `/api/rerank` (404 verificado) ni `bge-reranker` en su registro (404 en
dos variantes), así que se implementó como **LLM-as-judge**: el retriever trae
top-K (embedder `granite-embedding:278m`, elegido por tamaño — 0.56 GB — para
que quepa junto al agente `gemma4:e2b` ~8 GB en la M6000 de 12 GiB) y un modelo
chico reordena esos K candidatos. Código: `scripts/lib/reranker.mjs` (modos
`pointwise` y `listwise`). Script de medición: `scripts/bench-reranker.mjs`.

### ⚠️ Corrección importante al número de motivación de esta tarea

El número que motivó este trabajo (recall@3≈70% para el mejor embedder) **no
era correcto**. Al armar este bench aparecieron dos problemas reales, ya
corregidos:

1. **Bug de scoring en `bench-embedders.mjs`** (`rankMetrics()`): `if (pos <=
   2) r3++` y `if (pos <= 4) r5++` no comprobaban `pos >= 0` — `indexOf`
   devuelve `-1` cuando el slug esperado no existe en el corpus, y `-1 <= 2`
   es `true` en JS. Cualquier golden item cuyo `expected` no exista en el
   corpus contaba como acierto automático de recall@3/@5. Fix: agregado el
   guard `pos >= 0 &&` (MRR ya lo tenía; solo r3/r5 estaban rotos).
2. **15 de 44 golden items evaluables referencian slugs que ya no existen**
   como ficha propia: `solanum_tuberosum`, `lactuca_sativa`,
   `solanum_lycopersicum`, `fragaria_ananassa`, `daucus_carota`,
   `pisum_sativum` — el catálogo los reemplazó por variedades
   (`solanum_tuberosum_pastusa_suprema`, etc.) y `eval/rag-golden.json` nunca
   se actualizó. En el pipeline de producción esto probablemente NO es un
   problema real — `ragRetriever.js` tiene `collapseVarieties()` exactamente
   para este caso (ver "Cuellos conocidos" #1 arriba), y el bench
   `bench-rag-retrieve.mjs` (que sí corre el pipeline híbrido completo) ya
   resuelve `"que siembro en tierra fria" → solanum_tuberosum` correctamente.
   Pero **ni `bench-embedders.mjs` ni este bench de reranker corren
   `collapseVarieties()`** — ambos son pruebas de embedder/reranker aisladas
   sobre el corpus crudo (así lo pidió esta tarea, para reusar la metodología
   existente) — así que para estos 44 queries, esos 15 son un miss
   estructural que ningún embedder ni reranker puede resolver en este
   arnés de medición. **Recomendación de seguimiento**: repetir este
   experimento sobre la salida real de `retrieveInternal()` (post BM25 +
   semántico + `collapseVarieties()`), no sobre el ranking crudo de un solo
   embedder — ahí es donde un reranker tendría que demostrar valor real.

Con el fix, la tabla de embedders (mismo golden, corpus actual de 501 fichas)
queda:

| Embedder | recall@1 | recall@3 | recall@5 | MRR | lat. embed corpus | VRAM residente |
|---|---|---|---|---|---|---|
| nomic-embed-text (prod actual) | 18.2% | 38.6% | 40.9% | 0.2781 | 87ms | — |
| bge-m3 | 29.5% | 38.6% | 40.9% | 0.3489 | 343ms | ~1.3GB |
| snowflake-arctic-embed2 | 29.5% | 38.6% | 43.2% | 0.3618 | 366ms | ~1.3GB |
| **granite-embedding:278m** | **31.8%** | 36.4% | 40.9% | 0.3550 | **121ms** | **0.56GB** |

`granite-embedding:278m` no es solo "el que cabe" — tiene el recall@1 más alto
de los 4 Y es el más barato en VRAM y el más rápido embediendo. Su único
defecto real: `bert.context_length=512` tokens (verificado `ollama show`) —
329 de 501 fichas del corpus lo superan y quedan excluidas del ranking
(`corpus_embed_errors` en el JSON de salida). Truncar en vez de excluir se
probó primero y *empeoró* el recall@1 medido (31.8%→18.2%): los embeddings
truncados de esas 329 fichas largas terminaban ganándole el top-1 a la ficha
correcta en varias queries. Se mantuvo la exclusión (igual que
`bench-embedders.mjs`) por ser la opción más honesta, no la más completa.

### Resultado — recall@1 con y sin reranker (K=10, n=44, agente `gemma4:e2b` cargado)

| Reranker | recall@1 sin | recall@1 con | Δ | recall@3 con | latencia avg | latencia p95 | ¿Convive con el agente? |
|---|---|---|---|---|---|---|---|
| — (baseline) | 31.8% | — | — | 36.4% | — | — | — |
| **qwen2.5:3b** | 31.8% | **36.4%** | **+4.6pp** | 45.5% | 2303ms | 2838ms | **Sí** (2.31GB) |
| llama3.2:3b | 31.8% | 29.5% | **-2.3pp** | 34.1% | 3239ms | 3405ms | Sí (2.52GB) |
| gemma2:2b | — | **CRASH** | — | — | — | — | **No** — tumba el runner |
| phi4-mini | — | **CRASH** | — | — | — | — | **No** — tumba el runner |

Reproducido 3 veces (recall@1 idéntico en las 3 corridas para qwen2.5:3b y
llama3.2:3b tras fijar `format` JSON estructurado — ver abajo). Modo usado:
**listwise** (1 llamado con los K candidatos numerados, el modelo devuelve el
orden) — ganó por recall Y por latencia contra pointwise (1 llamado por
candidato) en el sub-experimento dedicado: con qwen2.5:3b sobre 15 queries,
listwise dio recall@1=20% en 2387ms promedio contra pointwise 13.3% en 4543ms.

**gemma2:2b y phi4-mini NO son un problema de configuración.** Se verificó
directo por curl, sin el script de por medio: ambos cargan y responden bien
en solitario (GPU vacía), y ambos truenan reproduciblemente
(`"llama runner process has terminated: signal arrived during cgo execution"`)
apenas se intentan cargar con `gemma4:e2b` ya residente — con VRAM de sobra
sobre el papel (agente 7.96GB + cualquiera de los dos ~2.5-2.9GB ≪ 12GB). No
es falta de memoria: es una incompatibilidad real de la M6000 (Maxwell sm_52)
+ Ollama 0.24 con esas dos arquitecturas bajo carga concurrente — qwen2.5:3b
y llama3.2:3b cargan sin problema en las mismas condiciones. El agente
`gemma4:e2b` sobrevive el crash intacto (confirmado vía `/api/ps` después);
solo el runner del modelo nuevo muere.

**Ajuste que importó**: sin fijar `num_ctx` explícito (2048, alcanza de sobra
para K=10 pasajes truncados), Ollama reserva el `num_ctx` por defecto del
modelo para el KV-cache — eso infló a `gemma2:2b` de ~2.3GB a 3.9GB
residentes y le hizo desalojar al agente en una corrida temprana. Con
`num_ctx:2048` fijo, todos los candidatos que sí cargan quedan bajo 2.6GB.

### Veredicto

**+4.6 puntos de recall@1 por +2.3 segundos de latencia por consulta no
justifica claramente el costo para una app de voz.** El propio criterio de
esta tarea era "un reranker que suba 20 puntos pero agregue 5 segundos puede
no servir" — acá se agregan ~2.3s (bajo el límite) pero se ganan solo 4.6pp
(muy por debajo del techo de ~14pp que separaba recall@1 de coverage@10,
45.5%). De los 4 candidatos que caben en presupuesto de VRAM real, 2 truenan
el runner y el único que mejora algo (qwen2.5:3b) lo hace de forma marginal;
el otro (llama3.2:3b) empeora. **No se recomienda shippear este reranker tal
como está.** Caminos con más chance antes de reintentar: (1) medir sobre la
salida de `retrieveInternal()` real (post-`collapseVarieties`), no sobre el
embedder aislado — el "problema de orden" que motivó esto puede ser bastante
más chico de lo que parecía; (2) si aun así hay hueco, probar el candidato
con más headroom no probado por incompatibilidad de GPU (`gemma2:2b`,
`phi4-mini`) en un GPU más nuevo, o esperar soporte de reranking nativo en
una versión más reciente de Ollama.
