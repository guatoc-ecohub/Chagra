# Bitácora — Whitelist 3d.guatoc.co + rebase PR #2764

Repo: `/home/kortux/Workspace/chagra`. Todo contra `origin/dev`, nunca `main`.

## Paso 0 — Setup

- `git fetch origin dev` OK.
- Branch de partida del agente: `feat/jaguar-marcha-perfil` (limpio, sin cambios pendientes).
- `ops/bitacora/` no existía — creado.
- PR #2764 verificado con `gh pr view 2764`: base=`dev`, head=`rescate/consistencia-rubberhose-d4`, state=OPEN, mergeStateStatus=DIRTY, mergeable=CONFLICTING. Confirma el conflicto real reportado en la tarea.
- Branches relacionadas detectadas: `rescate/consistencia-rubberhose-d4` (local+remota), `fable/consistencia-rubberhose-d4` (local+remota, la fuente que rescató), `feat/espiritu-guardian-rubberhose`, `feat/angelita-rubberhose` (locales, no mencionadas en la tarea — no tocar).

## TRABAJO 1 — Whitelist 3d.guatoc.co

- Leído completo `src/services/canonicalHostRedirect.js`: `isAllowedHost` protege contra que la SPA se sirva/monte desde hosts no autorizados; si el host no matchea, `runCanonicalHostRedirectGuard()` (invocado sin args desde `main.jsx`/`main-prod.jsx` en cada arranque) hace `location.replace` hacia `https://chagra.app` preservando path/search/hash, con guard en `sessionStorage` para no loopear.
- `git grep` de `canonicalHostRedirect`, `chagra.app` y `guatoc.co`: el único otro lugar con listas de host relacionadas es el propio test `src/services/__tests__/canonicalHostRedirect.test.js`. **Hallazgo clave**: ese test usa `chagra.guatoc.co` como ejemplo explícito de host que **debe** redirigir a `chagra.app` (es el dominio legado de producción, ver referencias en `scripts/*`, `.github/workflows/*` a `chagra.guatoc.co` como backend/target real). No hay ninguna referencia previa a `3d.guatoc.co` en todo el repo (confirmado, es genuinamente nuevo).
- **Decisión: host EXACTO `3d.guatoc.co`, NO wildcard `*.guatoc.co`.** Justificación con evidencia: un wildcard sobre `*.guatoc.co` habría hecho `isAllowedHost('chagra.guatoc.co') === true`, rompiendo el test existente y el comportamiento real esperado (ese dominio legado debe seguir rebotando al canónico). El comodín es más cómodo para futuros subdominios `*.guatoc.co`, pero es más permisivo de lo que el propio código ya asume en otro punto — se prefirió lo estrictamente necesario, siguiendo el mismo patrón que `isProdAppHost` (host exacto para `prod.chagra.app`).
- Cambios: nueva función `isThreeDWorldHost()` (comentario explicando la razón + por qué exacto y no wildcard) sumada a `isAllowedHost()`. 2 tests nuevos en el test file: (a) `isAllowedHost('3d.guatoc.co') === true`; (b) `isAllowedHost('chagra.guatoc.co') === false` y `isAllowedHost('otra-cosa.guatoc.co') === false` — documenta la decisión exacto-vs-wildcard como regresión futura.
- `npx vitest run src/services/__tests__/canonicalHostRedirect.test.js` → 6/6 verde (4 originales + 2 nuevos).
- `npx vite build` → verde (warnings preexistentes de code-splitting, no relacionados).
- **Prueba empírica real** (no solo unit test): serví `dist/` con `vite preview` (puerto 4790, `preview.allowedHosts:true` vía config temporal SOLO para destrabar el Host-header check propio de Vite, no relacionado con el código de la app) y usé Playwright + Chrome del sistema (`google-chrome`, el binario de Playwright bundlado falla por lib faltante en este NixOS) con `--host-resolver-rules=MAP <host> 127.0.0.1` para resolver hostnames arbitrarios a localhost:
  - `3d.guatoc.co` → la app monta COMPLETA (título "Chagra", logs de arranque: DB v27, SQLite WASM, catálogo, AlertEngine), cero navegaciones fuera de esa URL, `location.hostname` se mantiene `3d.guatoc.co`.
  - Control negativo `otro-host-no-listado.example.com` → SÍ dispara `location.replace`, Chrome navega de verdad a `https://chagra.app/` (producción real, confirmado por assets/SW cargando desde ese origen).
  - Esto prueba de forma directa, en un browser real, que el guard distingue correctamente ambos casos.
- PR abierto: **#2787**, rama `fix/whitelist-3d-guatoc-co` → base `dev`. NO mergeado (a la espera de review, como corresponde).
- Nada pendiente sin verificar en este trabajo.

## TRABAJO 2 — Rebase/actualización PR #2764

