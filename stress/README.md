# Stress tests de Chagra

Set de pruebas de estrés para los 5 frentes de riesgo del stack (agente/NLU,
grafo AGE, sidecar `agro-mcp`, offline/Service Worker, IndexedDB). Todo con
herramientas que YA están en `package.json` (Node nativo, Playwright,
`fake-indexeddb`) — no se sumó ninguna dependencia nueva (no hay k6/artillery
en el repo, así que la carga concurrente se implementa con un pool nativo,
ver `stress/lib/pool.mjs`).

**Regla de oro: por defecto TODO apunta a `localhost` / `127.0.0.1`.** Nunca
apuntes estos scripts a `alpha`/prod/stg sin coordinarlo — el sidecar y Ollama
corren con recursos limitados (GPU M6000 de 12 GiB, ver `INFRA_FACTS.md`) y
una corrida de estrés real los puede tumbar. Si necesitás medir contra un
host remoto, hazlo con `CONCURRENCY`/`TOTAL` bajos primero y escala con
cuidado, idealmente avisando antes.

## Los 5 scripts

| # | Frente | Script | Qué golpea |
|---|--------|--------|------------|
| 1 | Agente/NLU concurrente | `agent-nlu-load.mjs` | `POST {SIDECAR_URL}/nlu` y/o `POST {OLLAMA_URL}/api/chat` |
| 2 | Grafo/grounding | `grafo-grounding-load.mjs` | `POST {SIDECAR_URL}/resolve-entities` (modo `sidecar`) o Cypher crudo vía `psql` contra `chagra_kg` (modo `psql`) |
| 3 | Sidecar agro-mcp | `sidecar-load.mjs` | `GET {SIDECAR_URL}/healthz` + `POST {SIDECAR_URL}/tools/<tool>` |
| 4 | Offline/SW bajo red intermitente | `offline-intermittent.spec.js` (Playwright) | flapping `context.setOffline()` en ciclos, contra el dev server local |
| 5 | IndexedDB con volumen | `indexeddb-load.mjs` | schema real de `src/db/dbCore.js` sobre `fake-indexeddb` (en memoria, Node puro) |

Todos (menos el spec de Playwright) comparten:

- `stress/lib/pool.mjs` — pool de concurrencia nativo (sin `p-limit`).
- `stress/lib/stats.mjs` — percentiles p50/p90/p95/p99, sin dependencias.
- `stress/lib/report.mjs` — reporte consola + JSON opcional + chequeo de
  umbrales (exit code 1 si algún umbral configurado falla).
- `stress/lib/mockFetch.mjs` — backend HTTP sintético para `DRY_RUN=1` (ver
  abajo).
- `stress/lib/sidecarAuth.mjs` — resuelve el token del sidecar igual que
  `scripts/lib/bench-sidecar.mjs` (`~/.config/chagra-sidecar-token.txt` o
  `SIDECAR_TOKEN`).

## DRY_RUN — validar el harness sin tocar red real

Los 4 scripts que hablan HTTP (`agent-nlu-load`, `grafo-grounding-load` modo
`sidecar`, `sidecar-load`, y el modo `psql` de `grafo-grounding-load`)
soportan `DRY_RUN=1`: reemplazan `fetch` por un mock stateful
(`stress/lib/mockFetch.mjs`) que simula latencia + una curva de saturación
creíble (sube la probabilidad de HTTP 503 cuando hay muchos requests en
vuelo) sin abrir un solo socket real. Sirve para:

- Confirmar que el script corre de punta a punta (pool, timers, percentiles,
  reporte, umbrales) antes de apuntarlo a un host de verdad.
- Smoke-test rápido en CI si algún día se quiere un chequeo de que el harness
  no se rompió (no mide nada real, solo que el código funciona).

