# INFORME — BUG TODAY-UTC-HELADA-20260905 · "el día se resuelve en UTC/runtime, no en la zona de la finca"

- **Lane**: opencode (deepseek-v4-flash) · worktree `chagra/.worktrees/today-utc-helada-20260905`
- **Rama**: `fix/today-utc-helada-20260905` (desde `origin/dev`)
- **Commit**: `dcb4e3990`
- **PR**: https://github.com/guatoc-ecohub/Chagra/pull/3153 (base `dev`, MERGEABLE)
- **Fecha**: 2026-09-05
- **Severidad**: P0 (aviso de helada en el día equivocado entre 19:00 y medianoche Colombia)

---

## 1. Qué se reprodujo

Reloj falseado a `2026-09-05T23:30:00-05:00` (= `2026-09-06T04:30:00Z`). Con el
runtime en UTC (NO es la zona de la finca), los resolutores de "hoy" que cruzan
la fecha del reloj contra los `date` del `forecast_7d` (calendario LOCAL de la
finca) elegían la fila de **MAÑANA (06)** como "hoy". Evidencia dura: `ejeClima`
reportaba `"0 mm hoy"` leyendo la fila seca del 06, cuando HOY-finca (05) tiene
15 mm.

### Reproducción cruda (test ROJO antes de tocar código, `TZ=UTC`)

```
 FAIL  src/services/__tests__/todayUtcHelada.regression.test.js > BUG TODAY-UTC-HELADA-20260905 — el "hoy" se resuelve en la zona de la FINCA, no en UTC ni en el runtime > REPRO: a las 23:30 hora Colombia, ejeClima reporta la lluvia de HOY-finca (05), no la de mañana (06)
AssertionError: expected '0 mm hoy' to contain '15 mm hoy'
Expected: "15 mm hoy"
Received: "0 mm hoy"
 ❯ src/services/__tests__/todayUtcHelada.regression.test.js:61:29

 FAIL  ... regresión: el día elegido es el MISMO a las 18:59 y a las 20:01 hora Colombia (cruce de las 19:00 = medianoche UTC)
AssertionError: expected null to be 'lluvia' // Object.is equality

 FAIL  ... cubre la ventana completa 19:00-23:59 Colombia sin leer mañana
AssertionError: expected null to be 'lluvia' // Object.is equality

 Test Files  1 failed (1)
      Tests  4 failed (4)
```

---

## 2. Barrido COMPLETO de apariciones

### 2.1 FIJADO en este PR — resolutores de "hoy" contra `forecast_7d` que usaban la zona del RUNTIME

Patrón: `now.getFullYear()/getMonth()/getDate()` (zona del runtime, no finca ni UTC determinista).
Con runtime != finca, entre 19:00 y 23:59 Colombia leen MAÑANA como hoy.

| ruta:línea (defecto en origin/dev) | función | estado |
|---|---|---|
| `src/services/atmosphereService.js:77-82` + `:154` | `localISODate` privada → `deriveCondicion` todayKey | FIJADO → `fincaDateISO` en `:149`; helper local eliminado |
| `src/services/vitalidadEspirituService.js:174-179` + `:191` | `isoDiaLocal` privada → `ejeClima` hoyKey | FIJADO → `fincaDateISO` en `:187`; helper eliminado |
| `src/hooks/useClima3DVivo.js:39-42` + `:47` | `hoyISO()` → `diaActual` | FIJADO → `fincaDateISO()` en `:43` |
| `src/visual/mundo3d/useFincaViva.js:92-97` + `:114` y `:141` | `isoDiaLocal` privada → `aguaDeLluvia`, `vientoDeClima` | FIJADO → `fincaDateISO` en `:110` y `:137`; helper eliminado |
| `src/components/clima/GraficoClimaSemanal.jsx:28-29` | columna "Hoy" con `new Date()` runtime | FIJADO → `esHoy = iso === fincaDateISO()` en `:32` |

