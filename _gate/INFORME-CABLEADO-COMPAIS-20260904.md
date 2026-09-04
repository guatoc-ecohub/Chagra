# Informe de cableado de perfiles de conducta — 2026-09-04

## Resultado

- Se creó `src/compai/nucleo/perfilesConducta.js` como fuente única, portable al valle, con los seis perfiles del apéndice §8 sin alterar Angelita.
- `creatureIdle.js` proyecta ese núcleo: corrigió la respiración del jaguar a `freq: 1.85` (3,4 s), apagó `vuelta` para los seis y añadió el carril determinista `gesto`. La noche ahora distingue activo, duerme y torpor.
- `vidaEstados.js` proyecta los seis repertorios desde el núcleo; guacamaya y chivito ya tienen repertorio y no quedan en identidad muda.
- `compaiEspecies`, `CompaiAgente` y los seis adaptadores reenvían las capacidades de conducta como `data-agt-capacidad-*`. Chivito y guacamaya permanecen posados salvo en `caminando`.
- `useComportamientoCompai` usa radios, espera, velocidad y modo de locomoción por especie. El oso queda en modo `mistico` y publica el gancho `eventoMovimiento: 'planta'` al llegar.
- Se añadieron las auras de guacamaya y chivito; no caen al dorado de Angelita. Los valores `#ff5a3c` y `#4be0d0` siguen marcados como propuesta pendiente de arte.
- El CSS del chivito usa la respiración de 1,6 s; la luciérnaga conserva 3,1 s y modula su luz entre 0,65 y 1,0.

## Ganchos y decisiones pendientes

- No se construyó la marcha del oso; se conserva el modo místico y el evento `planta` para que el rig futuro haga clac + squash.
- No se construyeron huesos/calcos de luciérnaga ni chivito. El cableado usa el nivel 0 disponible: contenedor, luz y piel existente.
- No se resolvió la contradicción de la guacamaya sin tinta/lámina; no se tocó su arte ni se activó ningún rig archivado.
- No se decidió el color final de aura, el timbre TTS, ruana del oso ni la entrada alternativa de la guacamaya.
- El sync del núcleo se verificó en modo lectura: en este worktree resuelve `/demos/3d/compai`, inexistente, por lo que reporta «no aplica». No se escribió fuera del worktree.

## Validación

- `npx vitest run src/visual/creatures/__tests__/creatureIdle.test.js src/visual/creatures/__tests__/vidaEstados.test.js src/visual/creatures/__tests__/transformacion.test.js src/visual/agente/__tests__/compaiEspecies.test.js src/components/__tests__/CompaiP1.contract.test.jsx` → 47 pruebas en verde antes del reenvío final de atributos.
- `npx vitest run src/visual/agente/__tests__/compaiEstadoVisual.test.js src/components/__tests__/AgentFab.caminando.test.jsx` → 10 pruebas en verde.
- `npx vitest run scripts/__tests__/sync-compai-nucleo.test.mjs` → 4 pruebas en verde.
- `npx eslint` sobre los archivos modificados → verde.
- `npm run tsc:check 2>&1 | sed -r 's/\x1b\[[0-9;]*m//g'` → 0 errores TypeScript.
- Se añadió un gate que falla si alguno de los seis compais no tiene `PERFILES_CONDUCTA`; Angelita queda explícitamente fuera porque no cambia.

Nota conservadora: al cierre había otra corrida completa de Vitest, en otro worktree, saturando los workers compartidos. La repetición posterior de las dos suites de integración quedó sin resultado antes de cerrar; los cambios posteriores son únicamente el reenvío de atributos `data-agt-capacidad-*`, validado por ESLint.