- Verificado con `gh pr view 2764`: antes de tocar nada, `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`. Confirma el bloqueo real.
- `git merge-base origin/dev rescate/consistencia-rubberhose-d4` = `e53e5d5b` — dev tenía 20 commits nuevos desde ahí (incluye zarigüeya #2783 y jaguar-marcha #2784, entre 14 PRs de rescate más).
- La rama ya traía un merge previo (`931d4338`, `merge: rescatar fable/consistencia-rubberhose-d4`) que en su momento resolvió el mismo tipo de conflicto contra el dev de ESE momento (`e53e5d5b`) — quedó stale en cuanto dev volvió a avanzar. No se rehizo esa resolución vieja: se hizo un segundo `git merge origin/dev` sobre la rama para traerla al día (mismo patrón que ya traía, un merge commit más).
- **El conflicto real, uno solo**: `src/visual/creatures/creatureIdle.js` (no `index.js` — ese quedó sin conflicto, auto-merge limpio: el registro `CREATURES` completo de dev quedó intacto, solo se sumó el export de `rubberhoseSpec.js`). Ambas ramas tocaban el mismo punto del mapa `IDLE_PERFILES`, justo después de `'oso-andino'`:
  - dev insertaba ahí el perfil `zariguya` (Didelphis, cargada de crías).
  - la rama renombraba `'rana-dorada'` → `'rana-andina'` (dejando alias legacy `IDLE_PERFILES['rana-dorada'] = IDLE_PERFILES['rana-andina']` más abajo, ya presente sin conflicto) y agregaba ahí perfiles nuevos: perezoso, ardilla, jaguar, morrocoy, borugo.
  - **Resolución: se conservaron AMBOS** — quedó `oso-andino` → `zariguya` (restaurado de dev) → `rana-andina` (con su alias) → perezoso → ardilla → jaguar → morrocoy → borugo. Ninguna criatura de dev se perdió; nada de la rama se descartó. También actualicé el comentario de cabecera del archivo (línea ~41) para mencionar `zariguya` en la lista de la familia, que quedó desactualizado tras el merge automático (detalle menor, no funcional).
- **`creatureIdle.js` vs las marchas nuevas de jaguar/oso — verificado, NO choca**:
  - `git log`/`git show` de `e7b4fda7` (PR #2784, "marcha de perfil real" del jaguar, YA mergeado en dev) muestra que solo toca `Jaguar.jsx`, `creatures.css` y `JaguarBillboard.jsx` — nunca `creatureIdle.js`. La marcha vive en un sistema de pose CSS (`pose='camina'`) separado del idle.
  - `git grep` confirma que **ningún componente de producción** importa hoy `creatureIdle.js`/`IDLE_PERFILES` — solo lo consumen sus propios tests (`creatureIdle.test.js`, `Zariguya.render.test.jsx`). El sistema que sí usa Jaguar.jsx en producción es otro: `useVidaIdle`/`vidaEstados.js` ("VIDA v2"), independiente del `IDLE_PERFILES` de `creatureIdle.js`.
  - Conclusión: agregar el perfil `jaguar` a `IDLE_PERFILES` es aditivo e inerte para el jaguar real en producción — no interfiere con su ciclo de marcha ni con ningún otro comportamiento vigente. No encontré un commit "oso marcha" separado en dev (busqué `camina|marcha` en el log; solo existe el del jaguar) — si hay uno pendiente en otra rama local no mergeada, no lo vi tocar `creatureIdle.js` tampoco.
- `npx vite build` → verde.
- `npx vitest run src/visual` → **771/776 verde**. 5 fallos, en 5 archivos (`Borugo.render.test.jsx`, `vidaEstados.test.js`, `mergeMainIntegra.test.js`, `navegacion.test.jsx`, `vitrina.geom.test.js`). **Verificado en un worktree aislado de `origin/dev` solo (sin este merge)**: los mismos 5 tests fallan con el MISMO mensaje exacto (borugo archivado del registro pero el test viejo no se actualizó; `vidaEstados` repertorio no cubre condor/crisopa/danta/gallina/sirfido/trichogramma; fecha de `grafo-relations.json` desactualizada en el fixture; catálogo térmico de la Sierra; y conteo de viñetas de `vitrina.geom`). **Son pre-existentes de `dev`, no los introduce ni los agrava este merge** — no se tocaron (fuera de alcance de esta tarea, habría sido scope creep).
- Rama actualizada y pusheada (`git push origin rescate/consistencia-rubberhose-d4`, con `LEFTHOOK_EXCLUDE=eslint`).
- `gh pr view 2764` después del push: **`mergeable: MERGEABLE`** (antes `CONFLICTING`). `mergeStateStatus: UNSTABLE` — los checks de CI (vitest, tsc-gate, bundle sizes, E2E) quedaron en `pending` justo al pushear, aún no corren. **NO mergeado** (por instrucción explícita de la tarea) — queda listo para que el operador lo revise/mergee cuando los checks terminen.
- **Lo que no pude verificar y por qué**: no esperé a que terminaran los checks de CI en GitHub Actions (vitest/tsc-gate/E2E) porque tardan varios minutos y la tarea pedía dejarlo "mergeable", no verde-en-CI; el build y los tests SÍ los corrí localmente y están verdes salvo los 5 fallos pre-existentes documentados arriba. Tampoco verifiqué visualmente en navegador las 3 criaturas migradas (Escarabajo/Lombriz/Mariposa) ni el line-boil — el merge fue de texto/datos (un solo conflicto en un archivo de configuración numérica), no toqué su lógica ni su CSS, y sus tests unitarios (incluidos en el 771/776) pasan.

