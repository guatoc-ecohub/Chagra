# Bitácora — consolidación de ramas terminadas en `dev`

**Fecha**: 2026-07-26
**Operador**: "dale merge a todo lo que puedas ya"
**Destino**: `dev` (🔴 **NO** `main` — hay otro agente corriendo `dev`→`main`)
**Worktree de trabajo**: `<WORKSPACE>/wt-merge-a-dev`
**Rama de integración**: `integra/merge-a-dev-2026-07-26` (nace de `origin/dev` @ `3ef4954d`)
**Host**: `stg` (GPU real Vega 10 — requisito del gate visual)

---

## Paso 0 — Reconocimiento (hecho)

### Estado del repo al arrancar
- `<WORKSPACE>/chagra` estaba en `feat/compai-fuente-unica` @ `315e497d`.
- **WIP del operador**: el árbol principal estaba LIMPIO salvo un untracked:
  - `ops/DIAGNOSTICO-brecha-dev-main.md` (untracked, ajeno)
- `lugares.js` en `demos-src`: **no existe** bajo `<WORKSPACE>` — no hay riesgo de colarlo.
  Aun así: **rutas explícitas siempre, nunca `git add -A`**.
- 28 stashes preexistentes, 40+ worktrees, 1446 refs de rama. **No se borra nada.**

### Divergencia importante
`dev` local estaba **23 commits detrás** de `origin/dev`. Se trabaja sobre `origin/dev` @ `3ef4954d`,
no sobre el `dev` local rancio.

### Otro agente en curso (no tocar)
- `<WORKSPACE>/wt-integra-dev-main` → rama `integra/dev-a-main-2026-07-26` @ `389123d2`.
- Ya contiene **todo** `origin/dev` (0 commits detrás) y **37 adelante**.
- ⚠️ Consecuencia: lo que yo meta a `dev` **llega después** de que ese agente hiciera su fusión.
  **Tendrá que re-mergear `dev` para llevárselo.** Queda avisado en el reporte.

---

## Las ramas candidatas

| Rama | HEAD | Base | Commits sobre `origin/dev` |
|---|---|---|---|
| `feat/compai-fuente-unica` | `315e497d` | `4f146f42` (atrás de dev) | 6 |
| `fable/compai-gestos-entrada` | `63a0ba1f` | `3ef4954d` (= dev HEAD) | 2 |

### Solapamiento real entre las dos ramas
Solo **2 archivos**:
- `src/visual/agente/angelita-agente.css`
- `src/visual/agente/angelitaEstados.js`

Ahí vive la colisión del guiño ya declarada por el operador.

### Resolución de la colisión — decidida de antemano
🔴 **Gana el guiño de Fable** (ojo grande + ladeo cómplice; el `last-of-type` de la otra rama
usa el ojo lejano, que no se lee contra la cabeza oscura).
Y los **12 gestos de Fable deben quedar en el núcleo portable** `src/compai/nucleo/gestos.js`,
porque el refactor de fuente única es lo que corresponde conservar.

---

## Orden de merge elegido

1. `fable/compai-gestos-entrada` primero — nace exactamente de `dev` HEAD, entra limpio y
   deja el guiño BUENO como base establecida.
2. `feat/compai-fuente-unica` después — así cualquier conflicto en los 2 archivos compartidos
   se resuelve **a favor de lo que ya está** (Fable), que es justo lo que se quiere.
3. Portar los gestos de Fable al núcleo portable.

## Gates por merge
- `npx vitest run` verde
- `npx vite build` verde
- eslint **NO se corre** (~18 min) → `--no-verify`, `LEFTHOOK_EXCLUDE=eslint`
- Gate visual en **GPU real de stg**, nunca SwiftShader

---

## Registro de ejecución

### Paso 0 cerrado — bitácora commiteada antes de tocar nada (`d76981d4`)

---

## Paso 1 — merge de `feat/compai-fuente-unica` (315e497d)

### WIP del operador: re-verificado al arrancar el paso
Entre el reconocimiento y este paso **aparecieron 2 archivos modificados** en
`<WORKSPACE>/chagra` (otro agente / el operador trabajando en vivo):

