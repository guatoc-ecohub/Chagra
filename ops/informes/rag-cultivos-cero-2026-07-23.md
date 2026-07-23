# RAG: cultivos en recall@5 = 0 % — causa raíz medida y fix probado

**Fecha:** 2026-07-23
**Rama:** `fix/rag-cultivos-cero` (desde `dev` fresco, commit base `0c770085`)
**Autor:** carril de diagnóstico RAG
**Embedder:** `nomic-embed-text` (768d) en alpha `192.168.1.111:11434`
**Insumos:** `eval/rag-golden-ampliado.json` (117 queries reales), `golden-self-501.json`
(500 especies, nombre común → slug), corpus `public/cycle-content/*.json` (501 fichas),
índice `public/rag-embeddings.json` (501 vectores prod).

---

## 0. TL;DR

Hay **dos hallazgos distintos**, y conviene no confundirlos:

1. **El «8 cultivos con recall@5 = 0 %» del informe anterior es, en su mayor parte, un
   ARTEFACTO DE MEDICIÓN**, no la realidad de producción. El bench corre en Node, donde el
   catálogo SQLite no está disponible, y el *tier-gate* degrada FAIL-CLOSED a **44 especies**
   (`CROP_TAXONOMY`). 7 de los 8 cultivos «rotos» simplemente **no están cargados** en ese
   corpus de 44 → 0 % garantizado por ausencia, no por el embedding. Con el **corpus completo
   de 463 especies** (lo que prod SÍ carga), esos cultivos dan **84–100 % recall@5** en el
   híbrido. Medido, abajo.

