# Informe A1, visor de especie 3D

## Entrega

- Rama: `feat/a1-visor-especie-3d`, creada desde `origin/dev` en un worktree limpio.
- Página: `/species-visor.html`.
- Alcance: puente 2D↔3D, snap/cache de hotspots, botones DOM accesibles, oclusión por raycast cada 10 frames, encuadre por silueta, pivote anatómico, exclusión de pedestal, fallback de lámina, auto giro senoidal, render bajo demanda y agua procedural.
- Especies del export local AGE: tomate chonto, maíz criollo y aguacate.
- No se agregaron GLB, texturas nuevas ni binarios. Three.js se carga explícitamente en r160 desde CDN.

## Verificación medida

- `gate-x-estado.sh`: `VIVO` antes de capturar.
- Pantalla: viva durante las capturas.
- Capturas: cerca, plano medio, amplia, maíz, lámina 2D y semillas `20260807` y `20260808` en `_gate/capturas-a1/`.
- Estado observado en la captura final: `PLACEHOLDER PROCEDURAL`, `OCLUSIÓN: 1 oculto`, dos hotspots visibles, un hotspot con `aria-hidden="true"` y `tabIndex=-1`.
- Errores de página: ninguno.
- Prueba de teclado: los hotspots son `<button>`, tienen `aria-label`, `aria-pressed`, foco real y abren la lectura en la ficha.

## Pronóstico separado de medición

- Pronóstico: el demand rendering debe sostener el trabajo cuando el auto giro está pausado.
- Medición: 59,74 FPS en la corrida visual. El dato está contaminado: había 9 procesos Chromium ajenos y `maquinaSola=false`. No debe citarse como benchmark limpio.

## Pruebas

- `npx vitest run src/speciesViewer/cameraFit.test.js src/speciesViewer/hotspots.test.js`: 5/5 pasan.
- `npx eslint src/speciesViewer vite.config.js --max-warnings=0`: pasa.
- `npx vite build --config vite.config.js`: pasa y emite `dist/species-visor.html`.
- `npx vitest run`: falla con 68 tests preexistentes o ajenos al alcance en `origin/dev`; no se modificaron esos archivos.

## No pude verificar

- No pude obtener un FPS limpio con máquina sola porque los 9 Chromium ajenos siguieron vivos durante el gate.
- No se verificó un modelo 3D externo real, porque el prototipo usa deliberadamente un placeholder procedural y cero binarios.
