# INFORME-2859-DESCONFLICTADO-20260905

> Carril opencode/deepseek · trabajo en worktree propio `.worktrees/desconflict-2859-20260905`.
> PR **#2859** `feat(crm): CRM agroecológico mínimo con contactos e interacciones`
> · base `dev` · head `feat/idea-23-crm-agroecologico` · **sigue DRAFT (no lo saqué, no lo mergeé)**.
> Encargo: dejar mergeable, NO mergear. El operador decide.

## 0. Hecho verificado

| fuente | valor |
|---|---|
| mergeable antes | CONFLICTING |
| mergeable después | **MERGEABLE** |
| estado | OPEN · draft |
| head antes | `44d76cd88` (2026-08-27) |
| head después | `095218f5d` (2026-09-05) |
| merge-base con dev | `631e9323` (2026-07-12) → la rama estaba ~8 semanas atrás de dev |

### Commits que agregué a la rama (resolución)
```
570394b04 Merge remote-tracking branch 'origin/dev' into feat/idea-23-crm-agroecologico
8c010cb85 chore(crm): alinear con dev — retirar 8 archivos no-CRM que dev no tiene (resolución de conflicto PR #2859)
9c005ae43 fix(crm): App.jsx = dev + 3 hunks CRM sin quimeras del merge (ruta mockup crm-agroecologico)
095218f5d fix(crm): gates verdes — tipos JSDoc para onBack y fixtures, y declarar crmService+types/crm en allowlist de no-consumidas
```

### Estado final del árbol contra `origin/dev` (verificación de salida)
- `git diff --stat origin/dev HEAD` → **16 archivos, +1336 / −2** (los 15 del CRM +
  `ops/integraciones-no-consumidas.json` con las 2 declaraciones, ver 5b).
- `git diff --diff-filter=D --name-only origin/dev HEAD` → **vacío** (sin deletes).
- `git diff --name-only origin/dev HEAD` → solo los 15 archivos del CRM + el archivo de
  allowlist declarado en 5b; todo lo demás byte-idéntico a dev.
- Rama empujada a `origin/feat/idea-23-crm-agroecologico` (44d76cd88..095218f5d).

## 1. Tamaño real del conflicto

- El header de GitHub decía 3.379 archivos / +445k: eso es el diff 2-dot de una rama
  vieja contra un dev que avanzó 8 semanas. **No es el producto del PR.**
- Producto real del CRM: **2 commits, 15 archivos** (`src/components/crm/*`,
  `src/services/crmService.js`, `src/constants/crmConstants.js`, `src/types/crm.js`,
  `src/mockups/CrmAgroecologico.jsx` + tests, y ediciones a `src/App.jsx`,
  `src/types/asset.js`, `src/types/log.js`).
- Merge 3-way contra `origin/dev`: **155 archivos en conflicto no resueltos**
  (106 add/add + 49 modify/modify). Ninguno era del CRM.

## 2. Cómo resolví cada grupo

**Grupo A — 155 conflictos no-CRM (dev manda, sin excepción).**
Todos ajenos al CRM: 3D (`src/visual/mundo3d/**`, `src/visual/creatures/**`),
compAI, clima, workflows `.github`, `scripts/`, docs, tests de otras superficies.
Resolución: `git checkout --theirs` (= versión de `dev`) en los 155, commit del merge.

**Grupo B — 8 archivos no-CRM que el merge trajo de la rama vieja y `dev` no tiene.**
El árbol resultante quedó con 8 archivos huérfanos de la historia divergente de la
rama (ej. `src/visual/creatures/*LaminaViva.jsx`, `src/components/clima/PaginaTiempo2D.jsx`)
que `dev` ya no tiene. `dev manda` → `git rm`. Verificado: `git diff --name-only origin/dev HEAD`
quedó en exactamente los 15 archivos del CRM.

**Grupo C — `src/App.jsx`: quimera del auto-merge detectada y reconstruida.**
El 3-way auto-merge (base julio) combinó la versión vieja de la rama con la de dev
y produjo código roto SIN conflicto textual: import duplicado
(`userProfileService` importado 2 veces) y `<HomeCampesinoB>` renderizado 2 veces.
Regla aplicada: **`dev` + solo los 3 hunks del CRM** (lazy import
`CrmAgroecologicoMockup`, entrada `'mockups/crm-agroecologico'` en `MOCKUP_HASH_ROUTES`,
y el `case 'mockup_crm_agroecologico'`). Verificado: `git diff origin/dev -- src/App.jsx`
muestra exactamente esos 3 hunks, nada más.

**Grupo D — `src/types/asset.js` y `src/types/log.js`.**
El único delta del CRM vs dev es el newline final al EOF (los commits del CRM lo
agregaron). Sin impacto de contenido. Se conservó (es el cambio intencional del CRM).

**Los 12 archivos nuevos del CRM** quedaron byte-idénticos al tip del PR
(`44d76cd88`): verificados uno a uno con `git diff 44d76cd88 HEAD -- <archivo>` = vacío.

