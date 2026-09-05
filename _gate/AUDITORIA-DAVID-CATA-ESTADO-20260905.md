# AUDITORÍA — estado real HOY de los 9 bugs del hard-test de entrega David & Cata

> Fecha: 2026-09-05 · Carril: Claude (Opus) · Método: verificación **por contenido contra el sha desplegado** + corridas Playwright en vivo.
> Solo lectura en git. No se hizo checkout, commit ni se tocó el índice.

## Base de la auditoría (lo primero que hay que fijar)

| dato | valor | cómo se verificó |
|---|---|---|
| Deploy vivo | `db8c45ac` (`2026-09-05T20:00:16Z`) | `curl https://chagra-dev.guatoc.co/version.json` |
| `origin/dev` HEAD | `a9a9744a7` | `git log origin/dev` tras `git fetch` |
| Distancia deploy ↔ dev | **1 commit, solo docs** | `git show --stat a9a9744a7` → toca únicamente `.rescue/RESCATE-5-RAMAS-SIERRA-20260905.md` |
| `git diff db8c45ac7 origin/dev -- src/` | **VACÍO** | salida cruda vacía |

**Conclusión de la base: el código desplegado ES `origin/dev`.** Todo lo que sigue se verificó con
`git show db8c45ac7:<ruta>`, es decir, contra el bundle que David y Cata van a abrir.

---

## Tabla de veredictos — los 9 bugs

| id | sev | veredicto HOY | evidencia |
|---|---|---|---|
| BUG-01 | P1 | **VIVO — CONFIRMADO EN VIVO** | La ingesta del agente encola y **nadie empuja**. Cadena verificada: `llmTools.js:390` → `agentComplexIngest.js:239 persistComplexIngest` → `farmEventService.js:144/206` → `farmProcessSync.js:252 enqueueFarmProcessEvent` → `syncManager.saveTransaction` (`syncManager.js:87`), que **solo hace `store.add({...,synced:false})`** — cero POST, cero disparo de sync. Ver §BUG-01: el relay de background-sync está roto por identificador. |
| BUG-02 | P2 | **ARREGLADO** | Modal real con `key={actionModal.gateId}` (`AgentScreen.jsx:4614`), estado `actionModal` (`:297`), handlers `handleActionApprove`/`handleActionReject` (`:879`/`:889`). Confirmado en vivo en corrida 2 (lista legible, no JSON; botones Rechazar/Editar/Aprobar). |
| BUG-03a | P1 | **VIVO — y el fix es CONTRAPRODUCENTE** | `omitEmptyCalendarioArgs()` (`sidecarClient.js:983`) borra `mes`/`piso_termico` cuando vienen string vacío, y vive DENTRO de `callTool()` (`:1002-1006`), que es el **único** camino a `/tools/:name` en todo el cliente (grep de `/tools/` → 1 sola ocurrencia real, `sidecarClient.js:1006`). El fix cubre también el caso del planner NLU server-side, que era la causa que quedó abierta en corrida 2. |
| BUG-04 | P2 | **ARREGLADO** | Contrato del cliente `{ agent_response: responseText }` (`sidecarClient.js:846-848`). Corrida 2 midió 6/6 turnos con 0×400. |
| BUG-05 | P2 | **PARCIAL — el dato está, la app NO lo usa** | Grafo AGE `chagra_kg`: `Cucurbita pepo L.` / "Calabacín / Zucchini" / id `cucurbita_pepo` **existe**. Instrumento calibrado antes de concluir (743 Species, coincide con el SSOT). También en `catalog/chagra-catalog-seed-v3.2.json` y `catalog/chagra-kg-graph-snapshot.json` del cliente. |
| BUG-06 | **P0 de facto** | **VIVO — y la causa que el tracker le atribuía era FALSA** | Ver §BUG-06. Las 7 guardas **sí van en `Promise.all`** (`AgentScreen.jsx:1653`) y el par subgrafo/multihop se paralelizó (`:1810`). El informe de la propia flota (`_gate/INFORME-LATENCIA-20260904.md`, commit `afc18633c`) mide el pre-LLM en **1,6–3,0 s**, no 35–61 s. El MCP **no explica** la latencia. Lo mergeado fue un ahorro de **~171 ms**. El número del operador (~8 s) sigue sin cumplirse y **ya no se sabe por qué**. |
| BUG-07 | P1 | **PARCIAL — la UI ya no se pega, pero no responde en 61 s** | `clearAgentAttachment()` se llama ANTES del trabajo de visión (`AgentScreen.jsx:3571`), `setState(STATE_THINKING)` (`:3574`), `processPhotoItemBounded` con techo duro + `onTimeout: () => visionController.abort()` (`:3581-3588`), `skipRag:true` (`:3583,3595,3735,3752`) mata la cascada de catálogo, y se alcanza `await handleSubmit(...)` (`:3590`). Los 4 síntomas quedan atacados. **Reserva:** `media_cache` seguirá en 0 — el camino del agente **no llama `savePhoto`** (grep en `AgentScreen.jsx` → 0). Es diseño, no bug, pero la foto que manda Cata se analiza y se pierde. |
| BUG-08 | P2 | **PARCIAL — CONFIRMADO EN VIVO, NO bug resuelto** | Confirmado por contenido: `App.jsx:3408` renderiza `<InventoryDashboard />` **sin props** en `case 'bodega'`; `InventoryDashboard.jsx:120` pinta los botones solo bajo `{(onRecount || onViewAudit) && (…)}`. El único cableo real es `InventoryPage.jsx:114-115` (ruta `auditoria_inventario`). En **Bodega los botones no existen**; solo aparecen entrando por el botón "Auditoría" (`data-testid=bodega-open-auditoria`, `App.jsx:3398`). |
| BUG-09 | P3 | **ARREGLADO — CONFIRMADO EN VIVO (mitad A)** | `resolveDestinoPostLogin()` (`userProfileService.js:1011`) devuelve `'onboarding-perfil'` si `hasSeenProfileOnboarding()` es falso, y se usa en los DOS logins: password (`App.jsx:1806`) y OAuth (`App.jsx:1817`). **Matiz:** los flags viven en `localStorage` → en un teléfono nuevo el onboarding vuelve a salir. |
| **BUG-10** | **P1** | **NUEVO — VIVO** | Descubierto hoy. `InventoryDashboard.jsx:41` pone `'unidades'` (plural) por defecto; `VALID_UNITS` (`inventoryEvents.js:35`) solo acepta **`'unidad'`** (singular) → el conteo manual falla con `got "unidades"` y `inventory_events` queda en 0. El `<select>` muestra "bolsa" mientras el estado es el valor inválido. Con `unit='kg'` explícito, `inventory_events` 0→1. Arreglo de UNA línea. |

