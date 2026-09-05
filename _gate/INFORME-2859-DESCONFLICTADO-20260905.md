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
| head después | `9c005ae43` (2026-09-05) |
| merge-base con dev | `631e9323` (2026-07-12) → la rama estaba ~8 semanas atrás de dev |

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

## 3. Decisiones contra «dev manda» (ninguna)

No tomé ninguna decisión que prefiriera la rama sobre `dev` fuera del set CRM.
Las únicas 3 excepciones al árbol de dev son los archivos que el PR crea o edita.

## 4. Verificación local

- `npx vitest run src/components/crm src/services/__tests__/crmService.test.js
  src/mockups/__tests__/crmAgroecologico.route.test.jsx` → **5 files / 20 tests passed**.
- Todos los imports relativos de los 15 archivos CRM resuelven contra el árbol mergeado
  (única excepción `?raw`, sufijo Vite válido; el test de ruta que lo usa pasa).
- ESLint sobre los archivos CRM: 0 errores, **2 warnings propios del contenido CRM**
  (strings hardcodeados `"Pendiente"` y `"Cargando red…"`, regla chagra-i18n ADR-050).
  eslint no es gate de CI de PRs acá (es pre-commit lefthook); los dejo documentados,
  no toqué strings de UI del mockup.

## 5. Estado del CI

(pendiente de terminar la corrida; actualizar cuando los checks resuelvan)

## 6. Lo que NO pude verificar

- No corrí la suite E2E Playwright completa ni `vite build` local (caro; lo cubre CI).
- No corrí el gate tsc completo local (baseline ~2335 errores; el job CI lo hace y
  compara contra el baseline commiteado; los archivos CRM son nuevos, si introducen
  errores de tipo el gate lo va a marcar).
- No verifiqué visualmente la pantalla del mockup CRM (requiere servidor + navegador;
  es un mockup de navegación interna, los tests de ruta cubren que renderiza).