## 3. Decisiones contra «dev manda»

No tomé ninguna decisión que prefiriera contenido de la rama sobre `dev` fuera del set
CRM. Solo toqué **un archivo no-CRM**: `ops/integraciones-no-consumidas.json`, para
declarar 2 módulos del CRM que ningún gate del CRM quería huérfanos (ver 5b, punto 2).
Es aditivo (10 líneas), no revierte nada de `dev`.

## 4. Verificación local

- `npx vitest run src/components/crm src/services/__tests__/crmService.test.js
  src/mockups/__tests__/crmAgroecologico.route.test.jsx` → **5 files / 20 tests passed**.
- Todos los imports relativos de los 15 archivos CRM resuelven contra el árbol mergeado
  (única excepción `?raw`, sufijo Vite válido; el test de ruta que lo usa pasa).
- ESLint sobre los archivos CRM: 0 errores, **2 warnings propios del contenido CRM**
  (strings hardcodeados `"Pendiente"` y `"Cargando red…"`, regla chagra-i18n ADR-050).
  eslint no es gate de CI de PRs acá (es pre-commit lefthook); los dejo documentados,
  no toqué strings de UI del mockup.

## 5. Estado del CI (final, corrida sobre `095218f5d`)

- **Mergeable: MERGEABLE** · sigue DRAFT · `mergeStateStatus: UNSTABLE` por el check
  informativo abajo (dev no tiene required checks; el ruleset de GitHub solo protege `main`).
- **Verdes:** CodeQL · Analyze (javascript-typescript) · Check bundle sizes ·
  Offline-first E2E · Offline-first corpus (dist + SW real) · vitest ·
  tsc:check vs baseline · audit-integraciones · CLAAssistant.
- **Rojos (1, informativo):** `E2E suite completa (informativo)` → falla SOLO en
  `tests/agent-anti-halluc.spec.js` "Caso A — input/submit deshabilitados al alcanzar 2
  en cola" (timeout 45 s, reintentado 1 vez, mismo resultado). No toca el CRM: el diff
  del PR no incluye ningún archivo de agente/agent-screen y la única pieza compartida
  (`App.jsx`) solo agrega una ruta mockup lazy. Lo clasifico como ruido de la suite
  completa sobre la base, no causado por el PR.
- **Nota base (pre-existente, no bloquea):** audit-integraciones avisa de 4 entradas
  fantasma en la allowlist (`src/visual/creatures/_archivo/*LaminaViva.jsx`, symlinks a
  `/mnt/data/coldstore/...` que no resuelven en CI). Mismo aviso que produce dev; exit 0.

### Checks locales que corrí y cómo
- `vitest` sobre los 5 archivos de test CRM: **20/20 passed** (antes y después del fix tsc).
- `node scripts/tsc-check-gate.mjs`: **OK** — 755 errores vs baseline 756, sin errores nuevos.
- `node scripts/audit-integraciones.mjs`: **Auditoría limpia, exit 0**.
- `eslint` sobre archivos CRM: 0 errores; quedan 2 warnings de strings hardcodeados
  (`"Pendiente"`, `"Cargando red…"`, regla chagra-i18n) propios del contenido CRM, no es
  gate de CI de PRs.

## 5b. Fixes que hice por CI rojo propio del CRM
1. **tsc gate rojo** (8 errores nuevos): `crmService.test.js` (7, parámetros de los
   fixtures inferidos como literal único por TS) y `crmAgroecologico.route.test.jsx` (1,
   `onBack` requerido). Fix: JSDoc `@param {string}` en los fixtures del test y prop
   `onBack` opcional en `CrmAgroecologico.jsx` (el mockup ya la trataba como opcional en
   runtime).
2. **audit-integraciones rojo** (2 huérfanos sin declarar): `crmService.js` y
   `types/crm.js` no los alcanza ninguna ruta viva (el mockup renderiza fixtures y no
   escribe en IndexedDB). Declarados en `ops/integraciones-no-consumidas.json` con
   reason + date. **Única decisión que toca un archivo que no es del CRM**: lo declaro
   explícitamente — es el mecanismo que el propio gate prescribe y no revierte contenido
   de dev (solo agrega 2 entradas de 10 líneas).

## 6. Lo que NO pude verificar

- No corrí la suite E2E Playwright completa ni `vite build` local (caro; lo cubre CI). El
  único E2E rojo (agent-anti-halluc, informativo) no lo reproduje local ni en base limpia:
  los runs recientes del workflow en `dev` salen todos `cancelled`, así que no tengo un
  "dev verde" de hoy para comparar. La evidencia de que no es del CRM es estructural
  (ningún archivo del PR toca agente/agent-screen).
- No corrí la suite vitest completa del repo (solo los 5 archivos CRM + el gate tsc/audit).
- No verifiqué visualmente la pantalla del mockup CRM en navegador: el test de ruta
  renderiza y clickea (`CrmAgroecologico` monta los 3 paneles y navega entre contactos),
  pero no miré la captura. Es un mockup de datos de muestra; sin back-end ni IndexedDB.
