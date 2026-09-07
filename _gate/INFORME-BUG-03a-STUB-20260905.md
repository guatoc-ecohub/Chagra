# INFORME BUG-03a — calendario de siembra con stub, sin mutilar argumentos

- **Fecha:** 2026-09-05
- **Carril:** opencode · BUG-03a-stub-no-mutilar-20260905
- **Orden:** «arregla BUG-03a con el stub, no mutilando argumentos» (P1)
- **Rama:** `fix/bug03a-stub-no-mutilar-20260905` desde `origin/dev` (0afe6f0af)
- **Commit:** e210ef20b
- **PR:** https://github.com/guatoc-ecohub/Chagra/pull/3169 (draft, base `dev`)
- **Archivos tocados (3, mínimos):**
  - `src/services/sidecarClient.js`
  - `src/services/__tests__/sidecarClient.coerce.test.js`
  - `src/services/__tests__/sidecarClient.test.js`

---

## Cuerpo real de la petición: antes y después

### Antes del arreglo (reproducido en vivo contra el sidecar real, 127.0.0.1:7880)

El body que la auditoría capturó en el navegador y que disparaba el 502:

```json
{"mes":"","piso_termico":""}
```

Comportamiento REAL medido con curl al endpoint `/tools/get_calendario_siembra`
(no mocks):

| Body enviado | HTTP | Detalle |
|---|---|---|
| `{"mes":"","piso_termico":""}` | **502** | `mcp_call_failed` / `invalid_enum_value` (received `""`) — el repro exacto |
| `{}` | **502** | `invalid_type`, expected `'frio' \| 'templado' \| 'calido'`, received `"undefined"` — lo que producía el arreglo viejo tras borrar `piso_termico` |
| `{"piso_termico":""}` | **502** | `invalid_enum_value` |
| `{"piso_termico":"frío"}` | **502** | `invalid_enum_value` (piso con tilde sin normalizar — BUG-03 raíz, sigue cubierto por `normalizePisoTermicoArg`) |
| `{"piso_termico":"frio"}` | **200** | datos reales (mes por defecto = septiembre) — camino feliz |
| `{"piso_termico":"frio","mes":""}` | **200** | datos reales |
| `{"piso_termico":"frio","mes":8}` | **200** | datos reales de agosto |

Conclusión dura: borrar `piso_termico` vacío no arregla nada; el schema lo exige
siempre. El docblock viejo de `omitEmptyCalendarioArgs` afirmaba que «nunca llega
como un 502 de schema»: falso, quedó corregido.

### Después del arreglo

Con `piso_termico` faltante o vacío, el cliente **no hace la petición**: `callTool`
devuelve el stub (no hay body que viajar):

```json
{
  "available": false,
  "reason": "no_piso_termico",
  "hint": "pedirle al usuario su municipio o la altura de su finca (msnm) para saber el piso térmico (frío/templado/cálido) y poder sugerir qué sembrar este mes"
}
```

Es la evidencia sintética que `formatToolEvidence` (rama `available:false`)
inyecta al LLM para que **pida la altura/municipio y no invente un calendario**.
Con piso válido, el body que sale es limpio: `{"piso_termico":"frio"}` → 200
(verificado en vivo). El stub usa el mismo shape que los stubs de
`chipIntentRouter.js` (clima sin municipio, silvopastoreo sin altura) y el mismo
`reason: 'no_piso_termico'` que ya usaba el chip calendario.

---

## De dónde salía la llamada que producía el 502

El request fue capturado por la auditoría en la **red del navegador** (Playwright),
o sea que el POST a `/api/mcp/agro/tools/get_calendario_siembra` lo origina el
**cliente**, no el sidecar ejecutando tools por su cuenta (eso no sería visible en
Playwright).

Trazado en el código del cliente:

- El **único** path del cliente que postea a `/tools/<tool>` es `callTool()`
  (`src/services/sidecarClient.js`, `postJson(\`/tools/${toolName}\`, ...)`).
  No hay otro fetch directo a ese endpoint en `src/`.
