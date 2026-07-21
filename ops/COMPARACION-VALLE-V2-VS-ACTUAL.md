# Comparación visual — valle 3D: v2 (`6f7f839b`, "valle-2.0") vs ACTUAL (`origin/integra/todo-3d-a-prod` @ `a9d3087d`)

> Fecha: 2026-07-16. Auditoría por encargo del operador: la versión actual del
> valle "perdió cosas que sí tenía" la v2.0 que él caminó y aprobó (la de la
> "sensación de lentitud" de cámara). Método: dos worktrees aislados,
> `npm run build:prod` de cada uno, `vite preview` sobre `dist-prod`, captura
> con Chromium del sistema + swiftshader (`--use-gl=angle
> --use-angle=swiftshader`), ruta `#/valle3d` (en realidad la app aterriza ahí
> sola sin sesión — ver "Metodología"), hora de día forzada con `?ciclo=11`
> (override real del hook `useCicloDia`, existe en ambas versiones — no hizo
> falta tocar TZ/reloj del sistema).

## Resumen ejecutivo

1. **La regresión real y verificable es visual/de dirección de arte, NO de
   densidad de código**: los "6 portales" (`VentanasVivas` en
   `composicionValle3D.jsx`) son geometría **nueva en `actual`, ausente en
   v2** — 3 anillos translúcidos tipo espejo empañado dominan el centro del
   cuadro. Esto coincide exactamente con lo que el operador describe como
   "espejos que odia".
2. **La hipótesis de "se perdió la refinada de los árboles" NO se sostiene en
   el código ni en el render**: comparé `arbolMayor.geom.js` (0 líneas de
   diff), `ArbolMayor.jsx` (0 líneas), `FloraParamo.jsx` (0 líneas),
   `floraParamo.geom.js` (rebalanceo: **suben** roble/aliso/gaque/yarumo/
   encenillo, **bajan** frailejones — ver detalle abajo) y el clúster de
   árboles que instancia `Valle3D.jsx` en el landmark `'bosque'`
   (`SITIOS_ARBOLEDA`): **v2 tiene 3 árboles ahí, actual tiene 5**. El propio
   comentario del código en `actual` lo dice: *"El monte del portal 'toda mi
   finca' se espesó: 5 árboles, 3 especies"*. Ningún archivo de geometría de
   árboles bajó de densidad. Lo que sí cambió es que los 2-3 anillos-espejo
   ahora ocupan el mismo espacio visual donde antes había arbustos/matas
   pequeñas — leen como "el valle se llenó de vidrio, no de monte".
3. **Cámara: hallazgo real y medible.** `dampingFactor` de `OrbitControls`
   subió de **0.08 (v2) a 0.12 (actual)** — la cámara ya NO tiene la
   "sensación de lentitud/peso" que el operador aprobó; ahora es más seca/
   responde más rápido. Además el lerp de salida de foco bajó de 0.045 a
   0.035 (la transición de SALIR de un lugar es más lenta que antes).
4. **Render negro intermitente: NO se reprodujo en 10/10 intentos
   automatizados** (Chromium+swiftshader, contexto nuevo cada vez, 9s de
   espera, captura OS-level con `page.screenshot()`). Mi primer heurístico
   (leer píxeles del canvas vía `drawImage`+`getImageData` in-page) SÍ marcó
   "negro" en 10/10 — pero es un **falso positivo de método**, no un bug de
   la app (ver diagnóstico abajo). El bug real de negro-intermitente que
   reporta el operador no quedó reproducido aquí; dejo el diagnóstico de
   causas más probables + fix con evidencia de código.
5. Ningún mundo/ruta desapareció (`rutasProdChagraApp.js` diff: solo se
   **agregó** `path: 'juegos'`, nada se quitó).

---

## Metodología (para que el número se pueda repetir)

```
git worktree add --detach <scratch>/cmp/v2     6f7f839b
git worktree add --detach <scratch>/cmp/actual origin/integra/todo-3d-a-prod   # a9d3087d
ln -s <repo>/node_modules <scratch>/cmp/v2/node_modules      # package-lock.json IDÉNTICO en las 3 refs
ln -s <repo>/node_modules <scratch>/cmp/actual/node_modules
cd <scratch>/cmp/v2     && npm run build:prod   # OK, 34.7s
cd <scratch>/cmp/actual && npm run build:prod   # OK, 39.8s
npx vite preview --outDir dist-prod --port 5301   # v2
npx vite preview --outDir dist-prod --port 5302   # actual
# Playwright + chromium del sistema, swiftshader:
#   --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader --ignore-gpu-blocklist
# goto `${BASE}/?ciclo=11`  (sin sesión → App.jsx aterriza solo en 'valle3d';
#   ?ciclo=11 fuerza hora fija vía useCicloDia — existe en ambas versiones)
# 5 intentos independientes por versión (contexto nuevo cada vez) + 1 captura panorámica c/u
```

