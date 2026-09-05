# Dos experimentos para localizar el cuello de botella del valle (GPU real, stg)

**Fecha:** 2026-07-23 · **Rama:** `perf/valle-cuello-experimentos` (desde `dev`
fresco, commit base `85feeb22`) · **Componente:** `src/mockups/valle/Valle3D.jsx`
(ruta `#/mockups/entrada-3d`) · **Script base:** `scripts/medir-fps-mundos.mjs`
(se le agregaron flags `--viewport WxH` y `--dpr N`, opcionales, default =
comportamiento de siempre).

Este informe es medición, no arte: el objetivo es decidir dónde atacar
ANTES de comprometer una reescritura (instancing, LOD, sombras), separando
qué parte de la GPU pesa. No se toca el comportamiento real del valle: el
único cambio de código (`shadows={false}` forzado en el `<Canvas>` para el
Experimento A) fue temporal, se revirtió antes de commitear, y no queda en
el diff de esta rama (`git diff dev -- src/mockups/valle/Valle3D.jsx` da
vacío).

## Metodología

- GPU verificada en **cada** corrida vía `WEBGL_debug_renderer_info`:
  `ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES
  3.2)` — GPU real, nunca SwiftShader/llvmpipe. Ninguna corrida se abortó por
  renderer de software.
- Sin throttling de CPU (`rate=1`): el interés es aislar el eje GPU
  (sombras vs fill-rate vs geometría), no repetir la separación CPU/GPU que
  ya hizo el modelo de servilleta.
- Asentamiento generoso: `--settle 8000` (vs 6000 default) + `--window 15000`
  (vs 12000 default) — el valle tarda 3.3–5.4s en su primer draw call; se le
  dio margen antes de empezar a contar frames.
- **Cada condición se midió 3 veces** (no una sola). Motivo: la máquina
  (`stg`) tenía carga compartida real durante la medición (`uptime` promedio
  6.3–6.4 en 8 núcleos: dos sesiones de Claude, Hyprland, un `vite` de otro
  worktree, `gh pr view`), y el fps individual mostró ruido notable (rango
  11.5–15.5 fps entre corridas de una MISMA condición). Se reporta la media
  de 3 corridas; los JSON completos de las 9 corridas quedan en
  `ops/informes/valle-cuello-2026-07-23/` (ver §Reproducibilidad).
- Draw calls y triángulos, en cambio, fueron **deterministas** (variación
  <2% entre corridas de la misma condición) — es la señal más confiable de
  este informe, más que el fps crudo.

## Tabla resumen (medias de 3 corridas, `mockups/entrada-3d`, GPU real, rate=1x)

| Condición | fps (media) | ms/frame | draw calls/frame | triángulos/frame | Δ ms/frame vs baseline |
|---|---|---|---|---|---|
| **Baseline** (sombras como están, viewport 390×844 @dpr2) | 12.2 | 82.0 ms | 591 | 961.713 | — |
| **Sin sombras** (`shadows={false}` forzado, mismo viewport) | 12.8 | 77.9 ms | 406 (−31%) | 699.086 (−27%) | **−4.1 ms (−5,0%)** |
| **Viewport mínimo** (96×96, dpr1, mismas sombras/geometría) | 14.4 | 69.6 ms | 610 (≈ igual) | 962.371 (≈ igual) | **−12,4 ms (−15,1%)** |

Corridas individuales (para trazabilidad — el rango es real, no un error):

| Condición | fps corrida 1 | fps corrida 2 | fps corrida 3 |
|---|---|---|---|
| Baseline | 11.7 | 11.8 | 13.1 |
| Sin sombras | 13.0 | 11.5 | 14.0 |
| Viewport mínimo | 13.1 | 15.5 | 14.5 |

## Experimento A — sombras

