# Informe Láminas R2 — 2026-09-04

## Archivado materializado

Se movieron con `git mv` (la copia viva manda) estas seis láminas a
`src/visual/creatures/_archivo/`:

- `ChivitoPunkLaminaViva.jsx`
- `JaguarLaminaViva.jsx`
- `LuciernagaLaminaViva.jsx`
- `OsoBastonLaminaViva.jsx`
- `ZariguyaGeminiLaminaViva.jsx`
- `ZariguyaLaminaViva.jsx`

También se movieron sus carpetas de assets solicitadas: `chivitoLamina/`,
`jaguarLamina/`, `luciernagaLamina/`, `osoLamina/` y
`zariguyaGeminiLamina/`, incluidos sus tests de capas. El test del jaguar se
movió junto a su sujeto a `_archivo/__tests__/`.

Las seis copias históricas que el carril anterior había reducido a disco frío
se preservaron sin sobrescritura como
`*.archivado-previo-20260904.jsx`; son symlinks resolubles al cold store. No
se ejecutó `rm`.

El producto monta `OsoBaston` y `ZariguyaTrazado`; Angelita y
`ChagraAgentAvatar.jsx` no cambiaron. El auditor de alcance excluye
`_archivo/`, mientras el guardia de assets sigue recorriéndolo para no perder
la regresión sobre los PNG archivados.

## Tests ajustados

- `tests/unit/laminas-solo-tinta.test.js`: gate nuevo y estricto. Exige que
  las seis láminas y los cinco directorios no existan activos, que sigan en
  `_archivo/`, que no haya imports activos de `LaminaViva` y que el oso del
  registro sea TINTA.
- `tests/unit/laminas-assets-regression.test.js`: descubrimiento recursivo y
  resolución de anatomía desde el archivo.
- Los tests movidos de capas de chivito, jaguar, luciérnaga, oso y zarigüeya
  Gemini; este último conserva su import relativo ya resuelto al sujeto
  archivado.
- Los controles de `audit-componente-huerfano` y `audit-integraciones` ahora
  reconocen que las láminas archivadas no son módulos de producto.

Validación focalizada: **6 archivos / 110 pruebas, verde**.

## Corrida completa

Se ejecutó literalmente `npx vitest run` completo. La salida cruda, sin
edición, está en [vitest-run.raw.log](vitest-run.raw.log).

Resultado: 1.040 archivos pasaron, 3 saltados; 13.880 pruebas pasaron, 3
expected-fail y 37 saltadas. La corrida completa cerró con dos fallos ajenos a
los archivos modificados:

- `src/mockups/__tests__/visualLib.smoke.test.jsx`: timeout de 30 s durante
  la contención de dos corridas completas. Repetido aislado al terminar:
  **2/2 verde** en 9,05 s.
- `src/services/__tests__/waterDiagnostic.test.js`: espera `55.080`, pero el
  formateador devuelve `55,080`.

Vitest también informó una promesa pendiente de `usePendingSyncCount` al
cerrar `App.evolucion-route.test.jsx`.

## Tipos

Se ejecutó `NODE_OPTIONS=--max-old-space-size=6144 npm run tsc:check`.
La salida cruda está en [tsc-check.raw.log](tsc-check.raw.log). Tras retirar
ANSI con `sed -r 's/\\x1b\\[[0-9;]*m//g'`, el conteo fue **765** líneas
`error TS`; no provienen de los archivos de esta tarea.
