# Control del gate de Vitest

Fecha de medición: 2026-08-13.

## Shallow clone real

Se usó `git clone --depth 1` desde GitHub en `/tmp` y se confirmó que el clon era shallow.

Antes, con el detector de #2907:

```text
--- remote shallow clone completed ---
true
b8453ba fix(ci): corregir orden de git diff en detect-changed-tests.mjs
--- before: detector from #2907 ---
exit=0
stdout=''
stderr:
fatal: ambiguous argument 'origin/dev...HEAD': unknown revision or path not in the working tree.
Use '--' to separate paths from revisions, like this:
'git <command> [<revision>...] -- [<file>...]'
```

Después, usando el mismo clon shallow y el detector parcheado:

```text
--- after: patched detector against the same remote shallow clone ---
exit=1
stdout=''
stderr:
# ERROR: no pude medir archivos cambiados contra origin/dev
# ERROR: no existe el ref base origin/dev; el checkout debe traer el historial y el ref remoto (fetch-depth: 0). Detalle: fatal: Needed a single revision
```

## Fallback y conteos

Con `$TESTS` vacío, la lógica nueva produjo literalmente:

```text
fallback: vitest invocation=0
fallback: test files=0
```

Una selección explícita corrió 1 archivo:

```text
Test Files  1 passed (1)
      Tests  2 passed (2)
selected_exit=0
```

La invocación desnuda equivalente a `npm run test:unit --` corrió los 929 archivos de la suite:

```text
full_suite_exit=1
⎯⎯⎯⎯⎯⎯ Failed Tests 63 ⎯⎯⎯⎯⎯⎯
 Test Files  40 failed | 887 passed | 2 skipped (929)
      Tests  63 failed | 12651 passed | 1 expected fail | 25 skipped (12740)
   Start at  18:35:28
   Duration  307.42s (transform 91.09s, setup 374.70s, import 330.69s, tests 530.96s, environment 1716.97s)
```

## Rojo y verde del control

Se alteró temporalmente una expectativa del control, sin cambiar el detector:

```text
intentional_red_exit=1
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/detect-changed-tests.control.test.js > detect-changed-tests.mjs: control de la condición CI > selecciona un test cuando el diff contra origin/dev es medible
AssertionError: expected +0 to be 99 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

Al revertir la mutación:

```text
restored_green_exit=0
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## No verificado

- No se ejecutó el workflow dentro de GitHub Actions desde esta rama. La prueba reproduce localmente el checkout shallow real y la lógica del paso.
- La suite completa sigue teniendo fallos preexistentes; no se arreglaron ni se ampliaron allowlists para ocultarlos.