Se forzó `shadows={false}` en el `<Canvas>` de `Valle3D.jsx` (línea 2882),
manteniendo el resto del perfil `'alto'` intacto (mismo `segmentosTerreno`,
`materialRico`, `dpr`, sin instanciar nada) — un cambio de una sola variable,
no un cambio de tier completo (cambiar de tier también mueve DPR,
antialiasing, densidad de vegetación y LOD a la vez, lo que habría
contaminado la medición).

**Resultado:** los draw calls cayeron 31% y los triángulos 27% (consistente
con que ~40 objetos `castShadow` dejan de generar su pasada de profundidad),
pero el frame solo se achicó 4,1 ms (5,0%). La caída de trabajo GPU/CPU por
draw call es real y medible, pero es una fracción pequeña del presupuesto
total de frame (82 ms).

**Nota de honestidad sobre un supuesto previo**: el comentario en
`src/visual/mundo3d/deviceTier.js` (perfil `'medio'`) dice *"sin shadow-map
(el repaso de sombras es ~40% de la GPU)"*. Esa cifra describe el efecto de
bajar TODO el tier a `'medio'` (sombras + DPR + antialias + densidad +
instancing a la vez), no el costo aislado de solo las sombras. Medido en
aislamiento (este experimento), las sombras solas cuestan ~5% del frame, no
~40%. No se corrige ese comentario en este PR (está fuera de alcance y
describe una degradación combinada, no es falso en su contexto) — se deja
constancia acá para que nadie cite "40%" como si fuera el costo aislado de
las sombras.

## Experimento B — viewport mínimo (test de fill rate)

Mismo `dist` (mismas sombras encendidas, misma geometría) que el baseline;
se cambió solo el contexto de Playwright: viewport 390×844 @dpr2 → 96×96
@dpr1. El `dpr` interno de la app (`perfil.dpr = [1, 1.8]` en tier `'alto'`)
se aplica encima del `devicePixelRatio` del navegador (vía el clamp estándar
de `@react-three/fiber`), así que el framebuffer real no es exactamente
viewport×dpr en cada caso — pero la reducción de píxeles a rellenar es de
más de dos órdenes de magnitud (baseline ≈ 1,07M px vs mínimo ≈ 9,2K px,
~115× menos; estimado a partir de la lógica de clamp de R3F, no leído
directamente del framebuffer — no se instrumentó `drawingBufferWidth/Height`
en el script).

**Resultado:** con draw calls y triángulos prácticamente idénticos al
baseline (610 vs 591, 962.371 vs 961.713 — confirma que el experimento SÍ
aisló el eje correcto y no tocó geometría), el frame solo se achicó 12,4 ms
(15,1%) pese a rellenar ~115× menos píxeles. Si el cuello fuera fill
rate/overdraw, este recorte de píxeles debería haber disparado el fps
varias veces (2–5× o más es lo típico en escenas fill-rate-bound); acá el
fps se movió de 12,2 a 14,4 — una mejora real pero modesta, no un disparo.

## La conclusión en una frase

**El cuello del valle no son las sombras (solo ~4,1 ms/frame, 5%) ni el fill
rate (solo ~12,4 ms/frame, 15%, incluso con ~115× menos píxeles) — el ~80%
restante del presupuesto de frame (unos 66 de los 82 ms) no lo explica
ninguno de los dos experimentos y apunta a geometría/draw-calls: ~591
llamadas de dibujo individuales (mayormente sin instanciar) y ~962.000
triángulos por frame.**

## Recomendación priorizada (derivada de los dos experimentos, no de intuición)

1. **Instancing de geometría repetida (prioridad 1).** Es el único eje que
   los dos experimentos NO pudieron descartar — de hecho es lo que queda
   después de restarle a 82 ms los 4,1 ms de sombras y los 12,4 ms de fill
   rate. Bajar el conteo de draw calls (fusionar vegetación/estructuras
   repetidas en `InstancedMesh`, como ya hace `perfil.matasInstanciadas` en
   tier `'medio'`/`'bajo'` pero portado a `'alto'` sin bajar densidad visual)
   ataca directamente el ~80% no explicado.