`indexeddb-load.mjs` es inherentemente seguro de correr siempre (memoria
efímera del proceso Node, nunca toca el IDB real de un dispositivo) — su
`DRY_RUN=1` solo reduce el volumen a una corrida mínima (50 registros) para
un chequeo rápido.

```bash
DRY_RUN=1 node stress/agent-nlu-load.mjs
DRY_RUN=1 MODE=psql node stress/grafo-grounding-load.mjs
DRY_RUN=1 node stress/sidecar-load.mjs
DRY_RUN=1 node stress/indexeddb-load.mjs
npx playwright test --list --config=stress/playwright.stress.config.js   # valida discovery sin browser
```

## 1. Agente/NLU concurrente — `agent-nlu-load.mjs`

```bash
node stress/agent-nlu-load.mjs                                   # sidecar /nlu, 40 reqs, concurrencia 8
MODE=ollama-chat TOTAL=60 CONCURRENCY=12 node stress/agent-nlu-load.mjs
MODE=both node stress/agent-nlu-load.mjs                          # corre las dos fases, reportes separados
```

| Env var | Default | Qué hace |
|---|---|---|
| `MODE` | `sidecar-nlu` | `sidecar-nlu` \| `ollama-chat` \| `both` |
| `SIDECAR_URL` | `http://localhost:7880` | base del sidecar |
| `SIDECAR_TOKEN` | (auto) | header `X-Chagra-Token` |
| `OLLAMA_URL` | `http://localhost:11434` | base de Ollama |
| `OLLAMA_CHAT_MODEL` | `granite3.3:8b` | modelo de chat de prod |
| `TOTAL` | `40` | preguntas totales a disparar |
| `CONCURRENCY` | `8` | simultáneas |
| `TIMEOUT_MS` | `20000` | por request (NLU real usa 18s, ver `sidecarClient.js`) |
| `RAMP_MS` | `0` | stagger entre el arranque de cada worker (evita thundering herd si se quiere algo más gradual) |
| `P95_THRESHOLD_MS`, `P99_THRESHOLD_MS`, `MAX_ERROR_RATE`, `MAX_503_RATE` | — | opcionales; si se setean, el script marca FAIL y sale con código 1 al incumplirse |
| `OUT_JSON` / `SAVE_OUTCOMES=1` | — | persiste el reporte (y crudo por request) a `stress/results/` |

**Qué vigilar:** `p95`/`p99` de `/nlu` — el cliente de prod aborta a los 18s
(`NLU_TIMEOUT_MS`), así que un p99 acercándose a eso ya es señal de alerta.
Cualquier `503` en la fase `ollama-chat` es saturación directa de la GPU
(cola de Ollama llena); en la fase `sidecar-nlu` puede ser el sidecar
rechazando por su propio límite o Ollama saturado puertas adentro.

## 2. Grafo/grounding — `grafo-grounding-load.mjs`

```bash
node stress/grafo-grounding-load.mjs                              # modo sidecar (HTTP), default
MODE=psql PGHOST=localhost PGDATABASE=chagra_kg node stress/grafo-grounding-load.mjs
```

| Env var | Default | Qué hace |
|---|---|---|
| `MODE` | `sidecar` | `sidecar` (HTTP `/resolve-entities`) \| `psql` (Cypher crudo) |
| `SIDECAR_URL`, `SIDECAR_TOKEN` | igual que arriba | — |
| `AGE_GRAPH` | `chagra_kg` | nombre del grafo AGE |
| `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` | (env de `psql`/`.pgpass`) | solo modo `psql` |
| `TOTAL` | `60` | — |
| `CONCURRENCY` | `10` | — |
| `TIMEOUT_MS` | `15000` | — |

El modo `sidecar` (default, el que corresponde correr desde este repo
frontend) pega a `/resolve-entities` con preguntas que mencionan especies,
plagas y biopreparados reales — es la ruta que puertas adentro dispara los
`MATCH` de Cypher sobre `chagra_kg`. Además del reporte de latencia estándar,
imprime una sección **"Señal AGE"**: cuántas respuestas exitosas vinieron con
`age_available:false` o con `entities: []` pese a mencionar una entidad
conocida — eso es degradación del grafo bajo carga, no solo latencia alta.