---

## §BUG-01 — la causa raíz, que hasta hoy estaba sin identificar

Corrida 3 dejó escrito: *"Queda sin confirmar si esa cola alguna vez se vacía sola (no se identificó
el código exacto que la flushea para el caso del agente)"*. **Queda identificado, y la respuesta es
que no se vacía sola.**

### Dos tuberías, no una

| camino | qué hace | ¿llega a farmOS solo? |
|---|---|---|
| Manual "Registrar" (`RegistroUnificadoScreen` → `payloadService.savePayload` → `sendToFarmOS`) | POST directo online | **SÍ** — corrida 2 lo midió: `POST /api/log/harvest` → 201 |
| Agente NLU (`persistComplexIngest` → `enqueueFarmProcessEvent` → `syncManager.saveTransaction`) | `store.add({...,synced:false})` en `pending_transactions` | **NO** |
| Surco nuevo (`loteService.createLote` → `useAssetStore.addAsset`) | IDB + cola | **NO** |
| `addHarvestLog` / `addInputLog` (`useAssetStore:371/472`) | IDB + cola | **NO** (`savePayload` solo se llama en `:761,899,948`) |

### Quién drena la cola

`syncAll()` **no tiene `setInterval` ni arranque automático** (grep en `syncManager.js`: 0
`setInterval`). Sus únicos disparadores:

1. `window 'online'` (`syncManager.js:725`) — solo en la transición offline→online.
2. El usuario **toca el badge ámbar** `SyncIndicator` (`SyncIndicator.jsx:28`), que además solo se
   pinta si `pending > 0` (`:16`).
3. Montar `TaskLogScreen` (`TaskLogScreen.jsx:34`).
4. Mensaje `SYNC_REQUESTED` **emitido por el SW** (`main.jsx:88`), que solo sale de
   `sw.js:539`, dentro del handler del evento `sync`.

`main.jsx` en el arranque hace un **pull** (`pullRecentLogs`, `:71`) pero **ningún push**.

### El relay de background-sync está roto por identificador desalineado

Este es el patrón de [[feedback_controles_ciegos_por_identificador]], otra vez:

- **9 call-sites** mandan `postMessage({type:'SYNC_REQUESTED'})` al service worker
  (`useAssetStore.js:276,309,324,363,461,618,690` · `loteService.js:427` · `WorkerDashboard.jsx:116`).
- El handler `message` del SW (`sw.js:655`) **solo reacciona a `REGISTER_SYNC`** (`:661`) y a
  `REGISTER_VOICE_TELEMETRY_SYNC` (`:668`). `SYNC_REQUESTED` entrante **se descarta en silencio**.
- **`REGISTER_SYNC` no tiene NINGÚN emisor** en todo el repo: `git grep REGISTER_SYNC` devuelve una
  sola línea, la del propio `sw.js:661`.

Es decir: el tag de background sync se registra **una sola vez por carga de página**
(`swRegistration.js:237`, en `serviceWorker.ready`), típicamente **antes** de que haya nada
encolado, y no se vuelve a registrar nunca.

### Qué significa para la entrega

