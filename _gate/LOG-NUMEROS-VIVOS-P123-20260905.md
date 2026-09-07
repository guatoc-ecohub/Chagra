# LOG — sierra-numeros-vivos-pasos-1-2-3-r4-20260905 (carril opencode/deepseek)

Hora inicio: 2026-09-05 ~15:25 (-05). Rama: `feat/sierra-numeros-vivos-p123-20260904` (worktree
`.worktrees/numeros-vivos-p123-20260904`, base `origin/dev` 0afe6f0af).

## Contexto verificado (NO re-descubierto cada turno)
- `origin/dev` ya absorbió los PRs #3116, #3141, #3158, #3161, #3162, #3163-#3165. La píldora
  `.tsm__aterrizaje` de `TransicionSierraMundo.jsx` SIGUE VIVA (HUD con tinta/aviso/tiza/ENSO/
  «X vino a contarle») => PASO 1 no está hecho por contenido, no por SHA.
- Ya existen módulos puros que el diseño pedía: `sierra/lecturaClimaAterrizaje.js`
  (`lineaAhora`, `lineaHelada`, `resumenClimaAterrizaje`) y `sierra/aterrizajeDescenso.js`
  (`resolverAterrizaje`, `lineaEnsoPorPiso`, `anfitrionDeBanda`). NO se duplican; se reusan.
- `MapaDeNivel`/`MarcadorPiso` viven en `VistaGlobalSierra.jsx` (la portada). La portada NO recibe
  `msnm` real (el mockup no lo pasa) => sin curva P1, como dice el diseño §12.
- Otros carriles de Sierra: no hay `sierra-*` vivos ahora (pgrep limpio salvo este log). La rama
  toca `VistaGlobalSierra.jsx` y `TransicionSierraMundo.jsx` (ya estabilizadas en dev).
- Bug `today`-UTC (#3153) YA MERGEADO en dev (073969f1e) antes de mi base: la tiza de helada que
  construya NO depende del día UTC resuelto en runtime; señalado igual en el PR.

## Plan de ataque (decisión conservadora, se declara)
1. PASO 1 + PASO 3 juntos (viven en el mismo nodo): retirar la píldora `.tsm__aterrizaje` y armar
   el aterrizaje en tres tiempos (T0 cota · T1 tinta · T2 tiza en pizarra) con `setTimeout`
   determinista, solo cuando el viaje está PARADO en la cota (`?msnm=` = el caso que el diseño
   captura). En el viaje real (transición a un mundo) no se pinta composición de aterrizaje.
   Reusa `resolverAterrizaje` + `resumenClimaAterrizaje` + `lineaEnsoPorPiso`. ENSO = tiza
   prioridad 5. Nada de «X vino a contarle»: no se monta.
2. PASO 2: `VistaGlobalSierra` recibe `msnm` real (prop + fallback `?msnm=` ya leído por el gate)
   y dibuja la curva EXACTA `yDeMsnm(msnm)` con rótulo «a la altura de su finca». Sin altitud
   confirmada no se dibuja (guard existente). `MarcadorPiso` pasa a la cota real si hay `msnm`.
3. Tests: actualizar `transicionSierraDescenso3d.test.jsx` al nuevo DOM; tests puros para la
   curva P1 (contar curvas/rotulos), y prioridad de tiza ENSO.
4. Gate: vitest verde + conteo DOM (1 curva · 1 rótulo de tinta · ≤1 pizarra · 0 píldoras ·
   0 badges · ventana en todo número). Capturas headed: NO disponibles este carril (gate-x-estado
   y token telegram son rutas prohibidas del brief) => queda registrado como límite.

## Bits
- 15:31 PASO 1+3 (aterrizaje en tres tiempos, píldora fuera) → commit `9a4c0a79b`.
  TransicionSierraMundo: `.tsm__aterrizaje` eliminado; nueva composición T0 (cota
  'a la altura de su finca' en chip de mapa) · T1 (ahora en tinta) · T2 (pizarra
  con UNA tiza firmada), disparada por setTimeout al 86 % del viaje parado
  (`?msnm=`). Reusa lecturaClimaAterrizaje + lineaEnsoPorPiso. Firma de la tiza:
  anfitrión si hay relevo, si no el compai del usuario. Sin tiza: pizarra calla.
- 15:36 PASO 2 (curva P1 en la portada) → commit `989397a65`. VistaGlobalSierra
  acepta `msnm` (prop o `?msnm=` de gate); MapaDeNivel dibuja la curva exacta
  `yDeMsnm(msnm)` con su rótulo solo con altitud confirmada (guard nuevo
  `altitudFincaValida`). Marcador representativo y resaltado de banda se callan
  cuando hay cota exacta.
- 15:45 gate tsc en verde (755 ≤ baseline 756), eslint limpio en los 6 archivos,
  vitest verde en el lote tocado (mundo3d 39 archivos 522 tests; + pisosSierraCanon).
- 15:55 push + PR: https://github.com/guatoc-ecohub/Chagra/pull/3166 (draft, base dev,
  labels glm-generated + needs-review, MERGEABLE). 3 commits, +527/−131, 0 deletes.
  Informe: `_gate/INFORME-NUMEROS-VIVOS-P123-20260905.md`.
  Capturas headed y Telegram NO (rutas prohibidas del brief: gate-x-estado.sh y
  token). Conteo del gate verificado por DOM en tests, no visual.
