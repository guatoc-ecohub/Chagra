# Informe: muesca dorsal del jaguar

## Resultado

La costura dorsal quedó cerrada con un cambio quirúrgico en la juntura
hombro/torso. No se tocaron rosetas, cara, bigotes, patas ni cola.

## Reproducción antes del cambio

Fixture usado: `ops/gate-fixtures/jaguar-idle-1400x1100.png`, panel IDLE,
fondo `rgb(247,241,226)`. El perfil se obtiene por columna, desde el inicio
del panel, tomando el primer píxel de arte cuya distancia Manhattan RGB al
fondo supera `125` para descartar el borde antialias. La decisión es binaria:
una muesca existe si una columna tiene un `y` mayor que sus dos vecinas
inmediatas. No se usa un umbral de amplitud.

Tira completa medida, antes:

```text
798:238 799:238 800:238 801:239 802:240 803:240 804:240 805:241 806:241 807:241 808:242 809:243 810:243 811:243 812:244 813:241 814:239 815:238 816:238 817:238 818:237
```

Resultado binario: `DEFECT`, máximo local en `x=812`, porque `244 > 243` y
`244 > 241`. La tira de control `x=735..760` no contiene un máximo local
estricto:

```text
735:213 736:214 737:215 738:216 739:217 740:218 741:220 742:222 743:224 744:227 745:230 746:233 747:233 748:233 749:233 750:234 751:234 752:234 753:234 754:234 755:234 756:232 757:232 758:232 759:232 760:232
```

Esto distingue la muesca de la subida monótona que se aplana en el control.

## Causa y cambio

Los dos shapes son:

- `TRONCO`, definido por `TRONCO_PATH`, el padre que lleva la masa dorsal.
- `CUELLO`, la cuña del hombro/cuello que se pinta después del tronco.

El borde dorsal de `CUELLO` terminaba en `(248,66)`, mientras el dorsal de
`TRONCO` arrancaba en `(248,58)`. La unión producía la V visible al escalar el
SVG.

El fix reutiliza la técnica de costura por solape del PR #2962: el shape hijo
entra hasta el shape padre en la juntura. El único cambio es:

```diff
- M126,58 C 168,48 216,50 248,66 C 258,94 ...
+ M126,58 C 168,48 216,50 248,58 C 258,94 ...
```

## Re-medición después

Captura del harness `jaguar-demo.html`, viewport `1400x1100`, panel IDLE. Se
descartaron las tres primeras capturas tras el cambio y se inspeccionó la
cuarta. Tira completa, después:

```text
798:233 799:234 800:234 801:234 802:234 803:234 804:234 805:234 806:235 807:235 808:235 809:235 810:236 811:236 812:237 813:237 814:236 815:236 816:236 817:236 818:235
```

Resultado binario: `PASS`, no hay ninguna columna con `y` mayor que sus dos
vecinas en el tramo de la juntura. El jaguar sigue leyéndose como jaguar en la
vista amplia y la juntura se lee como una silueta continua en el recorte 5x.

## Banda vertical de tono

La banda permanece en el recorte 5x. No es fondo ni un hueco de composición:
es el límite de dos shapes con funciones visuales distintas. `CUELLO` usa
`jhCuelloGrad` y vetas alargadas; `TRONCO` usa `jhPelaje` y la densidad de
rosetas del torso. Se lee como el plano sombreado del cuello/hombro, no como
plástico ni como una lámina rota. No la alteré porque hacerlo habría cambiado
el sombreado y el registro deliberado de Fable fuera de la juntura.

## Validación y límites

- `gate-x-estado.sh`: `VIVO :0`.
- `gate-pantalla.mjs`: confirmó pantalla viva.
- `pgrep -c chromium`: había 9 procesos ajenos antes de capturar y 17 durante
  la captura propia. `esperarMaquinaSola` agotó su espera, por lo que no se
  reporta ningún FPS como dato válido.
- No se hizo medición de FPS. La evidencia citada aquí es el perfil de píxeles
  y la inspección visual de la captura, no rendimiento.
- El worktree de esta rama no contiene una copia local de
  `_gate/herramientas/gate-x-estado.sh`; se usó la copia normativa del repo
  Chagra para el gate y para `gate-pantalla`.
