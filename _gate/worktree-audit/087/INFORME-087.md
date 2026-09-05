# INFORME 087 R2 — `Check bundle sizes` rojo en BASE

Rama: `glm/087-bundle-budget-20260903` · Base: `origin/dev` @ 96202ac85 · Fecha: 2026-09-03

## Medición inicial

Build limpio de la base (`npm run build`, exit 0) + `node scripts/check-perf-budget.mjs`:

```
Total dist (arranque, budget): 43.0 MB / 42.0 MB
Excluido lazy (modo campo #2088): 124.1 MB (cache-on-use, no en arranque)
Main bundle: 0 B
Chunk count: 560

BUDGET EXCEEDED:
  - TOTAL dist exceeds budget: 43.0 MB
  - CHUNK "trazadoCreature-CLg4aVjY.js" exceeds 500KB: 1.4 MB
EXIT=1
```

Coincide con el diagnóstico del brief. Chunks de la familia trazado presentes en `dist/assets/`:

| chunk | ¿en CHUNK_ALLOWLIST actual? |
|---|---|
| `JaguarTrazado-CAASAxop.js` | SÍ (`/^JaguarTrazado-/`) |
| `trazadoCreature-CLg4aVjY.js` (1.4 MB) | **NO** ← el que revienta |
| `ChivitoTrazado-5tPgsHni.js` | no (bajo 500KB, no aplica) |
| `LuciernagaTrazado-BFItQcYf.js` | no (bajo 500KB) |
| `ZariguyaTrazado-CwVhurQa.js` | no (bajo 500KB) |

Nota: NO es un rename puro de `JaguarTrazado-` → `trazadoCreature-`: ambos chunks
coexisten. Hipótesis a verificar: `trazadoCreature-*` es el chunk COMÚN que rolldown
extrae de los módulos compartidos por los tres componentes `*Trazado` lazy.

## Es lazy o no (evidencia)

**Respuesta: NO es lazy. El chunk `trazadoCreature-*` está en el grafo EAGER de arranque.**
Evidencia medida sobre el dist de la base (no suposición):

1. **Entry**: `dist/index.html` carga `<script type="module" src="/assets/main-C2_erSIZ.js">`.
   Un script module resuelve TODOS sus imports estáticos antes de ejecutar: lo que
   main importe estáticamente se baja y ejecuta en el arranque.
2. **`main` importa ESTÁTICAMENTE el arte** (statements reales, no metadata):
   ```js
   import{t as rt}from"./ChivitoTrazado-5tPgsHni.js";
   import{t as tt}from"./LuciernagaTrazado-BFItQcYf.js";
   import{t as Qe}from"./ZariguyaTrazado-CwVhurQa.js";
   import{t as $e}from"./JaguarTrazado-CAASAxop.js";
   ```
   y `ChivitoTrazado-*.js` a su vez: `import{n,t as r}from"./trazadoCreature-CLg4aVjY.js"`.
   → `trazadoCreature-*` (1.4 MB) y `JaguarTrazado-*` (1.6 MB) se bajan en arranque.
3. **Qué es el chunk**: `trazadoPayloads.js` (marcado `/* GENERADO. Fuente:
   scripts/trazar-lamina.sh + svgo */`), un `Object.freeze` top-level con los SVG
   del trazado en tinta. Es el ARTE (datos vectoriales), no código acumulable.
4. **Cadena en fuente** (BFS del cierre de imports estáticos desde `src/main.jsx`):
   ```
   main.jsx → App.jsx → components/agent/ColibriTransition.jsx
            → components/ChagraAgentAvatar.jsx
            → components/ChagraAgentAvatar{Jaguar,Zariguya,Luciernaga,ChivitoPunk}.jsx
            → visual/creatures/{Jaguar,Chivito,Luciernaga,Zariguya}Trazado.jsx
   ```
