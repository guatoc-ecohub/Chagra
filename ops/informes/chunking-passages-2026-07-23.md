# Informe — Chunking passage-level MEDIDO sobre el RAG de Chagra

**Fecha:** 2026-07-23 · **Autor:** carril RAG/infra · **Rama:** `exp/rag-chunking-passages`
**Modelo embedder:** `nomic-embed-text` (768d), el mismo que prod usa hoy en `embedQuery()` y en `build-rag-embeddings.mjs`.
**Golden set:** `eval/rag-golden.json` (50 queries campesinas, 1 especie esperada por query).
**Infra:** embeddings servidos por Ollama en alpha (`http://alpha.local:11434`). No se tocó `public/rag-embeddings.json` de prod ni el modelo servido.

---

## 0. Veredicto — NO vale la pena (el chunking fino DEGRADA el recall)

La hipótesis del experimento era: *"hoy el corpus tiene UN vector por especie (chunking grueso);
ese es el cuello del retrieval semántico; embeber cada passage por separado debería subir el
recall."* **La medición la refuta.** Bajo condiciones idénticas (mismo modelo, mismas 50 queries,
misma regla de match), el chunking passage-level **empeora** el retrieve semántico, no lo mejora:

| arm (retrieval puro-semántico, cosine) | recall@1 | recall@3 | recall@5 | MRR |
|---|---|---|---|---|
| **A — doc-level PROD** (`extractPassageText`, 1 vec/especie) — *baseline* | **40%** | **56%** | **58%** | **0.4833** |
| B — doc-level flatten (concat de `flattenDoc`, 1 vec/especie) | 10% | 18% | 30% | 0.1861 |
| C — passage-level **max-pool** (`flattenDoc`, N vec/especie) | 12% | 32% | 42% | 0.2646 |
| D — passage-level mean-pool | 0% | 0% | 0% | 0.0261 |
| E — passage-level top3-mean | 6% | 20% | 32% | 0.1664 |

**Delta del MEJOR passage-level (max-pool) vs doc-level PROD: recall@1 −28 pp · recall@3 −24 pp ·
recall@5 −16 pp · MRR −0.2187.** Ningún esquema de pooling (max / mean / top3) alcanza al
doc-level. El passage-level max-pool no **gana** ni una sola query en top-5 y **pierde 8**.

**Recomendación:** NO cablear passage-level a producción. El techo del RAG **no** está en la
granularidad del chunk (como se conjeturó en el informe del reranker), sino en la **selección de
contenido**: la ficha doc-level de prod gana porque `extractPassageText` embebe un **resumen
curado** (valor pedagógico + hitos + modos de fallo + lección), mientras que `flattenDoc` indexa
**todo** —incluyendo boilerplate genérico compartido entre cientos de especies— y ese ruido
ahoga la señal, tanto agregado en un vector (arm B) como troceado en passages (arm C).

Esto encadena con la memoria `ci-green-not-real-value` y con el informe hermano
`reranker-medido-2026-07-23.md`: la técnica "obviamente buena" de la literatura (chunking fino)
**sobre este corpus mide negativo**. Medir antes de cablear evitó re-indexar prod a un esquema que
habría bajado el recall@5 de 58% a 42%.

---

## 1. Qué se construyó (sin tocar prod)

1. **Respaldo** de `public/rag-embeddings.json` (corpus doc-level de prod, 501 vectores) →
   `data/rag-chunking-exp/rag-embeddings.doc-level.backup.json`.
2. **Corpus passage-level** (`scripts/rag-chunking-build-passages.mjs`): usa el `flattenDoc()`
   **real** de `src/services/ragRetriever.js` (importado vía el loader de `bench-rag-retrieve.mjs`,
   sin drift) para sacar los passages de cada ficha de `public/cycle-content/*.json` y embebe
   **cada passage** con nomic. Salida `data/rag-chunking-exp/rag-embeddings-passages.json`.
3. **Arm de control docflat** (mismo script): 1 vector por especie con el texto **concatenado** de
   `flattenDoc` (mismo contenido que los passages, pero pooled a un solo vector). Aísla el efecto
   *"más contenido"* del efecto *"chunking fino"*.
4. **Bench** (`scripts/rag-chunking-bench.mjs`): retrieval puro-semántico de los 5 arms sobre las
   50 queries, con max-pooling por especie y colapso variedad→base.

Artefactos grandes en `data/rag-chunking-exp/` (gitignored); solo `results.json` se commitea.

---

## 2. Dimensionado del corpus passage-level

`scripts/rag-chunking-count.mjs` (importa el `flattenDoc` real):