- Los args de `callTool` para calendario llegan por dos vías, ambas caen en el
  mismo chokepoint:
  1. **Path NLU** (`AgentScreen.jsx` PASO 2b): el planner `/nlu` responde
     `useTool:true, tool:'get_calendario_siembra', args` y el cliente ejecuta
     `callTool(plan.tool, plan.args)` (o `executeToolChain` para `tool_chain`,
     que también llama `callTool`). Cuando el LLM del planner no deriva el piso,
     emite `args` con `piso_termico` vacío. Ese es el origen del body capturado.
  2. **Path chip** (`AgentScreen.jsx` PASO 2 + `chipIntentRouter.js`): ya estaba
     bien — `planForcedIntent` stubea con `null` cuando no hay piso y nunca manda
     el tool sin él. Es el patrón que se reutilizó.
- `agentNluFallback.js` (candidato sospechado en el brief): **descartado por
  lectura**, nunca produce `get_calendario_siembra` (solo
  `get_pest_controllers` / `get_species` / `get_biopreparados`).

**Conclusión:** era un solo camino, el NLU-simple/chain → `callTool`, que hoy
mutilaba los args y llamaba igual. El stub en `callTool` lo cubre. El chip ya
stubeaba. No hizo falta tocar dos rutas; el arreglo quedó en el chokepoint.

---

## Tests

TDD, fallan antes / pasan después:

- **Antes** (con `sidecarClient.js` en `origin/dev`, tests nuevos ya escritos):
  7 fallos en `sidecarClient.coerce.test.js` + `sidecarClient.test.js`.
- **Después:** 118/118 en ambos archivos.
- Suites relacionadas en verde: `chipIntentRouter.test.js`,
  `AgentScreen.chipsToolbar.test.jsx`, `mcpHonestidad.test.js`,
  `agentCapabilities.audit.test.js` (94 passed + 4 skipped).
- `eslint` limpio (sin warnings) sobre los 3 archivos tocados.
- `tsc`: 0 errores en `sidecarClient` (el repo en `dev` tiene 755 errores tsc
  pre-existentes en `src/visual/mundo3d/*`, ajenos a este cambio).
- Suite completa: 14.053 passed; 20 fallos en archivos ajenos
  (`catalog/__tests__/migrate-v31-to-v32`, `scripts/audit-integraciones`,
  visuales compai/3D). Verificado que fallan idéntico con el cambio stashado
  (pristine `origin/dev`): pre-existentes, no regresión mía.

### Qué cambió en cada test existente
- `sidecarClient.coerce.test.js` — bloque `omitEmptyCalendarioArgs`: el test que
  esperaba que se borrara `piso_termico` vacío ahora espera que **NO se toque**
  (solo se omite `mes` vacío, que es el campo opcional). Agregado describe
  `calendarioSinPisoTermico`.
- `sidecarClient.test.js` — el test «BUG-03a control negativo» (esperaba body
  `{}` = el comportamiento viejo que seguía dando 502) se reemplazó por tres
  tests: stub con piso vacío (repro exacto, no llama fetch), stub con piso
  ausente, y camino feliz (mes vacío + piso válido → llama y body sin mes vacío).

---

## Lo que NO pude verificar

1. **El paso del planner `/nlu` en vivo.** El intento de reproducir la consulta
   («¿qué puedo sembrar este mes a 2200 msnm?») contra el `/nlu` real devolvió
   `nlu_unavailable` / timeout a los 35 s (backend LLM no cargado en este
   momento). No pude confirmar con una corrida viva que el planner emita
   `args: {piso_termico:""}`; lo sostengo por el trazado de código + el body que
   la auditoría ya capturó en el navegador + la confirmación viva de que ese body
   produce exactamente el 502. Si el planner vuelve a estar disponible, la pasada
   siguiente puede cerrarlo con una captura de red de un turno real.
2. **Captura de red de un turno completo en el navegador.** No hay instancia viva
   de la PWA en este carril para conducir el flujo UI completo (chip o chat) con
   Playwright y capturar la petición. La evidencia de red se limita a: body ya
   capturado por la auditoría + curl directo al sidecar real (tabla de arriba).
3. **Camino feliz end-to-end con el agente** (que con piso presente el asistente
   responda el calendario normal en una conversación). Verifiqué el mecanismo
   HTTP (200 con `piso_termico:'frio'` en vivo) y el contrato de evidence por
   tests, pero no la conversación completa.
4. **El lint de repo completo** (`npm run lint`) aborta por OOM de node en este
   entorno (crash con core dump, pre-existente); el lint scoped a `src/services`
   y a los 3 archivos quedó limpio para mi diff.

Nada de lo anterior invalida el mecanismo: el 502, el porqué del 502 y el arreglo
(no llamar el tool sin `piso_termico`) quedaron confirmados contra el sidecar real.
