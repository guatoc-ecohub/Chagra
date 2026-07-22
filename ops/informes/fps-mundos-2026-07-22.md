# FPS reales de los mundos 3D de Chagra (stg, GPU real, throttling de móvil barato)

**Fecha:** 2026-07-22 · **Rama:** `perf/fps-mundos-reales` (desde `dev`, commit
base `5ad2c1ed`) · **Script:** `scripts/medir-fps-mundos.mjs`

Hasta hoy, `scripts/check-perf-budget.mjs` solo pesa archivos del bundle. Nadie
había medido si un mundo 3D corre fluido en algo parecido al hardware que va a
usar un campesino colombiano (gama Moto E). Este informe mide FPS reales
(`requestAnimationFrame`, frames contados, no estimados) en la GPU real de stg
(AMD Radeon Vega 10, sin SwiftShader) con throttling de CPU vía CDP.

**Aviso de honestidad (leer antes que nada)**: los números con throttling de
CPU (4x/6x) son **exploratorios, no un veredicto**. La medición autoritativa
de "cómo corre en un Moto E" solo sale de un Moto E físico, que no está
disponible en este entorno. Este informe usa throttling porque es lo que hay
— pero los números de 4x/6x **no deben presentarse ni citarse como si fueran
la experiencia real del teléfono del campesino**. Son una señal direccional,
razonablemente correlacionada, no una medición del dispositivo objetivo. Ver
§Metodología y §Limitaciones.

---

## Respuesta primero: ¿por qué el valle da tirones y suelo-demo-3d no?

**Dos causas, una grande (no se toca) y una acotada (ya arreglada en esta
rama).** Nota de trazabilidad: `suelo-demo-3d` (la ruta que citó el operador)
se **archivó a mitad de este trabajo** — ver aviso en la sección siguiente.
La comparación de fondo (por qué el valle es pesado) no depende de que esa
ruta siga viva: se cita con su commit exacto para que sea reproducible.

### Causa 1 (estructural, NO acotada): el valle es ~10-40× más pesado por frame

Midiendo **en la MISMA máquina, con la MISMA GPU, sin ningún throttling**, en
el commit `5f75f1ba` (el tope de `dev` cuando `suelo-demo-3d` todavía existía
como ruta viva):

| | `mockups/entrada-3d` (el valle) | `mockups/suelo-demo-3d` (archivada desde) |
|---|---|---|
| fps promedio | **3.3 – 9.4** (varió según carga de la máquina — ver §Limitaciones) | **43 – 60** |
| draw calls / frame | ~478–520 | ~10–13 |
| triángulos / frame | ~935,000–955,000 | ~24,000–93,000 |
| peor frame (stall) | hasta 1100+ ms | 33–130 ms |

El valle (`src/mockups/valle/Valle3D.jsx`, 2872 líneas) compone TODO el
panorama de la finca a la vez — terreno de 56 segmentos, cordillera, río,
decenas de edificios/lugares individualmente modelados (no instanciados) cada
uno con `castShadow`, vegetación densa a lo largo de toda la vista, luz
direccional con shadow-map real. `suelo-demo-3d` era una sola planta en
primer plano con desenfoque de profundidad que ocultaba casi todo lo demás —
arquitectónicamente más barata en cada eje que importa.

Esto **no depende del throttling ni del tiering**: incluso en el perfil
`'medio'` (frugal: sin sombras, sin fog, DPR≤1.3) el valle midió ~13 fps con
~208 draw calls / ~348k triángulos — sigue siendo pesado. Es un problema de
*cuánta geometría se dibuja por frame*, no de configuración. **Re-verificado
en el commit base actual de esta rama (`5ad2c1ed`)**: `entrada-3d` sigue
midiendo 3.8/2.4/1.5 fps (1x/4x/6x) con ~474-478 draw calls / ~935-944k
triángulos — el hallazgo no es un artefacto de un commit viejo.

**Esto es grande y no se tocó** (instanciar estructuras repetidas, LOD real de
los `MundoLugar`, recortar por frustum los lugares fuera de cámara, revisar si
tantas sombras son necesarias) — es trabajo de varios días sobre un archivo de
2872 líneas, no un cambio acotado. Se describe como recomendación al final.

### Causa 2 (acotada, SÍ arreglada): al valle le faltaba el cable de `permite3D()`

Casi todos los ~40 mundos 3D de la vitrina (incluido `suelo-demo-3d` mientras
existió, línea 191 de `SueloDemo3D.jsx`) llaman `permite3D(tier)` antes de
montar su `<Canvas>`: si el equipo es de gama baja, muestran directamente su
versión 2D liviana y **nunca pagan el costo de crear el contexto WebGL**. El
valle (`EntradaValle3D.jsx`) era la única excepción: importaba `decidirTier()`
pero nunca `permite3D()` — el `tier` solo bajaba la *calidad* del material
(`perfilDeTier`), nunca decidía si montar 3D en absoluto. `Valle2DFallback`
existía en el código, pero solo se usaba como red de un error de React
(`componentDidCatch`), no como decisión de tiering.

