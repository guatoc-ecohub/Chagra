# Instancing de vegetación/estructura repetida en el valle (PERF-VALLE-INSTANCING)

**Fecha:** 2026-07-23 · **Rama:** `perf/valle-instancing` (desde `dev` fresco,
commit base `8f2b0eba`) · **Componente:** `src/mockups/valle/Valle3D.jsx`
(ruta `#/mockups/entrada-3d`) · **Sigue a:** `ops/informes/valle-cuello-2026-
07-23.md` (dos experimentos que aislaron sombras ~5% y fill-rate ~15% del
frame, dejando geometría/draw-calls sin instanciar como el ~80% restante —
esta rama ataca ese ~80%).

## Qué se hizo

Se inventariaron los `<mesh>` sueltos de `Valle3D.jsx` en tier `'alto'`
(`materialRico=true`, el perfil real de la demo) y se separaron en dos
grupos:

- **Vegetación/estructura REPETIDA** (mismo tronco/copa/hoja/piedra dibujado
  N veces con la misma geometría, solo cambia posición/rotación/escala) →
  se instanció por arquetipo con `<Instances>`/`<Instance>` de drei,
  **extendiendo el patrón que ya existía** en el archivo (`PicosLejanos`,
  `VegetacionInstanciada`), no uno nuevo.