Nota: no hizo falta simular login. `src/App.jsx` (línea ~1153-1160, igual en
ambas versiones): *"La raíz sin sesión aterriza en el valle 3D"* —
`navigate(hash === 'login' ? 'login' : 'valle3d')`. Por eso ni siquiera hace
falta pasar por `#/valle3d` explícito; la ruta base ya cae ahí.

---

## Tabla de regresiones

| Qué | v2 (`6f7f839b`) | Actual (`a9d3087d`) | Archivo / línea | Fix propuesto |
|---|---|---|---|---|
| **Portales "espejo"** | No existen. `composicionValle3D.jsx` (v2, 235 líneas) solo tiene `CasaCampesina` + `SenderosValle` + `PatiosLugares` + `SecundariosDeTierra`. Los mundos se tocan directo sobre su landmark (icono flotante + geometría del lugar). | `VentanasVivas` — 6 anillos de "vegetación viva" con un **disco plano semitransparente** adentro (`meshBasicMaterial`, `circleGeometry`, `opacity 0.3-0.4`) que el operador lee como espejo empañado. | `src/mockups/valle/composicionValle3D.jsx:264-356` (fn `VentanaViva`/`VentanasVivas`, actual) | Ya hay un plan escrito HOY mismo para esto: `ops/REPARTO-PORTALES-VALLE-2026-07-16.md` recomienda que la "ventana viva" muestre un **preview 3D real en miniatura** de la escena destino (mismo patrón que `VentanaValle3D.jsx`, viewport vivo con `IntersectionObserver` + fallback SVG en tier bajo) — **eso NO se implementó**; lo que se implementó es un disco de color plano. Ahí está el hueco entre el plan y el código: cerrarlo (o, más barato, volver al pórtico de madera simple que también describía el plan como aceptable para navegación, sin el disco-espejo). |
| **Densidad de árboles** (hipótesis del operador) | `SITIOS_ARBOLEDA` (landmark `'bosque'`, `Valle3D.jsx`): 3 árboles (roble, aliso, gaque). `FLORA_TIER.alto`: yarumo 3, roble 3, encenillo 4, aliso 3, gaque 2, frailejones 12+14+7+5=38. | `SITIOS_ARBOLEDA`: **5 árboles** (+roble, +aliso). `FLORA_TIER.alto`: yarumo 5, roble 5, encenillo 6, aliso 5, gaque 4 (**todos suben ~60-70%**); frailejones 4+4+2+2=12 (bajan, quedan como "acento del páramo" según el comentario nuevo del código). `CUPO_QUENUAL.alto`: cerca 7→8, lejos 9→12 (sube). | `Valle3D.jsx:276-278` (v2) vs `:289-293` (actual); `bosque/floraParamo.geom.js:69-98`; `bosque/bosqueTakeA.geom.js:314-320` | **No hay nada que arreglar aquí** — el código de árboles no regresó, subió. Si el operador SIGUE viendo "menos monte" al caminar el valle real (no esta captura estática), lo más probable es que sea percepción por contraste: los 2-3 discos-espejo grandes ahora ocupan el centro visual donde antes el ojo caía sobre arbustos/matas — ver fila anterior. Confirmar con el operador señalando la captura exacta si ve otra cosa. |
| **Cámara — "sensación de lentitud"** | `OrbitControls dampingFactor={0.08}`. Lerp de posición al salir de foco: `× 0.045`. | `dampingFactor={0.12}` (+50%: la cámara frena/asienta más rápido, se siente más seca). Lerp de salida: `× 0.035` (-22%: salir de un lugar es más lento/pegajoso que antes). | `Valle3D.jsx:1263` (v2) → `:1580` (actual) — damping. `Valle3D.jsx:1079` (v2) → `:1377` (actual) — lerp entrando/saliendo. | Si el operador quiere recuperar el peso que aprobó: `dampingFactor` de vuelta a `0.08` (o probar `0.09-0.10` como punto medio) y el lerp de salida de vuelta a `0.045`. Es un cambio de una línea cada uno, sin tocar el resto de la dirección de cámara (posición/fov del `CAMARA_VALLE` NO cambiaron — siguen en `[10.5, 9, 13.5]`, fov 40, idénticos en ambas versiones). |
| **Rutas/mundos** | 19 rutas en `NUCLEO_3D` (`rutasProdChagraApp.js`). | Mismas 19 + `path: 'juegos'` (nueva, hub de juegos). Nada se quitó. | `src/config/rutasProdChagraApp.js` | Ninguno — esto es una adición, no una regresión. |
| **Iconografía nueva / reordenada** | Ícono de "cesta" (`🧺`, Vender) visible cerca del centro; oso café silueta simple. | Ícono de "libro" (`📖`, Aprender) apareció donde antes había otro; el oso ahora es el `GuardianEspiritu` biopunk (negro, contorno teal) en vez del oso café rubber-hose. | `composicionValle.js: PORTALES_VALLE` (nuevo, 6 entradas con emoji); `composicionValle3D.jsx` import `GuardianAvatar` | No es regresión — es la jerarquía de portales + el rediseño del oso que el propio operador pidió (ver commits `c27cfbf8`/`ef2a4448`, "el valle compuesto... jerarquía Angelita"). Lo señalo solo para que quede documentado como diferencia intencional, no accidental. |