Cata le dicta al agente, aprueba el modal, ve la confirmación — y el registro **se queda en el
teléfono**. Sale solo si ella nota el badge ámbar arriba a la derecha y lo toca, o si pierde y
recupera señal. No está perdido, pero **no está publicado**, y eso rompe HC1 punto 4 ("agregar un
surco nuevo hoy y **verlo publicado hoy**").

Nota honesta: `awaitSync: true` / `await_sync: true` que pasa `persistComplexIngest` **no sincroniza
nada** — el propio comentario del código lo dice (`farmEventService.js:139-143`): solo espera a que
la transacción quede escrita en IDB. El nombre invita al error.

---

## §BUG-06 — el hallazgo más grave, y el tracker tenía mal la causa

El tracker (corrida 2) atribuyó los 35–61 s a *"~13 llamadas MCP en serie"*. **Eso es falso en el
código desplegado**, y lo desmiente un informe de la propia flota que ya está mergeado:

- `AgentScreen.jsx:1652-1660` — `await Promise.all([resolveEntities, fermentoPrefilter,
  biopreparadoGrounding, pisoTermicoGuard, confusionEspecieGuard, pestVsDiseaseGuard,
  toxicSafetyGuard])`. Las **siete guardas van en paralelo**.
- `AgentScreen.jsx:1810` — `get_subgrafo_relacional` y `get_multihop_companions` también se
  paralelizaron (commit `afc18633c`).
- `_gate/INFORME-LATENCIA-20260904.md` (mergeado, sha `afc18633c`) midió endpoint por endpoint
  contra `dev`: **pre-LLM compuesto = 2.998 / 1.818 / 1.618 ms**. Primer token del LLM con prompt
  corto: 1.587 / 1.244 / 1.222 ms.

**El MCP cuesta ~2–3 s, no 35–61 s.** El ahorro real mergeado fue de **~171 ms** (mediana serial
410,5 ms → paralelo 239,5 ms).

Lo que queda serial son **etapas**, no llamadas: `retrieveCorpus` (`:1550`) → `Promise.all` de
guardas (`:1653`) → tool-chain relacional (`:1810`) → `planNlu` (`:2076`) → `callTool` (`:2149`) →
LLM. Pero la suma medida de todas ellas no llega a 3 s.

**Conclusión dura: el gap de ~35–58 s NO está explicado.** El propio informe lo dice sin adornos
("**No sé** qué tramo del cliente autenticado completa explica aquellos 35–61 s"). Los candidatos que
nadie ha medido: RAG local, IndexedDB, el ensamblado del prompt real y el **prefill del LLM con el
prompt completo de finca** (el diagnóstico midió con un prompt corto, no con el real).

Segundo frente, medido hoy e independiente: `_gate/DIAGNOSTICO-PERF-DEV-20260905.md` reporta que
**el login tarda 8,7–9,2 s en pintar** por un grafo de módulos pre-login desproporcionado (175–184
peticiones, ~1–2 MB) más `cache-control: no-store` + Cloudflare `BYPASS` en `/assets/*`. Eso es lo
PRIMERO que van a ver David y Cata.

---

## Lo que BLOQUEA la entrega, por gravedad

### 1. Lo va a ver el usuario el primer día

1. **BUG-06 — el agente tarda 35–61 s en empezar a responder.** Es el corazón del producto. Cata
   pregunta algo y no pasa nada durante casi un minuto. Y hoy **no sabemos por qué**: la hipótesis
   del pipeline MCP quedó refutada con medición. Esto no es "afinar", es **diagnosticar de nuevo**
   con `performance.mark` en sesión autenticada real.
2. **Arranque en frío de 47–71 s en navegador virgen** (medido hoy, 3 corridas — ver Adenda-B), y
   **8,7–9,2 s de login** en contexto ya tibio (`DIAGNOSTICO-PERF-DEV-20260905.md`). El primer
   contacto de Cata es más de un minuto de "Cargando…". Causa identificada y de arreglo conocido
   (sacar `prefetchHomeChunks` del login anónimo + cachear `/assets/*`).
3. **BUG-01 — lo que Cata le dicta al agente no se publica.** Confirmado en vivo: 8 transacciones
   encoladas, **0 POST a farmOS**. Registra, aprueba, ve el "listo", y el dato se queda en el
   dispositivo hasta que alguien toque un badge ámbar que nadie le explicó. Para una finca de 1500
   plantas en prueba de campo, esto es pérdida de confianza inmediata.
4. **BUG-03a — el calendario de siembra está caído, 2/2 en 502.** "¿Cuándo siembro X?" es una de las
   preguntas más obvias que va a hacer un agricultor, y hoy siempre falla. Además el fix vigente
   **empeora** el caso: borra un campo que el schema exige. Arreglo conocido y barato: stubear como
   ya hace `chipIntentRouter`, en vez de mutilar argumentos.
5. **BUG-05 — el agente niega tener especies que SÍ están cargadas.** Se arregló el grafo y la
   conducta no cambió: sigue diciendo "no tengo en mi base de datos" para calabacín. Cata es
   agroecóloga: va a probar especies del catálogo y se va a topar con esto.

### 2. Bloquea un caso completo del test

6. **HC2 es inejecutable tal como está especificado.** Re-verificado hoy contra el sha desplegado,
   los tres hallazgos P0 de corrida 2 **siguen intactos**:
   - `normalizeRoster` fija `tier:'free'` por defecto (`fincaRosterService.js:140-142`) →
     `maxSubUsers: 1` (`tierService.js:73`). `PRO_USERNAMES`/`resolveTier` existen pero **nunca se
     cruzan con `roster.tier`** (el único consumidor de `getCurrentTier` es `AgentScreen.jsx:375`,
     para `isPro`). Resultado: "Cupo lleno (1 en su plan)" — no se puede crear a David, Mariana,
     trabajadores ni la abuela.
   - `currentSubUserId` **solo se lee** (`fincaRosterService.js:153,283` · `roleService.js:163`);
     **ningún archivo lo escribe**. No hay "actuar como", ni PIN, ni selector de perfil.
   - `useSecurityRole` tiene **0 importadores** fuera de sí mismo (las otras 2 apariciones son
     comentarios). No hay gating de rol en agente, registro, mercado ni edición.

   **Consecuencia concreta:** Mariana, 11 años, en el mismo dispositivo, tiene privilegios completos
   de dueña. El requisito explícito del spec ("evitar pilatunas") **no se cumple de ninguna forma
   hoy**.

### 3. Esto aguanta

7. **BUG-08** — decisión de producto sin tomar: ¿el conteo manual vive en Bodega, o Auditoría es la
   puerta intencional? Confirmado en vivo que por Auditoría funciona. **Pero ojo: BUG-10 (unidad
   inválida) SÍ es un bug real y de arreglo trivial** — una línea, `'unidades'` → `'unidad'`. Si se
   arregla eso, el conteo manual queda usable por Auditoría y BUG-08 baja a cosmético.
8. **E2E "agrega planta → vende en el mercado" (HC3-4) — desconectado, y aguanta.** Verificado por
   contenido: `MercadosScreen.jsx` **no importa nada** de la capa de finca (ni `listFarmProcesses`,
   ni `useAssetStore`, ni `assetCache`, ni `logCache`). Publicar es un formulario de texto libre. Es
   una feature faltante, no una regresión; no rompe nada.
9. **BUG-07 reserva de `media_cache`** — la foto que se manda al agente no se archiva. Aguanta.
10. **Fotos sin autor y sin EXIF** (corrida 2 HC3, `photoService.js:105-124`) — aguanta, pero el
   docblock miente ("preservando la fecha EXIF cuando es posible" con `grep -rln exif src/` = 0).

---

## Lo que está listo y no hay que volver a mirar

> Ojo: BUG-05 salió de esta lista. El dato está cargado, pero el agente sigue diciendo que no lo
> tiene — el trabajo de grafo se hizo y **no cambió la conducta**.

- **BUG-02** — modal de confirmación legible, con Aprobar/Editar/Rechazar y remonte por `gateId`.
- **BUG-03b** — el spinner "PENSANDO" ya cierra con gracia ante fallo de tool (corrida 2 lo vio con
  un 502 real, `done=true` a los 53 s).
- **BUG-04** — `companion-species-guard`: contrato corregido, 6/6 turnos en 200.
- **Captura de audio** — pipeline completo verificado en corrida 3: `agent-mic-btn` → `POST
  /api/whisper/asr` 200 → auto-envío → `voice_telemetry` 0→2.
- **Rechazo de no-imágenes** — intencional y correcto (`handleAgentPhotoPick`, `AgentScreen.jsx:3451`).
- **Adversarial ~25 clics** — 0 pageErrors, 0 blancos reales (corrida 1).

---

## HC2 y HC3 — qué falta cubrir

**HC2** (nunca ejecutado completo): los puntos 1–3 del spec están **bloqueados por el tope de cupo**,
no por falta de pruebas. No tiene sentido gastar otra corrida hasta que `roster.tier` se conecte con
`resolveTier`. Lo que sí falta medir aparte: onboarding con una cuenta **genuinamente virgen** (hoy
solo existen `admin` y `javier` en la BD de dev, ambas contaminadas).

**HC3** (parcialmente cubierto):
- Falta la **auditoría dura de IA** (grafo AGE · RAG · MCP · embeddings · LLMs) como tal — hasta hoy
  solo se ha observado de refilón por trazas de red. Es una corrida dedicada, y ahora tiene un
  objetivo concreto: **explicar el gap de latencia de BUG-06**.
- Falta la **evaluación de las ~21 especies del catálogo milpachoachi** con MIP + biopreparados +
  rendimiento a 2200 msnm (el spec pide todas; se han tocado ~7 en las corridas).
- Falta **calidad de transcripción con habla real** (solo se probó con tono sintético de 440 Hz, que
  produjo la alucinación clásica de Whisper "¡Suscríbete!").
- **Ruta del valle 3D**: sigue con el hallazgo de corrida 2 sin re-verificar — el botón "Entrá al
  valle 3D" no responde a clic de mouse, solo a `Enter`, y aun así es flaky (1 de 2). En un
  dispositivo táctil, que es como Cata y David lo van a usar, el tap se parece más al clic que al
  Enter. **No re-verificado hoy.**

---

## Lo que NO pude verificar

1. **BUG-06 en vivo hoy**: no re-medí yo la latencia al primer token contra el deploy `db8c45ac`. Lo
   que sí está verificado por contenido es que el pipeline MCP **no** es la causa.
2. **BUG-03a en vivo**: el fix está en el chokepoint correcto, pero **no vi un 200 real hoy**. Que el
   código omita los strings vacíos no prueba que el sidecar no devuelva 502 por otra razón.
3. **BUG-09 en vivo**: `resolveDestinoPostLogin` está cableado en ambos logins, pero no vi yo el
   onboarding aparecer solo. El carril hermano sí lo vio en runtime headed contra un vite local
   (`_gate/capturas-canal-dc/bug09-primer-ingreso-onboarding.png`), **no** contra `chagra-dev`.
4. **Si la cola `pending_transactions` se drena en la práctica**: mi conclusión de BUG-01 es por
   lectura de código. El comportamiento real del `Background Sync` de Chromium (cuándo re-dispara un
   tag ya registrado) no lo medí. Podría drenarse por un camino que no vi.
5. **La anomalía de corrida 3** — un `log--harvest` (`c4b3c907…`) apareció sin que ningún script lo
   creara. Sigue sin explicar. La cuenta `admin` es compartida entre carriles; puede haber
   contaminación cruzada en todas las mediciones de IndexedDB.
6. **Nada visual fue certificado por mí.** No miré capturas con criterio de gate. Las capturas de las
   corridas quedan como evidencia cruda para que el operador juzgue.
7. **HC2 en vivo hoy**: los tres hallazgos P0 se re-verificaron **por código**, no volviendo a abrir
   "Gestión de usuarios" en el navegador.

---

## Adenda — corridas en vivo (se completa al cerrar)

### Adenda-C — medición propia del prefill del LLM (lo que nadie había medido)

**Esto es lo más accionable que salió de la auditoría para BUG-06.** El diagnóstico de la flota
(`INFORME-LATENCIA-20260904.md`) midió el TTFT con un **prompt corto de diagnóstico** y lo dijo
explícitamente. Nadie midió el prompt REAL. Lo medí, contra la GPU y el modelo de producción, sin
tocar `dev`.

**Contexto que lo motiva:** el log crudo de la corrida 2 (`/tmp/a2-full.log`) contiene esta línea de
un turno real:

```
[promptAssembler] system prompt 6263 tokens > presupuesto 6144 tras degradar sacrificables
                  — guardas y grounding se conservan intactos
```

Es decir: el system prompt real pesa **6.263 tokens** y **se pasa del presupuesto** (`6144`,
`promptAssembler.js:37`) incluso **después** de haber sacrificado el corpus RAG.

**Setup medido (real, no supuesto):**
- `ollama ps` → `qwen3.5:4b`, 3,3 GB, **100% GPU**, CONTEXT 8192.
- `nvidia-smi` → **Quadro M6000**, 12.288 MiB (Maxwell, sin tensor cores).
- ⚠️ `config/setup-llm-prod.json` del repo dice `chat_model: "granite3.3:8b"` y `num_ctx: 8192`.
  **Está desactualizado** respecto a lo que corre. Drift de documentación, no causa de latencia.

**Mediciones crudas** (`/tmp/ttft2.py`, `/tmp/ttft3.py`, contra `localhost:11434`, `think:false`):

```
CORTO            TTFT=  0.96s  prompt_tokens=33    prefill= 0.33s
~6.4k chars      TTFT= 10.21s  prompt_tokens=4098  prefill= 9.54s
~6.4k chars #2   TTFT=  0.72s  prompt_tokens=4098  prefill= 0.14s   <- cache de prompt idéntico
~39k chars #1    TTFT=  9.59s  prompt_tokens=4098  prefill= 8.93s
~39k chars #2    TTFT=  3.14s  prompt_tokens=4098  prefill= 2.54s
~39k chars #3    TTFT=  3.22s  prompt_tokens=4098  prefill= 2.59s
```

**Lo que esto establece:**
1. **El prefill es un contribuyente de primer orden y NO es MCP.** Un prompt grande cuesta ~9 s de
   prefill en frío contra 0,33 s de uno de 33 tokens, en la GPU y el modelo reales de producción.
   El MCP completo cuesta ~2–3 s (medido por la flota). **El costo dominante está en el LLM, no en
   las herramientas** — que es justo donde nadie estaba mirando.
2. **El cache de prompt cambia todo.** Repetir un prompt idéntico baja el prefill a 0,14 s. En la app
   real cada turno ensambla un prompt distinto (grounding y guardas cambian por consulta), así que
   el cache **casi nunca pega**. Esto explica también por qué las mediciones varían tanto.

**TRUNCACIÓN SILENCIOSA — CONFIRMADA con prueba decisiva (ya no es hipótesis).**
Puse una clave única al INICIO del prompt y le pedí al modelo repetirla (`/tmp/trunc.py`,
temperature 0):

```
relleno ~1.5k tok    prompt_eval_count=2513
   respuesta: ZANAHORIA-VIOLETA-7731                      <- la VE
relleno ~10k tok     prompt_eval_count=4098
   respuesta: "No se ha proporcionado ninguna clave secreta en el mensaje..."   <- NO la ve
```

**El techo efectivo es ~4.096 tokens, no los 8.192 que pide `num_ctx` y que reporta `ollama ps`.**
Y lo que se corta es el **INICIO** del prompt.

Consecuencia concreta, cruzando con el orden de ensamblado (`promptAssembler.js:79`, `BLOCK_ORDER`):
el bloque **`base` — "instrucciones + glosarios + perfil" — es el PRIMERO de la lista**, o sea el
primero en caer. Con un system prompt real de **6.263 tokens** y un techo de ~4.096, se están
perdiendo **~2.100 tokens en silencio en cada turno**, y son justamente las instrucciones base del
agente.

Matiz importante y a favor del diseño: `promptAssembler` pone guardas y grounding **al final**
(máxima recency) precisamente para esto, así que **la defensa anti-alucinación sí sobrevive** —
`toxicSafety`, `pisoTermico`, `confusionEspecie`, `evidence`, `curatedFacts` están en la cola. Lo
que se pierde son las instrucciones y glosarios base. Grave, pero no es la pérdida de las guardas de
seguridad.

Ojo con la etiqueta "(protegido)" del código: protege contra el sacrificio del PROPIO ensamblador,
**no** contra la truncación de ollama. Son dos cosas distintas y el comentario invita a confundirlas.

**Siguiente paso concreto para BUG-06** (reemplaza a "paralelizar MCP", que ya se hizo y rindió
171 ms): instrumentar el navegador autenticado con `performance.mark` separando RAG local ·
IndexedDB · ensamblado de prompt · prefill · generación, y **medir el tamaño real del prompt por
turno**. Si el prefill de ~6k tokens en una Maxwell es el grueso, las palancas son bajar el prompt,
no paralelizar más llamadas.


### Adenda-D — el estimador de tokens del ensamblador subcuenta ~9%, y eso agrava la truncación

`promptAssembler.estimateTokens` (`promptAssembler.js:72`) usa `Math.ceil(length / 2.65)`. Contra el
tokenizador real de `qwen3.5:4b`, medido en la misma prueba de truncación (6.127 chars →
`prompt_eval_count=2513`), el ratio real es **2,44 chars/token**.

```
ratio REAL medido    : 2.44 chars/token
ratio del estimador  : 2.65 chars/token
=> el estimador SUBCUENTA ~9%
```

Recalculando el turno real de la corrida 2:

| magnitud | tokens |
|---|---|
| system prompt según el estimador del código | 6.263 |
| system prompt **real** (ratio medido) | **~6.807** |
| techo efectivo medido | ~4.096 |
| **pérdida silenciosa** | **~2.711 (≈40% del prompt)** |

O sea: el aviso `> presupuesto 6144` que emite el código **llega tarde y corto** — cuando lo emite,
el prompt real ya va por ~6.800 y el modelo solo va a leer ~4.100. Bajar el presupuesto no basta si
el estimador miente; hay que calibrar el ratio contra el tokenizador real del modelo en producción.

**No certifico** que 2,44 sea el ratio para todos los textos: se midió sobre castellano agronómico
repetitivo, que es representativo del corpus pero no idéntico al prompt real completo (que mezcla
instrucciones, glosarios y datos). El orden de magnitud sí se sostiene.

### Adenda-A/B — corridas en vivo: EN VUELO al cierre de este informe

Se despacharon dos carriles Playwright contra `chagra-dev`. **Ninguno había entregado resultado
válido al momento de escribir esto.** Lo que sí dejaron, y que vale registrar:

**Carril A (BUG-01/03a/06/07) — CERRADO. Corrige tres de mis veredictos por contenido.**

*Primero, el instrumento.* La primera medición fue INVÁLIDA (`login.ok:false`, `agentOpened:false`,
`mcpCallCount:0`, y el `tail` era texto del wizard de onboarding). Causa raíz encontrada:
`POST /oauth/token` → **200** (el login sí funciona), pero `corpusLoader` aborta el primer fetch de
`/catalog.sqlite` y la UI queda en "Cargando…/Preparando tu chagra…" indefinidamente. Un `reload()`
dispara el reintento y en 47–71 s carga. Se corrigió `lib-common.mjs::login()` a login→reload→poll y
se probó duro: `GET /api/log/{harvest,seeding,input,observation,activity}` → **200** en todos.
Todo lo que sigue viene de una corrida ÚNICA y EN SERIE con `login.ok=true`, `agentOpened=true`.

*BUG-06 — los números reales de hoy, con sesión válida:*

| # | query | login.ok | agentOpened | firstTokenMs | totalMs | llamadas MCP |
|---|---|---|---|---|---|---|
| 1 | rúcula | true | true | **55.682** | 59.721 | 14 |
| 2 | tomate | true | true | **41.549** | 47.613 | 15 |
| 3 | aguacate | true | true | **46.719** | 50.761 | 14 |

Y la traza de solapamiento cierra la pregunta (ejemplo aguacate, ms desde Enter):

```
 1036- 5459  hybrid-retrieve                      (sola)
 5473- 5990  7 guardas          <- spread de <10ms al arrancar = PARALELO real
 5995- 6369  subgrafo + multihop <- par (spread 4ms)
 6378- 6761  nlu                                  (sola)
      >>> GAP DE 38.874 ms SIN NINGUNA llamada /api/mcp/ <<<
45635-47033  companion-species-guard, post-validate, log-conversation (post-respuesta)
```

Mismo patrón en rúcula (gap 33.289 ms) y tomate (31.052 ms). **Veredicto definitivo sobre la causa:
dentro de cada fase las llamadas SÍ son paralelas; las fases entre sí SÍ son seriales; pero todo el
MCP se acaba a los ~6,8 s y el 60–70% del tiempo (31–39 s) es un hueco donde NO hay ninguna llamada
MCP.** Ese hueco es el camino del LLM de chat. Queda confirmado desde dos lados independientes que
**el MCP no es el problema.**

Reconciliación honesta con mi medición de prefill: yo medí 9,5 s de prefill en frío contra ollama
directo; el hueco aquí es 31–39 s. **No cuadran**, y no lo cierro. Mi medición fue contra
`localhost:11434` con el modelo ya cargado y sin el sidecar de por medio; la del navegador incluye
sidecar, NLU sobre el mismo slot de GPU y posible cola. Falta la instrumentación en navegador.

*BUG-03a — SIGUE ROTO, 2/2 intentos en 502.* Y el fix resultó contraproducente:

| intento | body que sale del cliente | status |
|---|---|---|
| 1 ("¿cuándo siembro tomate…?") | `{"mes":"enero"}` | **502** |
| 2 ("calendario para lechuga…") | `{"mes":[]}` | **502** |

Dos cosas, y la primera es la grave:
1. **El intento 1 manda un `mes` válido y AUN ASÍ da 502 — porque le falta `piso_termico`.** El
   propio repo lo dice: `chipIntentRouter.js:152` → *"Sin piso térmico NO llamamos el tool (**el zod
   lo exige**)"*, y por eso esa ruta stubea en vez de llamar. Pero `omitEmptyCalendarioArgs`
   **BORRA** `piso_termico` cuando viene vacío → el campo requerido desaparece → 502 de schema. El
   fix cambió un 502 (enum inválido) por otro 502 (requerido ausente). Su docblock afirma *"nunca
   llega como un 502 de schema"*; **esa premisa es falsa** y la contradice el comentario de
   `chipIntentRouter`.
   → **Arreglo correcto: hacer lo que ya hace `chipIntentRouter` — no llamar la tool y stubear**,
   en vez de mutilar los argumentos.
