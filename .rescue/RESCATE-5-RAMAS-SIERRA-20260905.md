# RESCATE-5-RAMAS-SIERRA-20260905 — informe de entrega (RELANZAMIENTO r2)

- **Carril:** glm (GLM) · **Tarea:** `rescate-5-ramas-sierra-clima-r2-20260905`
- **Base de trabajo:** `origin/dev` = `90f12a947` (fetch fresco al arrancar).
- **Ruta del informe:** pedido original en `Chagra-strategy/ops/` (fuera del cwd,
  auto-rechazado por el carril). Se entrega commiteado aquí, dentro del repo,
  como `.rescue/RESCATE-5-RAMAS-SIERRA-20260905.md` — mismo precedente que
  `.rescue/RESCATE-4-PRS-20260904.md`.

## Decisión de método (conservadora, declarada)

El brief r1 mandaba rebasar cada rama sobre `origin/dev` y empujar. Al arrancar
r2, **las cinco ramas ya estaban en `origin`** (las copias locales desaparecieron
del repo de trabajo). Rebasarlas y empujar habría exigido force-push sobre
refs compartidas, prohibido para este carril sin confirmación del operador.
Elección conservadora: **rescatar por CONTENIDO en ramas nuevas**
`glm/rescate-r2/<n>-<slug>` desde `origin/dev` fresco, push normal (sin
force), PR draft por rama. Las ramas originales en origin quedan intactas.

Regla del brief aplicada en cada paso: verificar absorción **por CONTENIDO
(blob/árbol), no por SHA** — los squash reescriben números.

## Resultado por rama

### 1. `fable/mockup-clima-atmosfera` — RESCATADA → PR #3160

- Commit origen: `105e6afd3` (10-jul). Conflicto re-medido: 1
  (agregar/agregar en `src/mockups/ClimaAtmosfera.jsx`).
- **Absorción verificada:** el CSS del arte (`climaAtmosfera.css`, 789 líneas)
  está en dev **byte-idéntico** (blob `3792c46b`) y huérfano; TODO el cableado
  de `App.jsx` del commit ya vive en dev. La ruta canónica
  `#/mockups/clima-atmosfera` quedó como **puente al mundo real** (#2833,
  27-ago) con test smoke propio.
- **Lo único no absorbido:** el componente de arte (457 líneas, 5 estados de
  clima con re-tinte `data-clima`) — el arte de Fable «que no se ve en ningún
  lado».
- **Resolución:** se descartó el `App.jsx` del cherry-pick (duplicaba lazy
  import/case y rompía llaves del router actual); el arte entra como
  `ClimaAtmosferaArte.jsx` en ruta hermana `#/mockups/clima-atmosfera-arte`
  (entrada nueva al FINAL de `MOCKUP_HASH_ROUTES`, convención anti-conflicto
  del bloque). El puente #2833 queda intacto: **las dos intenciones viven**.
- **Tests:** `climaAtmosferaArte.smoke.test.jsx` (4): estado inicial, selector
  de 5 estados, re-tinte, retorno, y que el puente sigue montando el mundo
  real. vitest 4/4 · eslint limpio · tsc gate sin errores nuevos (756).

### 2. `feat/clima-fichas-agroclimaticas-dev` — ABSORBIDA (sin PR)