**Medido antes/después, simulando un equipo real de gama baja**
(`navigator.hardwareConcurrency=4`, `deviceMemory=2` — un Moto E típico, vía
`--simular-equipo 4,2`; recordatorio: esta simulación de *señales de
hardware* es distinta del throttling de CPU — ver Metodología §4):

| | Antes del fix | Después del fix |
|---|---|---|
| ¿Monta Canvas WebGL? | **Sí** — Valle3D completo | **No** — 2D digno directo |
| fps | ~17 (con perfil "bajo" de seguridad, igual sudando) | n/a (no hay Canvas que medir) |
| draw calls / frame | ~202 | 0 |
| triángulos / frame | ~184,700 | 0 |

Capturas: `ops/informes/capturas/fps-mundos-2026-07-22/valle-3d-antes.png` (el
valle 3D tal como se ve hoy) y
`.../valle-2d-fallback-bajo-tier-despues-del-fix.png` (el mismo equipo
simulado, después del fix — el 2D digno que YA existía en el código, ahora
sí alcanzable).

**El fix**: `src/mockups/EntradaValle3D.jsx` — importar `permite3D` del
barrel `visual/mundo3d` y envolver el bloque `<Valle3DGuard><Valle3D/></Valle3DGuard>`
en `permite3D(equipo.tier) ? (...) : <Valle2DFallback .../>`, mismo patrón que
ya usan los otros ~40 mundos. Una función, un condicional, cero geometría
nueva. Build verde, tests pre-existentes sin cambios (los 4 que fallan en
`entradaValle3D.nav.test.jsx`/`EntradaValle3D.tts.test.jsx` ya fallaban
**igual en `dev` sin tocar nada** — verificado con `git stash`).

**Ojo**: este fix protege a los equipos que SÍ caen en tier `'bajo'`
(pocos núcleos/poca RAM). NO resuelve el problema que reportó el operador
comparando valle vs. suelo-demo-3d **en el mismo equipo** — ese equipo (un
desktop con 8 núcleos / GPU dedicada) cae en tier `'alto'`, y en `'alto'` el
valle sigue siendo la escena pesada de la Causa 1. Son dos bugs distintos que
coincidían en el mismo componente.

---

## Aviso: `suelo-demo-3d` se archivó a mitad de este trabajo

Mientras se hacía este informe, `dev` avanzó (commit `5ad2c1ed`,
"el páramo definitivo") y **archivó tres mundos**: `SueloDemo3D.jsx`,
`BosqueVivo3D.jsx` y `MundoParamo3D.jsx` se movieron a `src/mockups/_archivo/`
y sus rutas (`mockups/suelo-demo-3d`, `mockups/bosque-vivo-3d`,
`mockups/mundo-paramo-3d`) se retiraron de `MOCKUP_HASH_ROUTES` en
`src/App.jsx`. Reemplazo directo: **`mockups/paramo-definitivo`** (un solo
mundo del páramo, sin Ent ni campesino, que "recicla lo bueno" de los tres).

**Encontrado por accidente, y es un hallazgo de metodología en sí mismo**: al
volver a correr el barrido sobre `dev` fresco, esas tres rutas midieron "ok"
con fps y draw-calls plausibles — pero eran **idénticos** a los de
`entrada-3d` (~470-560 draw calls, ~935-960k triángulos). La razón: cuando un
hash ya no está en `MOCKUP_HASH_ROUTES`, el router de la app (`src/App.jsx`,
efecto de arranque) hace `navigate(hash === 'login' ? 'login' : 'valle3d')` —
sin sesión (como el navegador de este script), **cualquier ruta desconocida
redirige silenciosamente al valle**. El script measía un canvas real, con fps
reales... del mundo equivocado, y lo hubiera reportado como si fuera
`suelo-demo-3d`. Se corrigió: `scripts/medir-fps-mundos.mjs` ahora lee
`MOCKUP_HASH_ROUTES` de `src/App.jsx` en cada corrida y marca
`ruta-no-existe` SIN abrir navegador si el slug ya no está — más vale no medir
que medir la app de otro (mismo espíritu que el fix de
`gate-real-gpu.mjs` de puerto/carpeta por corrida, ver más abajo).

`mockups/paramo-definitivo` (el reemplazo) SÍ se midió de verdad: **45.9 / 22.4
/ 15.8 fps** (1x/4x/6x), 168 draw calls / 541,414 triángulos. Es mucho mejor
que el valle, pero más pesado que lo que era `suelo-demo-3d` (que llegaba a
60fps con solo 10-13 draw calls) — no es una comparación "tan buena como
antes", es una escena distinta con otro presupuesto.

---

## Umbrales (de un deep-research con fuentes, no inventados)

El operador corrió un deep-research en paralelo específicamente para esto.
Los umbrales de este informe salen de ahí, no se inventaron:

- 60 fps exige ≈16,7 ms/frame; Android define **jank** como los frames que
  pasan de 16 ms.
- **30 fps estables (33,3 ms/frame) es el objetivo defendible** para 3D
  educativo en gama baja — **30 fps bloqueados es mejor que 60 fps
  inestables** (peor la variancia que el techo).
