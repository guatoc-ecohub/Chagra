# Informe CI: destrabar PRs Compai hacia `dev`

Fecha de verificación: 2026-08-23.

Alcance: PRs `2996`, `2995`, `2992`, `2990`, `2987`, `2985`, `2984`, `2975` y `2962`, todos con base `dev` y `mergeable=MERGEABLE` en la revisión inicial.

## Resultado ejecutivo

La tesis de que los nueve PRs son un único problema queda refutada parcialmente:

- `Check bundle sizes` sí tenía una causa común en `dev`. El propio build de `origin/dev` medía `27.7 MB / 27.5 MB`. La causa no era un umbral bajo que hubiera que subir: `dist/compai/laminas` contenía PNG servidos bajo demanda y ausentes del precache del service worker. El medidor los contaba como arranque.
- `tsc:check vs baseline` también falla ya en `origin/dev`, pero no por una causa única en las ramas. La base tenía dos errores nuevos en `gemeloValle2D.smoke.test.jsx`, mientras #2995 además introducía seis errores en tres archivos propios.
- `CLAAssistant` no es una intermitencia de código. En los tres PRs fallidos inspeccionados el autor de commit es `claude`, no firmado; #2962 pasa porque su autor de commit es `kortux`, que está en la allowlist. La solución es firma/allowlist o recheck administrativo.
- `E2E suite completa (informativo)` queda fuera del fix porque es informativo y no fue necesario para explicar los dos gates comunes. No se cambió ni deshabilitó.

## Logs crudos

Los siguientes fragmentos son literales de `gh run view <run-id> --log-failed`, conservando el texto emitido por los jobs.

### `Check bundle sizes`

PR #2996, run `32672522855`:

```text
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2605313Z Total dist (arranque, budget): 27.7 MB / 27.5 MB
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2609803Z Excluido lazy (modo campo #2088): 50.9 MB (cache-on-use, no en arranque)
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2610357Z
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2610553Z BUDGET EXCEEDED:
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2611006Z   - TOTAL dist exceeds budget: 27.7 MB
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2611524Z Main bundle: 0 B
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2611841Z Chunk count: 520
Check bundle sizes Check performance budget 2026-08-23T23:06:38.2639434Z ##[error]Process completed with exit code 1.
```

PR #2995, run `32671665270`:

```text
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5065877Z Total dist (arranque, budget): 27.7 MB / 27.5 MB
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5071515Z Excluido lazy (modo campo #2088): 50.9 MB (cache-on-use, no en arranque)
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5072207Z
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5072421Z BUDGET EXCEEDED:
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5072972Z   - TOTAL dist exceeds budget: 27.7 MB
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5073944Z Chunk count: 521
Check bundle sizes Check performance budget 2026-08-23T22:49:49.5112218Z ##[error]Process completed with exit code 1.
```

PR #2992, run `32670694966`:

```text
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4351195Z Total dist (arranque, budget): 27.7 MB / 27.5 MB
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4355261Z Excluido lazy (modo campo #2088): 50.9 MB (cache-on-use, no en arranque)
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4355704Z Main bundle: 0 B
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4355950Z Chunk count: 520
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4357826Z BUDGET EXCEEDED:
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4358385Z   - TOTAL dist exceeds budget: 27.7 MB
Check bundle sizes UNKNOWN STEP 2026-08-23T22:30:47.4393746Z ##[error]Process completed with exit code 1.
```

### `tsc:check vs baseline`

PR #2996, run `32672522896`:

```text
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T23:06:10.6169168Z tsc:check — actual: 668 errores, baseline: 715 errores
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T23:06:10.6170265Z REGRESIONES — más errores que el baseline (1):
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T23:06:10.6171022Z   - src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx: 6 -> 8 (+2)
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T23:06:10.6173763Z FAIL — hay errores de tipo nuevos que no estaban en scripts/tsc-baseline.json. Arreglalos, o si de verdad son necesarios agregá el tipo correcto (no `any`/`@ts-ignore` salvo irreducible con comentario que explique por qué).
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T23:06:10.6224922Z ##[error]Process completed with exit code 1.
```