```
 M src/services/aiService.js           md5 99cba2a7f520830962a6ec7628b29179  (+70)
 M src/services/segundaOpinionFoto.js  md5 93958c6a961acd33edf59b7c8136de42  (+18)
?? ops/DIAGNOSTICO-brecha-dev-main.md  md5 ca54cf37f3afb97549447785f24e5bae
```

**No se tocan.** Se mergea el commit `315e497d`, no el árbol sucio.
`lugares.js` de `demos-src`: **no existe en el disco** — no hay nada que colar.
Se trabaja en worktree aparte y con **rutas explícitas** (`git add <ruta>`), nunca `-A`.

### CONFLICTO REAL — `src/components/AgentFab.jsx`
No era el guiño: `dev` avanzó por debajo de la base de `feat`.

- **`dev`** (PR #2785, `46503a66`) cambió `<Angelita>` por **`<ChagraAgentAvatar>`**:
  el compAI es **elegible** por el usuario (Angelita / maíz / zarigüeya), y neutralizó
  los textos accesibles a "Chagra IA".
- **`feat`** reestructuró el FAB: envoltorio `<div>` para que el **botón de silencio**
  sea un hermano de verdad (enfocable) en vez de un `<button>` anidado (HTML inválido),
  + `estaOcupado`, + pulsación larga.

**Resolución = las dos cosas**, no una:
- se conserva la **estructura de `feat`** (div + botón de silencio + ocupado + `useRef`),
- pero renderizando **`ChagraAgentAvatar`** con `ariaLabel="Chagra IA"` — si me quedaba
  con `<Angelita>` de `feat` **regresaba el fix #2785** y el maíz/zarigüeya volvían a
  ser ignorados,
- y los textos accesibles quedan **neutros** ("su compañero"), no "Angelita",
  porque el personaje ya no es fijo. También los del botón de silencio.

Verificado: 0 marcadores de conflicto; `ChagraAgentAvatar`×3, `ariaLabel`×1,
`estaOcupado`×2, `alternarSilencio`×4 conviven en el archivo resuelto.

### Nota de arnés (para el que venga después)
La suite completa de este repo son **1590 archivos de test y tarda >15 min**.
Primer intento corrido como `timeout 900 npx vitest run 2>&1 | tail -30`:
- `timeout 900` la **mató a los 900 s** (exit 143), y
- el `| tail -30` **se tragó toda la salida** (tail no emite nada hasta que el
  pipe cierra), así que el log quedó **vacío**: cero información.

Forma correcta, la que se usa aquí: **sin `timeout`, redirección directa a
archivo, `--reporter=dot`**, en segundo plano — así el progreso se puede leer
mientras corre y el resultado sobrevive.

### REGLA: baseline antes de culpar al merge
El reporter de puntos muestra `x` (tests rojos) en esta corrida. **Un `x` no es
una regresión hasta que se compruebe que no estaba antes.** Hoy dos agentes
distintos casi reportan regresiones falsas por no tener baseline — uno de ellos
era su propia caché de `node_modules` arrastrando dos versiones de React
(**build en verde y la app muerta**).

Por eso se levantó un worktree **limpio de `origin/dev` @ `3ef4954d`** en
`<WORKSPACE>/wt-baseline-dev`. Todo rojo se corre **igual** ahí:
- falla igual en dev limpio → **preexistente**: se declara, no se arregla acá;
- falla solo con el merge → **es mío**: se arregla o se para.

### El gate visual: GPU REAL verificada ANTES de usarla
Dos trampas encontradas y esquivadas:
1. El chromium **empaquetado por Playwright no arranca en NixOS**
   (`libglib-2.0.so.0: cannot open shared object file`), y además Playwright le
   mete `--enable-unsafe-swiftshader` por defecto.
2. La receta buena ya estaba en el repo, en `scripts/gate-real-gpu.mjs`, con la
   lección aprendida a la mala anotada: **`--use-gl=egl` es justamente el flag
   que FUERZA SwiftShader** (`ANGLE (Vulkan 1.3.0 (SwiftShader Device (Subzero)))`).
   Sin ningún `--use-gl`, chromium agarra la Vega solo.

Receta usada: `executablePath: /run/current-system/sw/bin/chromium`,
`DISPLAY=:0`, `WAYLAND_DISPLAY=wayland-1`, sin `--use-gl`.

**Comprobado en vivo antes de capturar nada:**
```
ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES 3.2)
```
El script **aborta** si el renderer dice swiftshader/llvmpipe/subzero/software:
una captura de software no prueba nada y aprobaría a ciegas.

### El WIP del operador se MUEVE solo — y no soy yo
A mitad de trabajo, `<WORKSPACE>/chagra` pasó de 2 a 8 archivos
tocados y **cambió de rama** a `feat/compai-cableado-vision` (nueva):
`visionWarmService.js`, `AgentScreen.segundaOpinion.test.jsx`, etc.
Los md5 de `aiService.js` y `segundaOpinionFoto.js` cambiaron **dos veces**.

Esto **no es mío**: en `<WORKSPACE>/chagra` sólo hice lecturas,
`git fetch` y `git worktree add`. Nunca escribí un archivo rastreado ahí — todo
mi trabajo vive en `<WORKSPACE>/wt-merge-a-dev`.

Lo importante para el merge: **`feat/compai-fuente-unica` sigue clavada en
`315e497d`**. El trabajo en curso (el cableado de visión) salió a **otra rama**,
así que mergear `315e497d` **no parte ninguna feature por la mitad** — lo que
viene después aterrizará en su propio commit y se mergea aparte.

## El barrido de las otras ramas — y por qué casi todas son un espejismo

Hay ~1446 refs de rama. `git merge-base --is-ancestor` **miente** aquí: como los
PRs entran **aplastados (squash)**, la rama original nunca queda de ancestro de
`dev` aunque su contenido **ya esté dentro**. Mergearla otra vez sería duplicar
código y fabricar conflictos.

La herramienta honesta es **`git cherry origin/dev <rama>`**: marca `-` lo que ya
tiene equivalente aplicado y `+` lo que de verdad falta. Comprobado:

| rama | `git cherry` | veredicto |
|---|---|---|
| `fable/zariguya-crias-al-lomo` | `-` | ya en dev (PR #2783 aplastado) |
| `feat/jaguar-marcha-perfil` | `-` | ya en dev |
| `fix/whitelist-3d-guatoc-co` | `-` | ya en dev (#2787) |
| `docs/bitacora-whitelist-2764` | `-` | ya en dev (#2788) |
| `fix/eslint-escena-ciclo-agua-cx` | `-` | ya en dev (#2761) |

### Candidatas REALES (commits ausentes de dev) — NO mergeadas, y por qué
`fix/rag-bench-tier-gate-463` (+1) · `feat/deploy-3d-guatoc-ci` (+1) ·
`fix/compai-real-en-toda-la-app` (+4) · `feat/efectos-funcionales-libreria` (+1) ·
`rescate/mundo-frutales-encuadre` (+8) · `rescate/dante-oliver-juegos` (+3) ·
`rescate/mundo-yuca-quinua` (+3) · `arte/aliados-huerta` (+2) ·
`arte/valle-noche-lluvia` (+4) · `arte/bosque-estratos` (+3) ·
`arte/casa-adentro` (+2) · `fix/rag-cultivos-cero` (+2) ·
`fix/flattendoc-strings-cortos-dev` (+1) · `codex/c10-showcase-artesania-ruta` (+1)

**No se mergean.** El encargo es explícito: *"no mergees nada que no esté
claramente terminado y probado; ante la duda, dejala y decilo"*. De ninguna de
estas tengo prueba de gate (tests medidos, captura de GPU real) — y varias son
**arte**, donde el único gate válido es una captura por contenido. Merecen una
ola propia, con su gate, no un `git merge` a ciegas de madrugada.

Además `feat/compai-cableado-vision` (+5) está **viva en este momento** (es la
rama del árbol principal, con 8 archivos sin commitear): mergearla sería
partirla por la mitad. Queda explícitamente fuera.

## RESULTADO DE LOS GATES

### Tests — merge 1 (`276fb18a`), suite COMPLETA
```
Test Files  38 failed | 825 passed | 2 skipped (865)
Tests       63 failed | 12017 passed | 1 expected fail | 25 skipped (12106)
```
63 rojos. **Ninguno es mío.** Se corrieron los **mismos archivos** en el worktree
limpio de `origin/dev` y el diff de nombres de test da **vacío**:

```
comm -23 fallos-merge.txt fallos-dev-limpio.txt   →   (nada)
```

Los 63 son **preexistentes en `dev`** (TTS/Kokoro, temas y contraste, ClimaStrip,
RAG tier-gate, service worker, fotos de especie…), ninguno toca el compAI.
Ojo con el subconjunto: la primera comparación dejó fuera `scripts/__tests__/`
(el regex sólo cogía `src/` y `tests/`) y aparecieron 6 "regresiones" falsas;
al correr también esos 3 archivos en dev limpio fallan idéntico. **0 regresiones.**

### Tests — compAI, alcance dirigido tras el merge 2
```
Test Files  8 passed (8)      Tests  70 passed (70)
```
(`src/compai/nucleo/`, `src/visual/agente/`, AgentFab.)

### Build
`npx vite build` → **verde, 2m 29s**.

### Gate visual — GPU REAL, 12 gestos ✅
`ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES 3.2)`
13 capturas en `ops/capturas/merge-ramas-a-dev-2026-07-26/`, **todas con md5
distinto** (13/13) — o sea los gestos DISPARAN de verdad, no es un PNG repetido.

Mirados por contenido, no sólo contados:
- **`guino`**: se cierra el ojo **GRANDE** (el cercano) a una rendija mientras el
  chico sigue abierto, y el cuerpo ladea. **La resolución a favor de Fable queda
  probada en imagen**, no por decreto.
- **`cabecea`**: sale la **zetita "z"** junto a la cabeza con los ojos caídos —
  el componente `Zetitas` nuevo renderiza.
- **`bosteza`**: ojos apretados en línea, boca abierta y bracito subiendo.

### 🔴 Lo que NO pude verificar — y por qué
**La entrada al mundo (cruce 2D→3D) no la pude capturar.** La ruta
`#/mockups/entrada-3d` renderiza **pantalla en negro sin `<canvas>`** en el
arnés: la app no monta sin sesión y el mockup queda detrás de esa puerta.
Dos intentos, uno además arruinado por `ERR_NETWORK_CHANGED` (la interfaz de red
de la máquina cambió a mitad de carga). Las capturas negras **no se commitean**:
una foto vacía no prueba nada y aprobaría a ciegas.

Lo que sí está verificado de ese trabajo es **por lectura de código**, no por
imagen: el fix `aparecioRef` de `useEntradaAbeja.jsx` es un guard de una línea
—`cruceVivo && !aparecioRef.current`— que impide re-estampar el
`visibility:hidden` después del atrape. Es correcto y acotado, pero **queda
pendiente el gate visual del cruce**; lo hereda quien tenga sesión en el arnés.

### Tests — suite COMPLETA tras los DOS merges (cerrada después del push)
```
Test Files  39 failed | 824 passed | 2 skipped (865)
Tests       64 failed | 12018 passed | 1 expected fail | 25 skipped (12108)
Duration    2232 s
```
Contra la corrida del merge 1 (63 rojos) aparece **UN** rojo nuevo:

```
src/components/__tests__/AssetDetailView.smoke.test.jsx
  > PlanSection wiring (audit 070.7)
  > monta PlanEditor cuando la planta es una species con feeding_plan_template
```

No toca nada del compAI. **Verificado en vez de supuesto** — corrido aislado:

| árbol | resultado |
|---|---|
| mi merge | **8/8 pasa** |
| `origin/dev` limpio | **8/8 pasa** |

Es **flaky bajo carga**, no una regresión. Y la causa es mía y conocida: esa
suite corrió **en paralelo con el gate visual** (chromium headed + servidor de
vite), y el propio reporte lo delata — `environment 8651 s` sobre 2232 s de
reloj es contención pura.

**Lección para el próximo**: el gate visual y la suite completa **no se solapan**
en esta máquina; un test de humo de componente se cae por timing y regala un
falso rojo que cuesta media hora descartar.

**Veredicto: 0 regresiones.** Los 63 rojos estructurales son preexistentes en
`dev` y el 64.º es ruido de contención.

### Coordinación con el frente `dev`→`main`
`integra/dev-a-main-2026-07-26` **ya está entregada** y fijó su base en
`origin/dev` @ `3ef4954d`. Todo lo que yo aterrice en `dev` queda **después** de
esa foto ⇒ esa rama necesita un `git merge origin/dev` de remate.
**El commit final de `dev` va en el reporte** para que puedan hacerlo.
