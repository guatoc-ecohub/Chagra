# INFORME oso-lane: astilla del hombro a +18° (OsoBaston trazado)

Tarea: commit del arreglo de la costura ("astilla") que abre la cabeza al girar +18° en `src/visual/creatures/osoTrazado/pielTrazado.js`. La pasada r3 midió pero no committeó (entrega vacía). Esta pasada sí deja commit.

## Límite declarado del instrumento

Este agente NO tiene entrada visual de imágenes: ningún PNG fue inspeccionado a ojo. Toda conclusión sale de sondas numéricas (luminancia Rec.709 píxel a píxel) sobre capturas Playwright del arnés `ot-diag.html`, normalizadas al espacio lámina 615x630. El juicio estético final es del operador.

## Descubrimiento de marco de coordenadas (afecta a r3 y a las iteraciones v1/v2)

`preserveAspectRatio="xMidYMid meet"` descentra horizontalmente el contenido: viewBox 655x690 en caja cuadrada 480 deja ox = (480 - 655*480/690)/2 = 12.17 px de pantalla. Verificado en vivo: `getScreenCTM().e = 47.09` con pin en left=21 → origen real del contenido en 26.09 px del pin, mientras `_gate/ot-normaliza.mjs` asume 13.91. Resultado: **toda coordenada-x medida hasta ahora estaba desplazada +17.5 unidades de lámina** respecto del espacio donde viven los vértices del código.

Evidencia: el parche v2 pintaba exactamente sus vértices declarados (verificado con fill magenta en vivo: huella 158 px), pero esos vértices habían sido diseñados contra el seam leído en frame roto: quedaban ~17 unidades a la derecha del hueco real. No hubo nunca "pintor fantasma": era error de marco.

Conversión usada en todo este informe: x_verdad = x_reportado - 17.5 (y sin cambio).

## Iteraciones

| versión | diseño | violación -18° | fuga reposo | resultado +18° |
|---|---|---|---|---|
| r4v1 | techo alto hasta y84 | 240 px nuevoOscuro (flap sobre cielo) | 0 px | sellaba pero ensuciaba |
| r4v2 | disciplina envolvente, frame ROTO | 158 px | 0 px | cubría mitad derecha del seam (783 px residual) |
| r4v3 (esta) | rediseño contra mapas corregidos | 5 px (motita) | 0 px | 763 px sellados |

## Geometría medida (coordenadas VERDADERAS)

- Seam (+18°, página visible donde debe haber pelaje): banda vertical x241-266, y72-143; núcleo denso x241-261; total 1836 px en ventana amplia (x222-305, y55-165).
- Envolvente -18° (donde la cabeza NO pone tinta y por tanto el casquete estático no puede pintar): canal diagonal x248-263 × y80-95 y bolsillo x250-259 × y126-134, más flecos dispersos.
- En reposo la cabeza cubre toda la ventana: cualquier parche interior queda oculto.

## Batería final (capturas r4e, warmup descartado, canario 3818 paths +1 vs baseline 3817, cero errores de página)

- Control misma URL x2 (`g18a` vs `g18b`): máscara VACÍA, 0 px (umbral 12).
- Reposo post-fix vs reposo pre-fix: 0 px con umbral estricto de tono (<200 vs >222). Con umbral de canal >12 hay un halo de 16 px subumbral (antialiasing del borde izquierdo del parche tras la cabeza), sin volteo de tono.
- Violación -18° (oscuros nuevos vs pre-fix misma pose): **5 px**, motita 2x3 en x245.5-246.5, y109-111. Es fleco de página INTERNO del borde de papel de la cabeza a -18°, dentro de una celda 5px que promediaba segura (17-23/25 px de tinta). Subperceptual; se declara porque se midió.
- Cobertura +18° (oscuros nuevos vs pre-fix): 763 px en x240-260, y73-142.
- Residual de seam dentro del alcance del parche (x235-270, y70-146): 693 px. Concentrado en los conflictos de envolvente: x250-263 × y80-95 y bolsillo x250-259 × y126-134, que están expuestos a página SIMULTÁNEAMENTE a +18° y a -18°. Un casquete estático no puede pintarlos sin reproducir el flap oscuro de v1. Irreducible bajo la arquitectura actual (casquetes independientes de pose).
- Residual fuera de alcance: 351 px en x249.5-284.5 × y55-70: el mismo fenómeno de seam continúa MÁS ARRIBA (sector cuello/alto del hombro), preexistente, no tocado en esta tarea (el alcance definido era la franja del hombro, y88-145 en frame r3).

## Qué cambió en el código

Un único archivo: `src/visual/creatures/osoTrazado/pielTrazado.js`.
- Nueva constante `PARCHE_HOMBRO_MAS18` (v3, 22 vértices en coordenadas verdaderas) como segundo path del `casquete('cabeza', ...)`, tono P.cuello.
- Comentario de bloque documentando método, el hallazgo de marco y la disciplina de envolvente.
- `BANDA_CUELLO` intacta.

## Pronóstico (sepárese de la medición)

Pronóstico: a +18° el canal principal del hombro deja de leerse como rendija de página: 763 px de los 1836 del sector quedan en tono pelaje y el resto se reparte entre conflicto de envolvente (irreducible estáticamente) y sector superior fuera de alcance. A -18° y en reposo el parche es invisible salvo la motita de 5 px. NO certificado visualmente: los PNG crudos quedan en `_gate/r4e-*` para juicio del operador.

## Reproducción

```
node _gate/ot-shot.mjs "http://127.0.0.1:5561/ot-diag.html?sujeto=trazado&giro=18" out.png 3500 --elem ".caja .pin;0"
node _gate/ot-normaliza.mjs trazado out.png out-lam.png
# diffs: ot-mide (masa), o sondas lum<200 / >222 mismas poses antes/después
```
Servidor gate vivo pid 1869420, puerto 5561 (no fue reiniciado).
