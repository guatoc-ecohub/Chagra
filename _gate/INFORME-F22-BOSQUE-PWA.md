# INFORME F22 — Montañas Humboldt para el diorama de pisos (bosque PWA)

**Rama:** `fable/bosque-pwa-montanas-humboldt` (base `origin/dev`) · **Fecha:** 2026-08-12
**Ruta gateada:** `#/mockups/mundo3d-bosque` (vitrina "La ladera y sus pisos")

## Qué era y qué es

- **ANTES** (`origin/dev`, `EscenaEstratos.jsx:323-349`): el fondo del mundo `pisos` eran
  **6 conos** (`coneGeometry` de 5 y 4 segmentos radiales, `flatShading`): 2 "montañas"
  + 2 caperuzas de nieve + 2 "cordillera lejana". A plena luz (`ciclo=10`) leen como
  **dos pirámides beige de caras planas contables** — Egipto, no Andes. Ver
  `F22-bosque-pwa-antes.png`.
- **DESPUÉS**: un **heightfield low-poly de UNA malla** (96×30 segmentos, ~5.760
  triángulos, 1 draw call) con dos crestas — la verde cercana y los nevados lejanos —,
  colores por vértice en franjas altitudinales (verde de monte dominante → faja ANGOSTA
  de páramo verde-plata → nieve sólo en puntas), moteado de claros de sol, perspectiva
  aérea que funde lo hondo con la niebla real de la escena, y 4 jirones de **niebla de
  piso** al pie de la cordillera. Ver `F22-bosque-pwa-despues.png`.

## Qué se REUSÓ y de dónde (regla dura: reusar, no reinventar)

| Pieza | Origen |
|---|---|
| Receta de terreno (ruido determinista de senos + campanas de Gauss + colores por vértice + `toNonIndexed()` + `computeVertexNormals()` + `meshLambertMaterial vertexColors flatShading`) | `src/mockups/MundoParamo3D.jsx` (`ruido`/`gauss`/`construirTerreno`), rama `fable/paramo-humboldt-real`. **No está en `dev`**, así que se copió la receta en vez de importar (además la dirección de dependencia correcta es mockups→framework, nunca al revés). |
| Color de la bruma de distancia | `mezclarCielo(CIELOS.ladera)` de `atmosferaMadre.js` — la MISMA ley de mezcla que usa `EscenaBase3D`, así la cordillera muere exactamente en la niebla que la escena ya pinta. |
| Verdes y plateados | `PALETA` de `atmosferaMadre.js` (`follaje`, `follajeOscuro`, `follajeClaro`) + `#b3bda0` (el plateado de la roseta del frailejón que ya usaba este archivo) + `#e9f1f2` (el blanco de nieve de los conos viejos). |
| Niebla de piso | El componente `Niebla` ya existente en el archivo (los pufs del páramo), extendido con un `sx = 1` opcional (estirón horizontal); los llamados existentes quedan idénticos. |
| Ramas revisadas por si había montañas mejores | `git branch -a`: `fable/montana-de-los-mundos`, `montana-mundos-campesina/pasada2/pasada3` son **parallax 2D SVG** (`MontanaMundosCampesino/Cine.jsx`) — lenguaje visual, no geometría 3D reusable. Lo mejor 3D existente era el terreno del páramo, y de ahí se partió. |

## Qué NO se tocó

- El **diorama de pisos térmicos** (torre escalonada, terrazas, cultivos, chips/hotspots,
  voz, abeja Angelita): intacto. El diff toca SOLO el bloque del fondo + helpers aditivos.
- El mundo `disenio` (bosque comestible, mismo archivo): su camino de render
  (`DioramaEstratos`) quedó sin cambios.
- Nada de eucalipto/pino/retamo/acacia: el "bosque" del fondo es color por vértice, sin
  especies; verdes de la PALETA canónica.

## Gate GPU (shot3d --headed, M6000 real, viewport 1280x800, --wait-ms 9000)

| Captura | Condición | Resultado |
|---|---|---|
| `F22-bosque-pwa-antes.png` | `origin/dev` limpio (vía `git stash`), `?ciclo=10` | MUNDO VIVO, 0 page errors — **pirámides planas contables** |
| `F22-bosque-pwa-despues.png` | esta rama, `?ciclo=10`, misma cámara/espera | MUNDO VIVO, 0 page errors — **cordillera con masa** |
| `F22-bosque-pwa-antes-noche.png` / `despues-noche.png` | hora real (~3 AM, modo noche del ciclo diurno) | par nocturno adicional, mismas condiciones entre sí |
| `F22-bosque-pwa-despues-movil.png` | `--viewport 390x844` | layout de celular, torre protagonista |

- **Gotcha documentado**: el router de `App.jsx` NO recorta query del hash —
  `#/mockups/mundo3d-bosque?ciclo=10` cae fuera de la ruta. La hora fija se pasa por
  SEARCH: `/?ciclo=10#/mockups/mundo3d-bosque` (`leerCicloParam` lee hash Y search).
- El veredicto de texto ("MUNDO VIVO") no discrimina — el juicio es sobre los PNG,
  como manda RULINGS. Los 5 errores de consola presentes son ruido preexistente del
  dev-server (env `VITE_FARMOS_CLIENT_ID` ausente, sqlite-wasm 403 por node_modules
  symlinkeado) e idénticos en ANTES y DESPUÉS.

## Verificación técnica

- `eslint --max-warnings=0` sobre el archivo: **0**.
- `tsc:check` (`tsc --noEmit -p jsconfig.json`): **667 errores en base `dev` limpia,
  667 con el cambio, 0 en `EscenaEstratos.jsx`** → pasa contra baseline.
- `npm run build`: verde (12.6 s).
- Determinismo: sin `Math.random` — misma cordillera siempre.
- Costo: 1 draw call estático (~5.7k tris Lambert) + 4 pufs reusados, reemplaza 6 draw
  calls de conos. Trivial para el presupuesto del mundo.

## NO VERIFICADO (honesto)

- **FPS: NO MEDIDO.**
- **Órbita completa (360°) no gateada**: OrbitControls permite girar detrás; el
  heightfield tiene falda que muere en los bordes (taper), pero la vista trasera no
  se capturó.
- **`disenio` no regresionado visualmente** (el código de su camino no cambió; no se
  capturó su vitrina).
- **reduced-motion / tier bajo (gemelo 2D)**: no capturados — el fondo nuevo sólo vive
  en el camino 3D; el 2D usa `PisosTermicosBandas`/láminas, intocados.
- **El arte NO lo certifica este informe: lo certifica el operador.** Lo demostrado es
  que el fondo dejó de ser cono plano contable — no que quedó bonito.