2. Variante nueva: la NLU produjo `mes` como **array vacío** `[]`. `omitEmptyCalendarioArgs` solo
   limpia strings vacíos; los arrays se le escapan.

*BUG-01 — CONFIRMADO en vivo, exactamente como predijo la lectura de código:*

| store | antes | después |
|---|---|---|
| logs | 2 | 2 |
| farm_processes | 0 | **1** |
| farm_process_events | 0 | **7** |
| pending_transactions | 0 | **8** |
| inventory_events | 0 | 0 |
| media_cache | 0 | 0 |
| conversation_memory | 12 | 14 |

**`POST` a `/api/log/` o `/api/asset/` durante todo el flujo = 0.** Modal visto, Aprobar clickeado,
8 transacciones encoladas, **cero escritura remota**. Es la confirmación empírica de §BUG-01.

*BUG-07 — PARCIAL.* Lo que el fix SÍ logró: `bannerClearedAtEnd=true`, `noteClearedAtEnd=true` (la
UI ya no invita al reenvío duplicado) y `cycleContentCallsDuringSend = 0` (la cascada de catálogo
desapareció — `skipRag` funciona). Lo que NO: tras **61.050 ms** el agente **no había respondido**
(`agentReplied=false`), con el header en "PENSANDO…" y el aviso "Sigo pensando…". `media_cache` 0→0.
**Matiz importante:** dado que una consulta de TEXTO ya tarda 41–56 s (BUG-06), una de foto que no
responde en 61 s puede ser simplemente BUG-06, no un cuelgue aparte. No lo separo sin más evidencia.