5. **Por qué existe la cadena si "ya había lazy"**: `ChagraAgentAvatar.jsx` SÍ tiene
   `ADAPTADORES_PROD` con `React.lazy(() => import(...))` (líneas 76-84), pero
   mantiene imports ESTÁTICOS de los mismos 7 adaptadores para `ADAPTADORES_DEV`
   (contrato síncrono para tests). El ternario `import.meta.env.PROD ? PROD : DEV`
   sí se resuelve en build (no queda rastro del mapa DEV en el bundle), PERO como
   el package.json NO declara `sideEffects`, rolldown retiene los módulos de la
   rama muerta por sus efectos laterales (`import './trazadoCreature.css'`,
   `Object.freeze(...)` top-level de 1.4 MB). El comentario del dispatcher
   ("En producción se cargan después del shell y cada rig queda fuera del chunk
   de arranque") documenta la INTENCIÓN; la medición demuestra que FALLÓ.
6. **No está en el precache del SW**: `trazadoCreature-*` no aparece en `dist/sw.js`
   (las apariciones en `__vite__mapDeps` de main son el metadata de dependencias
   de los `import()` dinámicos, no carga).

**Conclusión**: la excepción `creatures-`/`JaguarTrazado-` de la base está
justificada como "lazy" pero `trazadoCreature-*` (y de paso `JaguarTrazado-*`)
son EAGER. La allowlist literal additionally está desalineada por el nombre
(`trazadoCreature-` nunca estuvo cubierta). Camino correcto según el brief:
**lazy real** (code-split), no extender la mentira.

## Cambio

Dos archivos (no se toca `src/visual/creatures/` — verificado con `git diff --stat`):

1. **`src/App.jsx`** — `ColibriTransition` pasa de import estático a
   `lazy(() => import(...))` + `<Suspense fallback={null}>` local. Era la ÚNICA
   puerta estática desde el entry hacia el dispatcher `ChagraAgentAvatar` y de
   ahí a los 7 rigs. Con esto el grafo eager queda cortado en el mismo lugar
   donde el propio dispatcher ya intentaba cortarlo (`ADAPTADORES_PROD`).
   - Por qué no se tocó el dispatcher: su doble mapa (DEV síncrono para tests
     / PROD lazy) NO se puede podar en build sin `sideEffects` en package.json
     (los CSS y el `Object.freeze` top-level retienen la cadena). Mover esa
     carga a App restaura la intención documentada sin romper el contrato
     síncrono que los tests usan (`render(...)` → `querySelector('svg…')` en
     el mismo tick).
   - Trade-off UX asumido: el overlay ya no es "eager" — pero se monta desde
     el arranque (`active=false` → null), así que React pide el chunk al
     montar el shell y está caliente mucho antes de que el usuario envíe
     desde el hero. El ARTE por especie se sigue pagando solo con el avatar
     elegido (esto no cambia: ya era `React.lazy` por especie en prod).
2. **`scripts/check-perf-budget.mjs`** —
   - `CHUNK_ALLOWLIST`: `/^JaguarTrazado-/` (literal) → `FAMILIA_TRAZADO_RE`
     (`/^[a-z]*trazado/i`). Cubre `trazadoCreature-`, `JaguarTrazado-`, y los
     futuros `LoQueSeaTrazado-` sin editar la lista por cada rename/criatura
     (causa raíz del desalineado). Comentario con el POR QUÉ (lazy verificado,
     arte no degradable), no solo el qué.
   - `LAZY_EXCLUDED_ASSET_PREFIXES` ahora acepta strings Y regex; se agrega la
     familia trazado para el techo TOTAL (política existente: los assets lazy
     no pesan en el budget de ARRANQUE — mismo criterio que vendor-three,
     creatures-, valle, tfjs).
   - El patrón exige prefijo camelCase sin guiones (`^[a-z]*trazado`), así un
     hipotético `algo-trazado-utils-` NO queda exento por accidente (falla
     ruidoso y obliga a verificar).

### Actualización tras re-medición (iteración 2)

La primera versión del cambio (solo App.jsx + script) dejó el arte FUERA del
grafo del entry, PERO la medición del cierre del chunk `ColibriTransition`
(arranca montado, `active=false` → null) mostró que su closure estático
seguía arrastrando el arte vía `useAgentAvatarType-*.js`: rolldown había
fusionado el **dispatcher + adaptadores** en ese chunk, y los imports
estáticos del mapa DEV seguían vivos ahí — el arte no bloqueaba el arranque
pero se pedía al montar el shell en cada sesión. Se agregó entonces:

3. **`src/components/ChagraAgentAvatarAdaptadoresSync.js`** (NUEVO) — el mapa
   DEV síncrono (los 7 imports estáticos + el mapa congelado), en su propio
   módulo, documentando el porqué.
4. **`src/components/ChagraAgentAvatar.jsx`** — pierde los 7 imports
   estáticos; el mapa DEV se carga con `await import(...)` dentro de
   `if (!import.meta.env.PROD)`. En build de prod esa rama es código muerto
   (`import.meta.env.PROD` → `true`) y rolldown la elimina junto con su
   dynamic import: cero referencias estáticas a los adaptadores en prod. En
   dev/test el TLA resuelve antes de montar la app → los tests siguen viendo
   el contrato síncrono SIN cambios (verificado: 5 archivos de tests del
   dispatcher/contrato corriendo sin ediciones).
5. **`scripts/check-perf-budget.mjs`** (adicional) — verificación
   **lazy-vs-grafo**: el script calcula el cierre estático de arranque del
   dist real (`index.html` → entry + modulepreloads → imports estáticos
   transitivos) y falla con `LAZY MENTIRA: …` si algún chunk de una familia
   exceptuada como lazy (vendor-three / creatures / trazado) aparece ahí.
   Esto convierte la política por-nombre en honesta por construcción: si un
   refactor futuro vuelve a enganchar el arte al arranque (el modo de fallo
   exacto de la base), el gate lo caza aunque el nombre coincida con la
   familia. Fail-closed: si el grafo no parsea (<10 chunks), error en vez de
   aprobar.

Post-fix medido de nuevo (build nuevo):
- Cierre EAGER (entry+modulepreloads): 35 chunks, **NINGUNO** de trazado.
- Cierre `ColibriTransition`: 11 chunks (antes 19), **NINGUNO** de trazado.
- Los chunks de arte volvieron a separarse solos: `JaguarTrazado-*` (1.59 MB)
  + `trazadoCreature-*` (1.39 MB) — ambos cubiertos por `FAMILIA_TRAZADO_RE`.
- El arte ahora solo se paga al renderizar el avatar elegido
  (`React.lazy` por especie) o montar una escena 3D.

## Verde + control negativo

**ANTES (base 96202ac85, build limpio):**
```
Total dist (arranque, budget): 43.0 MB / 42.0 MB
Excluido lazy (modo campo #2088): 124.1 MB (cache-on-use, no en arranque)
Main bundle: 0 B
Chunk count: 560

BUDGET EXCEEDED:
  - TOTAL dist exceeds budget: 43.0 MB
  - CHUNK "trazadoCreature-CLg4aVjY.js" exceeds 500KB: 1.4 MB
EXIT=1
```

**DESPUÉS (con el fix, `npm run build && node scripts/check-perf-budget.mjs`):**
```
Total dist (arranque, budget): 40.0 MB / 42.0 MB
Excluido lazy (modo campo #2088): 127.1 MB (cache-on-use, no en arranque)
Main bundle: 0 B
Chunk count: 570
Grafo de arranque verificado: 35 chunks estáticos (ninguna familia lazy presente)
All budgets within thresholds.
EXIT=0
```

**Control negativo A — chunk pesado ajeno a las familias** (2.4 MB falsos en
`dist/assets/heavyStartupProbe-TEST.js`, luego eliminado):
```
Total dist (arranque, budget): 42.4 MB / 42.0 MB
BUDGET EXCEEDED:
  - TOTAL dist exceeds budget: 42.4 MB
  - CHUNK "heavyStartupProbe-TEST.js" exceeds 500KB: 2.4 MB
EXIT=1
```
El gate sigue cazando bloat nuevo por chunk Y por total. ✓

**Control negativo B — "LAZY MENTIRA"**: chunk falso `EagerTrazado-TEST.js`
(nombre de familia) enganchado al arranque con un `import"./…"` appendeado a
`main-*.js` (luego revertido):
```
Grafo de arranque verificado: 36 chunks estáticos — 1 familia(s) lazy EN el arranque (arriba)
BUDGET EXCEEDED:
  - LAZY MENTIRA: "EagerTrazado-TEST.js" (familia trazado, exceptuada como lazy) aparece como import estático del arranque — sacarlo del grafo eager o corregir la exclusión
EXIT=1
```
La verificación lazy-vs-grafo detecta el modo de fallo de la base aunque el
nombre de la exclusión coincida. ✓

**Transparencia — límite del patrón por nombre**: el MISMO archivo de 2.4 MB
renombrado `PerezosoTrazado-TEST.js` escapa al chequeo por-chunk Y al TOTAL
(la familia está excluida de ambos). Ese es el trade-off documentado de una
política por-nombre; el contrapeso es la verificación lazy-vs-grafo (ese
chunk EAGER sería cazado por LAZY MENTIRA, como demostró el control B). Si
Opus quiere cerrar el hueco del TOTAL por completo, el paso siguiente es
derivar el TOTAL del cierre estático real (cambio de semántica del umbral —
decisión de arquitectura, no la tomé).

**Tests**: 11 archivos relacionados corriendo —
`ChagraAgentAvatar{,.ElencoUnificado}.test.jsx`, `CompaiP1.contract.test.jsx`,
`ChatBubble.test.jsx`, `OnboardingCondensado.capacidades.test.jsx`,
`App.compaiOverlay-mount.test.jsx`, `Trazado.render.test.jsx`,
`{Jaguar,Zariguya}Trazado.integral.test.jsx`,
`{Luciernaga,ChivitoPunk}Compai.test.jsx` (+GuacamayaCompai): 175/177 pasan.
Los 2 fallos (`luciernaga`/`chivito-punk` en CompaiP1.contract.test.jsx) son
**preexistentes en la base limpia** (verificado con `git stash` → mismos 2
fallos) — no regresión de este cambio. Los tests NO se editaron.

## TOTAL 43MB (frente aparte)

**¿El arreglo del chunk lo resuelve? SÍ — medido: 43.0 → 40.0 MB (verde).**
No se tocó el umbral (42 MB): el TOTAL baja ~3.0 MB porque el arte de tinta
pasó a ser lazy de verdad y las exclusiones de familia lo sacan del techo de
ARRANQUE — la política que ya existía para vendor-three/creatures-/valle/tfjs
("el techo mide peso de arranque, no disco total"). Sin el fix de laziness
esta exclusión habría sido mentira (por eso la verificación lazy-vs-grafo).

Composición del dist (du, para el registro): valle 73M (excluido),
plaga-images 33M (excluido), assets 19M, mercado 13M, rag-embeddings 7M
(excluido), models 7.1M (excluido), cycle-content 3.4M (excluido),
compai 2.8M (solo laminas/ excluido), catalog.sqlite 2.8M, vendor 2.1M.
Los 40 MB restantes incluyen mercado (13M) y catalog.sqlite (2.8M) — si el
TOTAL vuelve a crecer, esos son los próximos sospechosos de audituar si son
realmente peso de arranque. No lo hice en este PR (frente aparte).

## Qué NO verifiqué

- **CI real de GitHub**: no corrí el pipeline; todo es medición local
  (`npm run build` + gate + vitest por slices + eslint por archivo).
- **Suite vitest completa**: corrí los 11 archivos relacionados, no
  `npm test` entero. `npm run lint` completo no corre en este entorno (OOM
  del heap de node — preexistente).
- **Runtime en browser real**: la evidencia de laziness es el grafo estático
  del dist emitido (cierre BFS de imports estáticos desde index.html). No
  abrí la PWA ni medí red/timing de descargas.
- **Caching del SW para el arte**: verifiqué que NO está precacheado en
  `dist/sw.js`, pero no auditué si el runtime caching lo retiene on-use.
- **`tsc:check vs baseline`**: rojo por deuda aparte (instrucción del brief:
  otro frente). No lo toqué.
- **Deuda preexistente detectada y NO arreglada** (anotada para Opus):
  1. `Main bundle: 0 B` — el chequeo busca `index-*` pero el entry se llama
     `main-*`; hoy main = 275.8 KB (< 340 KB) así que arreglar el prefijo no
     rompería nada, pero el mensaje dice "300KB" con umbral de 340KB
     (inconsistencia adicional). No lo toqué: cambiar un chequeo del gate
     merece decisión de Opus.
  2. eslint: `scripts/*.mjs` no recibe globals de node en la config (10
     errores `no-undef` console/process; 9 venían de la base, +1 mío de la
     misma clase por la línea de log del grafo). Arreglarlo toca la config
     de lint y podría desenferrar errores en otros scripts.
  3. Los 2 fallos preexistentes de `CompaiP1.contract.test.jsx`
     (luciernaga/chivito-punk sin `data-agt-especie`) — también en base.