---

## Evidencia — capturas

Todas en `ops/valle-comparacion-evidencia/` (commiteadas con este doc):

| Archivo | Qué muestra |
|---|---|
| `comparacion-lado-a-lado-panoramica.png` | **La prueba más clara.** v2 (izq.) vs actual (der.), mismo encuadre panorámico (900×1000, `?ciclo=11`). Los 3 anillos-espejo saltan a la vista del lado derecho; el clúster de árboles del borde izquierdo es CASI idéntico en ambas — confirma la tabla de arriba. |
| `comparacion-lado-a-lado-retrato.png` | Mismo par, encuadre celular real (430×932). |
| `v2-panoramica.png` / `actual-panoramica.png` | Las dos capturas panorámicas sueltas, sin recortar. |
| `v2-retrato-01.png` / `actual-retrato-01.png` | Encuadre celular, intento 1 de 5. |
| `v2-retrato-02.png` / `actual-retrato-02.png` | Encuadre celular, intento 3 (v2) / 4 (actual) de 5 — para comparar consistencia entre intentos de la misma versión. |

Las 10 capturas retrato completas (5 v2 + 5 actual, sin curar) quedaron en el
worktree de escaneo, no se commitearon todas para no inflar el repo — avisar
si se quieren las 10.

---

## Diagnóstico del "negro intermitente"

### Lo que NO encontré (con evidencia)

Corrí 10 cargas **completamente independientes** (contexto de browser nuevo
cada vez → contexto WebGL nuevo cada vez, simula un reload real) — 5 sobre
v2, 5 sobre actual, `#/valle3d?ciclo=11`, Chromium del sistema +
`--use-angle=swiftshader`, 9s de espera antes de capturar. **Las 10 capturas
`page.screenshot()` (captura a nivel de compositor/SO) salieron con la
escena completa renderizada — cero negros reales.** `pageerror` vacío en las
10. El único `console.error` repetido fue:

```
[Config] Variable de entorno requerida no definida: VITE_FARMOS_CLIENT_ID. Revise .env o .env.local.
```

— inofensivo: `src/config/env.js:13-19` solo hace `console.error` y degrada
a `''` (mis worktrees de comparación no tenían `.env`; en prod real si está
seteado). No aborta el boot.

### El falso positivo que casi reporto como "negro 100%"

Mi primer heurístico para detectar negro leía el canvas *desde JS* (`ctx.
drawImage(canvasThreeJs, ...)` + `getImageData` sobre un canvas 2D temporal)
y dio **luminancia promedio 0 en 10/10** — parecía negro total. Al abrir los
PNG reales (captura de SO), la escena estaba completa y a color. Causa:
el `<Canvas>` de r3f (`Valle3D.jsx:2093`, ambas versiones) usa
`gl={{ antialias, powerPreference: 'high-performance' }}` **sin**
`preserveDrawingBuffer: true` — es el default correcto por performance, pero
significa que el framebuffer WebGL se limpia después de cada present; leerlo
desde JS *después* del frame (que es lo único que un script puede hacer)
devuelve negro aunque el usuario SÍ vio el frame en pantalla. **Anoto esto
explícito para que no se reutilice ese heurístico en benches futuros** — la
única forma válida de detectar negro real es captura a nivel SO
(`page.screenshot()`) o un hook `onAfterRender` de three.js que lea el
framebuffer ANTES de que se limpie.