*BUG-05 — PARCIAL, y esto corrige mi veredicto.* El dato **sí está** (grafo + catálogo del cliente),
pero la app **sigue sin usarlo**. Respuesta literal capturada hoy: *"El catálogo Chagra no tengo en
mi base de datos todavía la información detallada sobre cómo cultivar específicamente al calabacín
ni su lista completa de plagas asociadas."* (`firstTokenMs=36.736`). Arreglar el grafo no bastó: hay
un eslabón de resolución/retrieval que no lo alcanza.

*No medido por el carril A:* queries 4–6 de BUG-06 (cebolla, papa, lechuga), y la instrumentación
directa del hueco de 31–39 s.

**Carril B (BUG-08/09) — CERRADO, con control positivo bien hecho.**

*BUG-08 — medido sobre el MISMO ítem, tras sembrar un insumo real.* La primera pasada dio 0 en
AMBAS vistas, pero el cuerpo decía *"No hay insumos registrados en bodega"* — el carril **detectó su
propio cero falso y lo declaró** en vez de concluir. Sembró un insumo y repitió:

| vista | `[data-testid^=inventory-recount-]` | "Conteo manual" | "Bitácora" |
|---|---|---|---|
| **Bodega** (`#bodega`) | **0** | **0** | **0** |
| **Auditoría** (`#auditoria-inventario`) | **1** | **1** | **1** |

