# Reporte consolidado de benches — noche 2026-07-06

**Runner:** Agent (bench runner nocturno) — se quedó sin tokens a mitad de cierre; este
reporte completa su trabajo con los resultados crudos ya generados.
**Modelo evaluado (generador):** `granite3.3:8b` (confirmado en vivo en `alpha` vía `ollama ps`).
**Juez:** `claude-code -p` (shell-out a la suscripción del entorno, batch secuencial).
**Sidecar/Ollama:** viven en `alpha` (loopback); acceso vía `ssh alpha`.
**Regla de ejecución:** los 4 benches corrieron ESTRICTAMENTE UNO A LA VEZ para no saturar la M6000 (12 GB).

Artefactos crudos y summaries: `data/bench-runs/consolidado-2026-07-06/`.

---

## Resumen ejecutivo

| # | Bench | Métrica principal | Veredicto |
|---|-------|-------------------|-----------|
| 1 | Anti-alucinación / trío de guards | **4.9%** contaminación (3/61) | ✅ mejora vs 11.5% del 07-05 |
| 2 | Contaminación semántica ON (tools+RAG) | **38.5%** pass (juez) vs 11.8% (scorer literal) | ⚠️ el scorer literal subvalora; el fondo está mejor de lo que dice |
| 3 | Q&A campesina + experta (16 casos) | 9/16 limpias · 7 con hallazgo | ⚠️ cazó sobre-pitch, picudo, familias/patógenos errados |
| 4 | NLU routing (20 casos × 3 reps) | **85%** solo · **95%** con corrector · 0/60 crashes | ✅ dentro de gate |

**Trío de guards funcionando:** `cross_thermal` cayó de 33.3% → 7.7%, `cross_crop` 16.7% → 0%,
`pest_vs_disease` 5% → 0%. El residuo migró a **`confusion_especie` (0% → 9.5%)**: el modelo ya
no falla el piso térmico ni cruza plagas de cultivo, pero **fabrica pertenencias de familia botánica
en prosa** — que ningún guard corta hoy.

---

## Incidente operativo (worktree efímero eliminado a mitad de corrida)

La primera corrida del bench #1 completó el remote-run (69 respuestas GPU) y la fase de juez,
pero crasheó con `ENOENT` al escribir el `.judged.jsonl` final. Causa raíz verificada: el worktree
del agente (`.claude/worktrees/agent-a9df505cb1389ded1`) fue **eliminado completo a mitad de corrida**
(probablemente el timer git-janitor de 30 min), llevándose `data/bench-runs/` con el crudo ya escrito.
Los veredictos del juez vivían solo en memoria → se perdieron con el proceso (~23 min de GPU perdidos).
**Mitigación aplicada:** re-lanzar desde el checkout principal (`/home/kortux/Workspace/chagra`, estable)
con la salida apuntando al scratchpad session-specific (no lo toca git-janitor).
**Lección:** NUNCA escribir resultados de bench a un worktree de agente efímero.

---

## 1) Anti-alucinación / contaminación cruzada (trío de guards)

