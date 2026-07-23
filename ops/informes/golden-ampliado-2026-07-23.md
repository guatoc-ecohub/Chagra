# Golden set de retrieval ampliado + recall REAL del RAG

**Fecha:** 2026-07-23
**Rama:** `eval/golden-set-ampliado` (desde `dev` fresco)
**Autor:** carril de evaluación RAG
**Artefacto:** `eval/rag-golden-ampliado.json` (117 queries) · bench: `scripts/bench-rag-retrieve.mjs` con `GOLDEN_SET=`

---

## 1. Por qué

Hoy el recall del RAG se mide con `eval/rag-golden.json`: **50 queries**. A ese tamaño el
intervalo de confianza al 95 % es de **±13,6 pp** sobre recall@1 — demasiado ruidoso para
decidir nada. Este informe construye un golden set más grande a partir de los **1500 pares
QA** generados por la flota (ramas `glm/191.*`) y vuelve a medir el recall con más señal.

> **Advertencia respetada:** los 1500 pares arrastran errores taxonómicos del LLM que los
> generó (ejemplo real: «Papa criolla (*Solanum tuberosum*)» — es *Solanum phureja*). Por eso
> **solo se usó la query** (`user.content`) y el **nombre común que la query menciona**, nunca
> el nombre científico de la respuesta del asistente.

---

## 2. Construcción del golden set (query → slug)

**Fuente:** 1500 pares extraídos con `git show` de las tres ramas
(`glm/191.1/2/3` → `dataset-v1-lote{1,2,3}.jsonl`, 500 c/u).

**Mapeo nombre-común → slug**, dos niveles, contra el corpus real
`public/cycle-content/*.json` (501 fichas, campo `common_names`):

1. **Nivel 1 — nombre común completo del corpus** (anclado al catálogo, cero adivinación):
   se normaliza (minúsculas, sin tildes, sin puntuación), se parte por `/` los sinónimos
   («Cebollín / Cebolla larga») y se busca la frase completa como secuencia de palabras
   dentro de la query. Gana la coincidencia **más larga** (la más específica). Así
   «Papa criolla» → `solanum_phureja`, «San Marzano» → variante de tomate, etc. Se matchea
   la frase completa a propósito: evita falsos positivos de cabezas de nombre como
   «control» / «manejo» / «flor» que aparecen en las fichas de práctica.
2. **Nivel 2 — mapa canónico de genéricos** (24 entradas curadas y verificadas retrievables):
   `papa→solanum_tuberosum`, `frijol→phaseolus_vulgaris`, `maiz→zea_mays`,
   `cafe→coffea_arabica`, `platano→musa_paradisiaca`, `tomate→solanum_lycopersicum`,
   `cebolla→allium_cepa`, `cacao→theobroma_cacao`, etc. Resuelve la query cuando menciona el
   cultivo de forma genérica y no calza ninguna frase específica del Nivel 1. Las cabezas
   genéricas son ambiguas en el catálogo (`papa`→3 slugs, `frijol`→4, `tomate`→3); el canónico
   fija la elección alineada con las convenciones del golden de 50.

**Filtro de especie:** se descartan los slugs **no-especie** — `practica_*` (bocashi, biol,
supermagro, caldo bordelés, broca, roya, cogollero…) y `conocimiento_general_agroecologico`
(10 docs). El task pide mapear **la especie**; el golden de 50 sigue la misma convención
(mapea «gusano cogollero» → `zea_mays`, no a la ficha de práctica).

**Deduplicación:** los 1500 pares contienen solo **476 queries distintas** (68 % son
duplicados exactos). Se deduplicó por query normalizada quedándose con la primera aparición.

### Embudo 1500 → golden

| Etapa | Conteo |
|---|---|
| Pares QA totales | 1500 |
| Mapean a una especie retrievable | **506** |
| Descartados (sin especie mapeable) | **994** |
| — tras dedup de query | |
| Queries distintas en el golden | **117** |
| Especies distintas cubiertas | **15** |

### Por qué se descartan 994

Categorización aproximada (por palabras clave) de los 994 pares descartados:

| % | Categoría | Ejemplo |
|---|---|---|
| 26,3 % | Técnica / biopreparado | «¿Cómo preparo Bocashi?», «cómo hago supermagro» |
| 20,7 % | Otro (plaga sin cultivo, misceláneo) | «¿Qué enemigos naturales tiene Mosca blanca?» |
| 16,9 % | Concepto agroecológico | «¿Cómo monitoreo trofobiosis?», «materia orgánica» |
| 10,0 % | Definición («qué es / significa») | «Dígame: qué es un bate» |
| 9,7 % | Entrevista / personal | «¿Ha pasado dificultades económicas?», «Doña Nora…» |
| 8,1 % | Zona / región | «…en zona Pacífico» |
| 6,5 % | **Especie fuera del catálogo** | algodón, palma, arroz, caña, papaya (no hay ficha) |
| 1,8 % | Calendario lunar genérico | «¿Funciona calendar lunar para todos cultivos?» |

