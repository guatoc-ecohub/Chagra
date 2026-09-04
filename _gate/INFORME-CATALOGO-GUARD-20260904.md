# INFORME — Catálogo: guardia contra regeneración que borra especies en silencio

Fecha: 2026-09-04. Rama: `fix/catalogo-guard-regeneracion-20260904` (base `dev`).
Rol: esclavo headless, brief `catalogo-guard-regeneracion-20260904`.

## Resumen

Se agregó una guardia en `scripts/migrate-v31-to-v32.mjs` que aborta (exit != 0, sin
escribir) antes de regenerar `catalog/chagra-catalog-seed-v3.2.json` si la salida
perdería un `id` ya presente en el archivo existente (especies **y** fuentes, el mismo
set). Con `--permitir-bajas` se escribe igual, pero se imprime la lista de bajas.

El detonante real está vivo en el repo: el v3.2 commiteado tiene 74 especies y el v3.1
72. Las dos manuales son `eruca_vesicaria` (rúcula) y `cucurbita_pepo` (calabacín), las
del hard-test de entrega. Correr la migración tal cual hoy hubiera borrado esas dos y 6
fuentes en silencio. La guardia lo frena.

## Criterio 1 — GIVEN v3.2 con especie ausente de v3.1, WHEN migración, THEN exit != 0, imprime el id, y el archivo NO cambia

```text
$ md5sum catalog/chagra-catalog-seed-v3.2.json
84934ade0e4224940cb897efadb90f6f  catalog/chagra-catalog-seed-v3.2.json

$ node scripts/migrate-v31-to-v32.mjs
...
[ABORTO] la migración perdería datos ya presentes en el catálogo v3.2:
  - especie eruca_vesicaria
  - especie cucurbita_pepo
  - fuente uc-ipm-cole-crops-arugula
  - fuente umn-vegetable-planning-arugula
  - fuente agrosavia-inocuidad-frutas-hortalizas-2019
  - fuente jbb-rugula-density-2021
  - fuente agrosavia-modelo-calabacin-2019
  - fuente uc-ipm-cucurbits

Si el borrado es intencional, corré con la bandera --permitir-bajas.
EXIT=1

$ md5sum catalog/chagra-catalog-seed-v3.2.json
84934ade0e4224940cb897efadb90f6f  catalog/chagra-catalog-seed-v3.2.json
```

md5 antes == md5 después → **el archivo no cambió**. Exit = 1. ✔

## Criterio 2 — GIVEN mismo caso WHEN con --permitir-bajas, THEN escribe, exit 0, e imprime bajas

No se probó sobre el catálogo real (escribir ahí borraría rúcula/calabacín de verdad, y
la reconciliación es decisión del operador). Se cubre con el test de sandbox, que
fabrica un v3.2 con una especie extra fuera de v3.1, corre con `--permitir-bajas` y
verifica: exit 0, el archivo cambia, y `stderr` anuncia la baja.

Salida cruda del test (vitest):

```text
Tests  4 passed (4)
catalog/__tests__/migrate-v31-to-v32-guard.test.js > ... > con --permitir-bajas escribe, sale 0, y aun así anuncia la baja  ✓
```

## Criterio 3 — GIVEN migración sin pérdidas THEN escribe normal y sale 0

Test de sandbox "control negativo": fabrica un v3.2 sin ids extra (todos presentes en
v3.1), corre sin banderas y verifica exit 0 y que escribe.

```text
Tests  4 passed (4)
... > control negativo: sin pérdidas escribe normal y sale 0  ✓
```

Además, la migración sin pérdidas sobre un catálogo que NO perdería nada escrita normal:

```text
$ node scripts/migrate-v31-to-v32.mjs
=== MIGRACIÓN v3.1 → v3.2 COMPLETADA ===
✓ Migradas 72 especies → .../chagra-catalog-seed-v3.2.json
...
EXIT=0
```

## Criterio 4 — GIVEN el test nuevo WHEN revierto la guardia THEN el test falla