- **Presupuesto de frame time: P95 ≤ 33,3 ms y P99 ≤ 50 ms.**
- **Menos de 100 draw calls visibles por mundo.** Si el cuello de botella es
  CPU (llamadas de dibujo, no fill-rate), hay que bajar draw calls ANTES que
  bajar polígonos — hay escenas en esta tabla con miles de triángulos pero
  pocos draw calls que rinden mejor que otras con menos triángulos y más
  draw calls (ver `bosque-tres-estratos`: 1.86M triángulos mnos solo 17 draw
  calls → 35-38 fps estables en las 3 pasadas, vs. `mundo-abejas-3d`: 12.5k
  triángulos con 273 draw calls → colapsa a 5.3 fps a 6x).

### Umbral de bloqueo de merge propuesto

1. **Bloqueo duro, sin excepción**: cualquier medición con renderer de
   software (`swiftshader`/`llvmpipe`) — el número no dice nada, hay que
   remedir con GPU real antes de decidir nada.
2. **Bloqueo duro**: promedio **< 30 fps** O **P95 > 33,3 ms** (equivalente:
   fps instantáneo p5 < 30) en la pasada **sin throttling** sobre la GPU real
   de referencia. Si ni el hardware de referencia sostiene el piso
   defendible, ningún Moto E lo va a sostener — no hace falta throttling para
   saber que está roto (caso del valle: 3.3-9.4 fps sin throttling).
3. **Bloqueo duro por percentil de cola**: **P99 > 50 ms** en cualquiera de
   las pasadas medidas — eso es el frame ocasional que se siente como
   congelamiento aunque el promedio se vea bien.
4. **Bloqueo duro por draw calls**: **≥ 100 draw calls visibles** por mundo
   en la pasada sin throttling. Con CPU limitada (el caso típico de gama
   baja), el cuello de botella casi siempre es la cantidad de llamadas de
   dibujo, no los polígonos — bajar esto primero, antes de tocar geometría.
5. Un mundo que no monta ningún `<canvas>` cuando debería, o que redirige
   silenciosamente a otra ruta (ver el hallazgo de arriba), es el peor
   resultado posible y bloquea igual que fallar el umbral de fps — no se
   reporta como "n/a", se reporta como roto.
6. Las pasadas con throttling (4x/6x) se usan como **señal exploratoria
   adicional**, nunca como el gate principal — ver el aviso de honestidad al
   inicio del informe.

Con estos umbrales: `entrada-3d` (el valle) falla los puntos 2, 3 y 4 por
mucho margen (3.8 fps, peor-frame de cientos de ms, 474-478 draw calls). La
mayoría de los mundos nuevos (`mundo-*-3d`) pasan el punto 2 sin throttling
pero varios fallan el punto 4 (más de 100 draw calls) — ver tabla completa.

---

## Trampa que casi invalida todo el informe (y cómo se evitó)

1. **GPU real, no SwiftShader**: en chromium 148 de stg, `--use-gl=egl` cae a
   software (`SwiftShader Device (Subzero)`). El script NO pasa ese flag;
   verifica `WEBGL_debug_renderer_info` en cada medición y aborta si dice
   `swiftshader/llvmpipe/software`. Renderer real medido:
   `ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES 3.2)`.
2. **Troika/blob-workers**: en chromium 148 mueren async y dejan la escena
   3D entera suspendida (canvas de un solo color). Se deshabilitan igual que
   en `gate-real-gpu.mjs` (el `Worker` de blob truena, troika cae a
   main-thread).
3. **`reducedMotion: 'reduce'` (la trampa que este informe encontró sola)**:
   `gate-real-gpu.mjs` usa `reducedMotion:'reduce'` porque quiere una
   captura ESTÁTICA y estable para pantallazos. Copiar esa configuración a
   ciegas para medir FPS midió **0 frames en TODAS las escenas**, no porque
   estuvieran congeladas sino porque `prefers-reduced-motion` hace que r3f
   ponga `frameloop='demand'` (sin re-render continuo) — dejamos de pedirle
   que dibuje. Corregido a `reducedMotion:'no-preference'`.
4. **El throttling de CPU NO simula un teléfono barato por sí solo** (y por
   eso el aviso de honestidad al inicio): `decidirTier()`
   (`src/visual/mundo3d/deviceTier.js`) decide 3D-pleno / 3D-frugal / 2D
   según `navigator.hardwareConcurrency` y `navigator.deviceMemory` —
   señales que `Emulation.setCPUThrottlingRate` **no cambia**. Sin más,
   "throttling 6x" solo mide "la escena de escritorio, pero más lenta" — no
   el camino de render (más liviano) que un Moto E real ejecutaría. El
   script agrega `--simular-equipo <núcleos>,<GB>` para sobreescribir esas
   señales con `Object.defineProperty` ANTES de que la app arranque, así
   `decidirTier()` ve el equipo que se quiere simular de verdad. El barrido
   principal (tabla abajo) mide con el hardware REAL de stg (8 núcleos /
   16 GB → tier `'alto'`) + throttling, tal como pidió el encargo original;
   la comparación de tiering de la Causa 2 usa `--simular-equipo` aparte,
   documentada solo en este informe. **Ninguno de los dos reemplaza medir en
   un teléfono físico** — son las dos mejores aproximaciones disponibles sin
   uno.
