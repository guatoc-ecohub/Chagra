# INFORME — BUG-01 (P1): el agente DICE que registró y NO PERSISTE NADA

**Fecha:** 2026-09-03 · **Branch:** `glm/bug01-nlu-persiste` (desde `origin/dev` @ `96202ac85`)
**Bug:** memoria `project_test_david_cata_ejecucion` §BUGS BUG-01, caso HC1, severidad P1.

## 1. Qué se midió el 2026-08-31 (no se re-descubrió, se reprodujo)

Entrada verbatim (`02-hc1.mjs` del hard-test):

> Hola chagra sembré 10 tomate Cherry aquí en el surco número 12 hace 3 meses y ya
> entregué tres cosechas del surco, se abonó cada 15 días y se trató un problema de
> trozador y de gota.

Síntoma medido: respuesta generativa que afirmaba registro + IndexedDB vacío
(`logs=0 · farm_processes=0 · agent_outbox=0 · inventory_events=0 ·
pending_transactions=0`), sin POST de escritura.

## 2. Reproducción contra `origin/dev` HOY (evidencia, no a ojo)

E2E nuevo `tests/agent-bug01-nlu-persiste.spec.js` (playwright, backend mockeado con
el patrón de `e2e-integral-logueado.spec.js`): el pipeline determinista
(`agentComplexIngest` → gate `ActionConfirmModal`) **SÍ disparaba** el gate y el
operador aprobaba… y el volcado de IndexedDB seguía en **0**. La respuesta del
agente (honesto, pero sin persistencia): *«No registré ninguna operación porque la
confirmación o la escritura no terminó»*.

El audit trail (`chagra:action_audit_log`) entregó la causa raíz:

```json
{"status":"executed","edited":true,"edited_params":{},
 "result":{"success":false,"summary":{"status":"ignored","executed":0}}}
```

## 3. Causa raíz

`ActionConfirmModal` vive **siempre montado** en AgentScreen (renderiza `null`
cerrado) y su borrador es `useState(parameters)` — que solo captura los parámetros
del **primer render** (`{}`, el estado inicial de `actionModal`). Al aprobar, el
modal enviaba ese borrador rancio `{}`; `handleActionApprove` lo detectaba como
«editado» y el executor ejecutaba la tool `registrar_ingesta_compleja` con un plan
vacío → `persistComplexIngest(undefined)` → `{status:'ignored'}` → **cero
escrituras**. Esto rompía TODA tool con gate (crear_log, agendar_riego, …), no solo
la ingesta compleja.

Nota de línea de tiempo: la evidencia original (14:21–14:23) se capturó contra un
deploy previo al fix `ee80ad0cf` (14:50). Ese fix construyó el pipeline
determinista correcto, pero el gate estaba roto por esta causa raíz: el síntoma
«habla y no persiste» seguía vivo en dev HEAD, ahora con respuesta honesta de
fracaso en vez de afirmación falsa.

## 4. Fix

Patrón sancionado por React (remount por key, sin setState-en-efecto que el lint
`react-hooks/set-state-in-effect` del repo prohíbe):

- `AgentScreen.jsx`: el gate callback agrega `gateId` único por acción y el
  `<ActionConfirmModal key={actionModal.gateId}>` remonta por acción → el borrador
  arranca SIEMPRE con los parámetros de ESA acción (y sin heredar modo edición de
  una acción descartada).
- `ActionConfirmModal.jsx`: doc del contrato (el componente en sí no cambia).

## 5. Verificación dura (volcado de IndexedDB + red)

`tests/agent-bug01-nlu-persiste.spec.js` — 2 tests, PASAN:

### GIVEN el verbatim WHEN el agente responde THEN persiste
- Gate visible («Confirmar registro de campo») → Aprobar.
- Respuesta: *«Listo. Registré el surco, la siembra retrofechada, la cosecha 1, la
  cosecha 2, la cosecha 3, el abono cada 15 días, la observación de trozador, la
  observación de gota. ¿quieres contarme qué tratamiento seguiste para trozador y
  gota? Opción agroecológica inicial…»* → enumera QUÉ SÍ (y la rama partial del
  código enumera qué no; cubierta por test unitario «no declara éxito total si
  falla una escritura»).
- **Volcado** `before → after`:
  - `farm_processes: 0 → 1` (siembra backdateada 3 meses)
  - `farm_process_events: 0 → 7` (sowing_confirmed + 3 cosechas + abono c/15d + 2 observaciones)
  - `pending_transactions: 0 → 8`
- **POST de escritura en la red** (tras `syncAll`, lo que dispara el SW/badge):
  `POST /api/asset/plant`, `POST /api/log/seeding`, `POST /api/log/harvest` ×3,
  `POST /api/log/activity`, `POST /api/log/observation` ×2, `POST /api/asset/land` — 9 POSTs.
- Nota sobre `logs`: la store local `logs` queda 0 POR DISEÑO de esta ruta: la
  ingesta compleja escribe al modelo de ciclo ADR-047 (`farm_processes` +
  `farm_process_events`) y los logs farmOS se materializan en el BACKEND vía los
  POST `/api/log/*` de arriba. El registro queda persistido y verificable.

### CONTROL — «¿cuánto rinde la rúcula?»
- NO abre el gate, NO escribe NADA (las 6 stores de escritura sin cambios tras 8s).
  Un router que escribe siempre es tan malo como uno que nunca escribe.

### Unit tests
- `src/components/__tests__/ActionConfirmModal.bug01.test.jsx` (3): congela el
  contrato del remount (aprovecha con SUS parámetros; segunda acción no hereda
  borrador ni modo edición).
- Suites relacionadas verdes: `actionExecutor` + `agentComplexIngest` ×3 (39 tests).

## 6. Alcance y riesgos conocidos

- El fix repara TODAS las tools con gate (no solo la ingesta compleja): cualquier
  approve posterior al primer mount estaba ejecutando con `{}`.
- Pre-existente NO tocado: `CompaiP1.contract.test.jsx` falla 2 tests (rigs
  luciernaga/chivito-punk) también en el checkout sin mi cambio — reportado, fuera
  de alcance.
- El lint local de `AgentScreen.jsx` excede memoria/tiempo también SIN el cambio
  (verificado); el delta ahí es de 11 líneas (comentario + `gateId` + `key`).
- BUG-03 (spinner pegado) y BUG-06 (latencia) son bugs distintos, no abordados acá.