2. **LOD/culling de landmarks lejanos (prioridad 2).** `perfil.lod` ya existe
   para tier `'medio'`/`'bajo'` (`lodDistancia: 12`); portarlo a `'alto'` con
   un umbral generoso bajaría el conteo de triángulos enviados sin cambiar
   el look en primer plano. Complementa al punto 1 (menos draw calls Y menos
   vértices por los que quedan).
3. **Sombras (prioridad 3, bajo impacto medido).** Con solo 5% de ganancia
   medida en aislamiento, no es donde está la ganancia grande — pero es
   casi gratis de aplicar selectivamente (el mecanismo `perfil.sombras` ya
   existe) si sobra presupuesto después de 1 y 2. NO se recomienda invertir
   tiempo de ingeniería en optimizar sombras antes que geometría.
4. **NO priorizar fill-rate/overdraw** (niebla, transparencias, capas): el
   Experimento B lo descarta como eje dominante — atacarlo primero
   desperdiciaría esfuerzo en ~15% del problema cuando el ~80% sigue sin
   tocar.

## Limitaciones

- Máquina compartida (`stg`) con carga real durante la medición (load
  average 6,3–6,4 en 8 núcleos) — el fps individual tiene ruido genuino
  (rango de hasta 3,5 fps entre corridas de la misma condición). Por eso se
  promedia sobre 3 corridas y se reportan también las corridas individuales,
  no solo la media. Los deltas de 5% y 15% son direccionalmente claros y
  coherentes con las señales deterministas (draw calls/triángulos), pero con
  n=3 por condición no tienen la robustez estadística de un benchmark con
  decenas de repeticiones.
- Ninguna corrida cayó a SwiftShader (verificado en las 9 corridas), así que
  ninguna medición se descartó por eso.
- No se instrumentó el tamaño real del framebuffer (`drawingBufferWidth/
  Height`); el factor "~115× menos píxeles" del Experimento B es un cálculo
  a partir de la lógica de clamp de dpr de `@react-three/fiber`, no una
  lectura directa. No cambia la conclusión (el orden de magnitud es sólido),
  pero se deja explícito para que no se cite como medición exacta.
- No se probó una combinación de ambos experimentos a la vez (sombras off +
  viewport mínimo) — no lo pidió el encargo y el patrón de los dos
  experimentos por separado (5% + 15% = 20% de un 82 ms, dejando ~66 ms sin
  explicar) ya es suficiente para la recomendación priorizada.

## Reproducibilidad

```bash
# Baseline (sombras como están, viewport normal)
npm run build
node scripts/medir-fps-mundos.mjs --routes mockups/entrada-3d --rates 1 \
  --window 15000 --settle 8000 --out /tmp/baseline.json

# Experimento A: editar temporalmente Valle3D.jsx línea ~2882
#   shadows={perfil.sombras}  →  shadows={false}
npm run build
node scripts/medir-fps-mundos.mjs --routes mockups/entrada-3d --rates 1 \
  --window 15000 --settle 8000 --out /tmp/sin-sombras.json
# revertir Valle3D.jsx antes de seguir (git checkout -- src/mockups/valle/Valle3D.jsx)

# Experimento B: mismo dist del baseline, solo cambia el viewport
node scripts/medir-fps-mundos.mjs --routes mockups/entrada-3d --rates 1 \
  --window 15000 --settle 8000 --viewport 96x96 --dpr 1 \
  --out /tmp/viewport-mini.json
```

Cada comando se corrió 3 veces por condición (9 corridas totales). El
renderer (`AMD Radeon Vega 10`) se verifica automáticamente en cada corrida
dentro del script; si aparece SwiftShader/llvmpipe, `medir-fps-mundos.mjs`
marca esa medición como inválida.