PR #2995, run `32671665194`:

```text
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2497039Z tsc:check — actual: 674 errores, baseline: 715 errores
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2497952Z ARCHIVOS NUEVOS con errores (3):
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2498775Z   - src/components/clima/ClimaBoletinScreen.jsx: 1 error(es)
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2499690Z   - src/components/clima/ClimaBoletinScreen.test.jsx: 3 error(es)
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2500536Z   - src/services/agroIndices.js: 2 error(es)
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2501498Z REGRESIONES — más errores que el baseline (1):
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2502451Z   - src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx: 6 -> 8 (+2)
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2506070Z FAIL — hay errores de tipo nuevos que no estaban en scripts/tsc-baseline.json. Arreglalos, o si de verdad son necesarios agregá el tipo correcto (no `any`/`@ts-ignore` salvo irreducible con comentario que explique por qué).
tsc:check vs baseline Check tsc:check against baseline 2026-08-23T22:49:22.2591811Z ##[error]Process completed with exit code 1.
```

PR #2992, run `32670694964`:

```text
tsc:check vs baseline UNKNOWN STEP 2026-08-23T22:30:20.1053953Z tsc:check — actual: 666 errores, baseline: 715 errores
tsc:check vs baseline UNKNOWN STEP 2026-08-23T22:30:20.1054799Z REGRESIONES — más errores que el baseline (1):
tsc:check vs baseline UNKNOWN STEP 2026-08-23T22:30:20.1055651Z   - src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx: 6 -> 8 (+2)
tsc:check vs baseline UNKNOWN STEP 2026-08-23T22:30:20.1057097Z FAIL — hay errores de tipo nuevos que no estaban en scripts/tsc-baseline.json. Arreglalos, o si de verdad son necesarios agregá el tipo correcto (no `any`/`@ts-ignore` salvo irreducible con comentario que explique por qué).
tsc:check vs baseline UNKNOWN STEP 2026-08-23T22:30:20.1147388Z ##[error]Process completed with exit code 1.
```

### `CLAAssistant`

PR #2996, run `32672535406`:

```text
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.6222544Z PR Author: guatoc-ecohub
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.6223784Z Commit authors: ["claude"]
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.6234745Z All authors to check: [
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.7792482Z Loaded signatures file
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.7978917Z ❌ claude NO firmó CLA
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.7980069Z ✅ guatoc-ecohub en allowlist
CLAAssistant Verify CLA signatures 2026-08-23T23:04:49.7999871Z ##[error]Process completed with exit code 1.
```

PR #2995, run `32671700274`:

```text
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.1424424Z PR Author: guatoc-ecohub
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.1425551Z Commit authors: ["claude"]
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.1437648Z All authors to check: [
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.3657699Z Loaded signatures file
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.3857810Z ❌ claude NO firmó CLA
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.3858850Z ✅ guatoc-ecohub en allowlist
CLAAssistant Verify CLA signatures 2026-08-23T22:48:20.3876521Z ##[error]Process completed with exit code 1.
```

PR #2992, run `32670694927`:

```text
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:48.7008735Z PR Author: guatoc-ecohub
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:48.7009283Z Commit authors: ["claude"]
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:48.7021186Z All authors to check: [
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:49.1096087Z Loaded signatures file
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:49.1634571Z ❌ claude NO firmó CLA
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:49.1635289Z ✅ guatoc-ecohub en allowlist
CLAAssistant UNKNOWN STEP 2026-08-23T22:28:49.1655270Z ##[error]Process completed with exit code 1.
```

Control positivo, PR #2962, run `32216381400`:

```text
CLAAssistant Verify CLA signatures 2026-08-19T04:36:41.0135741Z Commit authors: ["kortux"]
CLAAssistant Verify CLA signatures 2026-08-19T04:36:41.2255034Z ✅ kortux en allowlist
CLAAssistant Verify CLA signatures 2026-08-19T04:36:41.2255869Z ✅ CLA verificado
```

## Causa raíz y evidencia

### Bundle: causa común en `dev`, sí