Texto crudo Bodega: `"…Cal agrícola PW-4B … 0 UNIDADES Abastecer"` (solo Abastecer).
Texto crudo Auditoría: `"…0 UNIDADES Abastecer Conteo manual Bitácora"`. Mismo ítem.
Capturas: `corrida4b/artifacts/d1b-04-bodega-con-material.png` · `d1b-05-auditoria-con-material.png`.

*BUG-09 — confirmado en vivo.* Contexto 100% limpio → login → **el onboarding aparece solo**
(`PASO 1 DE 6`, `onb2-saltar-todo` visible), en dos corridas independientes. "Saltar todo" escribe
`chagra:profile:skipped:v1:admin = "1"`. En un **segundo contexto limpio** (mismo usuario,
`localStorage` vacío verificado) **vuelve a aparecer** — y eso es **por diseño, no por bug**:
`userProfileService.js` es 100% `localStorage` y su propio comentario dice *"NADA se envía a ningún
backend"*. Si el criterio de aceptación esperaba persistencia por CUENTA, eso no se cumple, pero es
una decisión de diseño, no una regresión.

### 🔴 BUG-10 (NUEVO, no estaba en los 9) — el conteo manual falla por unidad inválida

Al abrir el `RecountDrawer` desde Auditoría y guardar con la unidad por defecto, falla con error
visible: `Invalid payload.unit: expected one of kg|g|litro|ml|unidad|m2|paquete|bolsa|galon, got
"unidades"`, y `inventory_events` se queda en 0.

