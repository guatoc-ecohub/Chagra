# Informe — Cross-encoder reranker MEDIDO sobre el RAG de Chagra

**Fecha:** 2026-07-23 · **Autor:** carril RAG/infra · **Rama:** `feat/rag-reranker-medido`
**DR de referencia:** `Chagra-strategy/ops/DR-RAG-RERANKER-2026-07-10.md`
**Modelo:** `BAAI/bge-reranker-v2-m3` (cross-encoder 568M, Apache-2.0) servido con TEI.
**Golden set:** `eval/rag-golden.json` (50 queries campesinas, 1 slug esperado por query).

---

## 0. Veredicto — NO vale la pena (hoy DEGRADA)

Montamos el reranker de verdad, lo medimos sobre el golden set, y **el cross-encoder EMPEORA
el retrieve**, no lo mejora:

| modo | recall@1 | recall@3 | recall@5 | MRR |
|---|---|---|---|---|
| BM25-only | 28.0% | 34.0% | 34.0% | 0.3067 |
| **Hybrid (nomic)** — baseline | **30.0%** | **42.0%** | **44.0%** | **0.3507** |
| **Hybrid + rerank (bge-v2-m3)** | **14.0%** | **26.0%** | **36.0%** | **0.2210** |

**Delta híbrido → híbrido+rerank: recall@1 −16 pp · recall@5 −8 pp · MRR −0.1297.**

Gate del DR §3.4 (recall@1 ≥ +8 pp **Y** MRR ≥ +0.05 para encender el flag en prod): **NO PASA**
— y no por poco: pasa lo contrario, el reranker destruye la señal del híbrido.

**Recomendación:** NO cablear el reranker a producción. El flag `VITE_RAG_RERANK` queda
documentado (§5) pero **OFF**, y el container de alpha se puede tumbar. El techo de calidad del
RAG **no** está en re-ordenar el top-k; está en la **granularidad del retrieve** (una razón
concreta, medida, en §4). Ese es el lever real, no el reranker.

Esto es exactamente el caso que la memoria `ci-green-not-real-value` anticipa: el reranker es
"obviamente bueno" en la literatura, pero **sobre este corpus y este pipeline la medición dice
que no**. Medir antes de encender salvó un flag que habría bajado el recall a la mitad.

---

## 1. Qué se montó en alpha

- **Servidor:** TEI (`ghcr.io/huggingface/text-embeddings-inference:cpu-latest`) en podman,
  container `chagra-reranker-tei`, escuchando en `127.0.0.1:7997` (loopback), backend **Candle CPU**.
- **Modelo:** `BAAI/bge-reranker-v2-m3` (safetensors, 2 271 071 852 bytes) cargado desde un
  directorio local (`~/tei-models/bge-reranker-v2-m3` en alpha) con `HF_HUB_OFFLINE=1`.
- **Endpoint `/rerank` verificado en vivo** (query "gusano del cafe broca" contra 3 textos):
  devuelve `[{index,score}]` ordenado y **discrimina bien** cuando le das el texto correcto
  (broca 0.908 · roya 0.132 · maíz 0.00002). El problema NO es el modelo (ver §4).

### 1.1 Bloqueador de GPU (documentar, no se pudo servir en GPU)

La GPU actual de alpha es una **Quadro M6000 (12 GB, compute capability 5.2, Maxwell)**. Las
imágenes GPU de TEI requieren **sm_75+** (Turing/Ampere/Ada/Hopper) → **la M6000 no arranca en
GPU con TEI**. El DR asumía la RTX 3090 (Ampere sm_86), que sí está soportada, pero hoy alpha
está con la M6000 (la 3090 rota entre entrenamiento y servicio, ver memoria
`gpu-ampere-vs-m3000`).

**Impacto en la medición: NINGUNO.** El recall de un cross-encoder es **determinístico** (mismos
pesos → mismos scores) en CPU o GPU. Los números de recall de arriba son reales y definitivos.
Lo único que la CPU NO representa es la **latencia** (§3.3).

