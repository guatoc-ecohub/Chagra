# Informe de validación: invernadero parametrizable

Fecha: 2026-08-18.

## Pronóstico

El cultivo principal recibe `{ especie, cantidad, layout }`, normaliza la
entrada a 1..10.000 plantas y usa una geometría compartida con un
`InstancedMesh` por familia. El tomate conserva una familia instanciada para
los frutos, con 3, 2 o 1 racimos por planta según la escala.

Esto es pronóstico de arquitectura. Las cifras de abajo son mediciones.

## Medición GPU

- `gate-x-estado.sh`: `VIVO :0`.
- La sonda propia importó `gate-pantalla.mjs` y confirmó pantalla viva.
- Chromium headed informó `ANGLE (NVIDIA Corporation, Quadro M6000/PCIe/SSE2, OpenGL 4.5.0)` mediante `WEBGL_debug_renderer_info`.
- La sonda descartó tres muestras cortas de calentamiento después de cada carga.
- Viewport: 1280 × 800. La sonda usó `--disable-gpu-vsync` para medir techo de render, no una cifra limitada por refresco.

| Configuración | FPS medido | WebGL | Errores de página | Fallos de red |
| --- | ---: | --- | ---: | ---: |
| tomate, 1.500, surcos | 399,32 | sí | 0 | 0 |
| tomate, 10.000, surcos | 94,47 | sí | 0 | 0 |

La máquina no quedó sola: `pgrep -c chromium` dio 8 procesos ajenos antes de
la sonda y el guard devolvió `maquinaSola=false`. Por tanto estas cifras son
válidas como medición de esta corrida, pero están contaminadas por carga
concurrente y no deben citarse como baseline aislada de la M6000.

## Lectura visual

Se capturaron amplia, plano medio y cerca para 1.500 y 10.000 plantas.

- En 1.500, el túnel, la cubierta, la condensación, los tutores, la masa verde
  y los frutos rojos se leen. Cerca y plano medio los racimos son distinguibles.
- En 10.000, el túnel y la cubierta siguen legibles y el cultivo se lee como
  una masa densa de follaje verde. Los frutos quedan parcialmente ocultos en
  las tres distancias, especialmente en amplia. Eso se lee como follaje
  denso, no como plástico roto ni como una escena vacía.
- La geometría actual sigue siendo el arquetipo procedural existente. El
  refinamiento visual del tomate, follaje como masa continua y porte realista
  queda marcado para Fable en `README-ARTE-FABLE.md`.

## Móvil

Con viewport 390 × 844, la ruta mostró canvas y los tres selectores, no tuvo
overflow horizontal (`scrollWidth=390`) y no produjo errores de página.

## Límites y no verificado

- `microapp-shot` y `judge-vl` no están disponibles en este checkout. No se
  inventa un veredicto automático: la lectura anterior es inspección directa
  de capturas con `view_image`.
- No se pudo medir máquina sola porque otros carriles mantuvieron Chromium
  vivo. No se mató ningún worker.
- El barrido procedural de tres semillas quedó cubierto en la prueba de
  distribución por conteo y determinismo, pero no se generaron tres series
  visuales separadas. La ruta pública mantiene la semilla estable de la escena.
- No se capturó un baseline alternativo sin post-proceso. Este cambio no añade
  un paso de post-proceso propio.

Capturas locales de esta corrida: `demos/3d/_gate/invernadero-parametrizable/`.
