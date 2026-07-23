# Test de Inteligencia Fuerte de Chagra — línea base 2026-07-23

**Autor:** harness `scripts/test-inteligencia-chagra.mjs` (rama `eval/test-inteligencia`).
**Qué es:** la vara. Un número —el ÍNDICE DE INTELIGENCIA— reproducible, para saber
si un cambio mejoró o empeoró al agente. Este informe fija la línea base de hoy y,
por pedido del operador, compara el modelo de producción (`gemma4:e2b`) contra el
candidato más grande (`gemma4:e4b`) para decidir si vale migrar.

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