**Para producción en GPU** (si algún día valiera la pena, que hoy no): o esperar la ventana de la
3090 (TEI, plan A del DR), o el plan B `llama.cpp --rerank` con GGUF, que sí compila para Maxwell
en CUDA 12. Ninguno urge dado el veredicto.

### 1.2 Gotcha de descarga (HF Xet colgaba)

El descargador `hf-hub` de TEI usa el protocolo **Xet** y **se colgaba en el paso de finalización**
sobre el enlace off-grid de alpha (el `.sync.part` llegaba a tamaño completo pero nunca se
renombraba al blob; CPU en idle, mtime congelado). `HF_HUB_DISABLE_XET=1` / `HF_XET_DISABLE=1`
**no** lo evitaron (reconstruía desde una caché Xet local). **Solución que sí funcionó:** bajar
los archivos con `curl` clásico (con reanudación `-C -` en loop hasta el tamaño exacto) a un
directorio local y arrancar TEI con `--model-id /model` + `HF_HUB_OFFLINE=1`. Queda anotado para
la próxima vez que se baje un modelo grande a alpha.

---

## 2. Cómo se midió (bench extendido)

Se extendió `scripts/bench-rag-retrieve.mjs` con un **tercer modo `hybrid+rerank`** (los dos
existentes, BM25 y híbrido, quedan idénticos):

1. Retrieve híbrido con pool ancho: `retrieve(query, POOL_K=20)` → 20 resultados **colapsados por
   especie** (mismo `collapseVarieties` de producción).
2. `POST RERANK_URL/rerank` con `{ query, texts: pool.map(p=>p.text), raw_scores:false, truncate:true }`.
3. Reordenar el pool por el score del cross-encoder y `slice(TOP_K=5)`.
4. Recall@1/@3/@5 + MRR sobre el mismo golden set, comparado a nivel de especie
   (`matchesSpecies`, igual que los otros modos).

Detalles de rigor del bench:
- **Fail-open:** si TEI no responde 2xx/timeout, se conserva el orden híbrido (fallbacks contados).
  En esta corrida: **0/50 fallbacks** — TEI respondió todo, el degrade es real, no un artefacto de red.
- **Métrica de aislamiento (`poolMetrics`):** las **mismas** 50 queries, el **mismo** pool de 20,
  pero en **orden híbrido** (sin rerank). Aísla el aporte NETO del cross-encoder sobre un conjunto
  de candidatos idéntico → controla por el efecto de ampliar el pool.
- **`coverage@20`:** ¿está el esperado dentro del pool de 20? Es el techo que el reranker puede
  alcanzar (no puede inventar cobertura que el retriever no trajo).
- La 3ra pasada solo corre si `RERANK_URL/health` responde 200; si no, se salta con aviso (CI sin
  TEI queda verde). `--no-rerank` la fuerza a saltar.
- Baseline reproducido **exacto** contra el número conocido (30/42/44/.351), lo que confirma que
  la extensión no tocó el camino híbrido.

**Cómo correrlo:**
```
# túneles a alpha (ollama nomic + TEI) o correr en alpha directo:
OLLAMA_URL=http://localhost:11500 RERANK_URL=http://localhost:7997 \
  node scripts/bench-rag-retrieve.mjs --history
```

---

## 3. Números completos

### 3.1 Aislamiento — el reranker degrada incluso con el pool fijo

| sobre el MISMO pool de 20 | recall@1 | recall@5 | MRR |
|---|---|---|---|
| orden híbrido (sin rerank) | 30.0% | 42.0% | 0.3440 |
| orden reranqueado | 14.0% | 36.0% | 0.2210 |

Con el conjunto de candidatos idéntico, reordenar con el cross-encoder baja MRR de .344 a .221.
El daño es del reranker, no de haber ampliado el pool.

### 3.2 Anatomía del daño (por query)