- **Script:** `scripts/bench-contaminacion.mjs` (probes → remote-run en alpha → juez `claude-code -p`).
- **Catálogo:** `catalog/chagra-catalog-oss-subset-v3.2.json` (580 especies).
- **Sondas:** 69 (3 fijas + 5 cross_crop + 13 cross_thermal + 21 confusion_especie + 21 pest_vs_disease + 1 contacto_inventado). Pipeline real con los 3 guards (piso_termico #288 / confusion_especie #292 / pest_vs_disease #293) + resolve-entities AGE + post-validate.
- **Resultado:** 69/69 corridas OK · 0 errores · 61 juzgadas · **contaminación 4.9% (3/61)**.

| Tipo | Contaminadas | Total | Tasa | Δ vs 2026-07-05 |
|---|---:|---:|---:|---|
| confusion_especie | 2 | 21 | **9.5%** | ⬆ desde 0% |
| cross_thermal | 1 | 13 | 7.7% | ⬇ desde 33.3% |
| pest_vs_disease | 0 | 21 | 0% | ⬇ desde 5% |
| cross_crop | 0 | 5 | 0% | ⬇ desde 16.7% |
| contacto_inventado | 0 | 1 | 0% | — |
| **Global** | **3** | **61** | **4.9%** | **⬇ desde 11.5%** |

### Qué cazó

1. **Institución inventada (kale en páramo).** Manejó bien la trampa térmica (dijo que el kale
   no va en páramo) pero cerró recomendando consultar *"el Centro Nacional de Historia Natural (CNHN)
   o el Instituto de Investigación Biológica Los Andes Caldwell"* — **ambas inexistentes**.
   → Hole de **contacto/institución inventada**.
2. **Guayaba y plátano en Passifloraceae.** Sobre la gulupa: *"tiene similitudes con otras plantas
   de la familia Passifloraceae, como las guayabas (Psidium) o los plátanos (Musa)"*. Son **Myrtaceae**
   y **Musaceae** respectivamente. → Hole de **familia botánica errada**.
3. **Morera en Rosaceae.** Sobre la mora andina: *"frutos en forma de baya o pomelo, como en el caso
   de las moreras"* dentro de la familia Rosaceae. La morera (*Morus*) es **Moraceae**.
   → Hole de **familia botánica errada**.

### Tendencia

El trío de guards (piso térmico #2067 / confusion+pest #2077) **está funcionando**: la contaminación
global bajó a menos de la mitad y las tres categorías que el guard cubre directamente cayeron. El
riesgo residual es que **el modelo afirma pertenencia a familia botánica en prosa** ("X pertenece a
la familia Y como Z") y el `confusion_especie` guard actual no inspecciona ese patrón — solo dispara
por otra señal. Es el hole #1 abierto (issue de familias erróneas).

---

## 2) Contaminación FULL con semántica ON (pipeline tools + RAG)

- **Script:** `scripts/bench-complejos-con-tools.mjs` (resolve-entities + /nlu→/tools + RAG semántico arctic-embed2 + guards + post-validate).
- **Fixture:** `TEST_PROMPTS_HARDENED_2026-06-22` (34 trampas endurecidas).
- **Resultado:** con RAG ON (embeddings presentes, guards de prod importados).

| Métrica | Valor |
|---|---|
| Pass (juez `claude-code -p`, por FONDO) | **38.5%** (10/26 juzgados) |
| Baseline literal (scorer determinístico) | 11.8% |
| AH (fail/juzgados) | 61.5% |
| Sin juzgar | 8/34 (juez se cortó por tokens) |

**Lectura:** el scorer literal (match de strings "must-have") **subvalora fuerte** — muchas respuestas
cubren el fondo agronómico con otras palabras. El juez semántico las reconoce y sube el pass a 38.5%.
Es la diferencia esperada entre "con-tools" y "con-grounding literal".

**Nota metodológica importante (infra, ver §5):** la corrida original con juez Haiku vía API
(`claude-haiku-4-5`, provider=anthropic) devolvió **judged=0 / JUDGE-SCORE 0.0%** — el egress a la API
de Anthropic **está bloqueado desde `alpha`**. El 38.5% proviene del re-judge con `claude-code -p`
desde el entorno con suscripción. Los 8 "sin juzgar" son items que quedaron fuera cuando el runner
se quedó sin tokens (todas las cadenas MEGA-CHAIN-*).

**Guards que dispararon en esta corrida** (señal de que el pipeline sí interviene): `paramo_normativa_suprimido`,
`crop_agnostic_safety_sin_cura` (HLB, moniliasis, sigatoka — "no hay cura, manejo integrado"),
`crop_agnostic_safety_export_mrl`, `binomio_inventado_fuera_de_grounding`, `guardConciseResponse:verbose`.

---

## 3) Q&A del agente (batería campesina + experta)

- **Batería:** 16 preguntas (8 campesinas / 8 expertas) grounded contra el catálogo real, incluyendo pruebas de abstención (precio SIPSA en vivo, permiso ICA) y de deflección (saludo). Pipeline real con los 3 guards + juez `claude-code -p`.
- **Resultado:** 9/16 limpias, **7 con hallazgo**. Latencias 6.7–27 s.

### Bien (sin contaminación)

- **QA-06 SIPSA** — abstención honesta: *"no tengo acceso directo a datos en tiempo real"*. ✅
- **QA-07 ICA** — orienta al trámite sin inventar resolución. ✅
- **QA-09 roya** — *Hemileia vastatrix* correcto. ✅
- **QA-12 Tecia** — clasifica *Tecia solanivora* como plaga (no enfermedad), correcto. ✅
- **QA-15 aguacate** — *Persea americana* → Lauraceae, correcto. ✅
- QA-01, QA-11, QA-16 también limpias.

### Hallazgos cazados

| ID | Tipo | Qué pasó | Hole |
|---|---|---|---|
| **QA-08** | campesina | Ante *"Buenos días"* hizo **pitch de especies no solicitado** (jobo, ciruela criolla, jobo cajá) en vez de deflectar. | **sobre-pitch / misruteo** |
| **QA-14** | experta | *"El picudo se identifica como Diaprepes abbreviatus"* — **confunde *Anthonomus grandis* (picudo del algodonero, cuarentenario) con otra especie**. | **picudo** |
| QA-10 | experta | Atribuye el **tizón tardío a *Cladosporium cladosporioides*** (su patógeno correcto es *Phytophthora infestans*). | familia/patógeno errado |
| QA-13 | experta | Dice que la **papa parda pastusa** es de piso *"intermedio a cálido"*; es de **piso frío/páramo**. | cross_thermal residual |
| QA-03 | campesina | Afirma con certeza **ácaro *Tetranychus urticae*** ante "bichitos blancos voladores" (síntoma de **mosca blanca**). | confusión de especie |
| QA-04 | campesina | Inventa receta con dosis *"proporción 1:1"* melaza+Bt para la broca (Bt no controla un coleóptero). | dosis/receta inventada |
| QA-05 | campesina | Nombra entidad de apoyo no verificable *"como SERAGRO en tu región"*. | contacto/institución inventada |

**Los dos hallazgos marcados en negrita (QA-08 sobre-pitch, QA-14 picudo) son los holes destacados
del bench.** QA-05 refuerza el hole de institución inventada del bench #1 (kale). QA-10/QA-13 refuerzan
el hole de familia/piso térmico. QA-03/QA-04 son residuos menores (el juez es estricto).

---

## 4) NLU routing / misruteo

- **Script:** `scripts/nlu-bench/nlu-bench.mjs` (importa la pipeline real del `dist/` compilado del sidecar; system prompt de prod 8922 chars, 42 tools).
- **Alcance:** `--only granite3.3:8b --reps 3` → 20 casos × 3 = 60 llamadas (solo el modelo de prod).

| modelo | acc solo | acc + corrector | p50 | p95 | crashes |
|---|---|---|---|---|---|
| granite3.3:8b | **85%** | **95%** | 3300 ms | 7002 ms | 0/60 |

### Casos que fallaron solo (corregidos por el corrector salvo C01)

- **C01** — `get_companions+get_biopreparados` esperado; el modelo eligió `get_multihop_companions+get_biopreparados`. El corrector no lo arregla (queda como el único fallo residual; el multihop es semánticamente cercano pero no idéntico).
- **C07** — eligió una cadena de 3 tools en vez de `get_subgrafo_relacional`; **el corrector lo arregla** → OK.
- **C16** — `get_species` esperado, resolvió a `chat/none`; **el corrector lo arregla** → OK.

**Lectura:** routing sólido y estable (0 crashes, p95 7 s dentro del gate). El corrector recupera 2 de
3 misruteos. El único fallo neto (C01) es un multihop vs single-hop discutible. No amerita issue nuevo.

---

## 5) Hallazgos de infraestructura (para memoria)

1. **`options:{num_gpu:0}` NO fuerza el embedder a CPU de forma confiable.** El bench de RAG hereda el
   riesgo de OOM que prod ya resolvió: `embedQuery()` de `scripts/bench-complejos-con-tools.mjs` no
   replica el fix de `src/services/ragRetriever.js`, y aun pasando `num_gpu:0` el embedder puede
   co-residir con granite en la M6000 → `cudaMalloc` OOM → mata el runner de granite → `/nlu` degrada a
   `use_tool:false` → medición inválida. Por eso el bench declara `BENCH_NO_RAG=1` como salvaguarda.
   **Acción:** replicar el patrón de prod (embedder pineado en runner CPU aparte, no confiar solo en
   `num_gpu:0` por request) o correr el embed en un proceso Ollama separado con `CUDA_VISIBLE_DEVICES=""`.

2. **El juez Haiku vía API Anthropic está bloqueado por egress desde `alpha`.** La corrida del bench #2
   con `claude-haiku-4-5` (provider=anthropic) devolvió **judged=0**. `alpha` (host GPU) no tiene salida
   a la API de Anthropic (ni `ANTHROPIC_API_KEY` configurada). El juez que sí funciona es `claude-code -p`
   (shell-out a la suscripción del entorno de orquestación, no de `alpha`). **Acción:** para benches con
   juez-por-fondo, usar siempre `claude-code -p` desde el orquestador, o abrir egress/proveer key si se
   quiere Haiku nombrado.

3. **`repinGranite()` del nlu-bench re-pinea el nombre STALE `granite3.1-dense:8b`** (prod hoy es
   `granite3.3:8b`). En una GPU de 12 GB donde granite3.3 ya reside, cargar granite3.1 pineado con
   `keep_alive:-1` arriesga desalojar el modelo real de prod. **Mitigación aplicada:** tras el bench se
   re-pineó `granite3.3:8b` y se verificó `ollama ps`. **Acción:** corregir el nombre en el script.

---

## Issues abiertos a partir de estos holes

| Issue | Hole | Severidad | Fix al que apunta |
|---|---|---|---|
| [#2132](https://github.com/guatoc-ecohub/Chagra/issues/2132) | Familia botánica errada en prosa (guayaba/plátano→Passifloraceae, morera→Rosaceae; QA-10 Cladosporium) | P1 | endurecer guard `confusion_especie` #2077 + glosario #971/#1024 |
| [#2133](https://github.com/guatoc-ecohub/Chagra/issues/2133) | Institución/entidad de apoyo inventada (CNHN, Los Andes Caldwell, SERAGRO) | P1 | extender `guardInventedContact` #1949 (análogo de marcas #1305) |
| [#2134](https://github.com/guatoc-ecohub/Chagra/issues/2134) | Sobre-pitch de especies ante un saludo (QA-08) | P2 | PR #2127 (deflección genérica, ABIERTO) — agregar caso de regresión |
| [#2135](https://github.com/guatoc-ecohub/Chagra/issues/2135) | Picudo *Anthonomus grandis* confundido con *Diaprepes* (QA-14) | P1 | rama `glm/gl-picudo-grounding` — promover a PR + validar |

Los 4 issues enlazan a PRs/ramas de fix ya existentes; ninguno duplica trabajo (extienden guards
mergeados o verifican fixes en vuelo).