El modo `psql` ejecuta Cypher **crudo** (adaptado de
`scripts/age-queries-example.sql`) vía el binario `psql`, concurrente. Este
repo (PWA frontend) **no tiene** credenciales de Postgres por diseño — este
modo es para correrlo desde el host que sí tiene acceso a `postgres-farm`
(ver `Chagra-strategy/ops/INFRA_FACTS.md`). Si `psql` no está en PATH, el
script avisa y sale con código 3 (no revienta).

**Qué vigilar:** `age_available:false` > 0 bajo carga moderada = el grafo se
está cayendo antes que el resto del sistema — es la señal más importante de
este frente, más que la latencia cruda.

## 3. Sidecar agro-mcp — `sidecar-load.mjs`

```bash
node stress/sidecar-load.mjs
TOTAL=150 CONCURRENCY=20 node stress/sidecar-load.mjs
```

| Env var | Default |
|---|---|
| `SIDECAR_URL`, `SIDECAR_TOKEN` | igual que arriba |
| `TOTAL` | `80` |
| `CONCURRENCY` | `15` |
| `TIMEOUT_MS` | `8000` (tools reales usan 5s, ver `TOOL_TIMEOUT_MS`) |
| `HEALTHZ_RATIO` | `0.25` — fracción de requests que van a `/healthz` en vez de a una tool |

Mezcla `GET /healthz` con `POST /tools/<toolName>` usando los mismos
`toolName`+`args` que llaman los servicios reales (`get_species`,
`get_companions`, `get_biopreparados`, `get_clima_ideam`,
`get_alertas_clima_zona`, `get_enso_status` — ver
`src/services/sidecarClient.js`). Imprime 3 reportes: combinado, solo
`/healthz`, solo `/tools/*`, más un desglose de errores por tool.

**Qué vigilar:** `/healthz` debería mantenerse rápido y sin errores AUNQUE
`/tools/*` esté saturado — si `/healthz` también se degrada, el problema es
el proceso del sidecar (o su event loop), no una tool puntual.

## 4. Offline/SW bajo red intermitente — `offline-intermittent.spec.js`

Playwright, con su **propio config aislado**
(`stress/playwright.stress.config.js`) — a propósito NO vive bajo `tests/`
para que no se sume a `npm run test:e2e` ni al workflow
`.github/workflows/playwright.yml` (son specs de carga, más lentas y con
parámetros configurables, no el gate funcional normal).

```bash
npx playwright test --config=stress/playwright.stress.config.js
# o apuntado explícito al spec:
npx playwright test --config=stress/playwright.stress.config.js offline-intermittent
```

| Env var | Default |
|---|---|
| `STRESS_OFFLINE_CYCLES` | `5` — ciclos de offline→online |
| `STRESS_ACTIONS_PER_CYCLE` | `2` — siembras encoladas por ciclo offline |
| `STRESS_FLAP_DELAY_MS` | `250` — ventana "online" entre ciclos antes de volver a cortar |
| `PLAYWRIGHT_BASE_URL` | `http://localhost:5173` (levanta su propio `vite --port 5173` si no se setea) |

Extiende el patrón ya usado en `tests/offline.spec.js` (login mock +
`context.route('**/api/**')` abortando + `context.setOffline`), pero en vez
de un solo corte hace **flapping**: N ciclos offline→online seguidos,
generando transacciones en cada ventana offline. Valida:

1. La UI base (`"Tareas pendientes"`) sigue visible después de cada ciclo —
   la PWA no queda en blanco ni crashea.
2. La cola de `pending_transactions` en IndexedDB solo CRECE durante el
   flapping — nada se pierde ni se duplica al reconectar en caliente.