- El híbrido tenía el esperado en **#1 en 15/50** queries.
- El reranker **lo bajó de #1 en 11 de esas 15** (73%). Solo mantuvo 4 en #1.
- El reranker **promovió** un #1 nuevo (que el híbrido no tenía arriba) en solo **3** queries.
- En **5** queries el esperado estaba en el pool pero el reranker lo empujó **fuera del top-5**.
- Neto recall@1: 15/50 (30%) → 7/50 (14%). ✔

Demotions concretas (`hybrid#1 → rerank#N`): G01, G09, G18, G20, G21, G24, G25, G30, G35, G41,
G45. **Nota amarga:** G21 ("broca en el café") era el caso que el DR §3.3 predecía como *cancha
del reranker* — y es una de las que MÁS se dañó (de #1 a fuera del top-5).

### 3.3 Latencia (CPU — NO representa producción)

Rerank de 20 pasajes en CPU (Candle fp32, ~5 núcleos): **p50 17.0 s · p95 41.6 s · avg 18.9 s por
query**. Esto es CPU y es irrelevante como número de producción (el DR estima ~20-50 ms en GPU
Ampere). No se reporta como métrica de mérito porque la latencia no cambia el veredicto: aunque
fuera instantánea, **bajar el recall 16 pp no se compra con velocidad**.

---

## 4. Por qué degrada (causa raíz, con traza en vivo)

El endpoint funciona (§1). El bug tampoco: el mapeo `index→score` es correcto y verificado. El
problema es **de granularidad del pipeline**, y lo diagnostica el propio DR §2.1 sin haberlo
medido: *"el semántico ordena ESPECIES, no passages"*.

Traza real, query **"gusano del cafe"** (esperado `coffea_arabica`), pool de 20:

```
HYBRID #1  coffea_arabica     rerank=3.05e-3   text="Café caturra / Castillo / Cenicafé 1"
...
RERANK #1  smallanthus_...    rerank=2.75e-2   text="El yacón (Smallanthus sonchifolius...)"
RERANK #2  foeniculum_vulgare rerank=1.62e-2   text="### Antagonistas (no asociar)..."
RERANK #5  coffea_arabica     rerank=3.05e-3   text="Café caturra / Castillo / Cenicafé 1"
```

Lo que pasa:
1. El híbrido acierta y pone `coffea_arabica` en #1, pero el **texto representativo** de esa
   especie (el pasaje que `collapseVarieties` conserva, = el de mayor score híbrido) es el
   fragmento **"Café caturra / Castillo / Cenicafé 1"** — una lista de variedades, **NO** el
   pasaje sobre la broca/gusano.
2. El cross-encoder lee `query × "Café caturra / Castillo / Cenicafé 1"` y — **correctamente** —
   juzga que ese fragmento no habla de gusanos → score 0.003.
3. Como **nunca ve** el pasaje de plagas del café (no está en el pool a nivel especie), no tiene
   forma de saber que `coffea_arabica` es la respuesta. Flota especies con introducciones más
   "descriptivas" (yacón, hinojo) que se parecen marginalmente más a una respuesta, todas con
   **scores ínfimos** (máximo 0.027: el reranker no encuentra NADA realmente relevante) → reordena
   ruido y entierra la respuesta correcta.

En resumen: el reranker recibe **un solo pasaje por especie, elegido por OTRO scorer**, y ese
pasaje suele ser un fragmento léxico corto, no el contenido pertinente. Alimentado con el texto
equivocado, hace lo correcto (lo descarta) y por eso rompe el ranking. **El cuello de botella es
el retrieve a nivel especie con embeddings gruesos, no el orden del top-k.**

### 4.1 ¿Y rerank-antes-de-colapsar (contrato del DR §2.3)?

El DR propone reranquear el pool **de pasajes** ancho **antes** de `collapseVarieties` (para que
el reranker vea TODOS los pasajes de una especie y elija el mejor). Esa variante **no se midió**
(exige exponer `retrieveInternal` y ~2× el costo CPU). Pero la evidencia sugiere que tampoco es la
bala de plata: para que ayude, el **pasaje correcto** (el de la broca) tiene que estar en el pool,
y hoy para "gusano del cafe" el híbrido trae a `coffea_arabica` por un fragmento de variedades, no
por su pasaje de plagas. El arreglo de fondo es **upstream**: embeddings/chunking a nivel pasaje
(no un vector por especie) + re-indexar. Un reranker recién tiene sentido **después** de eso.

---

## 5. Contrato de integración (documentado — NO cablear hoy)

Cómo se cablearía en `src/services/ragRetriever.js` (espejo exacto de `embedQuery()`), **dejado
como registro; con el veredicto actual el flag va OFF y no se construye el camino de prod todavía:**

```js
// Kill-switch, mismo patrón que isSemanticEnabled(). Default OFF hasta bench verde
// (que hoy NO existe: el bench dice que degrada).
export function isRerankEnabled() {
  const meta = /** @type {any} */ (import.meta);
  const raw = meta?.env?.VITE_RAG_RERANK;
  return raw === true || (typeof raw === 'string' && ['1','true','on','yes'].includes(raw.trim().toLowerCase()));
}

// Nuevo, análogo a embedQuery(): habla con TEI vía nginx /api/rerank/. Fail-open.
async function rerankPassages(query, passages) {
  try {
    const texts = passages.map((p) => p.text);
    const res = await fetchWithAuthRetry('/api/rerank/rerank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, texts, raw_scores: false, truncate: true }),
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
    });
    if (!res.ok) return null;                       // fail-open → conserva fusión
    const scored = await res.json();                // [{index, score}]
    if (!Array.isArray(scored)) return null;
    const byIndex = new Map(scored.map((s) => [s.index, s.score]));
    return passages
      .map((p, i) => ({ ...p, score: byIndex.get(i) ?? p.score }))
      .sort((a, b) => b.score - a.score);
  } catch (_) {
    return null;                                    // fail-open
  }
}

// En retrieve(), pool ancho ANTES de collapseVarieties (contrato DR §2.3):
let pool = await retrieveInternal(query, Math.max(topK * 6, 24));
if (isRerankEnabled()) {
  const reranked = await rerankPassages(query, pool);
  if (reranked) pool = reranked;                    // fail-open: null ⇒ deja la fusión
}
results = collapseVarieties(pool).slice(0, topK);
```

Más:
- **nginx:** ruta `/api/rerank/` → `127.0.0.1:7997` con el mismo lockdown CORS + token que
  `/api/ollama/` y `/api/mcp/agro/`.
- **Build:** `rag-embeddings.json` NO cambia (el reranker no precomputa nada); solo se añade una
  llamada runtime.
- El asset y la lógica actuales quedan **intactos** — este informe no toca producción.

---

## 6. Qué se entrega y qué sigue

**Entregado:**
- Reranker `bge-reranker-v2-m3` montado y verificado en alpha (TEI, `127.0.0.1:7997`).
- `scripts/bench-rag-retrieve.mjs` extendido con el modo `hybrid+rerank` + métrica de aislamiento
  + cobertura + gate del DR §3.4 (commiteado).
- Medición reproducible sobre el golden set con el veredicto de arriba.

**Recomendación (en orden):**
1. **NO** encender `VITE_RAG_RERANK`. Dejarlo OFF/no-construido.
2. Tumbar el container de alpha si se necesita la RAM: `sudo podman rm -f chagra-reranker-tei`
   (queda el modelo en `~/tei-models/` por si se retoma).
3. El lever real de calidad del RAG es **el retrieve a nivel pasaje**: re-chunkear + embeddings por
   pasaje (no un vector por especie) y re-indexar `rag-embeddings.json`. Recién ahí un reranker
   puede aportar — y habría que **re-medir** con este mismo bench.
4. Si en el futuro se retoma en GPU: esperar la 3090 (TEI) o `llama.cpp --rerank` (Maxwell), pero
   solo **después** del punto 3 y con un bench verde de por medio.
