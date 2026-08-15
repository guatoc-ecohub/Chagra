# INFORME F18 — Oso-con-bastón 2.5D vivo (arte de cero)

**Fecha:** 2026-08-11 · **Rama:** `fable/oso-baston-25d` (desde `origin/dev` f89ea3fd5, en worktree `.worktrees/oso-baston`) · **Autor:** Fable (tick autónomo, cláusula headless)

## Qué se entregó

El **oso del bastón** (`oso-baston`): la CUARTA dirección de arte del oso de anteojos
(*Tremarctos ornatus*), arte de cero en el patrón de la casa (ajuste arquitectónico del
PR #2877): **SVG rubber-hose con idle-brain**, no RiggedActor. La criatura ES la lámina viva.

- `src/visual/creatures/OsoBaston.jsx` — el componente (copiado también a esta ruta del árbol principal como entregable de campo; la fuente canónica vive en la rama).
- `src/visual/creatures/osoBastonIdentidad.js` — la identidad como datos.
- `src/visual/creatures/__tests__/OsoBaston.render.test.jsx` — 16 tests del contrato.
- `creatures.css` — bloque de cadencias `osb-*` + overrides + gates tier/RM.
- Cableado completo: `vidaEstados` (florece/resopla/reposo), `creatureIdle` (perfil suelo),
  `index.js` CREATURES, `elenco` (**enPWA: true**), `transformacion` (aura verde `#43c24f`),
  `rubberhoseSpec` (registro de personajes).

## La referencia del operador (identificada)

`~/.config/claude-inbox/img/20260807-164349_file_210.jpg` — el póster **"¡El oso de
anteojos! El guardián de los Andes"**: oso Cuphead erguido con bastón florecido, guantes
blancos, botas café, sonrisa amplia, paisaje andino. Y `…164345_file_209.jpg` (la lámina
"Tremarctos Cupheadianus") trae la nota del operador: *"que se parezca más a la visión de
Humboldt con su expresión cuphead sin que parezca copia"*. **Si esta identificación está
errada, corregir y se re-itera el arte** — pero las dos imágenes son inequívocamente el
oso-con-bastón pedido.

La traducción de "Humboldt vivo, no lámina muerta":
- **Botánica cierta y nombrada** en el bastón (`OSO_BASTON_FLORA`): *Espeletia
  grandiflora* (roseta + flor amarilla que corona), *Cattleya trianae* (la orquídea de
  Mayo, lila con garganta amarilla), enredadera nativa. Verde dominante, cero especies
  vetadas (ruling 2026-08-05).
- **Rayado de grabado** sugerido en el pelaje (trazos de buril a contraluz) y tintas
  tierra cálidas de la familia.
- **Todo respira**: oso-boil pesado, bastón con vaivén plantado en la contera, corola
  que cabecea, polen que flota, parpadeo con ritmo propio, la mirada que reconoce.

## La firma (contrato de silueta, `OSO_BASTON_FIRMA`)

Todos los rasgos `forma: true` (la lección del borugo): el **bastón coronado más alto
que él** (nadie más del elenco rompe la silueta hacia arriba con un prop), la **postura
de caminante con botas**, los **anteojos asimétricos** (el derecho derrama hacia el
hocico, como el patrón real), la **media luna del pecho**. Su ecología es su gesto:
el dispersor de semillas se detiene a **hacer FLORECER el bastón**.

## Estados vivos entregados

| Estado | Qué hace | Dónde |
|---|---|---|
| idle | vaivén del bastón plantado + corola que respira + polen + boil pesado + parpadeo/mirada | CSS base + `useVidaIdle('oso-baston')` |
| `florece` | gesto-firma: corola con overshoot 1.7s, halo verde, polen acelerado (dur 3400 = 2 ciclos exactos) | momento del idle-cerebro o prop |
| `resopla` | huff familiar (reusa oso-resoplido/oso-vaho/oso-cejas-frunce, ADITIVO) | momento o prop |
| `pose='camina'` | **ciclo de andar con bastón**: cuerpo que boya y se ladea, piernas alternando, bastón que planta/levanta a contratiempo, jarra que acompaña (1.3s) | host (kart/mundos) |
| `pose='celebra'` | alza el cayado con amplitud propia (override `osb-celebra-alza`; el rh-g genérico lo sacaba del encuadre) | host |
| `visema` V1-V4 | lip-sync a la cara | `useLipSync` |
| `poder` | aura VERDE del bastón florecido `#43c24f` (única en `AURA_POR_BICHO`) | host |
| `tier='bajo'` / RM / `animated=false` | fotograma digno: la firma queda, la cadencia se apaga | gates CSS |

## GATE GPU (headed, M6000, DISPLAY real) — el par antes/después

- **ANTES** → `_gate/oso-antes.png` — el oso café (`OsoAndino`, RECHAZADO por diseño,
  PR #2564: peluche plano infantil de panza crema) y el guardián lunar (`OsoGuardian`,
  otra dirección: mole biopunk nocturna, SIN bastón). `shot3d --headed`: LÁMINA VIVA,
  **page errors 0, request failures 0**.
- **DESPUÉS** → `_gate/oso-baston-despues.png` — el oso del bastón en 10 celdas (idle,
  florece, resopla, camina, celebra, poder, visema V3, lineBoil, tier bajo,
  animated=false). `shot3d --headed`: **LÁMINA VIVA — svg=11 visibles, geometría
  959/977, page errors 0, request failures 0** (el único console error es el favicon
  404 del harness).
- Harness reproducible: `.worktrees/oso-baston/_gateoso/` (`index.html` +
  `antes.html`), servido con `npx vite --port 5199` en el worktree.

### Juicio perceptual (las DOS preguntas, ruling 2026-08-07)

**1. ¿El defecto que motivó el trabajo está corregido?** Sí: ya no hay oso café plano
ni lámina muerta — hay un caminante Cuphead con bastón florecido VIVO, en el patrón de
la familia. La primera pasada del gate encontró 4 defectos y se corrigieron en
`1d03f150`: luna gigante al centro de la panza → babero pectoral chico y alto; guante
en jarra flotando → codo que rompe silueta + filo de luz; CELEBRA sacaba el bastón
volando → override de amplitud corta; sonrisa ilegible → arco amplio con dientes.

**2. ¿Se rompió algo que antes estaba bien?** No: 401 tests verdes en el set de
criaturas + selector + compai. Los **2 rojos preexistentes** (`Borugo.render`,
`vidaEstados` "los 8 bichos") se verificaron **en worktree baseline limpio de
`origin/dev`**: fallan idéntico sin mi rama (tests obsoletos ya documentados por el
PR #2877). Cero rojos nuevos.

**Trade-off aceptado (honesto):** el tubo del brazo en jarra (tinta sobre pelaje
oscuro) pierde contraste sobre fondos muy oscuros; a los 64px del uso PWA lee bien y
el codo ya rompe la silueta. Si el operador lo quiere más legible, la vía es aclarar
un punto más `cuerpoLuz` o engrosar el filo de luz del canto.

## Gate móvil (shot-pixel) — BLOQUEADO, no omitido

`shot-pixel` corrió (Pixel 6 Pro por ADB, `adb reverse` montado) pero el teléfono está
con **lockscreen con credencial** y no se bypassea: la captura salió de la pantalla
bloqueada (`_gate/oso-baston-pixel.png` en el worktree, sin valor de gate). Riesgo
móvil BAJO: el componente es **SVG+CSS puro, sin WebGL** — la clase de bugs Mali
(context-loss, InstancedMesh) no aplica, y es el mismo pipeline de las ~20 criaturas
ya en producción móvil. **Pendiente:** repetir `shot-pixel` con el teléfono
desbloqueado antes del merge si se quiere el sello móvil.

## Pendiente (fuera de alcance de este tick)

- **Kart (cross-repo):** como con la luciérnaga del PR #2877, falta generar la lámina
  PNG del oso (render grande → recorte) y dropearla en `compai/laminas/` del kart
  (`~/demos/3d/juegos/chagra-kart` — PROHIBIDO tocar el valle live desde este tick).
  `pose='camina'` ya existe para ese uso.
- El PR #2564 (sacar café+borugo del elenco) sigue abierto sobre otra base
  (`integra/todo-3d-a-prod`); esta rama no lo pisa (no toca la fila `oso` heredada).

## Cómo verificar

```bash
cd /home/kortux/Workspace/chagra/.worktrees/oso-baston
npx vitest run src/visual/creatures/__tests__/OsoBaston.render.test.jsx   # 16 verdes
npx vite --port 5199   # → http://localhost:5199/_gateoso/index.html (después) · /_gateoso/antes.html (antes)
shot3d http://localhost:5199/_gateoso/index.html /tmp/oso.png --headed --wait-ms 7000
```

Commits: `0313f216` (arte + cableado) · `c392cc71` (tests) · `1d03f150` (correcciones del gate).
