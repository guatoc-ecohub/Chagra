# INFORME — Dos PRs de la flota bloqueados, cada uno por UN check rojo (2026-09-05)

Carril: opencode · cwd `/home/kortux/Workspace/chagra` · rama base `origin/dev`
(excepción explícita a AGENTS.md: `main` está ~1155 commits atrás).

No se mergeó ninguno de los dos PRs. El merge lo hace el orquestador.

---

## Resumen ejecutivo

| Frente | PR afectado | Check rojo | Causa raíz | Fix | Estado |
|---|---|---|---|---|---|
| A | #3151 (`glm/3124-vitest-r2-20260905`) | `audit-integraciones` | `walk()` de `scripts/audit-integraciones.mjs` y del motor compartido `scripts/lib/alcance-simbolica.mjs` hacen `statSync` (sigue symlinks) sobre `src/visual/creatures/_archivo/*.jsx`, symlinks colgantes a cold store que CI no tiene montado → ENOENT | `readdirSync(dir, {withFileTypes:true})` + saltar `isSymbolicLink()` | PR #3155 (draft, base dev), audit-integraciones **pass** en CI |
| B | #3150 (`fix/bug09-onboarding-no-repite-20260904`) | `vitest` | `detect-changed-tests.mjs` manda `_gate/bug09-mitad-b.spec.js` (Playwright, fuera del include de vitest) al job de vitest → "No test files found" exit 1 | solo self-incluir `.test.*` (no `.spec.*`) | push a la rama #3150, vitest **pass** en CI |

---

## Frente A — PR #3151: el auditor CRASHEA (no es un hallazgo)

### Qué medía el check rojo
Job `audit-integraciones` (run 33963232615). Log:

```
Error: ENOENT: no such file or directory, stat
  '.../src/visual/creatures/_archivo/ChivitoPunkLaminaViva.jsx'
    at statSync (node:fs:1681:25)
    at walk (scripts/audit-integraciones.mjs:146:16)
```

### La ironía resuelta: cuál de las tres hipótesis es verdad
Verificado con evidencia, no supuesto:

1. **El arreglo del PR está incompleto** — SÍ, es la verdad central. El diff
   `origin/dev...e7352c590` (head de #3151) **NO toca** `scripts/audit-integraciones.mjs`
   ni `scripts/lib/alcance-simbolica.mjs` (`git diff --name-only` vacío para ambos).
   El PR curó el gate de **vitest** (`tests/unit/laminas-solo-tinta.test.js` con
   `lstat`, exclude `src/visual/creatures/_archivo/**` en `vitest.config.js`), pero
   el check rojo corre OTRO instrumento: `node scripts/audit-integraciones.mjs`.
2. **Hay más de un lugar que hace stat sin protección** — SÍ. Son DOS `walk()`:
   el propio del gate (`scripts/audit-integraciones.mjs:140`) y el del motor
   compartido `scripts/lib/alcance-simbolica.mjs:71` (lo usa también
   `audit-componente-huerfano.mjs`). Ambos hacían `statSync` (sigue el symlink).
3. **El auditor de CI no es el del PR** — NO. El log muestra que CI corre sobre
   el merge-ref del PR (`ad20dc1 = merge de e7352c590 en 073969f1e`), con el
   árbol que SÍ contiene los symlinks. No es base vs. head: es que el PR
   introdujo los symlinks (vía #3124 apilado) y no protegió a los walkers que
   los iban a encontrar.

### Causa raíz
Las 6 láminas archivadas + su test viven como **symlinks** (git modo 120000) a
`/mnt/data/coldstore/chagra-laminas-fuera-20260904/`. En alpha el mount existe y
el gate pasa; en el runner de CI el destino no existe y `statSync` (que sigue el
enlace) lanza ENOENT. El `lstat` del fix de #3151 cubre el test de vitest; el
script del auditor seguía crudo.

### El fix (rama `fix/audit-symlink-colgante-20260905`, PR #3155)
Decisión escrita en el código, NO try/catch silencioso:

> Un symlink, colgante o no, apunta FUERA del árbol de build: no es un módulo
> de `src/` que auditar. `walk()` usa `readdirSync(dir, { withFileTypes: true })`
> (el `Dirent` no sigue el enlace) y salta `entry.isSymbolicLink()`.

- `scripts/audit-integraciones.mjs` → `walk()` con `Dirent`.
- `scripts/lib/alcance-simbolica.mjs` → `walk()` con `Dirent`.
- Dev no tiene symlinks (verificado: `git ls-tree -r origin/dev | grep 120000` = 0),
  así que el cambio es no-op sobre la base: no cambia ningún veredicto existente.
- "Archivar ≠ borrar" lo sigue vigilando el gate de vitest con `lstat`
  (`tests/unit/laminas-solo-tinta.test.js`) — el auditor no se convierte en
  guardián de eso; solo deja de morir.

### Prueba de control obligatoria (falle-hoy / pase-con-este)
`conFixture({ conSymlinkColgante: true })` en `scripts/__tests__/audit-integraciones.test.mjs`
replica el árbol de CI (symlink a `/mnt/data/coldstore/...` ausente). Verificado
en las DOS direcciones:

- Con el auditor de hoy (stash de los dos fixes): el test **muere** con
  `ENOENT` + `at walk` (test falla, status ≠ 0).
- Con este arreglo: exit 0, `Auditoría limpia`, sin `ENOENT` ni `at walk`.

Suite completa afectada:
```
npx vitest run scripts/__tests__/audit-integraciones.test.mjs \
  scripts/__tests__/alcance-simbolica.test.mjs \
  scripts/__tests__/audit-componente-huerfano.test.mjs
→ 3 passed / 68 tests
```

### Verificación CI
`audit-integraciones` en #3155: **pass (16s)**. Los demás checks (vitest, bundle,
tsc, E2E) corren sobre el mismo árbol.

### Qué NO pude verificar (Frente A)
- Que #3151 quede verde **por sí mismo**: #3151 sigue apuntando al árbol que
  introduce los symlinks. Para que su check `audit-integraciones` pase hace falta
  (a) mergear #3155 a dev y (b) refrescar #3151 contra el dev nuevo (merge o
  rebase). Eso es decisión/orden del orquestador, no de este carril.
