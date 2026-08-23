# Informe: barra blanca del hocico

## Resultado

Corregido en `src/visual/creatures/zariguyaTrazado/pielTrazado.js`.

La causa observada era doble: el giro de la cabeza dejaba una cuña sin
respaldo, y dos islas del calco compuesto quedaban dentro de la región que
viajaba con la cabeza. Se agregó un respaldo vectorial estrecho para el borde
inferior del hocico y se podaron esas islas con un clip even-odd. El calco se
repinta sobre el respaldo, por lo que el respaldo solo aparece en sus huecos.

## Medición por píxeles

El comando solicitado con ImageMagick no pudo ejecutarse porque `magick` no
está instalado en este entorno. Usé el mismo recorte, en una sonda local con
`sharp`, conversión a escala de grises y umbral `>=235`, equivalente al gris
235 del control indicado. Por eso se reporta el número observado y no se
presenta como una reproducción exacta del binario original.

Recorte: `left=140, top=602, width=60, height=20` para +14°, y `top=156` para
-18°. Las capturas son de 560x1000, con los paneles apilados.

| Control | Antes | Después |
| --- | ---: | ---: |
| +14°, recorte del hocico | 213/1200 | 0/1200 |
| -18°, recorte equivalente | 0/1200 | 0/1200 |

El valor previo observado fue 213, no los aproximadamente 193 del reporte
original. La banda blanca sí se reprodujo visualmente y el control bueno a
-18° dio 0; la diferencia se deja explícita por la sustitución de instrumento.

## Controles del instrumento

Todos usan el mismo umbral `>=235` y una ventana de 60x20:

| Control | Recorte | Resultado |
| --- | --- | ---: |
| Pelaje macizo | `_gate/zt-giros-after3.png`, x=180, y=680 | 0/1200 |
| Fondo | `_gate/zt-giros-after3.png`, x=500, y=700 | 0/1200 |
| Negativo deliberado | `_gate/control-negativo.png`, imagen blanca | 1200/1200, GRITA |

El control negativo demuestra que el medidor sí dispara cuando toda la
ventana viola el umbral.

## Inspección visual

La captura ampliada muestra que las dos islas marrones que flotaban a la
izquierda de la cara antes del cambio ya no aparecen. La cara sigue leyéndose
como una zarigüeya: hocico, dientes, ojos, orejas y bigotes permanecen
legibles.

- [Antes, giros](../_gate/zt-giros-baseline.png)
- [Antes, ampliación del hocico](../_gate/zt-giros-baseline-head.png)
- [Después, giros](../_gate/zt-giros-after3.png)
- [Después, ampliación del hocico](../_gate/zt-giros-after3-head.png)
- [Después, reposo](../_gate/zt-reposo-after.png)

La captura de reposo y la de giros se revisaron para bigotes, dientes, ojos,
orejas y cola prensil. No se usó un juez VL.

## Estado de la medición

`gate-x-estado.sh` informó `VIVO :0 /tmp/xauth_GXjQtV` antes de capturar.
La comprobación de procesos dio un Chromium ajeno persistente; el gate lo
declaró y no se citó ningún FPS. Las capturas fueron válidas, pero no se hace
ninguna afirmación de rendimiento.

La página terminó sin errores reportados por Playwright y con `scrollHeight`
913 para giros y 546 para reposo.

