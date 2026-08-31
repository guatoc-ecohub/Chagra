# Informe de boundary audit

## Refutación inicial

La corrida inicial de `npx vitest run tests/unit/boundaryAudit.test.js` confirmó
42 violaciones. Eran 42 registros del auditor, correspondientes a dos patrones
solapados sobre referencias a la ruta absoluta del workspace. No se modificó el
test ni su allowlist.

El test recorre `ops/` porque el directorio contiene 146 archivos versionados,
no está excluido por `.gitignore`, y el repositorio se trata como fuente del
árbol público. Además, los workflows públicos construyen y despliegan desde el
checkout del repositorio. La evidencia indica que el alcance del test es
correcto, por lo que se eligió limpiar las rutas.

## Cambio realizado

- Documentos: se reemplazaron rutas absolutas por `<WORKSPACE>` sin cambiar el
  significado de los documentos.
- JSON medidos: se reemplazó únicamente el valor de `dist` o `model`; no se
  tocaron cifras, fechas ni resultados. Todos los JSON editados fueron parseados
  con `JSON.parse` y quedaron válidos.
- Scripts: se reemplazaron rutas fijas por `CHAGRA_REPO`/`process.cwd()` cuando
  correspondía, y por carpetas temporales neutrales para capturas. También se
  hizo portable el import de Playwright.

## Validación positiva

Comando:

```text
npx vitest run tests/unit/boundaryAudit.test.js
```

Salida:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
```

Resultado: 0 violaciones.

## Validación negativa

Se creó temporalmente `ops/.boundary-audit-negative-fixture.md` con una ruta
prohibida, se ejecutó el mismo test y luego se eliminó el fixture.

Salida relevante de la corrida negativa, con el literal sensible sustituido
por `[PATRON_PROHIBIDO]` para no reintroducirlo en este informe auditado:

```text
Violaciones: [
  {
    "file": "ops/.boundary-audit-negative-fixture.md",
    "pattern": "[PATRON_PROHIBIDO]"
  }
]

Test Files  1 failed (1 test | 1 failed)
Tests       1 failed (1)
NEGATIVE_EXIT=1
```

El guardián sí detecta una violación introducida deliberadamente. El fixture
temporal fue eliminado y no forma parte del cambio.

## TypeScript y sintaxis

Antes de editar, `npm run tsc:check` terminó con código 0 y sin diagnósticos.
Después de editar, volvió a terminar con código 0 y sin diagnósticos. También
pasaron `node --check` para los scripts modificados, `git diff --check` y el
parseo de todos los JSON editados.

## Lo que NO verifiqué

- No ejecuté gates visuales, mediciones de GPU/FPS ni capturas 3D.
- No ejecuté los scripts de diagnóstico contra hosts remotos.
- No hice deploy.
- No verifiqué un PR o pipeline remoto antes de crear el PR local.