Verificado por contenido en el sha desplegado:
- `InventoryDashboard.jsx:41` → `const unit = item.attributes?.inventory_unit || 'unidades';` (plural)
- `inventoryEvents.js:35` → `VALID_UNITS = {kg, g, litro, ml, **unidad**, m2, paquete, bolsa, galon}`
- `git grep unidades` en `inventoryEvents.js` → **no aparece**. El plural no está en el enum.

Peor: el `<select>` del drawer (`RecountDrawer.jsx:132`) ordena `VALID_UNITS` alfabéticamente, así
que **se ve "bolsa"** mientras el estado real sigue siendo el `'unidades'` inválido — el usuario no
tiene forma de saber por qué falla.

Con `unit='kg'` explícito, `inventory_events` pasó de **0 a 1** (`event_type: inventory_counted`,
snapshot `7.5 kg`). **El pipeline RecountDrawer → appendEvent → IndexedDB funciona bien**; lo que
bloquea es el string por defecto. Afecta a todo material creado por el formulario simple de Activos
(que no fija `inventory_unit`). Captura: `corrida4b/artifacts/d1b-07-post-submit.png`.

Esto completa la explicación de `inventory_events = 0` en las 3 corridas: **no era solo que los
botones fueran inalcanzables (BUG-08) — es que cuando por fin se alcanzan, el guardado falla.**