### Causas más probables del negro real que SÍ reporta el operador (no reproducidas aquí, pero con evidencia de código)

El `<Canvas>` (idéntico en ambas versiones, no es una regresión de este PR)
**no tiene manejo de pérdida de contexto WebGL**:

```
grep -n "webglcontextlost\|contextlost" src/mockups/valle/Valle3D.jsx src/mockups/EntradaValle3D.jsx
# (sin resultados en ninguna de las dos versiones)
```

Sí existe manejo de error de MONTAJE (`Valle3DGuard`, `EntradaValle3D.jsx:93-107`,
con `fallback` visible) y `Suspense fallback={<CargandoValle/>}` para el
`import()` perezoso de `Valle3D.jsx:73` — así que un fallo de import o una
excepción de React SÍ deberían mostrar una pantalla de carga/error, NO negro
puro. Si el operador ve **negro puro con la UI (título, chips, "Pregúntele a
su finca…") encima renderizada normal**, eso apunta a que el canvas WebGL SÍ
se montó pero el navegador **perdió el contexto WebGL después** (evento
`webglcontextlost` sin listener → sin `event.preventDefault()` el contexto
casi nunca se restaura solo, y sin oyente para `webglcontextrestored` la app
nunca vuelve a pintar — se queda en el `clearColor` para siempre hasta
recargar). Esto es plausible en dispositivos gama baja/Android con memoria
GPU ajustada, o en pestañas que estuvieron en background (el navegador libera
contextos WebGL de pestañas no visibles agresivamente en móvil).

**Fix propuesto** (no es un cambio grande, y aplica a ambas versiones por
igual — no es específico de v2 ni de actual):

```jsx
<Canvas
  ...
  onCreated={({ gl }) => {
    setListo(true);
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();           // habilita la restauración automática
      console.warn('[Valle3D] contexto WebGL perdido');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      // forzar remount del <Canvas> (key nueva) o gl.forceContextRestore()
      // según lo que r3f exponga en la versión instalada.
    });
  }}
>
```

Otras dos causas menos probables que descarté por evidencia:
- **`mergeGeometries` indexado+no-indexado → `null` silencioso** (el bug ya
  conocido, memoria `feedback_merge_geometries_null_silencioso`): revisé los
  usos en `terreno/sueloRico.geom.js`, `bosque/bosqueTakeA.geom.js`,
  `sierra/*` — son candidatos reales para "una especie no se dibuja", pero
  ese bug deja agujeros LOCALES (una malla ausente), no la pantalla ENTERA en
  negro. No descarta que contribuya a fallos puntuales, pero no es la causa
  primaria de un negro total.
- **Race del `lazy(() => import('./valle/Valle3D'))`**: cubierta por
  `Suspense`+`Valle3DGuard`, con fallback visible — un negro puro sin ese
  fallback de por medio no encaja con este flujo.

---

## Lo que confirmé que NO cambió (para que quede fuera de sospecha)

- `arbolMayor.geom.js`, `ArbolMayor.jsx`, `FloraParamo.jsx`: **0 líneas de
  diff** entre v2 y actual.
- `CAMARA_VALLE` (posición `[10.5, 9, 13.5]`, fov 40): idéntico.
- `package.json` / `package-lock.json`: idénticos entre v2, actual y HEAD
  actual del repo (permitió reusar `node_modules` vía symlink, sin reinstalar).
- Rutas (`rutasProdChagraApp.js`): ninguna eliminada.
- `<Canvas>` gl props: idénticos (`antialias`, `powerPreference:
  'high-performance'`, `frameloop`).

---

## Referencia cruzada

`ops/REPARTO-PORTALES-VALLE-2026-07-16.md` (mismo día, escrito ANTES de esta
auditoría) ya identificó que los 6 portales son una decisión fijada del
operador (no un invento de IA) y ya recomendó el fix correcto para el look
"espejo" (preview 3D real en miniatura, patrón `VentanaValle3D.jsx`). Esta
auditoría confirma con render real que ese fix **todavía no se aplicó** —
lo que hoy corre en `integra/todo-3d-a-prod` es la versión intermedia (disco
de color plano) que ese mismo documento ya señalaba como el problema a
corregir, no la versión final recomendada.