`origin/dev` era `3884ff9549e47a571133ea620b87fde3d9488f87`. En ese commit, `npm run build` seguido de `node scripts/check-perf-budget.mjs` reprodujo:

```text
Total dist (arranque, budget): 27.7 MB / 27.5 MB
Excluido lazy (modo campo #2088): 98.6 MB (cache-on-use, no en arranque)
Main bundle: 0 B
Chunk count: 520
BUDGET EXCEEDED:
  - TOTAL dist exceeds budget: 27.7 MB
```

La inspección de `public/sw.js` no encontró `/compai/laminas` en el precache. El árbol contiene, entre otros, `oso.png` (`425313` bytes), `jaguar-natural.png` (`417853`), `chivito-punk.png` (`328931`), `zariguya.png` (`247009`) y `luciernaga.png` (`228050`). Se cargan por URL cuando se monta el avatar.

El medidor contaba ese árbol como parte del total de arranque. El fix no sube `27.5 MB`: añade únicamente `dist/compai/laminas` a `LAZY_EXCLUDED_PREFIXES`. Tras el fix, la medición local fue:

```text
Total dist (arranque, budget): 26.1 MB / 27.5 MB
Excluido lazy (modo campo #2088): 100.2 MB (cache-on-use, no en arranque)
Main bundle: 0 B
Chunk count: 520
All budgets within thresholds.
```

### TSC: causa común de base, pero no única por rama

El gate ejecutado directamente sobre `origin/dev` reprodujo:

```text
tsc:check — actual: 668 errores, baseline: 715 errores

REGRESIONES — más errores que el baseline (1):
  - src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx: 6 -> 8 (+2)
```

El baseline de `dev` conserva seis errores para ese archivo. La regresión de dos errores proviene de dos accesos a `.style` sobre el tipo DOM genérico `Element`, añadidos por el cambio de responsividad de #2982. Se corrigió con una aserción JSDoc a `HTMLElement`; no se subió el baseline.

El caso #2995 refuta que todos los TSC rojos sean la misma causa: además de la regresión común, reporta seis errores nuevos repartidos en tres archivos de clima/índices propios de esa rama.

### CLA: patrón de autor, no bug de aplicación

Los tres fallos inspeccionados muestran el mismo patrón: `Commit authors: ["claude"]` y `❌ claude NO firmó CLA`. El control #2962 muestra `kortux` en la allowlist y `✅ CLA verificado`. Por tanto, el desbloqueo administrativo es firmar el CLA, añadir el autor válido a la allowlist según el proceso del proyecto o re-ejecutar el check después de corregir esa condición. No se modificó el workflow CLA.

## Fix aplicado

Commit: `3fc4010af` (`fix(ci): destrabar gates comunes en dev`)

Archivos incluidos, confirmados por `git show --stat`:

- `scripts/check-perf-budget.mjs`
- `src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx`

PR contra `dev`: [#2998](https://github.com/guatoc-ecohub/Chagra/pull/2998)

No se hizo merge, no se usó `--force`, no se cambió el umbral y no se deshabilitaron checks.

## Validación local

```text
node scripts/check-perf-budget.mjs
Total dist (arranque, budget): 26.1 MB / 27.5 MB
All budgets within thresholds.

node scripts/tsc-check-gate.mjs
tsc:check — actual: 666 errores, baseline: 715 errores
OK — sin errores nuevos respecto al baseline.

npx vitest run src/visual/mundo3d/__tests__/gemeloValle2D.smoke.test.jsx
Test Files  1 passed (1)
Tests  12 passed (12)
```

## Lo que no quedó verificado

- Los checks de GitHub del PR #2998 estaban pendientes al cerrar este informe; no se reportan como verdes.
- `E2E suite completa (informativo)` tiene fallos en algunos PRs, pero no se atribuye aquí una causa raíz sin un fragmento de error reproducible. Los checks `Offline-first E2E`, corpus offline y vitest de los PRs inspeccionados sí aparecían verdes cuando estaban disponibles.
- El fix común no puede hacer pasar automáticamente los errores propios de #2995 ni resolver CLA para commits cuyo autor no está firmado.
