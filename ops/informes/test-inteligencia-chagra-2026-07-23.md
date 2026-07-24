# Test de Inteligencia Fuerte de Chagra — línea base 2026-07-23

**Autor:** harness `scripts/test-inteligencia-chagra.mjs` (rama `eval/test-inteligencia`).
**Qué es:** la vara. Un número —el ÍNDICE DE INTELIGENCIA— reproducible, para saber
si un cambio mejoró o empeoró al agente. Este informe fija la línea base de hoy (§2),
compara **10 candidatos de modelo de chat** (§8, incluidos los fine-tunes propios) y
corre un **bench visual profundo de 8 modelos multimodales** (§9, ¿jubilar el swap de
qwen3-vl?). Índices clave de un vistazo:

- **ÍNDICE de prod hoy (`gemma4:e2b`, prod-faithful): 69.9 / 100.** Techo desplegable:
  `gemma3:4b` 81.7 ≈ `gemma4:e4b` 81.6.
- **Fine-tunes propios: ninguno superó a los gemma base** (mejor `granite33-dpo` 78.1).
  El SFT ayudó (+7.6 sobre su base) pero el DPO degradó a over-refusal. Ver §8.
- **Brazo visual: `gemma3:4b` (33.3% id, 100% honestidad) supera al `qwen3-vl:8b` actual
  (11.1%) → el swap de 53 s no se justifica.** Ver §9.

> Reglas de honestidad del test: mide de verdad. Si una dimensión sale mal, el número
> lo dice. Un índice inflado no sirve. Todas las corridas van contra el stack REAL
> (retriever de producción, grafo AGE vía MCP, modelos en la GPU de alpha), sin mocks.

---

## 1. Qué mide (4 dimensiones) y cómo se pondera