| métrica | valor |
|---|---|
| Fichas en el manifest | 501 |
| **Passages totales** (`flattenDoc`) | **20.201** |
| **Textos ÚNICOS de passage** | **3.909** |
| Passages por ficha (min / mediana / media / p95 / max) | 22 / 39 / 40,3 / 49 / 153 |
| Passages truncados a 5.000 chars (ver §5) | 22 / 20.201 (0,1%) |

**Hallazgo de dimensionado #1 — el 80% de los passages son boilerplate repetido.** De 20.201
passages solo hay **3.909 textos únicos**: labels de hitos ("germinación", "cosecha"), campos
contextuales ("clima templado", "altitud 1800"), nombres de companions y frases de manejo se
**repiten idénticos** entre cientos de especies. Por eso el build embebe solo los 3.909 únicos y
reusa el vector (5× menos llamadas a Ollama). Esto ya anticipa el problema de recall (§4): la
mayoría de los "passages" no discriminan especie.

**Hallazgo de dimensionado #2 — es el umbral donde pgvector empezaría a tener sentido.** 20.201
vectores materializados como `{slug,key,vector[768]}` pesan **~140 MB** en JSON (deduplicados, con
índice de refs, ~61 MB). El retriever JS actual los maneja en memoria, pero cada query debe correr
**3.909 cosines** (por texto único) + max-pool sobre 20.201 refs. A este tamaño, un índice ANN en
Postgres/pgvector (que la infra ya tiene: `postgres-farm`, PG 15.17) sería la evolución natural
**si** el passage-level hubiera ganado recall. No ganó, así que la migración a pgvector **no se
justifica por este experimento** (sí podría por otros: catálogo Pro, multi-tenant).

---

## 3. Metodología (por qué la comparación es limpia)

- **Puro semántico**: se mide solo cosine (sin BM25), para aislar el efecto del chunking sobre la
  capa que el experimento cuestiona. Los 5 arms comparten modelo, queries y regla de match; **lo
  único que cambia es el chunking**, así que el delta es atribuible a él.
- **Query embebida igual que prod**: prompt crudo, sin prefijos `search_query:`/`search_document:`
  (idéntico a `embedQuery()` y a `build-rag-embeddings.mjs`). Cacheada en
  `query-embeddings.json` para reproducibilidad.
- **Colapso variedad→base**: cada arm colapsa `solanum_tuberosum_pastusa_suprema` →
  `solanum_tuberosum` tomando el max score por base (igual que `collapseVarieties` en prod), y el
  `expected` del golden es especie base. Match: `base === expected || base.startsWith(expected+'_')`.
- **Max-pool por especie** (lo que pide el brief): score de una especie = MÁXIMO cosine entre sus
  passages. Se añadieron mean-pool y top3-mean para verificar que el resultado negativo no fuera un
  artefacto del max-pool (no lo es — todos pierden).
- **Techo del set**: 44/50 = 88%. Seis queries (`G39 biopreparado`, `G44 associacion`,
  `G46 mito_lunar`, `G47 suelo_acido`, `G48 agua_calidad`, `G49 erosion`) son conceptos
  cross-especie sin slug; ningún arm puede acertarlas → penalizan a todos por igual.
- **Validación del harness**: el arm A (doc-level PROD) reproduce **recall@1 = 40% (20/50) exacto**,
  el mismo headline que el baseline de prod. Si el harness estuviera roto/deflactando, el arm A no
  daría 40%. (Los @3/@5 de este bench —56/58%— son más altos que las cifras híbridas citadas en
  otros informes porque acá es puro-semántico + match por base colapsada; el número invariante y
  decisivo es el **delta controlado entre arms**, no el valor absoluto.)

---

## 4. Por qué el chunking fino DEGRADA (causa raíz, con evidencia)

**El max-pool premia el ruido genérico y sufre sesgo de longitud.** El score de una especie es el
máximo cosine entre sus passages; una especie con 118–153 passages tiene 118–153 "boletos" para un
cosine espuriamente alto contra la query, y la mayoría de esos passages son boilerplate genérico
(`propagation.notas`, campos contextuales) que se parece semánticamente a muchas queries sin
identificar especie.

**Caso G06 — "como abonar el maiz"** (esperado `zea_mays`):

| arm | rank de zea_mays |
|---|---|
| A doc-level PROD | **4** (acierta @5) |
| C passage-level max-pool | **165** (falla) |

Top-5 especies que el passage-level max-pool pone por encima del maíz para esa query:

```
1. amaranthus_caudatus     sim=0.674  via key=propagation.notas
2. phaseolus_vulgaris_nuna  sim=0.666  via key=propagation.notas
3. practica_cogollero_maiz  sim=0.662  via key=species_slug
4. practica_bocashi         sim=0.643  via key=failure_modes[0].mode
5. practica_biol            sim=0.642  via key=milestones[2].label
...
165. zea_mays               sim=0.590  via key=propagation.notas
```

