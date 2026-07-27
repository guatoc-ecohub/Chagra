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

### Paso 0 — cerrado
Bitácora commiteada antes de tocar una sola línea de código.