5. **Rutas archivadas redirigen en silencio al valle** (encontrado en este
   mismo informe): ver aviso arriba. `scripts/medir-fps-mundos.mjs` ahora
   verifica contra `MOCKUP_HASH_ROUTES` real antes de medir.
6. **Puerto y carpeta de capturas por corrida, no fijos**: mientras se hacía
   este trabajo, `scripts/gate-real-gpu.mjs` recibió el mismo tipo de fix
   (commits `11b97b0a` y `d6c0ace3`, 2026-07-22): puerto fijo (8097) +
   nombre de archivo fijo (`/tmp/gr-*.png`) hacían que dos corridas
   concurrentes en la máquina compartida se fotografiaran/midieran la una a
   la otra. `medir-fps-mundos.mjs` ya tenía una guarda propia (verificación
   de que el servidor HTTP responde con NUESTRO `dist`, no uno viejo — se
   encontró esa misma clase de bug de forma independiente corriendo el
   primer barrido, con un `http.server` huérfano en el puerto por defecto).
   Se adoptó además el mismo criterio de puerto: **`8100 + (pid % 800)`**,
   igual que `gate-real-gpu.mjs`, en vez de un puerto fijo.
7. **Máquina compartida**: stg no es un banco de pruebas aislado — corren
   otros procesos (`vite`, otras corridas de `gate-real-gpu.mjs` de tareas
   paralelas, etc.). Esto agrega varianza a los números absolutos —
   comparación relativa (valle vs. cualquier otro mundo) es robusta a esto;
   números absolutos de un solo mundo entre corridas distintas, no tanto.

---

## Metodología

- **Rutas medidas**: todos los mockups `#/mockups/...` de `src/App.jsx` que
  montan un `<Canvas>` WebGL real (confirmado por código fuente —
  `grep -rl "<Canvas" src/mockups/ src/visual/mundo3d/escenas/` — o por
  runtime si la detección estática no alcanzaba). 60 rutas candidatas, ver
  `RUTAS_3D` en el script (incluye `paramo-definitivo`, el reemplazo del
  2026-07-22, y mantiene las 3 rutas archivadas para documentar su ausencia).
- **Condiciones**: sin throttling, CPU 4x, CPU 6x (`Emulation.setCPUThrottlingRate`
  vía `context.newCDPSession(page)`), todas con la GPU real. Ver aviso de
  honestidad: 4x/6x son exploratorios.
- **Ventana de medición**: 12 s de escena asentada (tras 6 s de asentamiento
  fijo en tiempo real, igual para las 3 condiciones) — frames contados con
  `requestAnimationFrame` real, sin `Math.random` en ningún lado.
- **Draw calls / triángulos**: instrumentados por interceptación de
  `drawArrays`/`drawElements`/`drawArraysInstanced`/`drawElementsInstanced`
  en el contexto WebGL — cuenta real de llamadas GL por frame, no una
  estimación. "Geometrías"/"texturas" son un proxy (buffers/texturas WebGL
  vivos, vía `createBuffer`/`createTexture` interceptados) — no es 1:1 con
  `renderer.info` de three.js (no expuesto por la app), pero es una medición
  real, no inventada.
- **Tiempo al primer frame**: timestamp del primer `drawArrays`/`drawElements`
  real sobre el contexto WebGL, relativo al *time origin* de la navegación.
