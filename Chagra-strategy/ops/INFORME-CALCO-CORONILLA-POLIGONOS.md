# Informe de calco: polígonos de tapa recta en coronilla

Fecha de medición: 2026-08-23.

## Veredicto

No se encontró una receta segura para integrar. El defecto sigue visible como
una tapa recta interna entre las orejas en las tres poses riggeadas. No se
modifican ni se commitean `calcoTrazado.js`, `generar-calco.mjs` ni la receta
del producto.

La causa está acotada a la vectorización del calco: las variantes de modo,
gradiente y fidelidad cambian la cantidad de paths, pero ninguna reduce las
tres razones hacia la lámina al mismo tiempo. Esto no demuestra que el modo
sea el único origen del defecto.

## Instrumentación y límites

- El checkout no contiene `./_gate/herramientas/` ni
  `scripts/trazar-lamina.sh`. La receta de referencia fue leída desde el
  commit `a146f8a62`, sin copiarla al producto.
- El gate de pantalla equivalente respondió `VIVO :0`.
- Se verificó la flota antes de capturar. Hubo entre 1 y 9 procesos Chromium
  durante las corridas; no se mató ningún worker y no se usó FPS como criterio.
- Las capturas completas existentes son PNG de 2480x1960, tomadas con
  `dom-shot.mjs`, viewport 1240x980 y DSF 2. Se descartaron tres warmups tras
  cada sustitución de calco.
- Reproduje `borde.mjs` sin cambios bajo `nix shell nixpkgs#imagemagick`.
  El control de fondo dio 0.00x en las tres corridas.
- En esta repetición no pude obtener un PNG fresco: `dom-shot.mjs` no escribió
  el archivo dentro del timeout. Por eso la tabla de variantes cita los PNG
  completos ya generados en `_gate/zt-calco-probes/`, y no presenta ese intento
  como una captura nueva.

## Configuraciones probadas

Se probaron cinco familias. Las tres primeras llegaron a captura completa y
son las que tienen tabla `borde.mjs`: baseline spline, polygon-base y
polygon-fidelity. También se generaron fine-gradient (spline con speckle 1 y
gradient 4), spline-corners (corner threshold 0) y pixel-fidelity; no se les
asigna un resultado visual completo porque su captura final venció el timeout.

El baseline conserva la receta actual: `spline`, `color_precision 8`,
`filter_speckle 2`, `gradient_step 8`. Las variantes polygon cambian el modo de
curva a polígono. `polygon-fidelity` además baja speckle a 1, gradient a 4 y
usa corner threshold 30.

## Medición `borde.mjs`

La razón es `salto_max / salto_medio`; la ventana de fondo es el control de
piso. La fila HEAD usa los valores del gate del operador. Las filas de
variantes fueron reproducidas sobre sus PNG completos.

| Configuración | Idle | Camina | Actuando | Lámina | Fondo |
| --- | ---: | ---: | ---: | ---: | ---: |
| HEAD `90e0fc9f7`, receta actual | 6.35x | 4.54x | 3.77x | 2.39x | 0.00x |
| HEAD, reproducción sobre `baseline.png` | 6.16x | 4.54x | 3.77x | 2.39x | 0.00x |
| `polygon-base` | 6.49x | 4.39x | 4.28x | 2.39x | 0.00x |
| `polygon-fidelity` | 6.26x | 4.50x | 4.35x | 2.39x | 0.00x |

Ninguna variante baja simultáneamente idle, camina y actuando. En particular,
`polygon-base` mejora camina por 0.15x, pero empeora idle y actuando; además,
`polygon-fidelity` queda peor que HEAD en actuando.

## Control visual

La captura baseline y las dos capturas polygon fueron inspeccionadas en las
cuatro celdas del arnés. El defecto no desaparece: la coronilla se lee como
una losa o tapa horizontal oscura entre las orejas, no como pelo. El gorro de
elipses grises continúa muerto. La cara, los dos ojos, las dos orejas, los
bigotes y la cola en espiral permanecen enteros en las tres poses.

La conclusión visual responde ambas mitades del gate: ninguna configuración
elimina el defecto y ninguna alternativa capturada cambia la lectura de la
figura a otra cosa, pero tampoco justifica aceptar el aumento de peso.

## Peso

La receta actual medida en los artefactos de prueba produjo SVG minificado de
407959 B y módulo final de 412096 B. `polygon-fidelity` produjo 254637 B de
SVG minificado y 260061 B de módulo de calco, con peor medición en actuando.
Las variantes de fidelidad spline llegaron a 436313 B de SVG y 440346 B de
módulo; `pixel-fidelity` llegó a 461044 B y 465244 B. El aumento de fidelidad
no compró una reducción medida de la tapa.

## Archivos de evidencia

- `_gate/zt-calco-probes/baseline.png`
- `_gate/zt-calco-probes/polygon-base.png`
- `_gate/zt-calco-probes/polygon-fidelity.png`
- `_gate/zt-calco-probes/*.svg` y módulos generados de cada familia
- `/tmp/zt-gate-1418/borde.mjs`

## Próximo paso

La próxima pasada debe atacar la región de coronilla con una receta que
conserve la captura completa y reduzca las tres razones, o separar esa región
sin tocar pose por pose. Con lo medido aquí no se justifica elegir polygon,
bajar `gradient_step` ni subir la densidad global de curvas. No se debe citar
como éxito ninguna variante sin PNG completo y tabla de `borde.mjs`.
