# Informe de validación: invernadero escalable

Fecha de captura: 2026-08-18.

## Pronóstico

La parametrización debería sostener 1.500 a 10.000 plantas porque el cultivo
principal usa una geometría compartida y un `InstancedMesh` por familia. El
tomate mantiene una segunda familia instanciada para los racimos, con 3, 2 o 1
racimos por planta según la cantidad.

Esto es pronóstico de arquitectura. La cifra que se cita abajo es la medición.

## Medición GPU

El centinela `./_gate/herramientas/gate-x-estado.sh` respondió `VIVO :0` antes
de capturar. El renderer informado por Chromium fue:

`ANGLE (NVIDIA Corporation, Quadro M6000/PCIe/SSE2, OpenGL 4.5.0)`

| Configuración | FPS medido | WebGL | Errores de página | Fallos de red | Evidencia |
| --- | ---: | --- | ---: | ---: | --- |
| tomate, 1.500, surcos | 60,1 | detectado | 0 | 0 | `_gate/invernadero-escalable-1500.png` |
| tomate, 10.000, surcos | 60,0 | detectado | 0 | 0 | `_gate/invernadero-escalable-10000.png` |

Las tres capturas de calentamiento posteriores al cambio de código fueron
descartadas del veredicto.

## Lectura visual

Inspección directa de ambas capturas: el túnel, la puerta, los tutores y el
follaje verde dominante se leen. En 1.500 se distinguen más racimos rojos. En
10.000 la escena se lee como una masa densa de cultivo bajo plástico; a amplia
distancia parte de los frutos queda ocluida por el follaje. Eso se lee como
follaje denso, no como plástico ni como escena rota.

## Límites de esta validación

- `pgrep -c chromium` devolvió `18` durante la medición. Había procesos de
  otros carriles y no se deben matar. Por eso los 60 FPS son medidos en GPU real,
  pero no son una línea base aislada de máquina sola.
- `microapp-shot` no produjo una captura local y dejó un proceso headless
  esperando. No se usa como evidencia.
- `judge-vl` fue invocado sobre las dos capturas, pero no devolvió texto útil
  dentro del tiempo de la corrida. No hay aprobación automática del juez.
- No se capturó baseline sin post-proceso porque esta escena no usa un paso de
  post-proceso propio en este cambio.
- El barrido procedural del contrato se probó con las semillas deterministas
  `20260818`, `20260819` y `20260820`. La toma pública de la ruta usa la semilla
  interna estable `733` para conservar la escena reproducible.
- La envolvente de distancia cerca, plano medio y amplia no quedó instrumentada
  en tres cámaras separadas; las dos capturas certificadas usan la cámara
  estándar. La lectura amplia sí fue inspeccionada en la captura de 10.000.

## Handoff Fable

La geometría artística del tomate no se rediseñó en esta pasada. El contrato de
especie, cantidad y layout queda documentado en
`src/visual/mundo3d/invernadero/README-ARTE-FABLE.md` para reemplazo posterior
del arquetipo sin tocar el camino de instancing.