### 🔴🔴 BLOQUEANTE NUEVO — arranque en frío de 47–71 s en un navegador virgen

Medido en **3 corridas independientes** con polling cada 5 s: un contexto de navegador 100% limpio
(sin caché ni Service Worker instalado) se queda en *"Cargando… Sigue cargando — con señal de campo
puede tardar un poco más"* y **solo resuelve entre t+47 s y t+71 s** después del login.

Es **peor** que los 8,7–9,2 s de `DIAGNOSTICO-PERF-DEV-20260905.md`, porque aquella medición no
partía de un perfil virgen. **Esto es exactamente el primer contacto de Cata y David con la app**:
teléfono nuevo, primera vez, más de un minuto mirando "Cargando…".

Efecto colateral para la maquinaria: cualquier prueba con timeout de 60 s sobre contexto virgen da
**falso negativo** — le pasó a la primera pasada de este mismo carril.

**Lo que estos carriles resolverán y este informe deja abierto:** el número real de latencia hoy
(BUG-06), un 200 real de `get_calendario_siembra` (BUG-03a), los conteos de IndexedDB tras aprobar
(BUG-01), la respuesta a la foto (BUG-07), los conteos de botones Bodega vs Auditoría (BUG-08) y el
onboarding en vivo contra dev (BUG-09).
