# Informe de gate: tinta trazada Jaguar v2

## Alcance

Se generaron `ChivitoTrazado` (piel normal y piel punk) y
`LuciernagaTrazado` desde estas láminas fuente:

- `public/valle/compai/laminas/chivito-normal.png`
- `public/valle/compai/laminas/chivito-punk.png`
- `public/valle/compai/laminas/luciernaga.png`

La piel se generó con `scripts/trazar-lamina.sh`: aplanado sobre `#eee8d7`,
`vtracer --mode spline --hierarchical stacked --color_precision 8
--filter_speckle 2 --gradient_step 8 --path_precision 2`, clip del alfa con
`potrace`, y optimización `svgo --multipass -p 2`. El payload se empaquetó con
`scripts/generar-payload-trazado.mjs`. No se dibujaron paths SVG a mano.

Conteo de paths color generados:

- chivito normal: 3.678
- chivito punk: 4.399
- luciérnaga: 2.920

El modo punk solo selecciona la segunda piel cuando `modo="actuando"` o
`actuando={true}`. En reposo conserva la piel normal.

## Validación computacional

- Test unitario: `Trazado.render.test.jsx`, 2/2.
- ESLint de los archivos nuevos y el harness: PASS.
- `node --check` del generador y payload: PASS.
- `vite build`: PASS, 3.821 módulos transformados.
- Captura headed sin errores de página: PASS.

## Gate visual

Antes de capturar:

```text
VIVO :0 /tmp/xauth_ICXMso
chromium_before=0
```

La sonda propia importó `./_gate/herramientas/gate-pantalla.mjs`, esperó
máquina sola y descartó tres muestras después de la carga. La captura principal
fue a 1280x1600, con escalas 230 px (cerca), 64 px (plano medio) y 32 px
(amplia), en fondo claro y oscuro. No se usó post-proceso de escena.

## Veredicto Gemini

Juez independiente: `gemini-3.5-flash`, sobre comparaciones lado a lado de
referente original a la izquierda y salida trazada a la derecha.

- Chivito normal: **PASS**. Conserva silueta, cresta, expresión, lápiz, libro,
  pañuelo y lectura en las escalas reducidas.
- Chivito punk: **PASS**. Conserva cresta punk, pose, proporciones, pañuelo,
  lápiz y libro; la identidad se mantiene en las tres escalas.
- Luciérnaga: **PASS**. Conserva silueta, pose, proporciones, lápiz, libro y
  abdomen luminoso; sigue leyendo como el mismo personaje en las tres escalas.

La primera mitad del gate, desaparición del defecto, pasó porque la salida no
introduce arte manual ni bloques de papel fuera de la silueta. La segunda mitad,
lectura correcta, también pasó según Gemini en cerca, plano medio y amplia.

## No verificado

- No se midió FPS: esta entrega es una librería SVG trazada y el encargo no
  pidió una regresión de rendimiento. No se presenta un número de FPS.
- No hubo barrido de semillas: el trazado es determinista y no usa semillas
  procedurales. La animación CSS tampoco introduce selección aleatoria.
- El capturador general de mundos no aplicaba a este harness HTML por no tener
  canvas WebGL; por eso el gate usado fue la sonda HTML propia con la pantalla
  viva, no una conclusión basada en HTTP 200.