2. **SÍ existe un problema sistémico REAL de calidad de embedding**, visible con
   *self-retrieval* (query = nombre común → su propio slug, coseno puro): **recall@5 = 31,2 %
   sobre 500 especies** (66 % de las fichas no aparecen ni en el top-5 de su propio nombre;
   «Papa Pastusa Suprema» rankea **#199** de sí misma). Causa: `extractPassageText()` embebe
   **solo el cuerpo pedagógico** y nunca la **identidad** de la ficha (nombre común +
   científico + familia).

**Fix probado** (una sola función, `extractPassageText`): anteponer la cabecera de identidad.
Self-retrieval **31,2 % → 47,4 % recall@5 (+16,2 pp)**; **84 especies rotas suben al top-5,
solo 3 regresan** (neto **+81**). Neutro sobre las queries reales (el híbrido ya las rescataba
por BM25) — **sin bajar café/papa/maíz**.

---

## 1. Corrección del diagnóstico anterior: el 0 % era del bench, no de prod

El informe `golden-ampliado-2026-07-23.md` midió «8 especies a 0 %» con
`bench-rag-retrieve.mjs`. Al reproducirlo salen **exactamente** sus números (Hybrid recall@1
47,9 % / @5 61,5 %) — pero el log del propio bench delata la causa:

```
[RAG] Tier gate: catálogo vacío — degradando FAIL-CLOSED al subconjunto seguro.
[RAG] Tier gate FAIL-CLOSED (#1): 501 slugs → 44 del subconjunto seguro (CROP_TAXONOMY).
```

El loader del bench (`scripts/bench-rag-retrieve.loader.mjs`, línea 54) **stubbea**
`getAllSpecies → []` a propósito. El tier-gate lo interpreta como «catálogo no confiable» y
restringe el corpus a los ~44 ids de `CROP_TAXONOMY` que existen en el manifest. Resultado:

| Cultivo «roto» | ¿en `CROP_TAXONOMY`? | por qué no carga en el bench |
|---|---|---|
| plátano `musa_paradisiaca` | **NO** | ausente de la taxonomía |
| cacao `theobroma_cacao` | **NO** | ausente |
| yuca `manihot_esculenta` | **NO** | ausente |
| tomate `solanum_lycopersicum_*` | id no calza | taxonomía tiene `_cherry`/`_chonto`; el manifest, `_cerasiforme`/`_san_marzano`/… |
| zanahoria `daucus_carota_subsp_sativus` | id no calza | taxonomía `daucus_carota`, manifest `daucus_carota_subsp_sativus` |
| gulupa `passiflora_edulis_morada` | id no calza | taxonomía `passiflora_edulis`, manifest `…_morada` |
| guayaba `psidium_guajava_manzana` | id no calza | taxonomía `psidium_guajava`, manifest `…_manzana` |
| repollo `brassica_oleracea_var_capitata` | — | además `collapseVarieties` lo colapsa a `brassica_oleracea` ≠ clave del golden |

Verificado contra `public/catalog.sqlite` (el catálogo que prod SÍ lee): tiene **581 especies**
e incluye **las 8 con su slug exacto del manifest**. En prod el corpus RAG carga **463 de 501**
slugs (catálogo ∩ manifest), no 44.

### Medición prod-representativa (mismo retriever, catálogo real de 463)

Se corrió el retriever REAL sin tocarlo, con un loader que devuelve el catálogo de 463
(en vez de `[]`). Golden ampliado, híbrido, nomic en alpha:

| Especie | n | recall@5 bench (44) | **recall@5 prod (463)** |
|---|---|---|---|
| plátano `musa_paradisiaca` | 12 | 0 % | **92 %** |
| cacao `theobroma_cacao` | 7 | 0 % | **100 %** |
| yuca `manihot_esculenta` | 6 | 0 % | **100 %** |
| tomate `solanum_lycopersicum` | 9 | 0 % | **100 %** |
| zanahoria `daucus_carota` | 3 | 0 % | **100 %** |
| guayaba `psidium_guajava` | 2 | 0 % | **100 %** |
| gulupa `passiflora_edulis_morada` | 3 | 0 % | **0 %** (sigue rota) |
| repollo `brassica_oleracea_var_capitata` | 2 | 0 % | **0 %** (colapso de variedad) |
| **MICRO (117 queries)** | 117 | 61,5 % | **90,6 %** |
| **MACRO (15 especies)** | 15 | 46,2 % | **84,3 %** |

**Conclusión honesta:** el «RAG bimodal, mitad de los cultivos a 0 %» describe el corpus de 44
del bench, no producción. En prod, 6 de los 8 «rotos» están en 92–100 %. Quedan **2 fallas
reales** en el híbrido: **gulupa** (embedding débil + BM25 no la separa) y **repollo** (bug de
`collapseVarieties`: colapsa `brassica_oleracea_var_capitata` → `brassica_oleracea`, que no
matchea la clave del golden — no es de embedding).

> **Acción de seguimiento aparte:** el loader del bench debería reflejar el catálogo real (o el
> tier-gate no degradar en Node) para que el número del CI deje de estar deflactado. No es parte
> de este fix.

---

## 2. El problema sistémico REAL: `extractPassageText` no embebe la identidad

Esto es independiente del artefacto anterior y **sí** es sistémico. El *self-retrieval*
(query = nombre común de la ficha → su propio slug, coseno puro sobre los 501 vectores) mide
directamente si el embedding «sabe quién es»:

```
baseline (índice prod): N=500  recall@1 18,6 %  recall@5 31,2 %  fuera de top-5 68,8 %
```

**66 % de las fichas no aparecen ni en el top-5 de su propio nombre común.** No es el modelo ni
la GPU: es el **texto que se embebe**.

`extractPassageText()` (versión previa) concatenaba `valor_pedagogico` + `milestones` +
`companions` + `failure_modes` + `leccion_agroecologica`. Pero **`milestones`/`failure_modes`/
`leccion_agroecologica` existen en solo 12/501 fichas** y `companions` (array) en ninguna
(el corpus usa `companions_markdown`). Es decir: **para ~489/501 fichas el vector es el
embedding de `valor_pedagogico` a secas** — un ensayo. Nunca entran `common_names`,
`scientific_name` ni `family`, presentes en **501/501**.

### Café (funciona) vs plátano (falla) — el texto real

Dos efectos se suman. **(a) Selección de campo:** el `valor_pedagogico` del café está redactado
como *perfil de cultivo* y el del plátano como *ensayo botánico*:

**Café — texto embebido (viejo, 872c):**
> «El café arábica (Coffea arabica L.) es **el cultivo agroindustrial** emblemático de Colombia
> y la principal fuente de ingresos… 850.000 **hectáreas**… **requiere sombra** parcial 35-50 %,
> suelos francos con **pH 5.0-5.5**, **precipitación** 1.800-2.800 mm…»

**Plátano — texto embebido (viejo, 1043c):**
> «El plátano (Musa × paradisiaca, Musaceae) es **híbrido** cultivado entre Musa acuminata ×
> balbisiana… **pseudotallo** formado por vainas foliares… reproducción asexual por **hijuelos**…
> se reproduce SOLO clonalmente… **triploidía estéril**…»

Por eso la query real **«cultivo de café» rankea coffea #2**, pero **«cultivo de plátano» rankea
musa #263/501** (coseno 0,615): el vector del plátano codifica *trivia botánica*, no *«cómo se
cultiva plátano»*. El del café coincide con el vocabulario de cultivo.

**(b) Identidad ausente (el lever sistémico):** ninguno de los dos antepone el nombre. Con
query = puro nombre común, **ambos** fallan (café `#83`, plátano `#118` en self-retrieval). El
nombre común aparece a lo sumo una vez, diluido en ~900–1000 caracteres de prosa.

---

## 3. El fix (probado): anteponer la cabecera de identidad

`extractPassageText()` ahora antepone `common_names + (scientific_name) + familia <family>`
antes del cuerpo. Ejemplo del texto nuevo embebido:

> **Café:** `Café caturra / Castillo / Cenicafé 1 (Coffea arabica L.) familia Rubiaceae. El café arábica…`
> **Plátano:** `Plátano (Musa × paradisiaca L.) familia Musaceae. El plátano…`

Un solo archivo (`scripts/build-rag-embeddings.mjs`); no toca runtime.

### 3.1 Self-retrieval, 500 especies (antes/después)

Se regeneró el embedding de **las 500 especies** con el texto nuevo (nomic en alpha) y se
volvió a medir:

| variante | recall@1 | recall@5 |
|---|---|---|
| baseline (solo cuerpo pedagógico) | 18,6 % | 31,2 % |
| **fix identidad (nombres+científico+familia)** | **32,0 %** | **47,4 %** |
| + prefijo nomic `search_document:`/`search_query:` | 33,4 % | 49,2 % |

**Transición especie por especie (baseline → fix):**

```
ROTAS → top-5 (recuperadas):   84
top-5 → ROTAS (regresiones):    3   (Mango #5→6, Curuba de Castilla #3→13, Pino pátula #4→27)
se mantienen bien:             153
se mantienen rotas:            260
NETO:                         +81 especies
```

Ejemplos recuperados: «Palma de vino» #19→#1, «Durazno criollo / Pesgua / Cerote» #274→#1,
«Guadua / Bambú nativo» #371→#1, «Buddleja arborea / Salvion» #358→#1, «Malanga blanca» #21→#1,
«Café caturra…» #83→#1.

### 3.2 Por categoría (recall@5) — el fix sube en TODAS las categorías con volumen

| categoría | baseline | fix | n |
|---|---|---|---|
| frutales_perennes | 21 % | **35 %** | 100 |
| medicinales_alelopáticas | 21 % | **39 %** | 85 |
| árboles_sombra | 35 % | **52 %** | 75 |
| tubérculos_raíces | 27 % | **36 %** | 44 |
| ornamentales_nativas | 41 % | **65 %** | 34 |
| abonos_verdes_coberturas | 47 % | **59 %** | 32 |
| hortalizas_hoja | 55 % | **76 %** | 29 |
| cercas_vivas | 26 % | **42 %** | 19 |
| atractores_polinizadores | 50 % | **69 %** | 16 |
| especies_invasoras | 56 % | **69 %** | 16 |
| granos_legumbres | 21 % | **43 %** | 14 |

### 3.3 Queries REALES (golden ampliado, híbrido prod-representativo): sin regresión

Con el índice regenerado (fix) y corpus de 463, el híbrido sobre las 117 queries reales queda
**neutro**: MICRO recall@5 **90,6 % → 90,6 %**, MACRO **84,3 % → 84,0 %**. No sube porque el
BM25 ya rescataba esas queries (contienen el nombre común literal), y **no baja** café
(91 %→95 %), papa (100 %→100 %), fríjol (81 %→81 %); maíz oscila 100 %→92 % (una query cae de
top-5, ruido). El valor del fix está en la **capa semántica** — queries sin el nombre exacto
(folk, descripciones, sinónimos, errores de tipeo) y la precisión del aporte semántico al
híbrido (self-retrieval recall@1 18,6 %→32,0 %).

---

## 4. Honestidad — qué NO hace este fix

- **No mueve el número del bench del CI** (sigue con corpus de 44 por el stub del loader). El
  bench mide un corpus que no es el de prod; arreglar eso es otro cambio (§1).
- **No arregla gulupa ni repollo en el híbrido.** Gulupa necesita más que la cabecera; repollo
  es el bug de `collapseVarieties` (clave del golden a nivel variedad). Ambos quedan anotados.
- **Puede difuminar la desambiguación FINA de variedades** en self-retrieval exacto: «Papa
  Pastusa Suprema» #199→#263 (todas las papas comparten «Papa … Solanum tuberosum … Solanaceae»
  en la cabecera). No es regresión contable (ya estaba rota) y **no afecta al retriever real**,
  que colapsa variedades a especie (`collapseVarieties`) y matchea por especie.