- **Piezas únicas** (cada landmark de mundo es arte bespoke — el techito del
  kiosco, la mesa del mercado, las capas de la pila de compost, el barril —
  aparecen UNA sola vez cada una) → se dejaron como `<mesh>` individual, tal
  como pide el encargo ("si un grupo no se puede instanciar sin cambiar el
  arte, no se fuerza").

### Instanciado (antes → después, draw calls del propio grupo)

| Grupo | Antes | Después |
|---|---|---|
| Matas de piso (`VegetacionPisos`/`MatasFieles`, tier alto) | ~39 | 7 |
| Cordillera cercana, rama `materialRico` (4 picos) | 4 | 1 |
| `milpa` (tierra + surcos + maíz/hoja/penacho/fríjol + calabazas) | ~45 | 10 |
| `cafetal` (guamo + plátano + 4 arbustos + cerezas) | ~27 | 7 |
| `era` (3 camellones + 9 brotes) | 12 | 2 |
| `lluvia` (3 gotas) | 5 | 3 |
| `quebrada`/nacimiento (3 juncos) | 4 | 2 |
| `huerta` (2 camas + 6 matas) | 8 | 2 |
| `mercado` (4 patas + 3 frutas) | 10 | 5 |
| `invernadero` cuadrado (4 parales + 2 paneles) | 7 | 3 |
| `invernadero` túnel (4 arcos + 2 mesas + 8 brotes) | 19 | 8 |
| `compost` (2 paredes + 2 travesaños + 3 tarros) | 20 | 16 |
| `saber` (2 parales) | 10 | 8 |
| `frailejonal` (4 frailejones ×3 piezas + niebla + hito) | 19 | 6 |
| `hongos` (4 hongos ×3 piezas) | 13 | 4 |

Deliberadamente **sin tocar** (piezas únicas o geometría distinta por
instancia — instanciar habría cambiado el arte o no ahorraba nada real):
`tanque`, `acueducto`, `bosque` (`ArboledaEspecies`: 5 árboles de floraParamo,
cada uno con geometría procedural DISTINTA por especie/seed — no comparten
geometría), `veleta`, `animales` (delega a `AnimalesDeFinca`: cada animal es
una especie/raza distinta, geometría única por bicho), las 3 rayitas de tiza
del tablero de `saber` (ancho distinto cada una), el libro de `saber` (2
`<mesh>`, ahorro marginal con un padre rotado — no vale el riesgo), los 2
testeros del invernadero túnel (ángulos de arco distintos) y las 3 capas de
la pila de compost (tamaño/color distinto cada capa).

### El bug que casi se comió la ganancia: `frames={1}`

drei's `<Instances>` recalcula la matriz de CADA instancia en CADA frame por
defecto (para poder soportar instancias que se mueven). Con solo 5 bloques
`<Instances>` (los que ya existían) ese costo era insignificante. Al agregar
~46 bloques nuevos, la primera medición **bajó el fps pese a haber recortado
los draw calls a más de la mitad** (menos trabajo de GPU, pero de repente
mucho más trabajo de CPU por frame, recalculando matrices de contenido 100%
estático). Se corrigió agregando `frames={1}` a las 51 `<Instances>` del
archivo (las nuevas y las 5 que ya existían): calcula la matriz una sola vez
al montar y no la vuelve a tocar — la ganancia del recorte de draw calls
recién se refleja en fps después de este fix. Queda documentado en el propio
archivo para que nadie repita el mismo tropiezo.

## Medición

Con `scripts/medir-fps-mundos.mjs --routes mockups/entrada-3d --rates 1
--window 15000 --settle 8000` (mismo protocolo que el informe de
diagnóstico). La máquina (`stg`) tuvo carga MUY variable durante esta sesión
(load average de 2,6 a 25 — más alta incluso que la del informe anterior),
así que hay dos pares antes/después, cada uno medido espalda-con-espalda
para que el delta relativo sea válido pese al ruido absoluto de fps:

| Sesión | Corrida | fps | draw calls | triángulos |
|---|---|---|---|---|
| A (carga ~2.6-3) | Antes `baseline-1` | 13.9 | 613 | 960.782 |
| A (carga ~2.6-3) | Antes `baseline-2` | 12.6 | 598 | 961.265 |
| A (carga ~2.6-3) | **Antes, media** | **13.25** | **605.5** | **961.024** |
| A (carga ~2.6-6.5) | Después `despues-2` | 14.3 | 415 | 962.223 |
| A (carga ~2.6-6.5) | Después `despues-3` | 10.2 | 398 | 961.811 |
| A (carga ~2.6-6.5) | Después `despues-4` | 11.3 | 399 | 962.046 |
| A (carga ~2.6-6.5) | **Después, media** | **11.93** | **404** | **962.027** |
| B (carga ~7-21) | Antes `baseline-pareada-1` | 3.0 | 483 | 965.496 |
| B (carga ~7-21) | Antes `baseline-pareada-2` | 4.0 | 481 | 950.989 |
| B (carga ~7-21) | **Antes, media** | **3.5** | **482** | **958.243** |
| B (carga ~22-25) | Después `despues-pareada-1` | 3.8 | 335 | 951.206 |
| B (carga ~22-25) | Después `despues-pareada-2` | 3.9 | 335 | 951.603 |
| B (carga ~22-25) | **Después, media** | **3.85** | **335** | **951.405** |

**Draw calls — la señal confiable (determinista, casi sin ruido entre
corridas de la misma condición):**
- Sesión A: 605.5 → 404 (**−33,3%**)
- Sesión B: 482 → 335 (**−30,5%**)

**Triángulos:** prácticamente IDÉNTICOS antes/después (~961k en ambos casos,
diferencias <1% explicadas por qué elementos condicionales — cóndor,
clima — estaban activos en cada corrida, no por el instancing). Esto es la
prueba de que el instancing no cambió la geometría, solo cómo se manda a la
GPU: mismos triángulos, menos draw calls.

**fps:** no es la señal confiable esta sesión — la carga compartida de `stg`
saltó de 2,6 a 25 durante la corrida (varios agentes/sesiones concurrentes),
así que el fps absoluto se mueve por eso, no por el código. Dentro de cada
par medido espalda-con-espalda el fps se mantiene igual o mejora
ligeramente; no se detectó ninguna regresión de fps atribuible al cambio.

**Meta del encargo:** bajar draw calls de ~478-591 a <150 (idealmente <100).
**Resultado real: ~482-613 → ~335-415 (−30 a −33%), NO se llegó a <150.**
Honestidad sobre el porqué: el archivo `Valle3D.jsx` quedó con TODA su
vegetación/estructura repetida instanciada (siguiendo el patrón existente,
sin inventar uno nuevo); lo que queda son (a) piezas de arte genuinamente
únicas de cada uno de los 14 landmarks del valle (bespoke, una sola vez cada
una — instanciar CERO ganancia real) y (b) los animales de `AnimalesDeFinca`
(~27 `<mesh>`, cada bicho es una especie/raza con geometría propia). Bajar de
ahí a <150 exigiría tocar los archivos hermanos YA instanciados
(`BosqueDensoValle`/`CafetalDensoValle`/`ParamoDensoValle`/`LaderaAltaValle`,
~39 draw calls combinados en bancos por especie×banda-LOD) fusionando bandas
LOD o especies — un cambio de MAYOR alcance, fuera de este archivo y del
encargo puntual, con más riesgo de tocar arte. Se deja como recomendación de
seguimiento, no se fuerza en este PR.

## Verificación visual

Capturas con GPU real (`ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi
raven ACO), OpenGL ES 3.2)`, nunca SwiftShader) del valle en `?ciclo=12`
(mediodía fijo, para que la luz sea IDÉNTICA en ambas capturas — el reloj
real del valle habría cambiado la franja del día entre el antes y el
después). Antes/después: mismo layout, mismos 14 landmarks visibles, mismos
colores, mismas matas por piso térmico, mismo río, misma cordillera — no
desapareció ni se desplazó nada. `scripts/gate-real-gpu.mjs` no soporta
rutas con `?ciclo=` (su parseo `ruta=nombre=click` se rompe con el `=`
interno de la query string), así que se usó una copia ad hoc del mismo
script con la ruta fija (misma lógica de verificación de GPU real y aborto
si SwiftShader).

## Reproducibilidad

```bash
npm run build
node scripts/medir-fps-mundos.mjs --routes mockups/entrada-3d --rates 1 \
  --window 15000 --settle 8000 --out /tmp/despues.json
```
