# Informe de prueba: coronilla local

Fecha: 2026-08-23.

## Resultado

No hay una configuración local que baje las tres razones del borde sin
empeorar otra. Las dos variantes fueron retiradas del producto. Este commit
entrega el informe medido, no certifica que la coronilla esté resuelta.

La construcción probada fue la opción A: un recorte de la lámina en
`x=150..274, y=0..96`, trazado aparte y compuesto dentro de la región estática
de cabeza. Para reducir el peso se probó también el recorte estrecho
`x=158..254, y=0..56`, con un clip de coronilla entre las orejas.

## Instrumentación

- `gate-x-estado.sh`: `VIVO :0 /tmp/xauth_GXjQtV`.
- `pgrep -c chromium`: `1` durante las capturas finales.
- Captura: `~/.local/state/lv-gate/dom-shot.mjs`, viewport `1240x980`, DSF 2.
- Se descartaron tres warmups después de cada cambio.
- Medidor sin cambios: `/tmp/zt-gate-1418/borde.mjs`.
- El medidor necesitó ejecutarse bajo `nix shell nixpkgs#imagemagick`, porque
  este checkout no tiene `magick` en `PATH`.

## Tabla cruda, misma sonda

La fila baseline se ejecutó sobre `_gate/zt-calco-probes/baseline.png`.
Las filas locales se ejecutaron sobre capturas frescas del arnés completo.
La razón es `salto_max / salto_medio`.

| Configuración | Idle | Camina | Actuando | Lámina | Fondo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline, calco actual | 6.16x | 4.54x | 3.77x | 2.39x | 0.00x |
| Coronilla local, spline, 179 paths | 6.35x | 4.54x | 4.23x | 2.39x | 0.00x |
| Coronilla local, polygon, 193 paths | 6.35x | 4.54x | 4.23x | 2.39x | 0.00x |

### Output del medidor, baseline

```text
ACTUANDO       salto_max=25.1 (fila 23)  salto_medio=6.6  razon=3.77x
CAMINA   (ctrl) salto_max=27.7 (fila 21)  salto_medio=6.1  razon=4.54x
IDLE     (ctrl) salto_max=27.7 (fila 56)  salto_medio=4.5  razon=6.16x
REFERENCIA(ctrl) salto_max=18.0 (fila 22)  salto_medio=7.5  razon=2.39x
FONDO    (piso) salto_max=0.0 (fila -1)  salto_medio=0.0  razon=0.00x
```

### Output del medidor, composición local

```text
ACTUANDO       salto_max=25.1 (fila 23)  salto_medio=5.9  razon=4.23x
CAMINA   (ctrl) salto_max=27.7 (fila 21)  salto_medio=6.1  razon=4.54x
IDLE     (ctrl) salto_max=27.2 (fila 39)  salto_medio=4.3  razon=6.35x
REFERENCIA(ctrl) salto_max=18.0 (fila 22)  salto_medio=7.5  razon=2.39x
FONDO    (piso) salto_max=0.0 (fila -1)  salto_medio=0.0  razon=0.00x
```

## Inspección visual

La captura baseline `_gate/zt-calco-probes/baseline.png` y las capturas locales
`_gate/zt-coronilla-after-control.png` y
`_gate/zt-coronilla-polygon-after.png` conservan la lectura general de una
zarigüeya: ojos, orejas, hocico, bigotes, patas y cola siguen enteros en las
tres poses. La coronilla local sigue leyéndose como una franja de pelo oscuro
con techo demasiado recto, no como una tapa de plástico, pero el defecto no
queda eliminado de forma demostrable. El gate visual por tanto falla la mitad
"desapareció el defecto" y pasa la mitad "se reconoce la figura".

## Peso y decisión

La pasada spline local quedó en 17.1 KiB, con 179 paths, y la polygon en
11.7 KiB, con 193 paths, después de SVGO. Aun así, la métrica no compró una
mejora: spline empeoró `actuando` de `3.77x` a `4.23x`, mientras idle subió de
`6.16x` a `6.35x`; polygon dio exactamente la misma tabla cruda.

No se deja código experimental en `pielTrazado.js`, ni se modifica
`calcoTrazado.js`. Queda pendiente una pasada que ataque los paths que forman
la tapa sin superponer una nueva base de color sobre la coronilla.

## No pude verificar

- No se hizo barrido de semillas porque esta escena de calco no expone semilla
  procedural.
- No se usó FPS como criterio: el defecto es visual y la sonda solicitada es
  `borde.mjs`.
- El `dom-shot` tardó más de 30 segundos en algunas capturas completas, aunque
  terminó escribiendo los PNG finales; no se mató ningún worker.