- No corrí el gate completo de vitest del repo (son ~100 archivos de test, no es
  el contrato del check); corrí las 3 suites que tocan el motor/auditor.

---

## Frente B — PR #3150: `vitest` rojo

### El test concreto que falla
No hay un test que "falle": el job `vitest` muere ANTES de correr nada porque el
detector le pasa un archivo que vitest no puede ejecutar. Del log (run
33963230690):

```
Detected tests: _gate/bug09-mitad-b.spec.js
> vitest run _gate/bug09-mitad-b.spec.js
No test files found, exiting with code 1
filter: _gate/bug09-mitad-b.spec.js
include: src/**/*.test.{js,jsx}, tests/unit/**/*.test.{js,jsx}, ...
```

`_gate/bug09-mitad-b.spec.js` es un **spec de Playwright** (gate de carril, corre
con `_gate/playwright.bug09.config.js`), NO un unit test de vitest.

### Causa medida (reproducción local en la rama #3150)
1. `GITHUB_BASE_REF=dev node scripts/detect-changed-tests.mjs` → emite
   `_gate/bug09-mitad-b.spec.js` (match con `/\.(spec)\.(js|jsx)$/`).
2. `npm run test:unit -- _gate/bug09-mitad-b.spec.js` → vitest: **No test files
   found, exit 1** (reproducido local, exit=1).
3. Contraste control: `test:unit -- tests/unit/exampleQuestions...test.jsx _gate/bug09-mitad-b.spec.js`
   → corre el `.test.jsx` y pasa (exit 0). O sea: el rojo aparece solo cuando el
   ÚNICO archivo seleccionado es un `.spec.js` fuera del include de vitest.

### ¿Es del PR o de la base?
- La condición roja la dispara el CONTENIDO de #3150: agrega un `_gate/*.spec.js`
  (Playwright) como archivo cambiado. Sobre `origin/dev` limpio ese diff no
  existe, así que el job no se dispara con ese archivo.
- El bug de fondo (el detector trata `.spec.*` como unit test de vitest) vive en
  `scripts/detect-changed-tests.mjs` (base), pero solo se manifiesta cuando un PR
  toca un `.spec.js` que vitest no incluye. Medido con un fixture de base: el
  detector pre-fix también emite un `tests/offline.spec.js` hipotético.
- Veredicto según el protocolo del brief ("si también falla en dev limpio → no es
  de este PR"): el archivo gatillo es de #3150 y el arreglo se empuja a su rama
  (instrucción explícita de Frente B). El fix a la base viaja con el PR y queda
  para dev al mergear.

### El fix (push a la rama de #3150)
`scripts/detect-changed-tests.mjs`: la auto-inclusión de un archivo de test
cambiado ahora es solo `\.test\.(js|jsx)$`. Un `.spec.*` (Playwright E2E o gate)
cae al mapeo de hermanos: si tiene un unit test hermano, ese se selecciona; si no,
el diff no toca la superficie de vitest y el gate responde "sin tests unitarios
relevantes" (has_tests=false → pasa). Coherente con `vitest.config.js`, que solo
incluye `*.test.{js,jsx,mjs}` y excluye `tests/*.spec.js`.

Control añadido en `tests/unit/detect-changed-tests.control.test.js`: un diff que
toca solo `_gate/gate-carril.spec.js` debe producir salida vacía. Suite:
```
npx vitest run tests/unit/detect-changed-tests.control.test.js
→ 3 passed
```

### Verificación CI
Push a `fix/bug09-onboarding-no-repite-20260904` (commit `2e9f81487`). Checks de
#3150 re-corridos: **vitest: pass (2m11s)**. Los demás checks ya estaban verdes.

### Qué NO pude verificar (Frente B)
- No corrí `_gate/bug09-mitad-b.spec.js` con Playwright headed (requiere X vivo +
  navegador; el carril que lo escribió ya lo verificó en su informe). El check
  rojo de CI no era ese spec: era vitest intentando correrlo.

---

## Archivos tocados

Frente A (rama `fix/audit-symlink-colgante-20260905`, PR #3155, base dev):
- `scripts/audit-integraciones.mjs`
- `scripts/lib/alcance-simbolica.mjs`
- `scripts/__tests__/audit-integraciones.test.mjs` (prueba de control)

Frente B (rama `fix/bug09-onboarding-no-repite-20260904`, PR #3150):
- `scripts/detect-changed-tests.mjs`
- `tests/unit/detect-changed-tests.control.test.js`

Ningún `git diff --diff-filter=D` (no se borraron archivos).

## Reglas de la casa respetadas
- No se mergeó nada; no se tocó otro carril; commits con pathspec y `git show
  --stat` verificado en cada uno.
- Ningún check se puso verde silenciándolo (sin skip/only/allowlist-para-tapar):
  en Frente B el detector ahora distingue `.test.*` de `.spec.*`; en Frente A la
  decisión (symlink = fuera del árbol de build) está escrita en el código.
- Reproducción local antes de arreglar en ambos frentes (regla de la casa).
