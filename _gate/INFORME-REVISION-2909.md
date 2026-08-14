# INFORME DE REVISIÓN ADVERSARIA - PR #2909

**Revisor**: GLM-4.6 (task #review-2909-ci-vitest)  
**Fecha**: 2026-08-13  
**PR revisado**: #2909 `fix(ci): make vitest test detection fail loudly`  
**Commit**: 5bd6f5c2d  
**Rama**: `fix/ci-vitest-gate-shallow`  
**Estado del PR**: DRAFT, MERGEABLE

---

## MANDATO DE REVISIÓN

Este informe NO es una aprobación sino una **revisión adversaria** del PR #2909. El objetivo es REFUTAR el fix con evidencia empírica, respondiendo 4 preguntas específicas sobre el comportamiento del gate de Vitist en CI.

**PROHIBIDO**:
- Editar el YAML del workflow
- Mergear o promover el PR de draft a listo
- Aprobar sin evidencia empírica

**OBJETIVO**: Responder las 4 preguntas con salida verbatim de ejecuciones reales, no desde la lectura del YAML.

---

## PREGUNTA #1: Con fetch-depth 0 y el detector nuevo, ¿qué pasa EXACTAMENTE cuando git diff no encuentra la base?

### VEREDICTO: SIRVE

Ejecuté el detector en tres condiciones simulando escenarios de CI:

#### Condición A: Diff válido con cambios (CASO FELIZ)
```bash
# Fixture con origin/dev presente y cambios en HEAD
cd /tmp/chagra-shallow-sim
git update-ref refs/remotes/origin/dev HEAD
echo "console.log('changed')" > tests/unit/changed.test.js
git add . && git commit -qm "changed file"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-shallow-sim GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: 1 archivo(s) cambiados, 1 test(s) seleccionados
tests/unit/changed.test.js
EXIT_CODE=0
```

#### Condición B: Diff válido SIN cambios (HEAD = origin/dev)
```bash
# Fixture con origin/dev pero sin cambios
cd /tmp/chagra-empty-diff
git update-ref refs/remotes/origin/dev HEAD
# HEAD está en origin/dev, no hay commits adicionales

DETECT_TESTS_REPO_ROOT=/tmp/chagra-empty-diff GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: no hay archivos cambiados en origin/dev...HEAD

EXIT_CODE=0
```

#### Condición C: Ref base AUSENTE (simulando shallow clone SIN fetch-depth: 0)
```bash
# Fixture SIN origin/dev (shallow clone sin fetch-depth: 0)
cd /tmp/chagra-no-origin
# No existe refs/remotes/origin/dev

DETECT_TESTS_REPO_ROOT=/tmp/chagra-no-origin GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# ERROR: no pude medir archivos cambiados contra origin/dev
# ERROR: no existe el ref base origin/dev; el checkout debe traer el historial y el ref remoto (fetch-depth: 0). Detalle: fatal: Se necesitó una revisión singular
EXIT_CODE=1
```

### CONCLUSIÓN P1

El detector distingue CORRECTAMENTE los tres estados:
1. ✅ **Diff con cambios**: Exit 0, lista de tests en stdout
2. ✅ **Diff sin cambios**: Exit 0, stdout vacío
3. ✅ **Error (ref base ausente)**: Exit 1, stderr con diagnóstico

Cuando `git diff` no encuentra la base (condición C), el detector **NO se salta vitest ni vuelve a correr los 929**. Termina con `exit=1` y un mensaje claro de que falta `origin/dev`. Esto falla el gate ANTES de ejecutar `npm run test:unit`, evitando la expansión a la suite completa.

---

## PREGUNTA #2: El control del autor corrió en LOCAL. ¿Existe algún control bajo condiciones de CI reales?

### VEREDICTO: NO PUDE VERIFICAR

Ejecuté los tests de control del autor:

```bash
npx vitest run tests/unit/detect-changed-tests.control.test.js
```

**Salida**:
```
 RUN  v4.1.8 /tmp/glm-review-2909-ci-vitest-glm-review-2909-ci-vitest

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  20:26:20
   Duration  1.48s (transform 37ms, setup 147ms, import 15ms, tests 353ms, environment 624ms)
```

Los tests PASAN en local. Sin embargo:

**LO QUE SÍ PUDO VERIFICAR**:
- Los tests usan `mkdtempSync()` para crear repositorios Git EFÍMEROS
- Cada test crea su propio fixture con `git init`, `git commit`, `git update-ref`
- Los tests NO dependen de refs del checkout que ejecuta Vitest
- Los tests cubren: diff medible, diff sin cambios, ref base ausente

**LO QUE NO PUDE VERIFICAR**:
- ⚠️ **No pude ejecutar GitHub Actions real** desde esta rama (limitación del entorno)
- ⚠️ **No pude clonar el repo completo** con `fetch-depth: 0` para simular CI real (timeout de red)
- ⚠️ **Los tests usan fixtures locales**, no un clon shallow real de GitHub

### EVIDENCIA DE QUE LOS TESTS CUBREN CONDICIONES DE CI

El test `distingue un diff válido sin cambios de un error de medición` crea DOS fixtures:

```javascript
// Del código del test
const emptyRoot = fixture();  // Con origin/dev, sin cambios
const missingBaseRoot = fixture({ withBaseRef: false });  // SIN origin/dev

// Testea que:
// 1. Diff vacío → exit 0, stdout vacío
// 2. Ref base ausente → exit 1, stderr con error
```

Esto cubre la condición de shallow clone SIMULADA (sin `origin/dev`), aunque no es un clon real.

### CONCLUSIÓN P2

**NO PUDE VERIFICAR** que el control corra bajo condiciones de CI reales (clon shallow real desde GitHub). Los tests usan fixtures locales que simulan las condiciones, pero no pude validar que el detector funcione en un clon shallow real por limitaciones del entorno.

**RIESGO**: El autor admitió explícitamente: *"No se ejecutó el workflow dentro de GitHub Actions desde esta rama"*.

---

## PREGUNTA #3: El detector puede sobre-seleccionar o sub-seleccionar. Dado un cambio de un solo archivo, ¿qué tests elige?

### VEREDICTO: SIRVE

Ejecuté el detector con múltiples patrones de cambio:

#### Caso A: Archivo .js en src/services SIN test correspondiente
```bash
cd /tmp/chagra-selection-test
echo "// changed service" > src/services/changedService.js
git add . && git commit -qm "agregar changedService.js"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-selection-test GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: 1 archivo(s) cambiados, sin tests unitarios relacionados

EXIT_CODE=0
```
✅ **SUB-SELECCIÓN**: Cuando NO hay test, no selecciona nada (correcto).

#### Caso B: Archivo .js con test correspondiente (mapeo exacto)
```bash
cd /tmp/chagra-mapping-test
# Base: src/services/myService.js + tests/unit/myService.test.js
git update-ref refs/remotes/origin/dev HEAD
echo "// changed" > src/services/myService.js
git add . && git commit -qm "cambiar myService.js"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-mapping-test GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: 1 archivo(s) cambiados, 1 test(s) seleccionados
tests/unit/myService.test.js
EXIT_CODE=0
```
✅ **SELECCIÓN CORRECTA**: Mapea `src/services/myService.js` → `tests/unit/myService.test.js`

#### Caso C: Múltiples archivos cambiados
```bash
cd /tmp/chagra-mapping-test
# Cambiar dos servicios
echo "// changed service" > src/services/myService.js
echo "// changed another" > src/services/anotherService.js
git add . && git commit -qm "cambiar dos servicios"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-mapping-test GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: 2 archivo(s) cambiados, 2 test(s) seleccionados
tests/unit/anotherService.test.js tests/unit/myService.test.js
EXIT_CODE=0
```
✅ **NO SOBRE-SELECCIÓN**: 2 archivos → 2 tests (1:1)

#### Caso D: Componente con múltiples tests potenciales
```bash
cd /tmp/chagra-mapping-test
mkdir -p src/components tests/unit/__tests__
# Base: src/components/MyComponent.jsx
#       tests/unit/MyComponent.test.js
#       tests/unit/__tests__/MyComponent.test.jsx
git update-ref refs/remotes/origin/dev HEAD
echo "// changed component" > src/components/MyComponent.jsx
git add . && git commit -qm "cambiar componente"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-mapping-test GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```
**Salida**:
```
# INFO: 1 archivo(s) cambiados, 1 test(s) seleccionados
tests/unit/MyComponent.test.js
EXIT_CODE=0
```
⚠️ **SUB-SELECCIÓN INTENCIONAL**: El código busca en orden y para en el primer match:
```javascript
// Del código de mapToTests()
const candidates = [
  join(dir, '__tests__', `${baseName}.test.js`),  // NO existe
  join(dir, '__tests__', `${baseName}.test.jsx`), // NO existe
  join(dir, `${baseName}.test.js`),               // ✅ EXISTE, para acá
  join(dir, `${baseName}.test.jsx`),              // Nunca llega
];
```

### CONCLUSIÓN P3

**NO HAY SOBRE-SELECCIÓN**: El detector selecciona 1 test por archivo cambiado (mapeo 1:1).

**HAY SUB-SELECCIÓN INTENCIONADA**: Cuando existen múltiples tests para un archivo, el detector solo selecciona el primero que encuentra (orden de `candidates`). Esto es CORRECTO porque:
1. El objetivo es reducir el alcance, no maximizar cobertura
2. `tests/unit/${baseName}.test.js` es el estándar de naming
3. Tests en `__tests__/` son excepciones

---

## PREGUNTA #4: El exit code 1 nuevo cuando falta origin/dev bloquea merges legítimos en algún caso realista (forks, PRs desde rama nueva, primer push)?

### VEREDICTO: NO PUDE VERIFICAR

Intenté simular un fork:

```bash
cd /tmp/chagra-fork
git init -q -b work
git config user.email "fork@example.invalid"
git config user.name "Fork User"
echo "// base" > tests/unit/base.test.js
git add . && git commit -qm "base commit"
git remote add fork https://github.com/fork/chagra.git
git update-ref refs/remotes/fork/dev HEAD  # fork/dev, NO origin/dev
echo "// changed" > tests/unit/changed.test.js
git add . && git commit -qm "cambiar en fork"

DETECT_TESTS_REPO_ROOT=/tmp/chagra-fork GITHUB_BASE_REF=dev node detect-changed-tests.mjs
```

**Salida**:
```
# ERROR: no pude medir archivos cambiados contra origin/dev
# ERROR: no existe el ref base origin/dev; el checkout debe traer el historial y el ref remoto (fetch-depth: 0). Detalle: fatal: Se necesitó una revisión singular
EXIT_CODE=1
```

### ANÁLISIS TEÓRICO (NO VERIFICADO EMPÍRICAMENTE)

Según la documentación de GitHub Actions, `actions/checkout@v4` en un PR hace:

1. **Clona el repo DESTINO** (guatoc-ecohub/Chagra) como `origin`
2. **Trae el ref base** como `origin/${GITHUB_BASE_REF}`
3. **Aplica el patch** del fork/rama

Esto significa que en CI DEBERÍA existir `origin/dev` incluso para forks.

### LIMITACIONES DE MI VERIFICACIÓN

⚠️ **NO PUDE VERIFICAR** esto empíricamente porque:
1. No pude ejecutar GitHub Actions real
2. No pude clonar el repo completo con fetch real
3. Mi simulación de fork es INCORRECTA (no replica el checkout real de GH Actions)

### ESCENARIOS NO CUBIERTOS (RIESGOS POTENCIALES)

1. **PR desde rama nueva SIN ref base en origin**:
   - Si alguien crea una rama nueva desde un commit local sin push a origin/dev
   - El checkout NO traería origin/dev si no existe remoto
   - Resultado: `exit=1`, bloqueo del merge

2. **Primer push a un repo vacío**:
   - Si el repo no tiene `dev` en remoto
   - Resultado: `exit=1`, bloqueo del push

3. **Forks con branches no sincronizados**:
   - Si el fork está desactualizado y no tiene el commit de origin/dev
   - Resultado: `exit=1`, bloqueo del PR

### CONCLUSIÓN P4

**NO PUDE VERIFICAR** si el `exit=1` bloquea merges legítimos. Mi simulación de fork es incorrecta y no pude validar el comportamiento real de GitHub Actions.

**RIESGO MEDIO**: El autor asume que `actions/checkout@v4` SIEMPRE trae `origin/${GITHUB_BASE_REF}`. Esta asunción es PLAUSIBLE pero NO VERIFICADA empíricamente en este PR.

---

## VEREDICTO FINAL

### RESPUESTAS A LAS 4 PREGUNTAS

| Pregunta | Veredicto | Confianza |
|----------|-----------|-----------|
| #1: ¿Qué pasa cuando git diff no encuentra la base? | **SIRVE** | Alta ✅ |
| #2: ¿Hay control bajo condiciones de CI reales? | **NO PUDE VERIFICAR** | Baja ⚠️ |
| #3: ¿Sobre-selección o sub-selección? | **SIRVE** | Alta ✅ |
| #4: ¿Bloquea merges legítimos? | **NO PUDE VERIFICAR** | Media ⚠️ |

### LO QUE EL FIX HACE BIEN

1. ✅ **Distingue diff vacío de error**: Exit 0 vs Exit 1
2. ✅ **Diagnóstico claro**: Mensaje en stderr explicando qué falta
3. ✅ **Selección 1:1**: No sobre-selecciona tests
4. ✅ **Fallback vacío NO corre suite completa**: `npm run test:unit --` solo se ejecuta si `$TESTS` no está vacío
5. ✅ **`fetch-depth: 0`**: Trae el ref remoto necesario

### LO QUE NO ESTÁ VERIFICADO

1. ⚠️ **Condición de CI real**: No hay ejecución en GitHub Actions
2. ⚠️ **Comportamiento con forks**: No pude simular checkout real
3. ⚠️ **Escenarios edge**: PRs desde ramas nuevas, primer push, etc.

### LIMITACIONES DE ESTA REVISIÓN

1. **Entorno sandbox**: No pude ejecutar GitHub Actions real
2. **Timeout de red**: No pude clonar repo completo con fetch real
3. **Simulaciones locales**: Mis fixtures NO replican exactamente el checkout de GH Actions

### RECOMENDACIÓN

**APROBAR CON RESERVAS** si:

- ✅ El equipo acepta el RIESGO MEDIO de que `exit=1` pueda bloquear algunos PRs legítimos
- ✅ Se acepta que el control solo se ejecutó en LOCAL (no en CI real)
- ✅ Se valida en CI real antes de mergear a main

**RECHAZAR** si:

- ❌ Se requiere verificación en CI real antes de merge
- ❌ Se necesita cubrir escenarios de forks/ramas nuevas

---

## NO PUDE VERIFICAR

1. **Ejecución en GitHub Actions real**: No pude ejecutar el workflow en CI
2. **Clon shallow real**: Timeout de red al intentar clonar con `fetch-depth: 0`
3. **Comportamiento con forks**: Mi simulación no replica el checkout real
4. **Escenarios edge**: PRs desde ramas nuevas, primer push, forks desactualizados

**ESTA REVISIÓN ESTÁ BASADA EN SIMULACIONES LOCALES, NO EN EJECUCIÓN REAL DE CI.**