- **El prefijo nomic** (`search_document:` en docs / `search_query:` en queries) suma otros
  ~+1,8 pp, pero exige cambiar `embedQuery()` en `ragRetriever.js` **en lockstep** (invariante
  de modelo: si se regenera un lado sin el otro, el híbrido degrada a BM25-only en silencio).
  Se deja **documentado, no cableado** — decisión de producto.

---

## 5. Cómo reproducir

```bash
# self-retrieval baseline (índice prod, coseno puro sobre 500 especies)
node self-retrieval.mjs               # ~34 % recall@5 (muestra 1/3)

# regenerar el índice con el fix y volver a medir (nomic en alpha):
OLLAMA_URL=http://192.168.1.111:11434 node scripts/build-rag-embeddings.mjs

# híbrido prod-representativo (corpus 463) vs bench del CI (corpus 44):
OLLAMA_URL=http://192.168.1.111:11434 GOLDEN_SET=eval/rag-golden-ampliado.json \
  node scripts/bench-rag-retrieve.mjs --no-rerank    # 61,5 % @5 (44 especies, artefacto)
```

Los scripts de medición del experimento (self-retrieval sobre 500, transición, runner
prod-representativo) quedaron en el scratchpad del run; usan el índice prod como baseline y
`nomic-embed-text` en alpha para regenerar.

---

## 6. Entregable

- **Código:** `scripts/build-rag-embeddings.mjs` — `extractPassageText()` antepone la cabecera
  de identidad; se corrige el modelo por defecto a `nomic-embed-text` (768d), alineado con
  `embedQuery()`. Commiteado en `fix/rag-cultivos-cero`.
- **Regenerar `public/rag-embeddings.json` va aparte** — NO cableado a prod sin visto (el fix
  está medido; falta correr `build-rag-embeddings.mjs` contra el corpus y validar el diff).
- **PR sin mergear.**
