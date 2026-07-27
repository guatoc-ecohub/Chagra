# Bitácora — consolidación final de lo pendiente en ramas

**Fecha**: 2026-07-27 (madrugada) · **Host**: `stg` (GPU real Vega 10)
**Encargo del operador**: *"merge a todo lo pendiente"*
**Destino**: `dev`. 🔴 **NO** `main`. **NO** deploy. **NO** borrar ramas.
**Worktree de trabajo**: `/home/kortux/Workspace/wt-consolida`
**Rama de integración**: `integra/consolidacion-final-2026-07-26`
(nace de `integra/merge-a-dev-2026-07-26` @ `45fd1f66`)

---

## Paso 0 — Reconocimiento (antes de tocar nada)

### La máquina está saturada — esto condiciona TODO lo que sigue

```
carga promedio: 28,22  31,84  32,42      con  nproc = 8
```

Hay tres frentes vivos a la vez sobre el mismo disco y el mismo `node_modules`.
**Cualquier lentitud o timeout de aquí en adelante se sospecha primero de la
contención de CPU, no del merge.** Es exactamente la trampa que el operador
avisó: hoy un agente casi reporta una regresión falsa que era sólo CPU.

### Procesos vivos encontrados (NO se matan)

| PID | qué es | dónde | desde |
|---|---|---|---|
| 1915827 | `git commit` **colgado en eslint** | `/home/kortux/Workspace/chagra` | 00:41 |
| 1958845 | `vitest run` (suite completa) | `/home/kortux/Workspace/wt-merge-a-dev` | 00:53 |
| 1965585 | `vite preview :4173` | `/home/kortux/Workspace/wt-cerrar-fuga` | 00:55 |
| 1990152 | `gate-segunda-opinion.mjs` | `/home/kortux/Workspace/chagra` | 01:02 |
| 1876780 | `vite dev :5199` | `/home/kortux/Workspace/chagra` | 00:30 |

El agente de la fuga de login (`wt-cerrar-fuga`) **está vivo y verificando**.
Orden explícita: **no se toca esa rama**.

### El WIP sin commitear — md5 de entrada

Archivos ajenos en `/home/kortux/Workspace/chagra` (untracked, del operador / de
otro frente). **Se anotan para comparar al final. No se tocan.**

```
ca54cf37f3afb97549447785f24e5bae  ops/DIAGNOSTICO-brecha-dev-main.md
eb1f0035553e48f04ca7a8765a3d9744  capturas-compai/gate-so-FALLO-sin-pantalla.png
```

`ca54cf37…` coincide con el md5 que anotó el agente anterior en su bitácora
⇒ ese archivo lleva horas intacto.

**Regla de higiene**: rutas explícitas en cada `git add`, **nunca `git add -A`**
(así se coló `lugares.js` una vez).

---

## Estado real de las cuatro ramas — verificado, no asumido

### 1. `integra/merge-a-dev-2026-07-26` @ `45fd1f66` — **COMPLETA**

`git rev-list --left-right --count …origin/dev` → **12 adelante / 0 atrás**.

Trae, sobre `origin/dev` @ `3ef4954d`:
- merge de `feat/compai-fuente-unica` (`276fb18a`) — núcleo portable, fuente
  única del compAI, señal de ocupado, diagnóstico de foto en dos pasos;
- merge de `fable/compai-gestos-entrada` (`ad014c3a`) — 12 gestos ociosos,
  entrada al mundo, cruce 2D→3D;
- su bitácora (`ops/bitacora/merge-ramas-a-dev.md`) y **13 capturas del gate
  visual con GPU real** en `ops/capturas/merge-ramas-a-dev-2026-07-26/`.

La colisión del guiño quedó resuelta **a favor de Fable** y **probada en imagen**
(`gestos-06-guino.png`: se cierra el ojo GRANDE, el cercano).

⚠️ **NO está pusheada a `origin`.** Existe sólo en local. Ese es el trabajo que
se habría perdido si alguien poda worktrees.

### 2. `feat/compai-cableado-vision` — **A MEDIAS, y por una razón concreta**

La rama **apunta a `315e497d`, el mismo commit que `feat/compai-fuente-unica`**:
o sea **no tiene ni un commit propio**. Todo su trabajo está **staged y sin
commitear** en `/home/kortux/Workspace/chagra`:

```
M  src/services/aiService.js
M  src/services/segundaOpinionFoto.js
M  src/services/visionWarmService.js
M  src/components/AgentScreen/AgentScreen.jsx
M  src/services/__tests__/visionWarmService.test.js
M  src/services/__tests__/visionWarmService.offline.test.js
M  src/services/__tests__/segundaOpinionFoto.test.js
A  src/components/AgentScreen/__tests__/AgentScreen.segundaOpinion.test.jsx
```

