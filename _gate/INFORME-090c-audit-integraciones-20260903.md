# Informe 090.c — gate `Integraciones no consumidas` (`audit-integraciones`)

Fecha: 2026-09-03 · Task: 090-dev-rojo-en-tres-gates (sub-tarea 090.c) · Base: `dev` @ e6637b132

## El rojo, reproducido en checkout limpio

`git status --porcelain` vacío, `node scripts/audit-integraciones.mjs`:

```
✗ 2 capacidad(es) construida(s) y no conectada(s), sin declarar
  [orphan] src/visual/creatures/ChivitoPunkLaminaViva.jsx — construido pero NO alcanzable desde src/App.jsx (ninguna ruta viva lo importa) y SIN entrada en allowlist
  [orphan] src/visual/creatures/LuciernagaLaminaViva.jsx — construido pero NO alcanzable desde src/App.jsx (ninguna ruta viva lo importa) y SIN entrada en allowlist
exit 1
```

**Las integraciones concretas que disparan el rojo son esas dos.** Verificado con
grep sobre todo `src/`: cero referencias a `ChivitoPunkLaminaViva` ni a
`LuciernagaLaminaViva` fuera de los propios archivos (ni producto, ni tests, ni
comentarios de código que las importen). La auditoría de endpoints del sidecar
se salta en este entorno (chagra-pro ausente, comportamiento esperado del repo
público) y los 3 targets same-repo de grafoRelations están allowlisted — todo
lo demás estaba limpio.

## Historia verificada (cómo llegaron a huérfanos)

| Fecha | Hecho | Evidencia |
|---|---|---|
| 2026-08-18 | `ChivitoPunkLaminaViva` y `LuciernagaLaminaViva` se crean y se cablean al registro `CREATURES` ('chivito-punk', 'luciernaga') | commit `306209569` (diff de `src/visual/creatures/index.js`) |
| 2026-08-24/25 | jaguar y zarigüeya pasan a sus versiones Trazado; las láminas viejas quedan huérfanas | commits `2f6af8e52`, `55c2af631` |
| 2026-08-30 | batch de allowlist declara ~70 huérfanos, incluidos `JaguarLaminaViva` y `ZariguyaLaminaViva` — pero NO las dos de esta task (en ese momento seguían cableadas, el gate no las marcaba) | `ops/integraciones-no-consumidas.json`, entradas con date 2026-08-30 |
| 2026-08-31 | PR #3079 (`588c878d0`, "trazar chivito y luciernaga con receta jaguar") reemplaza ambas por `ChivitoTrazado`/`LuciernagaTrazado` en el registro y en los adaptadores; los imports salen del barrel y los archivos quedan en disco "como compatibilidad histórica fuera del montaje activo" (comentario del propio `index.js`) | `gh pr view 3079`: merged a dev 2026-08-31; `_gate/INFORME-tinta-chivito-luciernaga-dev.md` |
| desde entonces | el gate queda rojo sobre dev con estos dos `[orphan]` como causantes — la deuda que el bloque del 2026-08-28 ya venía arrastrando de la ventana anterior (ZariguyaLaminaViva sin declarar entre el 08-25 y el batch del 08-30) | corrida local del 2026-09-03 |

## Decisión: excepción escrita, no cableado ni borrado

- **No se recablea**: el registro y los adaptadores usan las versiones Trazado
  por decisión aprobada y certificada visualmente (gate del selector real,
  `_gate/INFORME-tinta-chivito-luciernaga-dev.md`). Volver a montar las láminas
  PNG-recortadas revertiría esa decisión.
- **No se borra en este PR**: el repo mantiene las láminas reemplazadas "por
  historia" (mismo patrón explícito que `JaguarLaminaViva`/`ZariguyaLaminaViva`,
  huérfanas gated el 2026-08-30). El borrado de láminas reemplazadas es
  curaduría aparte del operador.