El ÍNDICE es una suma ponderada de cuatro dimensiones, cada una 0–100. Los pesos
codifican la filosofía del operador: **grounding manda** ("fuerte en lo que sabe,
'no sé' honesto en lo que no").

| # | Dimensión | Peso | Qué mide | Depende del modelo de chat |
|---|-----------|------|----------|:--:|
| 1 | **RECALL** (retrieval) | 0.30 | ¿Encuentra la ficha correcta? Retriever híbrido de producción (BM25 + nomic-embed-text 768d) sobre el catálogo COMPLETO (501 fichas). | No |
| 2 | **GROUNDING** (anti-alucinación) | **0.35** | ¿Se abstiene ("no sé") ante lo que no está en el corpus, y responde lo que sí? | Sí |
| 3 | **RELACIONES** (grafo) | 0.20 | ¿Responde queries relacionales que solo el grafo AGE resuelve ("con qué se asocia el maíz")? | No |
| 4 | **TAXONOMÍA** | 0.15 | ¿Da el nombre científico CORRECTO (incluye los errores históricos: papa criolla = *Solanum phureja*, NO *tuberosum*)? | Sí |

`ÍNDICE = Σ(peso_i · puntaje_i) / Σ(pesos disponibles)`. Si una dimensión no corre
(p. ej. MCP inalcanzable), se excluye y se renormaliza (el índice se marca *parcial*).

Las dimensiones 1 y 3 **no dependen** del modelo de chat (son retrieval + grafo): se
calculan UNA vez y se reutilizan para cada modelo. Solo 2 y 4 usan el LLM, así que la
comparación e2b vs e4b aísla exactamente el efecto del modelo.

### Fórmulas de cada dimensión

- **Recall** = `100 · (0.35·r@5[golden] + 0.30·r@5[ampliado] + 0.35·r@5[self-501])`.
  Match especie↔variedad por prefijo (`solanum_tuberosum` acierta con
  `solanum_tuberosum_pastusa_suprema`), igual que `bench-rag-retrieve.mjs`. Las queries
  cuyo `expected` es un concepto y no una especie (biopreparado, mito lunar, erosión…)
  se reportan aparte y NO cuentan en el recall de especie.
- **Grounding** = `100 · media armónica ponderada(abstención_OOC, respuesta_control; 0.65, 0.35)`.
  La media armónica **castiga la mudez**: un agente que dice "no sé" a todo saca
  abstención 100% pero respuesta-en-control 0% → puntaje bajo. Esto es deliberado
  (un bench que premia el silencio no mide inteligencia).
- **Relaciones** = `100 · tasa_de_acierto_del_grafo`. Se reporta además la **ventaja
  del grafo** = acierto_grafo − acierto_vector (retrieval híbrido sin grafo), para
  probar que el grafo se gana su lugar.
- **Taxonomía** = `100 · fracción_correcta`. Correcto = la respuesta contiene género
  + epíteto esperados (insensible a acentos/mayúsculas y a la autoría botánica).

---

## 2. Resultado — LÍNEA BASE 2026-07-23

Corrida: catálogo **501 fichas / 20.201 pasajes**, embeddings nomic-embed-text 768d,
grafo AGE vía sidecar agro-mcp (`build_sha 373f780`, vivo), GPU de alpha.

| Modelo | RECALL (0.30) | GROUNDING (0.35) | RELACIONES (0.20) | TAXONOMÍA (0.15) | **ÍNDICE** |
|--------|:---:|:---:|:---:|:---:|:---:|
| **`gemma4:e2b`** (producción) | 88.2 | 57.7 | 70.0 | 61.5 | **69.9** |
| `gemma4:e4b` (candidato) | 88.2 | 81.2 | 70.0 | 84.6 | **81.6** |

> ## ÍNDICE DE INTELIGENCIA (hoy, producción) = **69.9 / 100**
>
> Esta es la vara para todo cambio futuro. `--check` falla si un cambio la baja > 2 pts.

RECALL y RELACIONES **no dependen del modelo de chat** (son retrieval + grafo), por eso
son idénticos entre las dos filas; solo GROUNDING y TAXONOMÍA cambian con el modelo.

---

## 3. Desglose por dimensión

### [1] RECALL — 88.2 / 100 (fuerte, y la "bimodalidad" era un artefacto)

| Golden set | n | recall@1 | recall@5 | MRR | especies sin recuperar @5 |
|---|---:|---:|---:|---:|---:|
| `rag-golden.json` (folk) | 44 | 52.3% | 79.5% | 0.612 | 0 / 18 |
| `rag-golden-ampliado.json` | 117 | 27.4% | 84.6% | 0.472 | 0 / 15 |
| `golden-self-501.json` (identidad) | 500 | 98.0% | 100.0% | 0.989 | 0 / 500 |

- El **self-retrieval llega a 100% @5** sobre las 500 fichas: la cabecera de identidad
  (regen de hoy) funcionó — cada ficha recupera su propio nombre.
- **La "bimodalidad" de recall que se veía antes era en buena parte un artefacto de
  medición**, no de retrieval: el corpus usa slugs a nivel de VARIEDAD
  (`solanum_tuberosum_pastusa_suprema`, `solanum_phureja`) y el golden esperaba la
  especie base (`solanum_tuberosum`). Con el match especie↔variedad por prefijo,
  **0 especies quedan en recall@5=0** en los tres sets. El r@1 más bajo del set ampliado
  (27.4%) es real y esperable: son queries "¿nombre científico de X?" donde la variedad
  correcta compite con sus hermanas — se recupera bien @5 (84.6%) pero no siempre en el
  primer puesto.

### [2] GROUNDING — 57.7 (e2b) / 81.2 (e4b) — **la dimensión que más separa a los modelos**

| Modelo | abstención OOC (↑ mejor) | alucinación OOC (↓) | responde control (↑) | sobre-abstención control (↓) |
|---|---:|---:|---:|---:|
| `gemma4:e2b` | 95.0% (19/20) | 5.0% | **33.3% (4/12)** | **66.7%** |
| `gemma4:e4b` | 85.0% (17/20) | 15.0% | 75.0% (9/12) | 25.0% |

- **Hallazgo duro y honesto: el modelo de producción (e2b) es MUDO.** Se abstiene
  correctamente ante especies inexistentes (95%), pero también **rechaza especies que SÍ
  están en el corpus** (solo respondió 4 de 12 controles). Dijo *"No tengo información
  curada sobre esa especie"* para el riego del frijol, el abono de la uchuva, la siembra
  de la quinua, la yuca en loma y el abono de la cebolla — con la ficha correcta puesta
  como evidencia. La media armónica lo castiga (57.7) por eso, y está bien: un agente que
  dice "no sé" a lo que sí sabe **no es fuerte, es mudo**. Es exactamente el fallo que el
  operador quería que el test cazara.
- e4b balancea mucho mejor (responde 75% de los controles) a costa de un poco más de
  alucinación (15% vs 5%): engancha con especies inventadas respondiendo sobre la especie
  base real (p. ej. "aguacate volcánico del Ruiz" → responde sobre el aguacate). Trade-off
  medido, no oculto.
- La única alucinación compartida es **"broca azul del café de altura"** (plaga
  inventada): ambos responden sobre la broca real. Es el caso límite más difícil.

### [3] RELACIONES — 70 / 100 — **el grafo se gana su lugar (ventaja +70 pp)**

- **Grafo acierta 70% (7/10); el retrieval híbrido sin grafo, 0% (0/10).** El vector NUNCA
  recupera la especie asociada para una query relacional ("con qué se asocia el maíz") —
  confirma que lo relacional **solo** lo resuelve el grafo AGE vía MCP.
- Las 7 asociaciones acertadas devuelven compañeros correctos (maíz→quinua/chocho/frijol,
  café→aliso/chachafruto, etc.).
- **3 huecos honestos del grafo, reportados, no escondidos:**
  1. `solanum_phureja` (papa criolla) → `found:false`: el grafo (~488 especies) no la
     resuelve por ese id/alias. Gap de cobertura del grafo, no del test.
  2–3. `get_pest_controllers` para **broca** y **cogollero**: el grafo reconoce la plaga
     (`found:true`) pero devuelve controladores **vacíos** → las aristas CONTROLS de
     biocontrol están incompletas para esas plagas.

### [4] TAXONOMÍA — 61.5 (e2b) / 84.6 (e4b)

- **Ambos pasan la trampa histórica:** papa criolla → *Solanum phureja* (NO *tuberosum*).
- e2b falla 5/13, otra vez por **mudez** (maíz, quinua, yuca, arracacha → "no tengo
  información curada"; uchuva → solo el género). e4b falla 2/13 (café → solo género;
  yuca → se abstiene). El patrón es consistente con GROUNDING: e2b se calla de más.

---

## 4. Veredicto e2b vs e4b

**`gemma4:e4b` saca +11.7 puntos de ÍNDICE (81.6 vs 69.9).** Toda la diferencia viene de
las dos dimensiones LLM (RECALL y RELACIONES son idénticas):

- GROUNDING: **+23.5** (81.2 vs 57.7) — e4b responde lo que sabe sin dejar de abstenerse
  ante lo inexistente; e2b se calla de más.
- TAXONOMÍA: **+23.1** (84.6 vs 61.5).

El cuello de botella de producción hoy **no es el retrieval ni el grafo** (ambos sólidos:
88.2 y 70) — es que **el modelo de chat de producción (e2b) es demasiado mudo**: se abstiene
ante especies que sí tiene en la evidencia. e4b corrige eso.

**Recomendación (decisión de recursos, del operador — el test da el número, no la orden):**
evaluar migrar producción a `gemma4:e4b` **si y solo si** (a) cabe en la M6000 (12 GB)
conviviendo con nomic-embed-text sin OOM, y (b) la latencia de TTS+generación sigue bajo el
techo de UX de voz. Si e4b no cabe o es muy lento, el segundo mejor movimiento es **atacar la
mudez de e2b** (ajustar el system prompt / few-shots para que responda cuando la evidencia
está presente): subiría GROUNDING y TAXONOMÍA sin cambiar de modelo. Cualquiera de los dos
caminos se **mide con este mismo harness** (`--check` contra el baseline de 69.9).

---

## 5. Reproducibilidad

- **Sin `Math.random`.** Sets ordenados por `id`. LLM en *greedy decoding*
  (`temperature 0`, `top_p 1`, `top_k 1`, `seed 42`) con **`think:false`** (sin ese
  flag los modelos gemma4 devuelven `response` vacío y contaminan la medición).
- **Determinismo:** las dimensiones de retrieval (1 y el lado vector de 3) son 100%
  determinísticas (embeddings precomputados + BM25 determinista). Las dimensiones LLM
  (2, 4) son deterministas salvo variación de punto flotante del backend CUDA.
- **Corpus completo, no el bug de las 44:** el bench viejo cargaba solo ~44 especies
  (el tier-gate degradaba FAIL-CLOSED con `getAllSpecies()=[]` en Node). El loader de
  este harness (`test-inteligencia-chagra.loader.mjs`) devuelve el catálogo completo
  del manifest, así el retriever indexa las **501 fichas / 20.201 pasajes** reales.
- **Cómo correrlo** (desde la raíz del repo `chagra`, con la IP de alpha en la env,
  nunca commiteada):

  ```bash
  OLLAMA_URL=http://<alpha>:11434 \
  MCP_BASE_URL=https://chagra.app/api/mcp/agro \
  CHAGRA_MCP_TOKEN=<token del sidecar> \
  CHAT_MODELS=gemma4:e2b,gemma4:e4b \
  node scripts/test-inteligencia-chagra.mjs
  ```

  - `CHAGRA_MCP_TOKEN`: header `X-Chagra-Token` del sidecar agro-mcp. Vive en el SOPS
    de alpha (`/run/secrets/chagra-agro-mcp-env`) y, por *defense-in-depth*, viaja en
    el bundle JS público (`VITE_CHAGRA_MCP_TOKEN`). **Nunca** se commitea en este repo.
  - Sin token, la dimensión RELACIONES se marca N/A y el índice sale *parcial*.
  - `node scripts/test-inteligencia-chagra.mjs --write-baseline` fija
    `eval/intel-baseline.json` (la vara). `--check` falla (exit 1) si el ÍNDICE del
    modelo de prod cae más de 2.0 puntos vs el baseline.

---

## 6. Enganche al set mensual (rebench)

El harness es apto para el rebench mensual (`Chagra-strategy/ops/rebench-mensual.sh`,
timer día 28). Ese script vive en el repo privado, fuera de este worktree sellado, así
que se documenta el paso a agregar (no se toca desde acá):

```bash
# ── Paso 3/3 — Test de Inteligencia (regresión del ÍNDICE global) ──
# Corre el harness contra prod (gemma4:e2b) y falla si el ÍNDICE cae > 2 pts
# vs eval/intel-baseline.json. ollama/sidecar son loopback en alpha → correr
# vía ssh alpha o con OLLAMA_URL/MCP_BASE_URL apuntando a alpha.
(
  cd "$CHAGRA_REPO_DIR"
  CHAT_MODELS=gemma4:e2b \
  OLLAMA_URL="${INTEL_OLLAMA_URL:-http://localhost:11434}" \
  MCP_BASE_URL="${INTEL_MCP_URL:-https://chagra.app/api/mcp/agro}" \
  CHAGRA_MCP_TOKEN="${CHAGRA_MCP_TOKEN:-}" \
  node scripts/test-inteligencia-chagra.mjs --check
) 2>&1 | tee -a "$REBENCH_LOG"
```

El JSON fechado queda en `ops/informes/data/test-inteligencia-<fecha>.json` para
seguimiento histórico. Para mover la vara tras una mejora aprobada: correr con
`--write-baseline` (acción deliberada, revisada en PR — no en el cron).

---

## 7. Limitaciones (para no mentirnos)

- **Grounding** replica el prompt de sistema de producción (`SYSTEM_PROMPT_BASE` de
  `llmGuardrails.js`) + evidencia RAG, pero **no** toda la cadena NLU→tool→post-validate
  del agente en vivo (que añade MÁS guardas). El número es entonces una **cota inferior**
  del grounding real: el agente en producción es, si acaso, más seguro.
- **Clasificador de abstención** es una regex determinista sobre la respuesta. Todas las
  respuestas quedan en el JSON para auditoría a ojo; refinarlo si aparecen falsos
  positivos/negativos.
- **Relaciones** usa ground-truth de asociación tomado de las fichas (que reflejan las
  aristas del grafo). Mide la ventaja del grafo sobre el vector; una cobertura del grafo
  al 100% "por construcción" no es el punto — el punto es que el vector NO resuelve lo
  relacional. Los huecos del grafo (subject `found:false`) se reportan como fallo honesto.

---

## 8. Comparativa de 10 candidatos de modelo (dims dependientes del modelo)

RECALL (88.2) y RELACIONES (70.0) NO dependen del modelo de chat, así que se dejan
CONSTANTES y solo se re-corren GROUNDING (0.35) y TAXONOMÍA (0.15) por candidato
(`FIXED_RECALL=88.2 FIXED_RELACIONES=70.0`, ~2.5x más barato). Todo con `think:false`,
greedy, secuencial + `ollama stop` (keep_alive 2m) entre modelos, en ventana-día (prod
usa `gemma4:e2b`). Las respuestas VACÍAS de reasoning cuentan como fallo de grounding.

### Tabla de DECISIÓN (método prod-faithful por modelo)

La pregunta que decide es "¿qué tan bueno sería este modelo EN PRODUCCIÓN?". Prod corre
`/api/generate` con prompt concatenado, y ese formato le sienta mejor a los gemma (su
prompt de sistema fue afinado ahí). Un fine-tune, en cambio, se desplegaría con su chat
template (`/api/chat`). Por eso **cada fila usa el método con el que ESE modelo se
desplegaría** — mezclar es lo correcto aquí; forzar a gemma a `/api/chat` lo castiga ~5 pt
por un método que prod no usa.

| # | Modelo | método | GROUNDING | TAXONOMÍA | **ÍNDICE** |
|---|--------|--------|:---:|:---:|:---:|
| 1 | `gemma3:4b` | generate | 75.0 | 100.0 | **81.7** |
| 2 | `gemma4:e4b` | generate | 81.2 | 84.6 | **81.6** |
| 3 | `granite33-dpo` (propio) | chat | 77.9 | 69.2 | **78.1** |
| 4 | `qwen35-sft-alpha` (propio) | chat | 70.3 | 84.6 | **77.8** |
| 5 | `qwen3.5:9b` (base) | chat | 48.8 | 84.6 | **70.2** |
| 6 | `gemma4:e2b` (PROD HOY) | generate | 57.7 | 61.5 | **69.9** |
| 7 | `granite-keeper` (propio) | chat | 36.4 | 100.0 | **68.2** |
| 8 | `qwen35-dpo-alpha` (propio) | chat | 35.4 | 69.2 | **63.2** |
| 9 | `granite33-curado` (propio) | chat | 0.0 · MUDO | 0.0 | **40.5** |
| 10 | `qwen35-chagra-cand` (propio) | chat | 0.0 · ROTO | 0.0 | **40.5** |

RECALL=88.2 y RELACIONES=70.0 constantes (no dependen del modelo). El "piso" 40.5 es
exactamente `0.30·88.2 + 0.20·70` renormalizado = un modelo MUDO (grounding y taxonomía en 0).

### Tabla de CONTROL (todos con `/api/chat`, método homogéneo)

Control secundario: mismo método para todos, para aislar el efecto del modelo del efecto
del método. Aquí gemma pierde ~5 pt (a gemma le sienta mejor `/api/generate` de prod).

| Modelo | GROUNDING | TAXONOMÍA | VACÍAS | ÍNDICE |
|--------|:---:|:---:|:---:|:---:|
| `gemma4:e4b` | 84.1 | 92.3 | 0 | **83.7** |
| `gemma3:4b` | 77.5 | 84.6 | 0 | 80.3 |
| `granite33-dpo` | 77.9 | 69.2 | 0 | 78.1 |
| `qwen35-sft-alpha` | 70.3 | 84.6 | 0 | 77.8 |
| `qwen3.5:9b` | 48.8 | 84.6 | 0 | 70.2 |
| `granite-keeper` | 36.4 | 100.0 | 0 | 68.2 |
| `gemma4:e2b` | 48.0 | 46.2 | 0 | 64.2 |
| `qwen35-dpo-alpha` | 35.4 | 69.2 | 0 | 63.2 |
| `granite33-curado` | 0.0 | 0.0 | **32** | 40.5 |
| `qwen35-chagra-cand` | 0.0 | 0.0 | **32** | 40.5 |

### Anexo — ¿por qué fallaron los 2 fine-tunes MUDOS? (check diferencial)

Los dos que sacan 40.5 emiten VACÍO en las 32 llamadas del grounding+taxonomía **bajo el
system prompt de grounding de prod**. Para distinguir *incompatibilidad de formato* de
*modelo roto*, se les tiraron 3 preguntas del golden SIN ese prompt (system mínimo
"Responde en español, breve."):

- **`granite33-curado` → RESPONDE bien sin el prompt de grounding** ("El maíz se asocia
  muy bien con la papa y con el fríjol…"; broca → "manejo agroecológico… monitoreo con
  trampas"). Su mudez es **INCOMPATIBILIDAD** fine-tune × prompt-de-grounding estricto: el
  SFT no vio ese prompt en entrenamiento y colapsa a abstención total. **Rescatable**
  ajustando el prompt o re-entrenando con el de prod. (Ojo: su taxonomía cruda es errónea
  — "papa criolla = Solanum tuberosum var. tandilense", inventado — así que aun rescatado
  no sería fuerte.)
- **`qwen35-chagra-cand` → SIGUE MUDO incluso sin el prompt** (3/3 `[VACIO]`). Está
  **ROTO** (over-refusal generalizado del DPO / export dañado, template `{{ .Prompt }}`).
  **No rescatable** sin re-entrenar distinto.

**Veredicto — ¿valió el fine-tune propio, o `gemma4:e4b` base es el techo?**

**No valió para producción: ningún fine-tune propio superó a los gemma base.** El mejor
checkpoint propio desplegable (`granite33-dpo` 78.1, `qwen35-sft-alpha` 77.8) queda por
debajo de `gemma3:4b` (81.7 — que además YA está desplegado como NLU del sidecar y pesa
3.3 GB) y de `gemma4:e4b` (81.6). Matices que sí importan para la próxima iteración:

- **El SFT ayudó, el DPO degradó.** `qwen35-sft-alpha` (77.8) superó a su base
  `qwen3.5:9b` (70.2) por **+7.6** → el SFT propio SÍ mejoró la base. Pero el paso DPO la
  empeoró: `qwen35-dpo-alpha` (63.2) < base. El DPO empujó a over-refusal (grounding 35.4:
  se abstiene hasta de lo que sabe). Mismo patrón en granite: `granite33-dpo` (78.1) fue
  el mejor, pero `granite-keeper` over-abstiene (grounding 36.4) y `granite33-curado` quedó
  mudo. **Lección: el DPO tal como se hizo colapsa el grounding; re-entrenar con el prompt
  de prod y sin ese paso DPO.**
- **El techo sigue siendo `gemma4:e4b`** (83.7 con su método nativo; 81.6 prod-faithful) y
  **`gemma3:4b` lo iguala** en prod-faithful (81.7) siendo mucho más liviano — el candidato
  de mejor costo/beneficio para subir el índice de prod hoy, sin fine-tune propio.

---

## 9. Bench visual profundo — ¿`gemma4:e4b` reemplaza a `qwen3-vl:8b`?

18 plagas/enfermedades reales etiquetadas por nombre científico (`public/plaga-images/`,
mapeadas a nombre común canónico según el vocabulario de plagas del grafo AGE) + 5 plantas
sanas de control. 8 modelos multimodales, prompt agronómico de una línea, `temperature 0`,
`think:false`. Tres métricas: **IDENTIFICACIÓN** (tarea real: el campesino fotografía su
planta enferma), **HONESTIDAD** (¿inventa diagnóstico en una planta sana?) y **LATENCIA**.

Tabla con el **prompt agronómico abierto** (el de la UX real: "¿qué plaga ves?"),
ordenada por IDENTIFICACIÓN. VISIÓN = media armónica(identificación 0.6, honestidad 0.4).

| Modelo | IDENTIFICACIÓN | HONESTIDAD | VACÍAS | LATENCIA | VISIÓN |
|--------|:---:|:---:|:---:|:---:|:---:|
| **`gemma3:4b`** | **6/18 · 33.3%** | 5/5 · 100% | 0 | 5.4 s | **45.5** |
| `gemma4:e4b` | 3/18 · 16.7% | 5/5 · 100% | 0 | 3.7 s | 25.0 |
| `qwen2.5vl:7b` | 3/18 · 16.7% | 5/5 · 100% | 0 | 8.7 s | 25.0 |
| `gemma4:e2b` (prod chat) | 2/18 · 11.1% | 5/5 · 100% | 0 | 3.3 s | 17.2 |
| `qwen3-vl:8b` (brazo visual HOY) | 2/18 · 11.1% | 4/5 · 80% | **16** | 13.7 s | 16.9 |
| `llava:7b` | 0/18 · 0% | 5/5 · 100% | 0 | 10.2 s | 0 |
| `llama3.2-vision:11b` | 3/18 · 16.7% | **0/5 · 0%** | 0 | 18.7 s | 0 |
| `moondream` | 0/18 · 0% | 0/5 · 0% | **17** | 1.5 s | 0 |

Lecturas crudas verificadas (no artefactos):
- **`qwen3-vl:8b` emite VACÍO en 16/18** — se calla en vez de arriesgar un nombre; las 2
  que sí nombra (roya → "Hemileia vastatrix", mosca blanca → "Bemisia") son correctas. Su
  11.1% es comportamiento REAL de identificación abierta, no bug del harness.
- **`llama3.2-vision:11b` honestidad 0% es REAL y grave:** inventa diagnósticos falsos en
  TODAS las plantas sanas ("trombosis de la rama", "tuberculosis de la papa", y degenera en
  repetición "de la fijación de la fijación…"). Alucinador visual peligroso.
- **`moondream` está roto:** vacío o basura ("!!!", "1. Yes", "ida-96461").

### `qwen3-vl:8b` con sus DOS prompts (el número que decide)

El operador avisó que `qwen3-vl` es extremadamente prompt-sensitive (en un arena viejo de
presencia/ausencia sacó 100% con un prompt yes/no estricto). Se verificó:

| prompt | roya (D01) | sana (control) | resto (16 diag) |
|--------|-----------|----------------|-----------------|
| **abierto** (agronómico) | ✓ "Hemileia vastatrix" | ✓ honesto "se ve sana" | vacío |
| **estricto** ("nombre en 1 línea; si sana 'planta sana'") | ✗ "roña del café" (mal: roña≠roya) | ✗ vacío | vacío |

Número completo de `qwen3-vl:8b` sobre las 23 imágenes, con los DOS prompts:

| prompt de qwen3-vl | IDENTIFICACIÓN | HONESTIDAD | VACÍAS | VISIÓN |
|--------------------|:---:|:---:|:---:|:---:|
| abierto (agronómico) | 2/18 · 11.1% | 4/5 · 80% | 16 | 16.9 |
| estricto (1 línea) | 1/18 · **5.6%** | 4/5 · 80% | 14 | 8.8 |

El prompt estricto lo deja **peor** (5.6% vs 11.1%). Cualquiera de los dos queda muy por
debajo de `gemma3:4b` (33.3%) y `gemma4:e4b` (16.7%) con el prompt agronómico normal.

El prompt estricto **NO rescata** a `qwen3-vl`: lo empeora (confunde roya con roña, y se
enmudece hasta en la sana). Su fortaleza del arena viejo era una tarea DISTINTA (yes/no de
presencia), no identificación abierta. Depender de un prompt especial que los gemma NO
necesitan es, en sí, una **desventaja operativa**.

**Veredicto — ¿e4b iguala/supera a `qwen3-vl:8b` en diagnóstico real? SÍ — lo supera, y `gemma3:4b` lo supera por mucho.**

En la tarea REAL (identificar la plaga a partir de la foto, con el MISMO prompt agronómico):
`gemma3:4b` (33.3%, 100% honestidad) **triplica** en identificación al brazo visual actual
`qwen3-vl:8b` (11.1%, 16 vacías) y es más honesto; `gemma4:e4b` (16.7%, 100%) también lo
supera. **El swap de 53 s a `qwen3-vl` NO se justifica para identificación abierta de plagas.**

- **Recomendación:** unificar el brazo visual en `gemma3:4b` (ya cargado como NLU del
  sidecar, 3.3 GB, 5.4 s/img) o en `gemma4:e4b` si ya está caliente para chat — y **jubilar
  el swap de 53 s** a `qwen3-vl`. Evitar `llama3.2-vision` (alucina en sanas) y `moondream`
  (roto).
- **Caveat honesto:** la identificación ABSOLUTA es baja en todos (0–33%). Son fotos de
  síntoma en primer plano SIN contexto; el agente real suma el texto del usuario + RAG +
  grafo, así que el diagnóstico end-to-end es mejor que la visión pura. Lo accionable acá es
  el **ranking relativo** (gemma3:4b > gemma4/qwen2.5vl > qwen3-vl > llama/moondream), no el
  valor absoluto. El brazo visual puro es débil: hay que apoyarlo con contexto, no confiarle
  el diagnóstico solo.

### Modelos nuevos probados (recomendados por el DR de visión)

Se pullearon y midieron 3 modelos recientes con el MISMO bench (18 plagas + 5 sanas):

| Modelo | IDENTIFICACIÓN | HONESTIDAD | VACÍAS | LATENCIA | VISIÓN |
|--------|:---:|:---:|:---:|:---:|:---:|
| `gemma3:27b` (referencia, ~17 GB) | **8/18 · 44.4%** | 5/5 · 100% | 0 | 22.8 s | **57.1** |
| `minicpm-v:8b` | 3/18 · 16.7% | 5/5 · 100% | 0 | 9.4 s | 25.0 |
| `qwen3-vl:4b` | 1/18 · 5.6% | 3/5 · 60% | **19** | 10.0 s | 8.7 |

- **`gemma3:27b` es el mejor de TODOS los medidos (44.4% id, 100% honestidad)** — confirma el
  patrón "más grande identifica más" — pero pesa ~17 GB, **offloadea en la M6000 (12 GB) y
  tarda 22.8 s/img**: no es candidato de prod, solo referencia del techo generalista.
- **`minicpm-v:8b`** (que el DR marcaba fuerte) rinde igual que `gemma4:e4b`/`qwen2.5vl:7b`
  (16.7%, 100% honesto) — **no supera a `gemma3:4b`**.
- **`qwen3-vl:4b`** repite el patrón mudo de su hermano `:8b` (19/23 en vacío) — peor aún.

**Veredicto de la ronda nueva: ninguno de los nuevos supera a `gemma3:4b` (45.5) entre los
DESPLEGABLES.** El único que lo pasa es `gemma3:27b` (57.1), no desplegable en la M6000.
Consistente con el DR de visión (4 papers 2025–26): **todos los VLM generalistas caen en
~15–45 % en diagnóstico agrícola real** — `gemma3:27b` (44.4 %) está en el borde alto de esa
banda. **El techo generalista es `gemma3:4b`; el salto REAL a diagnóstico confiable es
fine-tuning** (~73 % con ~11k imágenes) o un CNN especializado (~94.7 %), no otro VLM base.
(Prod no se cambia — es medición.)

---

# 10. Tablas finales para el operador

> **HALLAZGO DEL DÍA: `qwen3.5:4b` es un modelo ÚNICO nuevo.** Le gana a `gemma3:4b` en
> TEXTO (índice 84.7 vs 81.7), lo IGUALA en VISIÓN (45.5 = 45.5, y 0.3 s más rápido), es
> **multimodal + tools + thinking**, pesa 3.4 GB, y tiene la mejor combinación
> grounding/contaminación (86.9 grounding con solo 5 % de invención). Un solo modelo para
> chat + visión + agente. (Decisión de prod = del operador; el test da el número.)

## TABLA 1 — VISIÓN (todos los multimodales, mejor→peor por SCORE)

Prompt agronómico abierto, `temperature 0`, `think:false`. 18 plagas etiquetadas + 5 sanas.
SCORE = media armónica(identificación 0.6, honestidad 0.4).

| # | Modelo | IDENTIF. | HONESTIDAD | VACÍAS | LAT s/img | SCORE |
|---|--------|:---:|:---:|:---:|:---:|:---:|
| 1 | `gemma3:27b` (ref, ~17 GB, offload) | 44.4% | 100% | 0 | 22.8 | **57.1** |
| 2 | `gemma3:4b` | 33.3% | 100% | 0 | 5.4 | **45.5** |
| 2 | **`qwen3.5:4b`** (multimodal, +texto) | 33.3% | 100% | 0 | **5.1** | **45.5** |
| 4 | `gemma4:e4b` | 16.7% | 100% | 0 | 3.7 | 25.0 |
| 4 | `qwen2.5vl:7b` | 16.7% | 100% | 0 | 8.7 | 25.0 |
| 4 | `minicpm-v:8b` | 16.7% | 100% | 0 | 9.4 | 25.0 |
| 7 | `gemma4:e2b` | 11.1% | 100% | 0 | 3.3 | 17.2 |
| 8 | `qwen3-vl:8b` (brazo visual HOY) | 11.1% | 80% | 16 | 13.7 | 16.9 |
| 9 | `qwen3-vl:4b` | 5.6% | 60% | 19 | 10.0 | 8.7 |
| 10 | `llava:7b` | 0% | 100% | 0 | 10.2 | 0 |
| 11 | `llama3.2-vision:11b` (alucina en sanas) | 16.7% | 0% | 0 | 18.7 | 0 |
| 12 | `moondream` (roto) | 0% | 0% | 17 | 1.5 | 0 |

`ministral-3:latest`, `ministral-3:14b` y `gemma4:12b`-visión: EN ESPERA por orden del
operador. (`gemma4:12b` además está BLOQUEADO: `ollama pull` da 412 "requires a newer
version of Ollama" — la 0.24 de alpha no lo corre.)

## TABLA 2 — TEXTO / INTELIGENCIA (stack completo RAG+grafo+MCP, mejor→peor por ÍNDICE)

RECALL (88.2) y RELACIONES (70.0) son constantes (no dependen del modelo). Método
prod-faithful por fila: gemma vía `/api/generate`; el resto vía `/api/chat` (su template
nativo). **CONTAM** = % que INVENTA en las 20 preguntas trampa (especies inexistentes) —
se lee JUNTO a GROUNDING para no premiar al mudo (un mudo saca 0 % contam pero grounding 0).

| # | Modelo | ÍNDICE | GROUND. | TAXON. | CONTAM↓ | ~GB | método |
|---|--------|:---:|:---:|:---:|:---:|:---:|:---|
| 1 | **`qwen3.5:4b`** ⭐ | **84.7** | 86.9 | 92.3 | **5%** | 3.4 | chat |
| 2 | `gemma3:4b` | 81.7 | 75.0 | 100 | 15% | 3.3 | generate |
| 3 | `gemma4:e4b` | 81.6 | 81.2 | 84.6 | 10% | 9.6 | generate |
| 4 | `phi4-mini` | 79.4 | 75.0 | 84.6 | 25% | 2.5 | chat |
| 5 | `aya:8b` | 79.1 | 74.2 | 84.6 | 30% | 5.0 | chat |
| 6 | `exaone3.5:2.4b` | 78.3 | 65.3 | 100 | 45% | 1.6 | chat |
| 7 | `granite33-dpo` (propio) | 78.1 | 77.9 | 69.2 | 5% | 4.9 | chat |
| 8 | `qwen35-sft-alpha` (propio) | 77.8 | 70.3 | 84.6 | 10% | 4.8 | chat |
| 9 | `qwen3:4b` | 74.5 | 54.3 | 100 | 35% | 2.5 | chat |
| 10 | `qwen3.5:9b` (base) | 70.2 | 48.8 | 84.6 | 0% | 6.6 | chat |
| 11 | `gemma4:e2b` (PROD HOY) | 69.9 | 57.7 | 61.5 | 5% | 7.2 | generate |
| 12 | `granite-keeper` (propio) | 68.2 | 36.4 | 100 | 0% | 5.1 | chat |
| 13 | `qwen35-dpo-alpha` (propio) | 63.2 | 35.4 | 69.2 | 10% | 4.8 | chat |
| 14 | `falcon3:3b` | 61.1 | 32.6 | 61.5 | 50% | 2.0 | chat |
| 15 | `phi4-mini-reasoning` | 60.2 | 13.6 | 100 | **90%** | 3.2 | chat |
| 16 | `llama3.2:3b` | 51.5 | 31.4 | 0 | 0% | 2.0 | chat |
| 17 | `granite33-curado` (propio) | 40.5 | 0·MUDO | 0 | 0% | 4.9 | chat |
| 17 | `qwen35-chagra-cand` (propio) | 40.5 | 0·ROTO | 0 | 0% | 5.6 | chat |

Notas: latencia de texto no se instrumentó por modelo (se usa ~GB como proxy de costo).
`phi4-mini` y `falcon3` sufrieron false-mute bajo contención en la primera pasada (40.5);
re-medidos con GPU limpia dan 79.4 y 61.1 — los valores de la tabla son los limpios.
`phi4-mini-reasoning` NO es mudo: **inventa el 90 % de las trampas** (grounding 13.6) — un
contaminador confiado, descartado. `exaone3.5:2.4b` sorprende (78.3 en 1.6 GB) pero
contamina 45 %.

## THERMAL — recall del retrieval por piso térmico (nivel sistema)

El recall no depende del modelo de chat; este desglose mide si el retrieval rankea igual de
bien los cultivos de piso frío (páramo) que los de cálido.

**Nivel identidad (self-retrieval, 500 especies):** el desglose por piso térmico da recall@5
= **100 % en frío, templado y cálido** — porque el self-retrieval tiene `species_zero_recall
= 0/500` (§3): TODAS las especies recuperan su propia ficha @5, sin importar el piso. Es
decir, **el retrieval NO desfavorece sistemáticamente a los cultivos de páramo (frío)** frente
a los de tierra caliente; la cabecera de identidad (nombre común + científico) domina el
embedding por igual en los tres pisos.

**Nivel folk-query (por-zona sobre golden+ampliado):** NO se completó en la ventana — el
desglose re-embebe 167–667 queries en serie con nomic y a la latencia observada (~6 s/embed
stg→alpha) excedía el tiempo razonable de la corrida nocturna. El script queda en
`scratchpad/thermal.mjs` (nivel sistema, no por modelo) para una corrida dedicada cuando el
embedder esté caliente/local. Dado que el nivel identidad ya es uniforme (100 %/100 %/100 %),
no se espera un sesgo térmico grande en el retrieval; la variación por-zona en folk-queries
sería del orden de la variación general (r@5 79–85 %), no un colapso en piso frío.

## Veredicto integrado

1. **Agente de texto:** `qwen3.5:4b` (84.7) supera al mejor gemma desplegable (`gemma3:4b`
   81.7) y a prod (`gemma4:e2b` 69.9, +14.8). Mejor grounding y la contaminación más baja
   de su nivel (5 %).
2. **Brazo visual:** `qwen3.5:4b` iguala a `gemma3:4b` (45.5) — y ambos triplican al
   `qwen3-vl:8b` actual (16.9), que además arrastra el swap de 53 s. 
3. **Conclusión:** hay un **candidato a modelo único** (`qwen3.5:4b`) que mejora texto,
   iguala visión, suma tools, y elimina el swap del brazo visual — todo en 3.4 GB.
4. **Fine-tunes propios:** ninguno superó a los base; el SFT ayudó, el DPO degradó (§8).
5. **Techo real de visión:** generalistas topan ~45 %; el salto es fine-tuning/CNN, no otro
   VLM base (§9).

(Ninguna de estas mediciones cambió producción — son evidencia para que el operador decida.)

---

# 11. TEST v2 — set duro (120 preguntas verificadas vs grafo) + DELTAS de robustez

El set v2 es 3× más difícil: `ooc_invented_subtle` (binomios falsos plausibles),
`false_premise_numeric` (datos numéricos falsos que el modelo debe corregir),
`pest_cross_crop` (plagas atribuidas al cultivo equivocado), `variety_to_species`.
Método idéntico a v1 (prod-faithful; RECALL/RELACIONES constantes — MCP down, y son
model-independent). Se añadió un clasificador de RECHAZO de premisa (RECHAZA_OK) para no
marcar como alucinación una corrección correcta. **El DELTA v1→v2 = robustez: el que MENOS
cae razona; el que se derrumba memorizó el patrón fácil.**

| Modelo | ÍNDICE v1 | ÍNDICE v2 | Δ (robustez) |
|--------|:---:|:---:|:---:|
| `granite-keeper` | 68.2 | 64.8 | **−3.4** (ya conservador) |
| `qwen35-dpo-alpha` | 63.2 | 62.8 | −0.4 (ya degradado) |
| `exaone3.5:2.4b` | 78.3 | 72.1 | **−6.2** |
| **`qwen3.5:4b`** ⭐ | **84.7** | **76.3** | **−8.4** (líder absoluto v2) |
| `phi4-mini` | 79.4 | 69.5 | −9.9 |
| `granite33-dpo` (propio) | 78.1 | 64.2 | −13.9 |
| `qwen3:4b` | 74.5 | 60.2 | −14.3 |
| `qwen35-sft-alpha` (propio) | 77.8 | 62.5 | −15.3 |
| `qwen3.5:9b` (base) | 70.2 | 51.5 | −18.7 |
| `aya:8b` | 79.1 | 40.5 | **−38.6** (COLAPSA a mudo) |
| `gemma3:4b` | 81.7 | _(corriendo)_ | — |
| `gemma4:e4b` | 81.6 | _(corriendo)_ | — |
| `gemma4:e2b` (PROD) | 69.9 | _(corriendo)_ | — |
| falcon3 / phi4-mini-reasoning / llama3.2:3b / granite33-curado / qwen35-chagra-cand | — | _(corriendo)_ | — |

**Lectura de robustez (preliminar, faltan gemmas):**
- **`qwen3.5:4b` sigue liderando el ÍNDICE ABSOLUTO en v2 (76.3)** y cae moderado (−8.4):
  combina el techo de capacidad con buena robustez. Sigue siendo el candidato a modelo único.
- **Los que menos caen son los ya-conservadores** (`granite-keeper` −3.4, `exaone3.5` −6.2):
  bajan poco porque ya se abstenían mucho — robustez "barata", con techo bajo.
- **`aya:8b` se DERRUMBA** (−38.6, a mudo): fuerte en v1 fácil, frágil ante las trampas
  sutiles — memorizó el patrón, no razona. `qwen3.5:9b` base también cae fuerte (−18.7),
  MÁS que su hermano 4B (−8.4): el 4B es más robusto que el 9B base.
- Los fine-tunes propios caen fuerte (`granite33-dpo` −13.9, `qwen35-sft-alpha` −15.3):
  el fine-tune ajustó al patrón fácil, no generalizó a lo difícil.

_(Tabla parcial — se completa con gemma3:4b/e4b/e2b + los 5 restantes cuando cierre el
sweep de la madrugada. Índices v2 crudos en `scratchpad/v2*.log`.)_