Verificado revirtiendo a mano la guardia (se reemplazó `writeGuarded()` por el
`writeFileSync` directo original). Con la guardia revocada, el test "aborta y NO escribe"
falla porque la migración escribe y sale 0:

```text
$ npx vitest run catalog/__tests__/migrate-v31-to-v32-guard.test.js
 FAIL  ... > aborta (exit != 0) y NO escribe si la salida perdería un id existente
   AssertionError: expected +0 not to be +0   // migration salió 0 y escribió
 FAIL  ... > también aborta si la pérdida es solo de una fuente
   AssertionError: expected +0 not to be +0
 FAIL  ... > con --permitir-bajas escribe, sale 0, y aun así anuncia la baja
   AssertionError: expected '...tracking_mode=NULL...' to contain 'sp_test_extra'
   // sin guardia no hay aviso de bajas en stderr
 Test Files  1 failed (1) | Tests  3 failed | 1 passed
```

Con la guardia restaurada el mismo archivo pasa:

```text
Test Files  1 passed (1) | Tests  4 passed (4)
```

## Test nuevo

`catalog/__tests__/migrate-v31-to-v32-guard.test.js` (vitest, sandbox): fabrica un
`catalog/` temporal con v3.1 real + v3.2 fabricado, corre el script copiado con
`execFile`, y verifica los cuatro criterios. NO toca el catálogo del repo.

4 tests:
1. aborta y NO escribe si la salida pierde un id de especie (y de fuente).
2. aborta también si la pérdida es solo de una fuente (sources entran en el mismo set).
3. con `--permitir-bajas` escribe, sale 0, y anuncia la baja.
4. control negativo: sin pérdidas escribe normal y sale 0.

## Barrido de otras apariciones (criterio de "barrer todo, no una superficie")

`grep -rln "chagra-catalog-seed-v3.2.json" scripts/` devuelve:

- `scripts/migrate-v31-to-v32.mjs` — **ESCRIBE el catálogo** (OUT_PATH). Lleva la guardia. ✔
- `scripts/bench-grafo-cobertura.mjs` — **NO escribe el catálogo**. Lo usa solo como
  candidato de lectura (`loadCatalog`). Su única escritura es el historial del bench en
  `HISTORY_DIR` (line 224). No aplica la guardia.
- `scripts/extract-wikimedia-flora-col.mjs` — **NO escribe el catálogo**. Lo lee para
  bajar imágenes y escribe `manifest.json` + jpgs en `OUT_DIR` (líneas 147, 214). No aplica.

Revisadas ambos scripts: ninguna escribe el archivo del catálogo; la única superficie que
lo escribe es `migrate-v31-to-v32.mjs`. No se barre otra cosa.

## Hallazgo preexistente (fuera de scope, se informa)

`catalog/__tests__/migrate-v31-to-v32.test.js` (sin tocar) tiene 7 fallos YA en
`origin/dev`, independientes de esta guardia: asumen que v3.2 == v3.1 en especie/sources,
pero el v3.2 commiteado es un superconjunto (74 vs 72) por las altas manuales de rúcula y
calabacín. Verificado que los seeds son idénticos a `origin/dev`
(`git diff --quiet origin/dev -- catalog/...seed-v3.1.json ...v3.2.json` → sin diff). La
reconciliación v3.1 vs v3.2 es decisión del operador; acá solo se puso el freno, como pide
el brief.

## Qué NO se tocó

- `catalog/chagra-catalog-seed-v3.2.json` ni `...v3.1.json`: sin regenerar ni commitear.
- `/home/kortux/demos/3d`: intacto.
- No se usó `git add -A`; cada archivo se revisó en su diff.

## Verificación de estilo

- Test nuevo: `npx eslint catalog/__tests__/migrate-v31-to-v32-guard.test.js` → exit 0.
- El script `.mjs` queda fuera del glob de lint del lefthook (`*.{js,jsx,ts,tsx}`), igual
  que todo el resto de `scripts/`; sus usos de `console`/`process` son Node y no están
  gated (preexistentes).