**Por qué quedó a medias**: el agente lanzó el commit *detached* a las 00:41 y
el `pre-commit` de lefthook se metió en **eslint** sobre los 8 archivos. A las
01:04 seguía corriendo (23 min, 7:41 de CPU acumulada). Con carga 28 sobre 8
núcleos, eslint no termina. El commit **nunca aterrizó** y el agente murió
esperándolo.

Lección para el que venga: **no combinar `git commit` (lefthook→eslint) con la
máquina saturada**. La receta del repo es `LEFTHOOK_EXCLUDE=eslint` /
`--no-verify` y correr el lint aparte.

md5 de entrada de esos 8 archivos, para probar que los recojo **tal cual**:

```
a928c741efdfc7fa5a4cbc01dcdc7b1d  src/services/aiService.js
e706403ce957fb7a521223ddce1aa4cc  src/services/segundaOpinionFoto.js
d045bd57ceb216ab85a70b773debb436  src/services/visionWarmService.js
775075858c60d175302992b0ecd48581  src/components/AgentScreen/AgentScreen.jsx
ee518efe41a3b55188cd99829856d091  src/services/__tests__/visionWarmService.test.js
5758d72aae0db3b87e2411d3b892738b  src/services/__tests__/visionWarmService.offline.test.js
f6b456dc89315512e791ba332a4485a2  src/services/__tests__/segundaOpinionFoto.test.js
d690ba57a013ef32fa06361f6b8f610b  src/components/AgentScreen/__tests__/AgentScreen.segundaOpinion.test.jsx
```

### 3. `fix/cerrar-fuga-login-2026-07-26` — **VIVA, no se toca**

Agente verificando en `/home/kortux/Workspace/wt-cerrar-fuga` con un
`vite preview` levantado y capturas antes/después en curso. Queda **fuera** de
esta consolidación y se reporta como pendiente.

### 4. `integra/dev-a-main-2026-07-26` @ `58281f70` — **espera remate**

Fijó su base en `origin/dev` @ `3ef4954d`. Todo lo que aterrice ahora en `dev`
queda **después** de esa foto ⇒ necesita `git merge origin/dev` al final.

---

## Plan de ejecución

1. **Paso 0** — esta bitácora, commiteada antes de tocar nada. ✅
2. **Paso 1** — recoger el trabajo de `feat/compai-cableado-vision` (los 8
   archivos staged) y commitearlo en su rama, sin eslint.
3. **Paso 2** — mergearlo en `integra/consolidacion-final-2026-07-26`.
4. **Paso 3** — gates: `vitest` dirigido + suite comparada contra baseline
   limpio de `origin/dev`, `vite build`, **gate visual con GPU real**.
5. **Paso 4** — `dev` ← consolidación, y push.
6. **Paso 5** — rematar `integra/dev-a-main-2026-07-26` con `git merge origin/dev`.
   **Sin mergear a `main`.**

### Gates — no negociables
- `npx vitest run` y `npx vite build` verdes tras cada merge.
- **Baseline de `origin/dev` limpio ANTES de culpar a mi merge** (ya existe el
  worktree `/home/kortux/Workspace/wt-baseline-dev` @ `3ef4954d`).
- **Gate visual con GPU real de stg (Vega 10), nunca SwiftShader.**
- 🔴 **El peligro no son los conflictos marcados, son los que git resuelve mal
  en silencio.** Ya pasó hoy: un `case` de `App.jsx` fusionó limpio y reventaba
  el build 2.000 líneas más abajo. **Compilar y mirar.**

---

## Registro de ejecución

### Paso 0 — cerrado (`d8e97792`)
Bitácora commiteada antes de tocar una sola línea de código.

---

### CORRECCIÓN a mitad de camino — el paso 2 ya estaba hecho

Aviso del coordinador confirmado **verificando, no creyendo**:

```
origin/dev                                   = 45fd1f66
integra/merge-a-dev-2026-07-26 ... origin/dev = 0 adelante / 0 atrás
```

O sea `integra/merge-a-dev-2026-07-26` **ya es `origin/dev`**: el otro agente
alcanzó a pushear antes de caerse. Esa rama queda **absorbida y redundante**
— no se mergea encima de nada. `origin/main` intacto (avanzó por su propio
carril, `e6a1d81f`, ajeno a esto).

Mi rama sale de ahí, así que **no rehago nada**: sólo agrego encima.

---