El passage ganador de casi todas es `propagation.notas` —una nota de propagación genérica que
menciona nutrición/abono y existe casi idéntica en decenas de fichas—. El maíz no tiene un passage
que supere a esos genéricos, así que cae al puesto 165. En cambio, el vector **doc-level** del maíz
(que concatena su valor pedagógico + hitos + modos de fallo + lección en **un texto coherente**)
captura el "gestalt" de *cultivar maíz, incluida su fertilización* y rankea maíz en el puesto 4.

**El mean-pool es catastrófico (0% recall)** justamente por lo mismo: promediar ~40 passages, la
mayoría boilerplate corto, produce un score casi idéntico entre especies → cero poder
discriminante → ranking ~aleatorio.

**El arm B (docflat) lo confirma desde el otro lado.** Embeber TODO el contenido de `flattenDoc`
concatenado en **un** vector (misma granularidad gruesa que prod, pero más contenido) también se
desploma a 10/18/30. Es decir: **el problema no es la granularidad, es el contenido.**
`extractPassageText` gana porque es un **subconjunto curado** de campos pedagógicos;
`flattenDoc` (todo lo indexable, incluidos slugs, taxonomía, números contextuales, boilerplate)
mete ruido que ahoga la señal, se trocee (C) o no (B).

---

## 5. Notas de implementación / gotchas

- **Contexto de nomic (HTTP 500 "input length exceeds the context length").** nomic-embed-text en
  este Ollama tiene ctx ~2.048 tokens y **rechaza** (no trunca) textos largos; `num_ctx` NO lo
  extiende (verificado: falla >~6.000 chars de prosa densa aun con `num_ctx:8192`). Se truncan los
  textos a 5.000 chars antes de embeber —régimen de contexto por defecto, el mismo con el que se
  construyó el corpus doc-level de prod—. Afecta a **22 de 3.909** passages únicos (0,6%) y a
  algunos concat de docflat; impacto en el veredicto: nulo (el passage-level pierde por 16–28 pp,
  no por un margen que 22 truncados moverían).
- **`flattenDoc` importado, no copiado.** El build y el contador importan el `flattenDoc` real de
  `ragRetriever.js` vía `scripts/bench-rag-retrieve.loader.mjs` (stubea authService/tenantContext/
  catalogDB y neutraliza `import.meta.env`), así que no hay drift con producción.
- **Dedup de embeddings.** 20.201 passages → 3.909 embeds reales. Sin dedup, el build sería 5× más
  lento y el asset ~5× más grande.

---

## 6. Si en el futuro se quisiera pasar passage-level a prod (NO ahora)

Documentado por completitud; **hoy no se cablea** porque no sube el recall. El camino sería:

1. **Build**: `build-rag-embeddings.mjs` generaría un asset passage-level (no `{slug→vec}` sino
   `{slug,key→vec}`), reusando `flattenDoc` + dedup por texto. Tamaño ~60–140 MB → pasa el umbral
   donde conviene **pgvector** (postgres-farm ya está) en vez de JSON en memoria.
2. **Retriever**: `scoreSemanticDocs()` cambiaría de `embeddings[doc.species]` (1 vector) a
   max-pool sobre los passages de la especie, y `combineResults` fusionaría con BM25 igual que hoy.
3. **Requisito previo NO cumplido**: primero habría que **arreglar la selección de contenido** (que
   `flattenDoc` no meta boilerplate/IDs/números como passages semánticos) — porque el experimento
   muestra que passages sobre `flattenDoc` crudo degradan. Sin ese filtro, no hay caso.

### Lever real sugerido por los datos (fuera del alcance de este experimento)
El delta A vs B/C dice que la palanca no es el tamaño del chunk sino **qué se embebe**. Hipótesis a
medir en un próximo experimento: (a) enriquecer `extractPassageText` con más campos pedagógicos
curados (no todos), o (b) passage-level pero **filtrando** los passages genéricos/contextuales
(indexar solo campos discriminantes: valor pedagógico, plagas, manejo, lección — no
`propagation.notas` ni contextuales numéricos). Ambas atacan el ruido, que es la causa raíz medida.

---

## 7. Reproducir

```bash
# 1. corpus passage-level + docflat (embebe ~4.410 textos en alpha, ~3 min)
OLLAMA_URL=http://alpha.local:11434 node scripts/rag-chunking-build-passages.mjs
# 2. bench de los 5 arms (queries cacheadas tras la 1ª corrida)
OLLAMA_URL=http://alpha.local:11434 node scripts/rag-chunking-bench.mjs
# (opcional) dimensionar el corpus
node scripts/rag-chunking-count.mjs
```

Resultados crudos: `data/rag-chunking-exp/results.json`.