- **El fix**: dos entradas en `ops/integraciones-no-consumidas.json` con
  `reason` + `date` (2026-09-03), que documentan la cadena completa
  construida → cableada → reemplazada → huérfana declarada.

## Control negativo (rojo ANTES / verde DESPUÉS)

| Estado del allowlist | Resultado del gate |
|---|---|
| SIN las 2 entradas (base dev) | `exit 1`, nombra los dos `[orphan]` |
| CON las 2 entradas (fix) | `exit 0`, "Auditoría limpia — 80 excepción(es) declarada(s), 0 huérfanos sin declarar" |
| stash del fix en caliente | vuelve a `exit 1` con la misma salida (verificado) |

## Tests nuevos (`scripts/__tests__/audit-integraciones.test.mjs`, 9 tests)

1. **Contrato del gate contra fixture hermético** (el script se copia a un tmp
   y su ROOT resuelve al árbol fixture): alcanzabilidad por import estático
   desde `App.jsx` (dos saltos), huérfano allowlisted → `exit 0`, huérfano sin
   entrada → `exit 1` nombrando el archivo, export same-repo sin consumidor →
   `exit 1`, allowlist ausente → `exit 2`, entrada sin `reason` → `exit 2`.
2. **Guardias sobre el repo real**: toda entrada del allowlist trae `reason` +
   `date` válida; cada id de `orphan_components` existe en disco como
   `.jsx`/`.tsx` bajo `src/mockups|src/visual` (la entrada no se pudra con
   renombres/borrados); los dos ids causantes del rojo siguen declarados
   (test REGRESIÓN 090c); y una corrida end-to-end del gate sobre este repo
   que debe mantenerse verde.
3. **Control negativo de los tests**: con el commit del fix revertido
   (`git revert --no-commit`), fallan exactamente los 2 guardias (REGRESIÓN
   090c + end-to-end, este último con "gate rojo: 2 capacidad(es)...") —
   verificado y revertido.

## Verificación

- `npx vitest run scripts/__tests__/`: 64 archivos, 1211 tests, todos pasan
  (incluye el nuevo).
- `npx eslint scripts/__tests__/audit-integraciones.test.mjs`: limpio.
  (El lint global del repo tiene deuda preexistente en `.mjs` de scripts/,
  incluido el propio `audit-integraciones.mjs` — fuera del alcance de esta
  task y sin relación con el gate.)
- `node scripts/tsc-check-gate.mjs`: sigue rojo por deuda preexistente de dev
  (8 archivos, scope de la sub-tarea 090.a). Ninguno de los archivos tocados
  por este PR aparece en la lista de errores nuevos (verificado con grep
  sobre la salida del gate).
- Suite completa `npx vitest run` (con este PR aplicado): **1029 archivos pasan,
  3 fallan, 3 skipped** — los 3 fallidos son `src/services/__tests__/chipIntentRouter.test.js`
  (7 tests), `src/components/__tests__/CompaiP1.contract.test.jsx` (2) y
  `src/components/dashboard/__tests__/FincaVivaResto.noSolapa.test.jsx` (2).
  Ninguno referencia el allowlist ni el script del gate (verificado con grep) y
  el rojo de vitest sobre dev ya estaba documentado en el brief — scope de la
  sub-tarea 090.b, no de esta.

## Falta por medir

- La sección de endpoints del sidecar (chagra-pro) sigue sin auditarse en CI
  del repo público (chagra-pro no está disponible ahí). La auditoría cruzada
  completa requiere corrida local con `CHAGRA_PRO_PATH` o un job del lado
  privado — no medido en esta task.
- Los ~70 huérfanos allowlisted el 2026-08-30 no se re-curaron uno por uno:
  solo se verificó que siguen existiendo en disco (guardia nueva). Cablear o
  borrar cada uno sigue siendo curaduría abierta del operador.
- El límite conocido del script (imports dinámicos por template string no se
  ven) permanece documentado y sin cerrar, por diseño.