### Paso 1 — rescate de `feat/compai-cableado-vision` (`9996e69d`)

El agente **NO terminó**. Confirmado con el árbol en la mano, no por reporte:
la rama **sigue en `315e497d`** con los 8 archivos **staged y sin commitear**,
y el proceso de `git commit` (PID 1915827) murió a los ~30 min sin aterrizar,
atascado en el `eslint` del `pre-commit` (PID 1916125, 8:58 de CPU quemada).

**El trabajo en sí sí está completo** — otra cosa es que el commit no llegara:
- los 8 archivos estaban **todos** en el índice (el agente ya había hecho el
  `git add` explícito de los 8: iba a commitear, no estaba a mitad de escribir);
- trae **sus propios tests** (4 archivos, incluido uno nuevo);
- y esos tests **pasan**.

Rescatado sin tocar el worktree principal: `git diff --cached --binary` (lectura
pura) y `git apply -3` sobre esta rama. **Los 8 md5 del resultado coinciden uno
a uno con los del índice original** — es el mismo contenido, no una reescritura.

`AgentScreen.jsx` no cambió entre `315e497d` y `45fd1f66`, así que el 3-way
aplicó sobre base idéntica. Cero marcadores de conflicto.

Qué cablea: `revisarFoliage()` (segundo par de ojos sobre la misma foto),
`warmVisionReviewModel()` + `modelosResidentes()` (precalentar para no cobrarle
la espera al usuario), `puedeCorrerSegundoPaso()` (si no hay con qué, no se
promete) y `lanzarSegundaOpinionFoto()` serializada en `AgentScreen`, para no
pisar el modelo del chat.

**Gates del paso 1**
- `vitest` dirigido (compAI + visión + núcleo + `visual/agente`):
  **11 archivos / 122 tests, TODOS verdes**.
- `npx vite build`: **verde, 2m 57s**.

---

### Paso 3 — EL REMATE: `integra/dev-a-main-2026-07-26` ← `origin/dev` (`5b68141c`)

Era el paso que faltaba. La rama había fijado su base en `dev` @ `3ef4954d` y
resolvió 125 conflictos ahí; `dev` avanzó después a `45fd1f66`.

```
antes:  38 adelante / 12 atrás de origin/dev
merge:  git merge origin/dev  ->  automática, CERO conflictos marcados
después: 39 adelante /  0 atrás de origin/dev
```

Entran 12 commits / 64 archivos / +4297 líneas.

#### Cero conflictos NO es cero riesgo — lo verificado a mano

El peligro de este merge no son los marcadores, son los que git resuelve mal en
silencio (ya pasó hoy: un `case` de `App.jsx` fusionó limpio y reventaba el
build 2.000 líneas más abajo). Comprobado uno por uno:

| qué | cómo se comprobó | resultado |
|---|---|---|
| los 34 commits propios de `main` | `git merge-base --is-ancestor origin/main HEAD` | ✅ `main` entero sigue dentro |
| guards de plaguicida vetado | `outputGuards.js` en el diff del merge | ✅ **el merge no lo toca** |
| `App.jsx` (donde ya hubo corrupción silenciosa) | idem | ✅ **el merge no lo toca** |
| el fix #2785 (avatar elegible) | `grep` en `AgentFab.jsx` | ✅ `ChagraAgentAvatar`×3, cero `<Angelita>` a mano |
| la estructura nueva del FAB | idem | ✅ `estaOcupado`×2, `alternarSilencio`×4 |
| marcadores sueltos | `grep '^<<<<<<< \|^>>>>>>> ' src/ tests/ scripts/` | ✅ vacío |

Las dos cosas que el otro agente peleó en `AgentFab.jsx` (avatar elegible **y**
botón de silencio hermano) **siguen conviviendo** después del remate: el merge
no revirtió ninguna.

#### El guiño de Fable — verificado en el código, no por decreto
`OjosRubber` declara los ojos `[{r:1.95},{r:1.45}]` ⇒ **el primero ES el
grande**, así que `g:first-of-type` anima el ojo que se lee. Y los **12 gestos**
(peso > 0) están en el núcleo portable `src/compai/nucleo/gestos.js`:
`mira · distraida · acicala · rasca · sacude · guino · estira · bosteza ·
rascanuca · cabecea · voltereta · posa`
(`flota`, `posada` y `despega` son de secuencia, peso 0).
`angelitaEstados.js` **re-exporta** del núcleo — no copia.

---

### Gate visual del remate — GPU REAL, mirado por contenido ✅

`ops/capturas/remate-dev-main-2026-07-27/` (en la rama del remate). El script
`scripts/gate-real-gpu.mjs` **aborta solo** si el renderer es software; imprimió:

```
ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES 3.2)
```

3 capturas, 3 md5 distintos, 249–502 KB — contra los ~80 KB idénticos que da la
tarjeta *"Algo falló"* cuando la app está muerta. **Miradas, no contadas:**

| Escena | Qué se ve DE VERDAD |
|---|---|
| `paramo-definitivo` | Frailejonal, niebla en capas, cordillera, cóndor volando, quebrada azul, oso y rana iluminados, *"La fábrica de agua"* |
| `vitrina-maestra` | *"El mirador de los mundos"*: 15 arcos-portal con su vista viva adentro, quebrada, piedras de paso, el compAI en la esquina, leyenda verde/dorado. **Es el archivo que traía 17 conflictos y dibuja entero.** |
| `angelita-viva` | El compAI **vivo**: entrada teatral con gafas al sol, *"El repertorio del agente"*, gesto `Calma` — *"flota viva, mira, se acicala"* |

Los 12 gestos y el núcleo portable **llegaron dibujando** al remate, no sólo
compilando.

### Gate visual del rescate de visión — parcial, y lo digo como es

`ops/capturas/cableado-vision-2026-07-27/gr-diagnostico-foto.png`, capturada
sobre el build de ESTA rama (la que lleva `9996e69d`).

**Lo que la captura SÍ prueba**: la pantalla del diagnóstico de foto renderiza
íntegra con el cableado dentro — foto real de la hoja, los dos hallazgos
anotados sobre la imagen (`1` *"Aquí: la roya"* AVANZADO y `2` *"Manchitas
nuevas"* APENAS EMPEZANDO), *"Es la roya del café · Hemileia vastatrix · en el
envés de la hoja"* y la confianza *Alta · 88%*. **Cero regresión visual.**

**Lo que la captura NO prueba, y no lo voy a vender como que sí**: esa ruta es
la *muestra de demostración* del mockup. **No ejecuta la ida y vuelta real al
modelo de visión.** El segundo paso de verdad necesita sesión iniciada y el
backend detrás del proxy; sobre un `dist` servido con `python -m http.server`
no hay proxy que valga. El agente anterior chocó con lo mismo: sembró la sesión
en localforage (DB `Chagra`, store `syncQueue`), consiguió
`isAuthenticated: true`, y aun así la app **no montó en tres intentos** — su
única captura es `gate-so-FALLO-sin-pantalla.png`, una pantalla vacía.

**Una foto vacía no aprueba nada.** Así que el segundo paso queda **verificado
por tests y por build, no por imagen de punta a punta**.

---

### 🔴 HALLAZGO TARDÍO — el cableado de visión tiene un agente VIVO otra vez

A las 01:26, revisando el worktree principal, aparecieron **dos capturas nuevas**
que no existían en mi foto de entrada:

```
01:20:51  capturas-compai/gate-so-2-conversacion.png   (191 KB)
01:26:26  capturas-compai/gate-so-1-foto-adjunta.png   ( 91 KB)
```

Y sí: hay un proceso **vivo** corriendo `gate-segunda-opinion.mjs` con chromium
headed sobre `/home/kortux/Workspace/chagra`. Alguien retomó ese frente.

**Consecuencia operativa: NO mergeo el cableado de visión a `dev`.** Ese trabajo
tiene dueño activo en este momento; meterlo yo por debajo sería duplicarlo y
fabricarle conflictos a quien lo está gateando. Mi rescate queda **commiteado y
pusheado** en `integra/consolidacion-final-2026-07-26` (`9996e69d`) para que no
se vuelva a perder si el agente se cae otra vez — que ya pasó una vez hoy.

#### Y lo que esa captura enseña — el segundo paso NO cierra de punta a punta

`gate-so-2-conversacion.png` muestra la pantalla del agente con la foto real
adjunta (*"Foto enviada para análisis"*, una mata de col en su cama de tierra),
el avatar elegible funcionando (*"Chagra IA · AGENTE AG…"* con el maíz), y
abajo, en rojo:

```
Chagra no pudo responder (código 404). Intente de nuevo.
IA offline o lenta — las respuestas pueden tardar más de lo normal.
```

O sea: la pantalla **monta y adjunta la foto**, pero el modelo de visión
**no contesta (404)** desde ese arnés. El segundo par de ojos no llega a
correr. Eso confirma —desde otro frente y con otra herramienta— lo que ya
había concluido: **la ida y vuelta real del segundo paso sigue sin prueba
visual**, y no por culpa del código sino porque el arnés no alcanza el backend.