- **Memoria JS**: `performance.memory.usedJSHeapSize` (Chromium).
- **Verificación de ruta viva**: antes de medir, el script confirma que el
  slug sigue en `MOCKUP_HASH_ROUTES` de `src/App.jsx` (evita medir un
  redirect silencioso — ver Trampa #5).

---

## Tabla completa

Generada con `node scripts/tabla-fps-md.mjs ops/informes/fps-mundos-2026-07-22.json`
sobre el JSON completo de la corrida final (commit base `5ad2c1ed`, 180
mediciones = 60 rutas × 3 condiciones).

### El valle y variantes

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/entrada-3d` — Valle (EntradaValle3D, home 3D) | 3.8 (p5 2.3/p95 6.7), peor 500ms | 2.4 (p5 1.2/p95 5), peor 899.9ms | 1.5 (p5 0.9/p95 2.1), peor 1199.9ms | **478** | **944,421** | 1712/7 | 9411ms | 55 |
| `mockups/valle-lluvia-3d` — Valle con lluvia (escena distinta, NO es Valle3D.jsx) | 59.5 (p5 59.5/p95 60.2), peor 33.4ms | 49.1 (p5 29.9/p95 60.2), peor 66.7ms | 55.8 (p5 30/p95 60.2), peor 50ms | 31 | 12,641 | 121/4 | 1046ms | 15.3 |
| `mockups/valle-noche-3d` — Valle de noche (escena distinta, NO es Valle3D.jsx) | 58.2 (p5 59.5/p95 60.2), peor 50.1ms | 48 (p5 29.9/p95 60.2), peor 100.1ms | 19.9 (p5 8.6/p95 60.2), peor 216.7ms | 10 | 6,326 | 33/6 | 1733ms | 12.6 |

`valle-lluvia-3d` y `valle-noche-3d` **NO son el mismo componente** que
`entrada-3d` — comparten la palabra "valle" en el nombre de ruta pero son
escenas standalone mucho más chicas (924 y 689 líneas respectivamente, contra
2872 de `Valle3D.jsx`). No es una contradicción que midan 20-59 fps mientras
el valle real mide <4 fps.

### Mundos "Vivo3D"

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/bosque-vivo-3d` | **ARCHIVADA 2026-07-22** — ruta ya no existe, ver `paramo-definitivo` | | | — | — | — | — | — |
| `mockups/cafetal-vivo-3d` | 59.9 (p5 59.9/p95 60.2), peor 33.4ms | 36.6 (p5 20/p95 60.2), peor 83.3ms | 24.9 (p5 15/p95 30.1), peor 83.4ms | 49 | 273,406 | 267/6 | 1297ms | 20.2 |
| `mockups/aguacatal-vivo-3d` | 60 (p5 59.9/p95 60.2), peor 16.8ms | 40.4 (p5 29.9/p95 60.2), peor 83.4ms | 16.2 (p5 10/p95 30), peor 133.3ms | 84 | 63,945 | 364/6 | 1138ms | 20.6 |
| `mockups/invernadero-vivo-3d` | 49.3 (p5 29.9/p95 60.2), peor 100ms | 42.9 (p5 29.9/p95 60.2), peor 66.7ms | 27.3 (p5 15/p95 60.2), peor 133.3ms | 41 | 47,426 | 137/6 | 1902ms | 17.9 |
| `mockups/cacao-vivo-3d` | 58.2 (p5 59.5/p95 60.2), peor 50ms | 35.1 (p5 20/p95 60.2), peor 50.1ms | 23.3 (p5 15/p95 30), peor 100ms | 28 | 89,154 | 177/6 | 1875ms | 15.2 |
| `mockups/papa-viva-3d` | 52 (p5 29.9/p95 60.2), peor 83.3ms | 19 (p5 12/p95 30.1), peor 183.4ms | 10.1 (p5 5/p95 29.9), peor 266.6ms | 16 | 138,011 | 118/5 | 1124ms | 13.7 |
| `mockups/mundo-piscicultura-3d` | 42.8 (p5 29.9/p95 60.2), peor 116.7ms | 39.3 (p5 20/p95 60.2), peor 149.9ms | 37 (p5 20/p95 60.2), peor 100.1ms | 81 | 12,108 | 168/4 | 4353ms | 14.9 |
| `mockups/lecheria-viva-3d` | 58.4 (p5 59.5/p95 60.2), peor 33.4ms | 28.2 (p5 20/p95 59.9), peor 166.7ms | 24.5 (p5 15/p95 30), peor 83.4ms | 125 | 54,572 | 723/6 | 1645ms | 21.1 |

### Mundos nuevos (`Mundo*3D`)

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/mundo-suelo-vivo-3d` | 57.2 (p5 59.5/p95 60.2), peor 50ms | 44.5 (p5 29.9/p95 60.2), peor 50.1ms | 31.7 (p5 20/p95 60.2), peor 66.7ms | 132 | 7,958 | 645/5 | 1148ms | 21.2 |
| `mockups/aliados-finca-3d` | 60 (p5 59.9/p95 60.2), peor 16.8ms | 50.6 (p5 29.9/p95 60.2), peor 50.1ms | 35.1 (p5 29.9/p95 60.2), peor 66.7ms | 54 | 1,964 | 240/4 | 1050ms | 14 |
| `mockups/mundo-cafe-3d` | 60 (p5 59.9/p95 60.2), peor 16.8ms | 59.8 (p5 59.5/p95 60.2), peor 33.4ms | 59 (p5 59.5/p95 60.2), peor 33.4ms | 59 | 25,505 | 245/5 | 1068ms | 16 |
| `mockups/mundo-semillero-3d` | 60, peor 16.8ms | 60, peor 16.8ms | 59.7, peor 33.4ms | 62 | 1,650 | 222/5 | 985ms | 18.8 |
| `mockups/mundo-compost-3d` | 60, peor 16.8ms | 49.7, peor 50.1ms | 35.7, peor 66.7ms | 73 | 14,487 | 358/6 | 1049ms | 17.3 |
| `mockups/mundo-fermentos-3d` | 58.2, peor 33.4ms | 49.1, peor 50.1ms | 35.5, peor 83.3ms | 138 | 17,609 | 568/5 | 3183ms | 22.4 |
| `mockups/mundo-microfauna-3d` | 59.6, peor 33.4ms | 57.7, peor 33.4ms | 47.9, peor 50ms | 153 | 14,832 | 680/5 | 1386ms | 19.1 |
| `mockups/mundo-agua-3d` | 57.4, peor 33.5ms | 37.2, peor 66.8ms | 25.9, peor 100ms | 278 | 18,914 | 1170/4 | 1344ms | 23.9 |
| `mockups/mundo-paramo-3d` | **ARCHIVADA 2026-07-22** — ruta ya no existe, ver `paramo-definitivo` | | | — | — | — | — | — |
| `mockups/mundo-abejas-3d` | 32.9 (p5 20/p95 60.2), peor 116.7ms | 9.6 (p5 6/p95 15), peor 250ms | 5.3 (p5 3.7/p95 10), peor 316.7ms | 273 | 12,545 | 1346/5 | 1593ms | 20.5 |
| `mockups/mundo-gallinero-3d` | 52.7, peor 50ms | 24.2, peor 83.4ms | 15.4, peor 183.3ms | 125 | 3,456 | 524/5 | 1186ms | 19 |
| `mockups/mundo-mercado-3d` | 60, peor 16.8ms | 59.7, peor 33.4ms | 57.5, peor 33.4ms | 100 | 3,114 | 362/5 | 1453ms | 14 |
| `mockups/mundo-botica-cana-3d` | 51.9, peor 50ms | 25.8, peor 150ms | 17.7, peor 116.6ms | 247 | 125,288 | 1011/5 | 1663ms | 22.2 |
| `mockups/mundo-frutales-3d` | 59.2, peor 50.1ms | 44, peor 66.6ms | 31.4, peor 83.3ms | 74 | 10,298 | 314/5 | 1386ms | 21.9 |
| `mockups/mundo-leguminosas-3d` | 59, peor 33.4ms | 44.7, peor 100.1ms | 17.1, peor 550.1ms | 25 | 98,414 | 115/5 | 1288ms | 17.1 |
| `mockups/jaguar-monte-3d` | 25.8 (p5 15/p95 59.9), peor 116.7ms | 11 (p5 6/p95 20), peor 316.7ms | 5.3 (p5 3.5/p95 10), peor 316.6ms | 5 | 19,766 | 22/4 | 2024ms | 13.6 |
| `mockups/frutales-andinos-3d` | 58.9, peor 33.4ms | 54.7, peor 50ms | 38.1, peor 83.4ms | 11 | 87,614 | 53/4 | 2019ms | 14.4 |
| `mockups/mundo-polinizadores-3d` | 59.2, peor 66.6ms | 49.7, peor 50.1ms | 36.1, peor 99.9ms | 169 | 236,856 | 478/5 | 1561ms | 16.8 |
| `mockups/micorrizas-3d` | 59.8, peor 50ms | 60, peor 16.8ms | 58.4, peor 33.5ms | 29 | 50,549 | 112/4 | 1684ms | 15.5 |
| `mockups/paramo-humboldt-3d` | 44.6 (p5 29.9/p95 60.2), peor 66.7ms | 39.8 (p5 20/p95 60.2), peor 66.7ms | 39.7 (p5 20/p95 60.2), peor 283.3ms | 47 | 1,236,318 | 148/7 | 3296ms | 29.6 |
| `mockups/bosque-tres-estratos` | 37.1 (p5 20/p95 60.2), peor 66.7ms | 37.8 (p5 20/p95 60.2), peor 83.3ms | 35.3 (p5 20/p95 60.2), peor 66.7ms | **17** | **1,861,088** | 77/5 | 1824ms | 19.7 |

`bosque-tres-estratos` es el ejemplo perfecto del umbral de draw-calls: 1.86
millones de triángulos pero solo 17 draw calls → 35-38 fps **estables** en
las 3 condiciones (el fill-rate no es el cuello de botella aquí, y con pocas
llamadas de dibujo el CPU no sufre). Compárese con `mundo-abejas-3d`: 45x
menos triángulos (12.5k) pero 273 draw calls → colapsa a 5.3 fps a 6x. Es
literalmente el consejo del umbral #4 ("si el cuello es CPU, bajar draw
calls antes que polígonos") demostrado con datos propios.

### Mundos legacy (framework `<Mundo>`)

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/mundo3d-agua` | 59.8, peor 33.4ms | 42.9, peor 83.3ms | 26.4, peor 283.3ms | **0** ⚠ | **0** ⚠ | 0/4 | — | 17.7 |
| `mockups/mundo3d-suelo` | 55.2, peor 33.5ms | 40.7, peor 83.3ms | 27.4, peor 200ms | 61 | 690 | 194/19 | 1451ms | 15.9 |
| `mockups/mundo3d-animales` | 49.2, peor 66.7ms | 25.2, peor 100.1ms | 15.1, peor 200ms | 128 | 6,788 | 618/22 | 1401ms | 21.3 |
| `mockups/mundo3d-milpa` | 56.2, peor 33.4ms | 32.7, peor 83.4ms | 21.4, peor 116.7ms | 112 | 2,606 | 398/19 | 1418ms | 18.3 |
| `mockups/mundo3d-bosque` | 56.7, peor 33.4ms | 31, peor 83.4ms | 22, peor 166.7ms | 66 | 1,558 | 386/19 | 1460ms | 18.7 |
| `mockups/mundo3d-clima` | 54.1, peor 33.5ms | 31, peor 83.4ms | 19.4, peor 216.6ms | 63 | 4,595 | 226/19 | 1769ms | 21.4 |
| `mockups/mundo3d-sanidad` | 55.3, peor 50ms | 26.4, peor 99.9ms | 11.3, peor 183.5ms | 85 | 4,098 | 290/19 | 1647ms | 15.8 |
| `mockups/mundo3d-mercado` | 56.5, peor 33.5ms | 32.4, peor 100ms | 20.7, peor 166.7ms | 76 | 2,618 | 261/22 | 1554ms | 17.4 |
| `mockups/mundo3d-cafe` | 49.1, peor 50ms | 21.2, peor 100ms | 14.8, peor 250ms | 70 | 262,845 | 344/19 | 1594ms | 24.5 |
| `mockups/mundo3d-semillero` | 56.2, peor 33.5ms | 30.2, peor 83.3ms | 18.6, peor 166.6ms | 101 | 4,070 | 350/19 | 1463ms | 20.6 |

⚠ **`mundo3d-agua` mide fps real (rAF real) pero CERO draw calls** — el
Canvas monta con tamaño real y la GPU responde a 60fps, pero no dibuja NADA
(confirmado con captura: fondo beige liso con los hotspots de la UI
superpuestos, sin geometría 3D visible). No se sabe si es intencional (un
estado "vacío" antes de interactuar) o un bug del diorama — no se investigó
más a fondo por estar fuera del alcance de este informe, pero se deja
anotado explícitamente: **un fps alto no garantiza que la escena esté
dibujando algo**. Ver `mundo3d-agua-debug.png` en la carpeta de capturas.

### Demos / utilidades 3D

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/suelo-demo-3d` | **ARCHIVADA 2026-07-22** — ver §Causa 1 y §Aviso (datos históricos citados por commit) | | | — | — | — | — | — |
| `mockups/paramo-definitivo` (reemplazo) | 45.9 (p5 29.9/p95 60.2), peor 100.1ms | 22.4 (p5 15/p95 59.9), peor 116.7ms | 15.8 (p5 8.6/p95 30), peor 333.3ms | 168 | 541,414 | 558/10 | 2012ms | 28.7 |
| `mockups/hoja-prueba-valle` | 0 fps — **`frameloop="demand"` por diseño**, escena de calibración estática, NO es un bug | | | — | — | — | 1060ms | 15.3 |
| `mockups/tres-ents-gradiente` | 53.9 (p5 30/p95 60.2), peor 33.4ms | 47 (p5 29.9/p95 60.2), peor 33.4ms | 45.9 (p5 29.9/p95 60.2), peor 100ms | 63 | 221,513 | 350/5 | 1875ms | 24.7 |
| `mockups/camara-director` | 0 fps — **`frameloop="demand"` por diseño** (comentario propio del archivo: "Contrato frugal del framework"), NO es un bug | | | — | — | — | 1084ms | 14.9 |
| `mockups/momento-venta-mercado-3d` | 59.8, peor 33.3ms | 59.3, peor 33.4ms | 58.9, peor 50ms | 31 | 11,495 | 359/5 | 1481ms | 15.2 |
| `mockups/artesania-andina` | 60, peor 16.8ms | 60, peor 16.8ms | 59.7, peor 33.4ms | 8 | 826 | 28/4 | 1115ms | 15.4 |
| `mockups/efectos-funcionales` | 0 fps — **`frameloop="demand"` por diseño** ("nada corre por frame en reposo"), NO es un bug | | | — | — | — | 1232ms | 16.8 |
| `mockups/catalogo-infra` | 59.2, peor 33.4ms | 56.7, peor 33.4ms | 54.1, peor 83.4ms | 29 | 1,303 | 124/4 | 1059ms | 16.4 |
| `mockups/infraestructura-3d` | 60, peor 16.8ms | 59.7, peor 33.4ms | 57.5, peor 50.1ms | 38 | 1,648 | 116/8 | 1344ms | 17.7 |
| `mockups/colocar-infraestructura` | 60, peor 16.8ms | 60, peor 16.8ms | 60, peor 16.8ms | 1 | 4,608 | 5/4 | 1267ms | 15.3 |
| `mockups/sierra-global` | 60, peor 16.8ms | 59.5, peor 33.4ms | 58.7, peor 33.4ms | 14 | 7,285 | 59/4 | 1243ms | 13.1 |

### Vitrinas

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/vitrina-3d` | **NO CARGA canvas en 40s** — ver nota abajo, no es "roto" en el sentido de bug | | | — | — | — | — | — |
| `mockups/vitrina-infra` | 60, peor 16.8ms | 59.8, peor 33.3ms | 57.3, peor 50.1ms | 38 | 1,648 | 116/8 | 1472ms | 17.6 |
| `mockups/vitrina-maestra` | **NO CARGA canvas en 40s** — ver nota abajo | | | — | — | — | — | — |

**`vitrina-3d`** (VitrinaCriaturas.jsx): se navegó, cargó contenido real (UI
con selector de detalle, pestañas "Criaturas rubber-hose" / "Micro-fauna del
suelo" / etc.), pero **su pestaña por defecto ("Criaturas rubber-hose") no
monta ningún `<canvas>`** — es contenido 2D/SVG ("rubber-hose" hecho con
CSS/SVG, patrón conocido del proyecto). El 3D real puede vivir en otra
pestaña que este barrido no exploró (fuera de alcance: el script navega y
mide, no hace clic en tabs). No se cuenta como "mundo roto", se cuenta como
"esta ruta, en su estado inicial, no es una escena 3D".

**`vitrina-maestra`** (VitrinaMaestraMundos.jsx): el propio código dice que
el Canvas "ocurre SIEMPRE en su `onMitad`, debajo del velo — máx un Canvas
vivo" — es decir, el 3D solo aparece brevemente durante una transición
(cuando el usuario elige un mundo), no en el estado inicial ("galería"
2D). Mismo caso: no es un mundo roto, es una demo gateada por interacción que
este barrido (sin clics) no alcanza a disparar.

### Juegos

| Mundo | 1x | 4x | 6x | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |
|---|---|---|---|---|---|---|---|---|
| `mockups/new-donk` | 59.5, peor 33.4ms | 47.1, peor 83.4ms | 42.2, peor 50.1ms | 24 | 1,158 | 93/4 | 1168ms | 11.9 |
| `mockups/murales-new-donk` | 52, peor 50ms | 24.7, peor 133.4ms | 16.4, peor 116.8ms | 34 | 1,338 | 133/4 | 1045ms | 12.8 |
| `mockups/juego-mi-finca` | 60, peor 16.8ms | 58.4, peor 33.5ms | 53.8, peor 49.9ms | 45 | 1,630 | 177/4 | 1124ms | 14.7 |

---

## Aclaración importante sobre nombres parecidos

Ver nota en §El valle y variantes arriba: `valle-lluvia-3d` y `valle-noche-3d`
no son `Valle3D.jsx`.

## Qué no se pudo medir / limitaciones

- **Hardware real Moto E**: no hay un teléfono físico conectado a este
  entorno; se simuló vía `navigator.hardwareConcurrency`/`deviceMemory` +
  CPU throttling. Esto cambia la RUTA de render (tiering) correctamente pero
  no captura diferencias de GPU real (Mali/PowerVR/Adreno de gama baja vs.
  Vega 10 de escritorio) — **los números de este informe, sobre todo los de
  throttling, son exploratorios, no autoritativos** (ver aviso al inicio).
- **Geometrías/texturas** son un proxy (ver Metodología), no el conteo exacto
  de `renderer.info.memory` de three.js — la app no expone el renderer por
  `window`.
- Mundos marcados "0 fps" con `frameloop='demand'` por diseño (`hoja-prueba-valle`,
  `camara-director`, `efectos-funcionales` — los tres documentan esto en su
  propio código fuente) NO son un bug — se anotan así en la tabla
  explícitamente, no se omiten ni se confunden con un mundo roto.
- `vitrina-3d` y `vitrina-maestra` no montaron canvas en su estado inicial
  (2D/SVG o gateado por interacción) — ver notas en §Vitrinas. No se
  exploraron sus demás pestañas/estados (fuera de alcance).
- `mundo3d-agua` midió fps real pero 0 draw calls (canvas vacío) — ver nota
  en §Mundos legacy.
- El barrido corrió con carga de fondo de una máquina compartida (otros
  `vite`, otras corridas de `gate-real-gpu.mjs`) — agrega varianza a los
  números absolutos entre corridas distintas del mismo mundo; la comparación
  relativa entre mundos en la MISMA corrida es robusta a esto.
- **`suelo-demo-3d` se archivó a mitad de este trabajo** — los números
  citados para esa ruta son de un commit anterior (`5f75f1ba`), no del
  commit base final de esta rama (`5ad2c1ed`), donde la ruta ya no existe.
  Ver §Aviso.

## Recomendación para la Causa 1 (no se tocó, es grande)

1. Instanciar estructuras repetidas del valle (`InstancedMesh` para lo que
   hoy son `<mesh>` individuales por lugar — ya existe el patrón en
   `VegetacionInstanciada`, falta aplicarlo a edificios/landmarks).
2. Activar el LOD que ya existe (`perfil.lod` / `<Detailed>`) también en
   tier `'alto'` — hoy el comentario dice "landmarks siempre a detalle
   completo" en `'alto'`; con ~478 draw calls (umbral propuesto: <100) eso ya
   no se sostiene ni en desktop.
3. Frustum culling explícito de los `MundoLugar` fuera de cámara — el valle
   dibuja TODOS los lugares aunque la cámara solo encuadre una fracción.
4. Revisar si `castShadow` en cada mesh individual (decenas de ellos) es
   necesario, o si un shadow-map compartido/baked cubre el mismo resultado
   visual a una fracción del costo.
5. Referencia de "sí se puede": `bosque-tres-estratos` sostiene 1.86M
   triángulos a 35-38 fps ESTABLES en las 3 condiciones con solo 17 draw
   calls — la vía es bajar draw calls, no necesariamente bajar triángulos.

Esto es trabajo real de optimización de escena, no un cambio acotado — se
deja documentado para que se priorice, no se intentó en esta rama.
