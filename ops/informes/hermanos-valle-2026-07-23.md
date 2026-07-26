# Instanciar el hermano más pesado del valle (PERF-HERMANOS-VALLE)

**Fecha:** 2026-07-23 · **Rama:** `perf/hermanos-valle-instancing` (desde `dev`
fresco, commit base `c18fb0da`) · **Sigue a:** `ops/informes/valle-instancing-
2026-07-23.md` (#2710, instanció `Valle3D.jsx`: 605→404 draw calls, −33%).
Este trabajo ataca el resto: las escenas hermanas que el valle compone/enlaza.

## Paso 1 — medir, no adivinar

El encargo proponía como candidatos `FaunaBosque.jsx`, `EscenaBosqueVivo.jsx`,
`EscenaCafetalVivo.jsx`, `floraCafetal.geom.js`, `floraParamo.geom.js`. Antes
de tocar nada se auditó qué compone REALMENTE `Valle3D.jsx` (la ruta
`entrada-3d`): importa sus PROPIOS componentes (`BosqueDensoValle.jsx`,
`CafetalDensoValle.jsx`, `ParamoDensoValle.jsx`, `LaderaAltaValle.jsx`,
`HatoMovil.jsx`, `ArrieriaValle.jsx`, `CampesinosValle.jsx`,
`AguaVivaValle.jsx`, `DetalleSueloValle.jsx`, `composicionValle3D.jsx`) — NO
los mundos standalone que sugería el encargo. Revisando esos archivos
(comentarios propios + grep de `<Instances>`/`instancedMesh`/`Banco`) resultó
que **ya estaban todos instanciados** por el trabajo previo (#2710 y el commit
base de `Valle3D.jsx`): bancos por especie×banda-LOD (`Banco`/`BancoInstancias`,
~39-54 draw calls combinados entre los cuatro), ovejas/gallinas en
`InstancedMesh` en `HatoMovil`, pórticos/patios en `<Instances>` en
`composicionValle3D`. Los candidatos del encargo eran una buena hipótesis pero
**no correspondían a lo que el valle realmente monta** — exactamente el motivo
por el que el encargo pedía medir en vez de adivinar.

Se midieron entonces los MUNDOS HERMANOS de verdad — las rutas standalone a
las que el valle lleva (portales/ventanas) y que comparten arquetipos con el
valle — con `scripts/medir-fps-mundos.mjs` (`--rates 1 --window 12000 --settle
6000`, GPU real `ANGLE (AMD Radeon Vega 10)`, nunca SwiftShader). Nota: la ruta
legacy `mundo-paramo-3d` que sugería el encargo está ARCHIVADA desde
2026-07-22 (reemplazada por `paramo-definitivo`, ver comentario en el propio
script de medición); se usó su reemplazo vivo.

| Mundo hermano | Ruta | Draw calls | Triángulos |
|---|---|---:|---:|
| Valle (referencia, ya instanciado en #2710) | `mockups/entrada-3d` | 388 | 960.543 |
| **Páramo definitivo** | `mockups/paramo-definitivo` | **158** | 541.303 |
| `[legacy] Mundo3D bosque` | `mockups/mundo3d-bosque` | 66 | 1.558 |
| Cafetal vivo 3D | `mockups/cafetal-vivo-3d` | 49 | 277.802 |

**El páramo definitivo (`EscenaBosqueVivo.jsx`, montado por
`MundoEntBosque.jsx` en la ruta `paramo-definitivo`) es el hermano más
pesado por lejos**: 3.2× los draw calls del cafetal y 2.4× los del bosque
legacy, con 541k triángulos (más de la mitad de los del propio valle).

## Paso 2 — instanciar el más pesado

Dentro de `EscenaBosqueVivo.jsx`, casi todo el terreno/vegetación/estructura
YA estaba instanciado (`Quenual`, `Hojarasca`, `CentroParamo`, `Penas`, todos
con `Banco`/`Instancias`). El contribuyente sin instanciar más grande vive en
`FaunaBosque.jsx` (que `EscenaBosqueVivo` monta): `MariposasDelParamo` — 8
mariposas en tier alto, cada una con 2 alas + 1 cuerpo como `<mesh>` sueltos
= hasta **24 draw calls**, SIEMPRE visibles (no gateadas por evento raro como
`BandadaDeAves`). De paso se instanció también `AbejasDelFrailejonar` (3
`<mesh>` sueltos → 1 `InstancedMesh`, ganancia menor pero gratis).

### El fix

- `MariposasDelParamo`: 3 `InstancedMesh` totales (ala-izquierda,
  ala-derecha, cuerpo) en vez de 24 `<mesh>`. El offset/rotación/flip local
  del ala (antes en un `<group scale={[lado,1,1]}><mesh position={[0.11,0,0]}
  rotation={[-Math.PI/2,0,0]}>` anidado) queda HORNEADO en la geometría
  (`geomAla()`, verificado a mano: `rotateX→translate→scale` en ese orden
  replica exactamente la composición T·R·S de los Object3D anidados). Lo
  único dinámico por frame es la matriz del cuerpo (posición/yaw/banqueo/
  escala) compuesta con el aleteo (rotación Z), vía `Matrix4.compose` +
  `multiply` — mismo patrón que `HatoMovil` usa para oveja/gallina. Color por
  instancia (cada mariposa tiene su propio color) vía `setColorAt`.
- `AbejasDelFrailejonar`: 3 `<mesh>` → 1 `InstancedMesh` (solo posición
  cambia, mismo color para las tres).
- **Sin `frames={1}`**: a diferencia del bug de #2710 (contenido QUIETO
  recalculado de más), aquí el contenido SÍ se mueve cada frame — no aplica.

### El bug que casi se aprueba a ciegas: `vertexColors` sin atributo de color

Primera versión traía `vertexColors: true` en el material del ala (copiado
del patrón de `Banco`/`BancoInstancias`, que SÍ lo necesitan porque sus
geometrías —frailejón, roble— vienen con sombreado horneado por vértice de
verdad). Pero `PlaneGeometry` no tiene atributo `color`: three.js activa
`USE_COLOR` igual (`material.vertexColors` se lee directo, sin comprobar si
la geometría tiene el atributo — verificado en
`node_modules/three/src/renderers/webgl/WebGLPrograms.js:296`), WebGL lee el
atributo faltante como `(0,0,0)`, y `vColor *= color` deja el ala EN NEGRO
antes de multiplicar por el tinte de instancia — el color de instancia
quedaba bien pintado pero invisible. Se encontró SOLO por verificación visual
dirigida (ver abajo); las mediciones de draw-calls/triángulos no lo habrían
detectado (no cambian). Fix: quitar `vertexColors` del material del ala — el
tinte por instancia lo pone `USE_INSTANCING_COLOR`, que no depende de ese
flag.

## Medición (antes/después, pares espalda-con-espalda)

```bash
npm run build
node scripts/medir-fps-mundos.mjs --routes mockups/paramo-definitivo --rates 1 --window 12000 --settle 6000
```

| Condición | Corrida 1 | Corrida 2 | Media |
|---|---:|---:|---:|
| Antes — draw calls | 162 | 160 | **161** |
| Antes — triángulos | 541.337 | 541.334 | 541.336 |
| Después — draw calls | 131 | 129 | **130** |
| Después — triángulos | 541.382 | 541.393 | 541.388 |

**Draw calls: 161 → 130 (−31, −19,3%).** Triángulos prácticamente idénticos
(diferencia <0,01%, dentro del ruido de otras piezas condicionales del
frame — `BandadaDeAves`, `Stars` — no del instanciado): la prueba de que
esto es el mismo dibujo, con menos llamadas a la GPU. `entrada-3d` (el valle)
se re-midió de paso para confirmar que `Valle3D.jsx` no se tocó: sigue en el
mismo rango (351-388) que reportó #2710, la variación es ruido de
franja/clima entre corridas, no una regresión.

## Verificación visual

GPU real (`ANGLE (AMD Radeon Vega 10 Graphics)`, nunca SwiftShader) en ambos
lados. `scripts/gate-real-gpu.mjs` usa `reducedMotion:'reduce'`, que
DESMONTA `MariposasDelParamo`/`AbejasDelFrailejonar` (gateadas a
`!reducedMotion`) — no sirve para verificar ESTE cambio en particular. Se
usó una copia ad hoc del mismo patrón (misma guarda GPU-real, mismo puerto
por corrida) con `reducedMotion:'no-preference'`, y además una verificación
dirigida: un hook de auditoría TEMPORAL (mismo patrón que
`AuditoriaValle.jsx` del valle, dormido salvo `?debugparamo=1`, retirado
antes de este commit) que expuso `{gl,scene,camera}` para teleportar la
cámara junto a cada mariposa y aislar (ocultando el resto de la escena) los
`InstancedMesh` de fauna. Confirmado: 8 mariposas con sus 8 colores propios
(rosa/azul/amarillo/verde… según `MARIPOSAS`), forma de ala en V intacta,
3 abejas ámbar — mismo layout/colores que la versión sin instanciar,
capturada en el mismo punto de la órbita (la mariposa Morpho azul aparece en
el mismo lugar junto a las rocas en ambas capturas de contexto completo).

## Lo que NO se tocó (y por qué)

- **`RayosDeSol`/`BrumaParallax`** (`EscenaBosqueVivo.jsx`, 10 `<mesh>` cada
  uno, tier alto): candidatos legítimos a instanciar (posiciones estáticas
  relativas a su grupo padre), pero `BrumaParallax` anima la opacidad POR
  CAPA de forma independiente con materiales separados — instanciarlo bien
  pide mover esa animación a un atributo por instancia (más alcance, más
  riesgo de tocar el comportamiento). Se deja como seguimiento.
- **`BandadaDeAves`** (6 aves × 3 `<mesh>` = 18 draw calls): evento raro
  (dura ~10s cada 42-90s, oculto el resto del tiempo — 0 draw calls la
  mayoría del tiempo). Baja prioridad frente a las mariposas (siempre
  visibles).
- **Bosque/Cafetal/Páramo/LaderaAlta** (los archivos que el encargo nombraba
  como hermanos): ya instanciados, ver Paso 1. Fusionar sus bandas LOD/
  especies para bajar más los ~39-54 draw calls combinados es el mismo
  seguimiento que ya señaló el informe de #2710 — no se repite aquí.

## Reproducibilidad

```bash
npm run build
node scripts/medir-fps-mundos.mjs --routes mockups/paramo-definitivo,mockups/entrada-3d --rates 1 --window 12000 --settle 6000 --out /tmp/despues.json
```