- Commits: `a99fce87e` (fichas) + `1e429f21e` (init.sh sensor).
- **Por contenido:** 5/7 archivos byte-idénticos en dev;
  `fichasAgroclimaticas.js` es estrictamente absorbido (dev = rama + typedefs
  JSDoc que entraron con #3105); el mismo commit «agrega fichas
  agroclimaticas» YA está en dev como `7b7fc2053`.
- `init.sh`: dev absorbió el sensor por otra vía (**#3137**) con evolución
  propia (4 gates: eslint/vitest/tsc/build). El bloque único de la rama
  (health checks HTTP de fleet-viz) depende de `ops/fleet-viz/server.py`,
  **que no existe en dev**: traerlo sería código muerto con un `exit 0`
  anticipado que saltaría los gates 3–4. Se documenta y se SALTA (regla del
  brief: «no se puede, por esto» verificado).

### 3. `fix/clima-reachable-dev-20260830` — ABSORBIDA (sin PR)

- Commits: `f6b026563` + `b1692d9db` (30-ago).
- **Por contenido:** `PaginaTiempo2D.jsx` ya no existe en dev (la eliminación
  de la rama está absorbida; su entrada tampoco está en `tsc-baseline.json`
  de dev, que es más nuevo: 756 del 03-sep vs 758 del 29-ago);
  `ClimaBoletinScreen.jsx/.test.jsx` y `DashboardLive.redistribucion` en dev
  son superconjuntos (motores agroclimáticos etc.); `mundosFinca.js`
  idéntico.
- La intención «boletín 2D alcanzable» está **superada** en dev: 5 rutas hash
  llevan a `clima_boletin` (`clima-boletin`, `tiempo`, `el-tiempo`,
  `pagina-del-tiempo`, `el-clima-que-viene`) y la tarjeta mundo-clima navega
  directo (`mundo-clima` → `clima_boletin`, probado en dev).

### 4. `codex/c08-pisos-termicos-sierra` — ABSORBIDA (sin PR)

- Commit: `39c577f31` (24-jul). Conflicto re-medido: 2.
- **Por contenido:** dev tiene verbatim TODO el cableado de la rama: imports
  `PisosTermicosBandas`/`TransicionSierraMundo` (líneas 68-69), props
  `onSeleccionPiso`/`pisoActivo`, callbacks `seleccionarPiso`/`viaje`
  (líneas 744+), y lo **supera** con el deep-link `?viaje=<id>` y el panel
  por piso (#3141/#3107). El test `vistaGlobalSierra.cableado.test.jsx`
  agregar/agregar también vive en dev (evolucionado).
- Nota: esta rama toca `VistaGlobalSierra.jsx`, archivo del carril vivo
  `sierra-absorbe-todo-el-clima-r2`; al no haber nada que rescatar, no hubo
  colisión efectiva.

### 5. `fix/valle2d-fallback-y-sierra-clic` — RESCATADA (parcial) → PR #3162

- Commit: `8b860eb2d` (21-jul, bug P1 huérfanos-3D). Conflicto re-medido: 2.
- **Supersede declarado:** la recalibración del fallback 2D del valle
  (`clampPct` 8–92% + constantes 22/10) fue **superada por #2702**
  (BUG-VALLE-390): dev clampea las etiquetas con `clamp()` CSS px+%
  conservando la geografía. Los hunks de `Valle2DFallback.jsx` NO se traen
  (desharían una decisión más nueva). Sus tests originales probaban esa
  arquitectura sustituida y tampoco se copian.
- **Hueco real encontrado y rescatado:** en dev, `PisosTermicosBandas`
  dispara el clic, `VistaGlobalSierra` expone `onSeleccionPiso` a mitad de la
  transición (probado en su `cableado.test`)… **y ningún host lo consumía**:
  el clic se perdía. El PR añade el cableado del host (`App.jsx`,
  case `mockup_sierra_global`) + helper SSOT
  `mundoPrincipalDePiso(piso)` en `pisosTermicos.js` (resuelve piso de finca
  o banda visual vía `id` o campo `piso`, p.ej. `calido_seco`→`calido`;
  honestidad: sin mundo → `null` → no navega).
- **Tests:** `pisoANavegacion.test.js` (6): resolución por piso, bandas→mundo,
  honestidad, invariante de cultivables + contrato de host por fuente `?raw`.
  Vecinos (cableado, contratos mockup, SSOT pisos): 59/59.
- **Colisión declarada:** `VistaGlobalSierra.jsx`/`App.jsx` es zona del
  carril vivo `sierra-absorbe-todo-el-clima-r2` (PR #3159). El PR toca solo
  el case del mockup + import, sin solapamiento de líneas con #3159.

## Verificación global

- `npx vitest run` (suite completa, rama 5): **1051/1064 archivos verdes**.
  Los 10 rojos se caracterizaron contra `origin/dev` LIMPIO corrido en
  paralelo: rojos de base (`migrate-v31-to-v32`, `audit-integraciones`,
  `DashboardLive.extensionistaMundos`, `AngelitaGuia`, `Guacamaya`,
  `Luciernaga.render`, `LuciernagaCompaiEscena`) + flakes de carga
  (`ChagraAgentAvatar.estadosP1`, `CompaiP1.contract`, `ProfileScreen.hub`,
  `visualLib.smoke`) que **pasan aislados en dev limpio Y en la rama**.
  Ningún rojo es de este rescate.
- `npx eslint` sobre todos los archivos tocados: limpio con
  `--max-warnings=0`.
- `node scripts/tsc-check-gate.mjs` (con `NODE_OPTIONS=--max-old-space-size=6144`):
  sin errores nuevos vs baseline **756**; un JSDoc se endureció (tipado
  honesto de `mundoPrincipalDePiso`), sin `any` ni `@ts-ignore`, baseline
  NO tocado.
- `npm run build` (rama 5, la de mayor impacto): **VERDE** — `vite build`
  completo en 19.6 s con su prebuild de catálogo/manifests.
- `npx eslint .` full-repo: OOM de Node en este entorno incluso con
  `--max-old-space-size=6144` (limitación del entorno; el lint de la casa
  corre SCOPED — ver init.sh, «lint archivos modificados»). Cobertura real:
  todos los archivos tocados, limpios con `--max-warnings=0`.

## Estado de checks (separando los de la base)

- Ajenos a estos PRs (rojos de base para todos, probado en la ronda
  anterior con un PR de solo `.md`): `CLAAssistant`, `audit-integraciones`.
  `E2E suite completa` es informativo.
- Propios: vitest/eslint/tsc en verde según el detalle por rama de arriba.

## Límites de este carril

- `Chagra-strategy/ops/` inalcanzable (auto-rechazo de rutas fuera del cwd):
  informe entregado en `.rescue/` dentro del repo.
- No se tocó `scripts/tsc-baseline.json` (regla dura del brief).
- Sin force-push, sin reset --hard, sin branch -D; ramas originales en
  origin intactas.