Utilidad única nueva: `src/utils/farmDate.js:25,38` (`FINCA_UTC_OFFSET_SECONDS`,
`fincaDateISO`). Resuelve YYYY-MM-DD sumando el offset de la finca al epoch y
leyendo en UTC (técnica idéntica a `agroMeteoService.localIsoDate` de #3142).
Independiente de la TZ del proceso (verificado bajo `TZ=UTC` y `TZ=America/Bogota`).

### 2.2 YA FIJADO (no tocado — mergeado antes como #3142)

| ruta:línea | qué |
|---|---|
| `src/services/agroMeteoService.js:162-165,248-249,311,364-367` | `localIsoDate`/`hoyFinca` con `utc_offset_seconds` de Open-Meteo. El `today` del digest ya se resuelve en la zona de la finca. Tests propios verdes. |

### 2.3 Barrido con veredicto: FUERA de la ruta helada/pronóstico (no se tocan)

Mismo mecanismo (día resuelto en UTC) pero NO eligen día de pronóstico ni
alimentan el aviso de helada. Clasificados para que el operador decida si
quiere un PR separado de saneamiento:

- **Default de fecha de formularios de registro** (`toISOString().split('T')[0]`):
  entre 19:00 y 00:00 Colombia el default sale con la fecha de MAÑANA. Son
  defaults de input (date de cosecha/siembra/tarea/observación), no avisos:
  `src/components/DateField.jsx:27`, `HarvestLog.jsx:95,114`, `InputLog.jsx:40`,
  `MaintenanceScreen.jsx:19,88`, `ObservationScreen.jsx:40,72,261,277`,
  `SeedingLog.jsx:70,150,323`, `TaskScreen.jsx:66`, `SeguimientoProcesoScreen.jsx:303,502,508,616,651`,
  `TelemetryAlerts.jsx:166`, `ExtensionistaDashboard.jsx:30`,
  `src/components/cultivos/CalculadoraGradosDia.jsx:202`, `src/services/exportService.js:163`,
  `src/services/glaciarExport.js:113`, `src/services/glaciarZenodoMeta.js:230`,
  `src/services/fincaRosterService.js:85`, `src/store/useAssetStore.js:378`.
- **Buckets de agrupación UTC** (semana ISO / mes / día en telemetría y stats):
  corrimiento solo cerca de fronteras de bucket, no forecast:
  `src/hooks/useAssetPerformance.js:39-42`, `src/hooks/useConsumptionMetrics.js:79`,
  `src/services/cosechaService.js:158,411`, `src/services/vitalidadEspirituService.js:252`,
  `src/services/inventoryEvents.js:261`, `src/services/agentComplexIngest.js:43-46`.
- **Timestamps/ISO de persistencia** (append-only, sin elegir día):
  el resto de `new Date().toISOString()` del barrido (payloads, auditLog, sync…).
- **Año calendario de la finca** `src/services/fincaClockService.js:55` (reloj del
  frailejón): solo frontera de 31-dic, fuera de helada. No tocado.

### 2.4 Residual documentado (NO fijado a propósito)

| ruta:línea | defecto | por qué no se tocó |
|---|---|---|
| `src/components/dashboard/ClimaStrip.jsx:69-78` | `dayLabel` parsea la fecha naive date-only (`new Date(iso)`) como UTC → en runtime Colombia el weekday del pronóstico (días 1-6) sale un día antes | El archivo arrastra deuda de lint **pre-existente en origin/dev** (`react-hooks/set-state-in-effect` en el effect de `setSnapshot`, + warning `chagra-i18n`) que rompería el pre-commit `eslint --max-warnings=0`. Requiere PR aparte que primero limpie esa deuda. |

---

## 3. El fix (resumen)

Los cuatro consumidores del snapshot sidecar + el gráfico semanal ahora resuelven
el "hoy" en el calendario de la FINCA vía `fincaDateISO()` en vez de la zona del
runtime. Tres helpers privados duplicados (`localISODate`, `isoDiaLocal` ×2,
`hoyISO`) se colapsaron en una utilidad pura. Default UTC-5 (Colombia, única
geografía del producto) documentado en el módulo con la nota de leer el offset
del snapshot si el producto algún día sirve otra región.

## 4. Test de regresión VERDE

`src/services/__tests__/todayUtcHelada.regression.test.js` — 7 tests.

```
TZ=UTC npx vitest run src/services/__tests__/todayUtcHelada.regression.test.js
 Test Files  1 passed (1)
      Tests  7 passed (7)

TZ=America/Bogota npx vitest run src/services/__tests__/todayUtcHelada.regression.test.js
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Suites de regresión tocadas (todas verdes bajo `TZ=UTC` y/o `TZ=America/Bogota`):
- atmosphereService.test, vitalidadEspirituService.test, useClima3DVivo.test,
  useClimaAtmosphere.test, PanelVitalidadEspiritu.test, faunaFuncional.test,
  mundosPorPisoTermico.test, useEstadoFincaReal.test (77 tests).
- ClimaBoletinScreen.test, ClimaStrip.*.test (40 tests) + hoyEnFincaService.test,
  HoyEnFincaScreen.test, HoyEnFincaStrip.test, smokes clima/mundo3d (31 tests).
- ESLint `--max-warnings=0` limpio y pre-commit lefthook completo verde sobre los 7 archivos.

## 5. Entregable (Rule 6 — outputs verbatim)

```
$ git log --oneline origin/dev..HEAD
dcb4e3990 fix(clima): el día 'hoy' del pronóstico se resuelve en la zona horaria de la finca, no en la del runtime (BUG TODAY-UTC-HELADA-20260905)

$ git diff --stat origin/dev..HEAD
 src/components/clima/GraficoClimaSemanal.jsx       |   7 +-
 src/hooks/useClima3DVivo.js                        |   6 +-
 .../__tests__/todayUtcHelada.regression.test.js    | 107 +++++++++++++++++++++
 src/services/atmosphereService.js                  |  13 +--
 src/services/vitalidadEspirituService.js           |  14 +--
 src/utils/farmDate.js                              |  43 +++++++++
 src/visual/mundo3d/useFincaViva.js                 |  16 ++-
 7 files changed, 174 insertions(+), 32 deletions(-)

$ git diff --diff-filter=D --name-only origin/dev..HEAD
( vacío — sin deletes )

$ PR: https://github.com/guatoc-ecohub/Chagra/pull/3153  (base dev, open, mergeable)
```

## 6. Lo que NO pude verificar / advertencias

- **No hay pantalla visual con GPU**: este defecto es lógico-temporal y su
  verificación correcta es el test con reloj falseado (hecho). No corresponde
  captura headed para un cambio de resolución de fecha pura.
- El `forecast_7d` del sidecar se asume anclado día-0 = hoy-finca (contrato de
  climaService); el anclaje SERVER-side no es código de este repo y no se pudo
  auditar. El fix elimina la dependencia del reloj del cliente para elegir la
  fila "hoy", que era la fuente del P0.
- `ClimaStrip.dayLabel` (weekday corrido) queda documentado como residual (§2.4):
  requiere PR aparte por deuda de lint pre-existente en el archivo.
- Los defaults de fecha de formularios (§2.3) siguen resolviéndose en UTC: es el
  mismo mecanismo pero sin impacto en el aviso de helada; candidato a PR de
  saneamiento si el operador lo prioriza.