3. Cero `pageerror` (excepciones JS no capturadas) durante toda la corrida.

**Requiere** un dev server local (`vite`) y Chromium — no toca ningún backend
real (todo `**/api/**` se aborta a propósito, igual que `offline.spec.js`).
Correrlo completo no es "dry-run": levanta browser + servidor, así que puede
tardar ~30-60s; para validar solo que el spec está bien armado sin pagar ese
costo, usa `--list` (ver sección DRY_RUN arriba).

## 5. IndexedDB con volumen — `indexeddb-load.mjs`

```bash
node stress/indexeddb-load.mjs                       # 3000 registros por store, ambos stores
RECORDS=20000 STORE=logs node stress/indexeddb-load.mjs
DRY_RUN=1 node stress/indexeddb-load.mjs              # 50 registros, chequeo rápido
```

| Env var | Default |
|---|---|
| `STORE` | `both` — `logs` \| `rag_telemetry` \| `both` |
| `RECORDS` | `3000` (por store) |
| `BATCH_SIZE` | `200` — tamaño de transacción para la escritura por lotes |
| `ASSET_COUNT` | `50` — activos distintos que "acumulan" logs (distribución realista, no 1 log por activo) |
| `SINGLE_WRITE_SAMPLE` | `300` — muestra de escrituras 1-por-transacción (costo "peor caso" sin batching) |
| `READ_SAMPLE` | `300` — muestra de lecturas por clave primaria |
| `WRITE_P95_MS`, `READ_P95_MS`, `INDEX_P95_MS` | — umbrales opcionales |

Corre contra el **schema real de producción**
(`DB_NAME`/`DB_VERSION`/`STORES` de `src/db/dbCore.js`, hoy v26), pero sobre
`fake-indexeddb` (ya devDependency, usado en `tests/unit/setup.js`) en vez de
un navegador — implementación en memoria fiel a la spec IDB, así que el
costo relativo write/read/índice es representativo, y corre en Node puro sin
Playwright/Chromium. Es **inherentemente seguro**: memoria efímera del
proceso, nunca toca el IndexedDB real de un dispositivo ni ningún backend.

Mide, por store:

1. Escritura por lotes (`BATCH_SIZE` registros por transacción — el patrón
   real de sync).
2. Escritura individual (1 transacción por registro — el costo "sin batching").
3. Lectura por clave primaria (`get(id)`, sample de ids reales ya escritos).
4. Lectura por rango de índice — timeline de un `asset_id` en `logs` (usa el
   índice compuesto `asset_id_timestamp`, Issue #244) o por `surface` en
   `rag_telemetry`.
5. Full-scan: `count()` y `getAll()` sobre el store ya poblado.

**Qué vigilar:** el índice `asset_id_timestamp` existe justamente para que
la lectura de timeline de UN activo no dependa del tamaño TOTAL del store —
si su p95 empieza a escalar linealmente con `RECORDS`, algo rompió esa
garantía (ver comentario "Issue #244" en `src/db/dbCore.js`).

## Convención común de salida

Todos los scripts imprimen un reporte de consola con: throughput (req/s),
tasa de error, tasa de HTTP 503, latencia (min/mean/p50/p90/p95/p99), y
histogramas de status/errores. Si se configura algún umbral (`*_THRESHOLD_MS`,
`MAX_ERROR_RATE`, `MAX_503_RATE`, `WRITE_P95_MS`, etc.) el script marca
`[OK]`/`[FAIL]` por umbral y sale con código de salida `1` si alguno falla —
pensado para poder engancharse a un chequeo automatizado el día que se quiera
correr esto en CI contra un entorno de staging dedicado (NO contra prod).

`OUT_JSON=<ruta>` o `SAVE_OUTCOMES=1` persisten el reporte (y opcionalmente
cada request crudo) en `stress/results/` — directorio ignorado por git (ver
`.gitignore`), igual que `/data/bench-runs/`.