El descarte es correcto: son mayoritariamente queries **no-especie** (técnicas, conceptos,
entrevistas, zonas) que el mapeo query→especie no debe forzar. Solo ~6,5 % son especies
reales sin ficha en el catálogo (algodón, palma, arroz, caña…).

### Calidad del mapeo — auditoría manual (muestra)

Correcto: «Sigatoka amarilla del plátano»→`musa_paradisiaca`, «purín de ortiga»→`urtica_dioica`,
«Café arábigo»→`coffea_arabica`, «Papa criolla»→`solanum_phureja` (la corrección taxonómica
funciona: la frase específica del Nivel 1 le gana al genérico `papa`→tuberosum del Nivel 2).

Imprecisiones conocidas (documentadas, marginales):
- **«Cebolla de rama»** cae al canónico `allium_cepa`; estrictamente es `allium_fistulosum`
  (cebolla larga). Ambas son *Allium* y ambas retrievables → impacto bajo.
- **«Fríjol cabecita negra»** cae al canónico `frijol→phaseolus_vulgaris`; taxonómicamente es
  caupí (*Vigna unguiculata*). Es exactamente el tipo de error que el task advierte; se prefirió
  el genérico honesto antes que inventar. Son 2–3 queries.

---

## 3. Recall REAL — N grande vs los 50

Bench: `bench-rag-retrieve.mjs`, modo **Hybrid (nomic)**, `OLLAMA_URL=http://${OLLAMA_HOST}:11434`
(nomic-embed-text), corpus e índice de embeddings actuales de `dev` (`public/rag-embeddings.json`,
501 docs → 1648 pasajes). Sin reranker (TEI no levantado en stg → se omite, como en CI).

| Vista | recall@1 | recall@3 | recall@5 | MRR | N | 95 % CI (@1) |
|---|---|---|---|---|---|---|
| **50-golden (tal cual)** | 40,0 % | 44,0 % | 46,0 % | 0,422 | 50 | ±13,6 pp |
| 50-golden solo-especies | 45,5 % | 50,0 % | 52,3 % | 0,479 | 44 | ±14,7 pp |
| **Ampliado — micro** (por query) | **47,9 %** | 59,8 % | **61,5 %** | 0,540 | 117 | **±9,1 pp** |
| Ampliado — ponderado por frecuencia | 46,8 % | 60,5 % | 62,8 % | 0,541 | 506 | — |
| **Ampliado — macro** (por especie) | **39,4 %** | 45,3 % | **46,2 %** | — | 15 esp. | — |
| Ampliado — BM25 puro (referencia) | 37,6 % | 59,0 % | 60,7 % | 0,482 | 117 | — |

**Verificación de entorno:** correr el bench sobre el golden de 50 reproduce EXACTO los
números reportados (recall@1 40,0 %, recall@5 46,0 %) → la medición del set ampliado es
comparable.

### ¿El número se sostiene con N grande?

**Sí y no — el hallazgo importante no es el agregado, es que estaba escondiendo dos poblaciones.**

- El **40 % / 46 %** del golden de 50 estaba **deflactado** en parte por **6 de 50 entradas que
  son no-especie con slug inexistente en el corpus** (`biopreparado`, `mito_lunar`, `erosion`,
  `suelo_acido`, `agua_calidad`, `associacion` → miss garantizado, techo 88 %). Quitándolas, el
  mismo set de 50 sube a **45,5 % / 52,3 %**.
- El número ingenuo de N grande, **micro 47,9 % / 61,5 %**, es **optimista**: los 1500 pares
  **sobre-representan los cultivos fáciles**. Café + fríjol + papa + maíz + plátano concentran
  el 56 % de las queries, y el RAG acierta café/fríjol/papa/maíz muy bien.
- La vista **macro (una especie, un voto): 39,4 % / 46,2 %**. Es casi idéntica al **46,0 %** del
  golden de 50 en recall@5 → **el 46 % original NO era ni optimista ni pesimista: era un buen
  estimador central, solo muy ruidoso** (±13,6 pp). Con N grande el intervalo cae a ±9 pp y se
  confirma que el recall@5 real ronda el **46 %** por especie.

### El hallazgo que el N=50 no dejaba ver: el RAG es BIMODAL

Con 117 queries y 15 especies, el recall por especie parte en dos grupos limpios:

| Funciona (recall@1 ≥ 50 %) | recall@1 | | Falla (recall@5 = **0 %**) | n |
|---|---|---|---|---|
| café (`coffea_arabica`) | 86 % (19/22) | | **plátano** (`musa_paradisiaca`) | 0/12 |
| fríjol (`phaseolus_vulgaris`) | 69 % (11/16) | | **tomate** (`solanum_lycopersicum`) | 0/9 |
| papa (`solanum_tuberosum`) | 69 % (11/16) | | **cacao** (`theobroma_cacao`) | 0/7 |
| maíz (`zea_mays`) | 67 % (8/12) | | **yuca** (`manihot_esculenta`) | 0/6 |
| ortiga (`urtica_dioica`) | 100 % (3/3) | | zanahoria (`daucus_carota`) | 0/3 |
| papa criolla (`solanum_phureja`) | 100 % (2/2) | | gulupa (`passiflora_edulis_morada`) | 0/3 |
| cebolla (`allium_cepa`) | 100 % (2/2) | | repollo (`brassica_oleracea…`) | 0/2 |
| | | | guayaba (`psidium_guajava`) | 0/2 |

**8 de 15 especies tienen recall@5 = 0 %.** No es ruido de muestreo: el golden de 50 ya mostraba
las mismas fallas (musa, tomate, yuca, zanahoria todas rank=None), pero con 1–3 queries por
cultivo parecía anécdota. Con 12/9/7/6 queries queda claro que es **sistemático**.

### Causa (diagnóstico rápido, no era el objetivo pero es accionable)

No es bug del bench ni del golden: los embeddings de plátano/cacao/yuca **sí existen**
(vectores de 768 dim) pero **rankean como ruido**. Coseno directo query↔doc para
«cultivo de plátano»:

- `musa_paradisiaca` (la respuesta correcta): coseno **0,615**, **puesto 263** de 501.
- Los que ganan (`vasconcellea_pubescens` 0,713, `raphanus_sativus` 0,706…) son hierbas sin
  relación: el embedding del doc de plátano **no codifica bien «plátano/cultivo»**.
- En contraste, «cultivo de café» funciona: `coffea_arabica` puesto 2 (coseno 0,694).

Es decir: el índice nomic **separa mal** para un subconjunto de fichas (probable problema en el
texto que se embebe al construir `rag-embeddings.json`, no en el modelo de query). Nota lateral:
`solanum_lycopersicum` (base) **no está** en el índice de embeddings — solo sus variantes; y para
tomate el retriever devuelve `solanum_betaceum` (tomate de árbol), confundiendo especies.

> **Recomendación de seguimiento (fuera de alcance de este informe):** revisar la construcción de
> `rag-embeddings.json` (`scripts/build-rag-embeddings.mjs`) para las fichas que fallan —
> confirmar que el `common_names` y la descripción de cultivo entran al texto embebido. Un
> reranker o un boost por nombre común/BM25 sobre el nombre de la especie taparía el 0 % de
> golpe. Hay rama `feat/rag-reranker-medido` en curso; este golden ampliado le sirve de gate.

---

## 4. Cómo reproducir

```bash
# 1. construir el golden (script en scratchpad del run; corpus = public/cycle-content)
#    produce eval/rag-golden-ampliado.json (117 entradas)

# 2. medir
OLLAMA_URL=http://${OLLAMA_HOST}:11434 \
GOLDEN_SET=eval/rag-golden-ampliado.json \
node scripts/bench-rag-retrieve.mjs --no-rerank

# baseline de control (debe dar 40,0 / 46,0):
OLLAMA_URL=http://${OLLAMA_HOST}:11434 node scripts/bench-rag-retrieve.mjs --no-rerank
```

`GOLDEN_SET` es la única adaptación al bench: acepta ruta relativa al repo o absoluta; cada
entrada solo requiere `{id, query, expected}` (los campos extra `matched_common_name` y
`dup_count` se ignoran). El golden de 50 (`eval/rag-golden.json`) queda intacto.

---

## 5. Honestidad — límites de este golden ampliado

- **117 > 50, pero no es enorme.** El tope lo pone la fuente: 476 queries distintas de las
  cuales solo ~117 mencionan una especie del catálogo. El CI baja de ±13,6 pp a ±9 pp: real,
  pero no milagroso.
- **Solo 15 especies, muy concentradas.** No amplía la *cobertura* de especies frente al golden
  de 50 (~18); amplía la *cantidad de queries por especie*. Reduce el ruido en los cultivos que
  el QA cubre, no en el catálogo completo.
- **El agregado engaña.** Reportar «61,5 % recall@5» sería vender optimismo. El número honesto es:
  **~46 % por especie (macro)**, con **la mitad de los cultivos evaluados en 0 %**. Esa es la
  medición REAL que pedía la tarea.
