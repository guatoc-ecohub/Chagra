# Diagnóstico de la brecha `dev` → `main`

**Fecha de corte:** 2026-07-26
**Alcance:** diagnóstico. **No se fusionó, no se empujó, no se desplegó, no se borró ninguna rama.**
La fusión de prueba se hizo en un *worktree* descartable (`git merge --no-commit --no-ff` → `git merge --abort` → `git worktree remove`).

**Refs medidas:** `origin/main` = `e6a1d81f` (2026-07-25 23:10) · `origin/dev` = `3ef4954d` (2026-07-25 12:49) · base común = `efd57b1a` (2026-07-12 07:28).

Antecedente: `ops/RECONCILIACION-MAIN-DEV-2026-07-23.md` (commit `afb4e8c3`, #2715). Este documento lo actualiza y **corrige dos premisas del encargo**.

---

## Resumen para decidir en 60 segundos

| Pregunta | Respuesta medida |
|---|---|
| ¿`main` está abandonada? | **No.** Tiene 34 commits que `dev` no tiene, y su commit más reciente es **10 h más nuevo** que el de `dev`. Son dos ramas **activas** divergiendo, no una vieja y una nueva. |
| ¿Un usuario con datos viejos pierde algo? | **No.** `src/db/` es **byte a byte idéntico** en las dos ramas. `DB_VERSION = 27` en ambas. Riesgo de pérdida de datos: **ninguno detectado**. |
| ¿El bundle adelgaza 6×? | **No — engorda.** Es al revés de lo que dice el encargo. Ver §2.1. Es el hallazgo más importante de este informe. |
| ¿Cuántos conflictos? | **125 archivos, 601 *hunks*.** Creciendo: 79 → 108 (23-jul) → **125** (hoy). |
| ¿`dev` está verificado? | **Casi nada.** En los últimos 60 *runs* de CI sobre `dev` corrieron **cero** *gates* de test/tipos/perf/seguridad. |
| ¿Se puede mergear? | Sí, y **la capa de datos lo hace seguro**. Pero hay que arreglar el asset de embeddings **antes**. Ver §6. |

---

## 1. El tamaño real

### 1.1 Commits

```
git rev-list --left-right --count origin/main...origin/dev
34      678
```

- **`dev` adelante:** 678 commits (533 sin contar *merges*).
- **`main` adelante:** **34 commits que NO están en `dev`.**
- Base común: `efd57b1a`, 2026-07-12. La divergencia tiene **14 días**.

### 1.2 Volumen del diff

```
git diff --shortstat origin/main origin/dev
551 files changed, 83665 insertions(+), 3281 deletions(-)
```

Relación 25:1 entre líneas agregadas y borradas — es **trabajo aditivo** (mundos, criaturas, escenas), no una reescritura.

| Extensión | Archivos |
|---|---|
| `.jsx` | 222 |
| `.js` | 139 |
| `.png` | 59 |
| `.json` | 28 |
| `.md` | 26 |
| `.mjs` | 23 |
| `.jpg` | 22 |
| `.css` | 22 |
| resto (`.yml`, `.ts`, `.jsonl`, `.sh`, `.html`) | 10 |

Reparto de los 533 commits por tipo: 260 `feat`, 123 `fix`, 72 `art`/`arte` (78 con las variantes), 18 `chore`, 9 `docs`, 8 `test`, 6 `perf`.
Por área: `3d` (66), `mundo3d` (41), `valle` (40), `bosque` (25), `angelita` (15), `tsc` (14), `prod` (13), `paramo` (11), `rag` (9), `creatures` (9).

**Lectura:** la brecha es, en masa, **arte y mundos 3D**. La inteligencia (RAG/agente) es una minoría de commits aunque sea la que más titulares genera.

### 1.3 🔴 Los 34 commits que solo están en `main` — los peligrosos

Estos se **perderían** si se adopta `dev` como nueva `main` por reemplazo (`git branch -f`, *force push*, o *reset*). Un `git merge` normal **sí los conserva**.

Están ordenados del más nuevo al más viejo. Marco con ⚠️ los que considero **no descartables** (seguridad, producto en vivo, o modelo en producción).

| # | Commit | Fecha | Título |
|---|---|---|---|
| 1 | ⚠️ `e6a1d81f` | 07-25 | `feat(red)`: redService cliente PWA de la RED de trueque (Chagra #7, Fase 1) (#2792) |
| 2 | ⚠️ `cd88a118` | 07-25 | `feat(vision)`: cablear cliente al juez async (no bloqueante) (#2791) |
| 3 | ⚠️ `1cfdab85` | 07-25 | `feat(agent)`: activar Deep Research + cerrar brecha de 4 tools en grounding (#2790) |
| 4 | ⚠️ `5721584d` | 07-24 | `feat(modelo)`: qwen3.5:4b en prod (quirúrgico) — retira el fantasma e2b (#2762) |
| 5 | `afb4e8c3` | 07-23 | `docs(ops)`: diagnosticar divergencia main y dev (#2715) |
| 6 | ⚠️ `28fef3f2` | 07-22 | `feat(mercado)`: entry standalone del demo público mercado.chagra.bio (#2547) |
| 7 | `8d323eea` | 07-21 | `feat(vision)`: qwen3-vl:8b reemplaza a gemma3:4b en el carril de visión (#2675) |
| 8 | `0443e08e` | 07-21 | `feat(agente)`: gemma4:e2b reemplaza a granite3.3:8b (#2673) |
| 9 | `c0b98007` | 07-21 | `fix(graph)`: derivar piso_termico para especies del grafo AGE (#2469) |
| 10 | `cf2d0131` | 07-21 | `feat(murales)`: integrar fichas 2D por mundo (#2651) |
| 11 | `f9046ece` | 07-21 | `port(main)`: guía de Angelita + aire al corte de suelo de la microfauna (#2650) |
| 12 | ⚠️ `e7180af8` | 07-21 | `fix(agent)`: corregir triaje de síntomas por cultivo (#2646) |
| 13 | `1c7a3643` | 07-21 | `experiment(embedder)`: fine-tune contrastivo con pares reales del grafo (#2473) |
| 14 | `77e87798` | 07-21 | `docs(vision-cafe)`: clasificador café RoCoLe+BRACOL — resultado negativo honesto (#2474) |
| 15 | `07d74bc5` | 07-21 | `feat(bench)`: script de entrenamiento QLoRA-DPO (B7) + requirements (#2311) |
| 16 | `ec519af1` | 07-21 | `feat(audit)`: script de auditoría de bugs en grafo agroecológico AGE (#2531) |
| 17 | `6d1922b0` | 07-21 | `fix(agro)`: normalizar esquema altitud en grafo AGE (#2472) |
| 18 | ⚠️ `1c58c794` | 07-21 | `fix(agente)`: buildFallbackResponse chequeaba shapes de tools STALE (#2586) |
| 19 | ⚠️ `6f72ff3b` | 07-21 | `fix(prompt)`: cubrir los 10 plaguicidas vetados del banco del canario (C1) (#2558) |
| 20 | ⚠️ `7515fea9` | 07-21 | `fix(ci)`: los gates no corrían en dev ni app-3d — todo el 3D entraba a ciegas (#2487) |
| 21 | `1850e3f5` | 07-21 | `fix(merge)`: integrar main en escenas 3d (#2631) |
| 22 | `1e91f381` | 07-21 | `chore(oc-cla-raiz-…)`: cambios generados por opencode (GLM-4.6) (#2634) |
| 23 | ⚠️ `d3d3169a` | 07-20 | `fix(grounding)`: filtrar entidades-ruido antes del prompt (ICA/SENA no son especies) (#2604) |
| 24 | ⚠️ `71a52c70` | 07-18 | `feat(capture)`: modo piloto captura conversaciones de todos los usuarios (#2592) |
| 25 | `dd6fb9bc` | 07-18 | `chore(bench)`: borrar el diff markdown muerto (#2584) |
| 26 | `130ddb39` | 07-18 | `feat(rag)`: embeber clima/altitud/piso térmico en la capa semántica (#2583) |
| 27 | `13eec2bf` | 07-18 | `feat(offline)`: exportar piso térmico (GROWS_IN) al grafo offline (#2582) |
| 28 | `6f96f717` | 07-18 | `fix(bench)`: el gate no debe tratar conteos crudos como porcentajes (#2581) |
| 29 | `6f3b64c2` | 07-18 | `feat(bench)`: cablear el bench-gate CI (gate v1 + workflow + baselines) (#2580) |
| 30 | `fdb134a3` | 07-18 | `fix(rag)`: indexar clima y altitud — un umbral de 20 chars botaba el 62% del saber (#2579) |
| 31 | `510533b7` | 07-15 | `feat(ops)`: auditor CI de integraciones construidas y no conectadas (#2475) |
| 32 | ⚠️ `fe417d7f` | 07-15 | `fix(guards)`: suprimir receta de plaguicida vetado con dosis (canario C1) (#2476) |
| 33 | `519953a3` | 07-13 | `feat(perf)`: PerformanceMonitor + tiers dinámicos de presupuesto 3D (#2442) |
| 34 | `7d651d52` | 07-13 | `fix(prompt)`: close thermal grounding gap (#2422) |

**Los dos que más duelen si se pierden:** `fe417d7f` y `6f72ff3b` — son los *guards* que impiden que el agente **recete un plaguicida vetado con dosis**. Eso es seguridad de una persona en el campo, no una feature.

> El documento del 23-jul ya clasificó 29 de estos como A (artefacto), B (superado por `dev`) o C (requiere *port*). Su clasificación sigue siendo válida; los 4 nuevos (#1–#4) son todos **C** y todos ⚠️.

### 1.4 Hay una PR de promoción abierta y atascada

`gh pr list --base main --head dev`:

```
#2649  "deploy: promover dev → main (Angelita guía, microfauna, valle, arreglos del día)"
       creada 2026-07-21 · state OPEN · mergeable: CONFLICTING
```

Lleva **5 días abierta y en conflicto**. Cualquier decisión debería cerrarla o rehacerla, no dejarla ahí.

---

## 2. Qué gana el usuario si se mergea

Priorizado por impacto sobre el usuario real (campesino, teléfono modesto, conexión mala).

### 2.1 🔴 CORRECCIÓN: el asset **NO** adelgaza 6× — **engorda 4,5×**

El encargo dice: *"el asset 6× más liviano (7,6 MB → 1,26 MB, que en zona rural importa)"*.
**Medido, la dirección está invertida.** Esa mejora **ya está en producción** y **`dev` la perdió**.

Historia real de `public/rag-embeddings.json` (`git cat-file -s`, tamaño sin comprimir):

| Commit | Fecha | Tamaño | Rama | Qué pasó |
|---|---|---|---|---|
| `105bd938` | 06-11 | **7,14 MB** | compartida | primer asset, 768d float crudo |
| `abb107f4` | 06-23 | **1,59 MB** | compartida | ← **aquí ocurrió el "6× más liviano"**: arctic-embed2 + cuantización int8 |
| `e6fcdaa4` | 06-24 | 1,62 MB | compartida | +9 prácticas |
| `130ddb39` | 07-18 | **1,62 MB** | **main** | clima/altitud. Sigue int8. |
| `bc7436b7` | 07-23 | **7,29 MB** | **dev** | migración arctic→nomic — **se perdió la cuantización** |
| `befb45cf` | 07-23 | **7,28 MB** | **dev** | cabecera de identidad |

El adelgazamiento 7,14 MB → 1,59 MB ocurrió el **23 de junio, en historia compartida**. Está en producción **hoy**. No es algo que `dev` aporte.

Estado actual medido:

| | `main` (producción hoy) | `dev` |
|---|---|---|
| Formato | `{q:"int8", s:escala, v:[…1024]}` | `[0.8654096722602844, …768]` (float crudo) |
| Modelo | snowflake-arctic-embed2 (1024d) | nomic-embed-text (768d) |
| **Tamaño en disco** | **1,62 MB** | **7,28 MB** |
| **Gzip (lo que viaja por la red)** | **0,57 MB** | **3,31 MB** |
| Entradas | 501 | 501 |

**Mergear `dev` hoy multiplicaría por 5,8 la descarga del RAG en la red del usuario rural** (0,57 → 3,31 MB gzip).

**Y es un error, no una decisión.** El propio script de `dev` (`scripts/build-rag-embeddings.mjs:217-220`) cuantiza **por defecto** y documenta:

> `// int8 por DEFAULT: el reader (ragRetriever) espera {q:'int8',s,v}; floats`
> `// crudos rompen el retrieve y pesan 6x (10MB vs 1.6MB). --no-quantize solo para`

El artefacto commiteado en `dev` **contradice el invariante que el propio `dev` documenta**. Se generó con `--no-quantize` (o por otro camino) y se commiteó así.

**Buena noticia:** es barato de arreglar y **no rompe nada**. El *reader* de `dev` acepta las dos formas (`ragRetriever.js:638` int8, `:646` `else if (Array.isArray(entry))`), así que hoy **funciona, solo pesa**. Regenerar con cuantización debería dejarlo en **~0,5 MB** según el encabezado del propio script de `dev` (`* ~0.5 MB con --quantize int8`, línea 26) — es decir, **más liviano que producción**, que es lo que el encargo quería.

> **Acción concreta:** regenerar `public/rag-embeddings.json` con cuantización int8 **antes** de mergear. Convierte la regresión en la mejora que se buscaba.

### 2.2 RAG con cabecera de identidad — real, pero con una letra chica importante

Commit `befb45cf` (#2733), medido y documentado por el propio commit:

```
recall@1   23% → 38%   (+15pp)
recall@5   34% → 51%   (+17pp)
fuera de top5  66% → 49%
```

El **+15 pp del encargo es correcto** (es `recall@1`). Pero el mismo commit dice, textualmente:

> *"**Neutro** sobre las 117 queries reales del golden ampliado (el híbrido ya las cubre vía BM25) y sin bajar café/papa/maíz. El beneficio es para queries semánticas puras y especies raras (árboles nativos, flora de páramo) que BM25 no capta."*

**Traducción honesta:** la métrica es de *self-retrieval* (buscar una especie por su propio nombre, muestra de 167 especies). Sobre las **preguntas reales** de usuarios el efecto medido es **neutro**. El beneficio real es para especies raras y consultas semánticas — valioso, pero **no es "+15 pp de calidad percibida"**.

Ganancia adicional del cambio de embebedor (`bc7436b7`, #2717): nomic vs arctic **recall@5 44% vs 38% (+6 pp)** y **274 MB vs 1,3 GB de VRAM** — esto último importa porque permite que el embebedor conviva con `gemma4:e2b` sin desalojo.

### 2.3 Arte, mundos y criaturas — la masa real del valor

Es lo que más pesa en commits y lo que el usuario **ve**: 78 commits `art`/`arte`, y por área `3d` (66), `mundo3d` (41), `valle` (40), `bosque` (25), `creatures` (9). Archivos nuevos más grandes: `estratosAltoandinos.geom.js` (1.496 L), `entsGradiente.geom.js` (1.467 L), `nacederoParamo.geom.js` (1.295 L), `gradienteAndino.geom.js` (1.215 L), escenas de suelo comparado, banco de semillas, benéficos, láminas botánicas.

**No pude cuantificar esto con una métrica de usuario.** No hay un número medido de "mundos que antes no existían y ahora sí" porque las rutas ya existían en `main` (§3.2) — lo que cambia es el **contenido** de las escenas. Evaluarlo exige gate visual (capturas), que está fuera del alcance de este diagnóstico.

### 2.4 Lo que NO gana

- **Peso:** pierde (§2.1, §3.4).
- **Modelo del agente en producción:** `main` ya tiene `qwen3.5:4b` (#2762, 24-jul), que es **posterior** a lo que `dev` trae. `dev` está **atrás** en esto.
- **RED de trueque, Deep Research, juez de visión async, Mercado standalone:** solo en `main`.

---

## 3. Qué se rompería

### 3.1 🟢 Migraciones de datos — **la pregunta crítica, y la respuesta es: nada se pierde**

Esta es la única parte irreversible, así que la verifiqué por cuatro caminos independientes.

```
git diff --stat origin/main origin/dev -- src/db/
(vacío — cero cambios)

git rev-parse origin/main:src/db/dbCore.js  →  bdf93605f39a7b21e39d5e3012001782546337fc
git rev-parse origin/dev:src/db/dbCore.js   →  bdf93605f39a7b21e39d5e3012001782546337fc   ← MISMO HASH

main: export const DB_VERSION = 27;
dev : export const DB_VERSION = 27;          ← MISMA VERSIÓN
```

- **`src/db/` completo (11 módulos) es byte a byte idéntico**: `assetCache`, `catalogDB`, `corpusIndexCache`, `dbCore`, `farmProcessCache`, `glaciarDraft`, `glaciarReportes`, `logCache`, `marketplaceOfertas`, `mediaCache`, `redTransactions`.
- **Ningún archivo de `src/db/` se agrega ni se borra** entre ramas.
- `src/utils/persistStorage.js` (anti-purga de IndexedDB en iOS): **idéntico**.
- `DB_VERSION = 27` en ambas → **no se dispara ningún `onupgradeneeded`** al pasar de una versión a la otra.

**Conclusión: un usuario con siembras guardadas que abra la versión nueva NO pierde nada.** No hay cambio de esquema, no hay migración que ejecutar, no hay *store* nuevo ni renombrado, y el número de versión ni siquiera se mueve.

Único archivo de persistencia nuevo en `dev`: `src/store/persistMiddleware.js` — lo leí completo. Persiste **preferencias de UI en `localStorage`** bajo una clave propia, con `try/catch` en lectura y escritura. **No toca IndexedDB ni los datos del usuario.**

> **Salvedad honesta:** esto verifica el **código de esquema**, que es donde vive el riesgo de pérdida. No ejecuté una prueba de migración con una base real poblada (ver §7).

### 3.2 🟢 Rutas y enlaces guardados — un (1) enlace se rompe

Extraje `path:` + `alias:` de `src/config/rutasProdChagraApp.js` en ambas ramas:

| | `main` | `dev` |
|---|---|---|
| `path` | 184 | 184 |
| `alias` | 59 | 59 |
| **direcciones totales** | **243** | **243** |
| comunes a las dos | **242** | **242** |

- **Desaparece en `dev`:** `ent` (era alias de `bosque_vivo`).
- **Nueva en `dev`:** `paramo_definitivo`.
- **Re-apuntada (ruta viva, contenido distinto):** `diorama_paramo` ahora carga `MundoEntBosque` en vez de `MundoParamo3D` (archivado).
- **Reactivada:** `mockup_entrada_campesina` sale de `EXCLUIDO` y vuelve a `NUCLEO_APP`.

**Impacto:** quien tenga guardado un enlace a `…/ent` se queda sin destino. Todo lo demás sobrevive. **Mitigación trivial:** conservar `ent` en la lista de alias además de `paramo_definitivo` (una línea).

### 3.3 🟢 Service worker / PWA — la actualización **sí** llega sola

```
public/sw.js                      → IDÉNTICO
public/manifest.json              → IDÉNTICO
index.html                        → IDÉNTICO
src/main.jsx                      → IDÉNTICO
src/services/swRegistration.js    → IDÉNTICO
src/components/UpdateAvailableBanner.jsx → IDÉNTICO
package.json / package-lock.json  → IDÉNTICOS
vite.config.js                    → IDÉNTICO
```

La mecánica de actualización (idéntica en ambas ramas, leída en `public/sw.js`):
- `install` → `self.skipWaiting()`
- `activate` → borra caches viejos → `self.clients.claim()` → `postMessage({type:'SW_UPDATED'})`
- `CACHE_NAME = chagra-<sha>` — **cambia en cada deploy**, así que el `activate` invalida el cache anterior
- `swRegistration.js` + `UpdateAvailableBanner.jsx` hacen `registration.update()`, auto-`SKIP_WAITING` y **una sola** recarga vía `controllerchange`, con red de seguridad por *timeout* si `controllerchange` nunca dispara

**El usuario no queda pegado a la versión vieja.** Y como el registro es idéntico en las dos ramas, el merge **no cambia** este comportamiento.

> Detalle a favor: el corpus `/cycle-content/*` vive en un cache **separado** de `CACHE_NAME` a propósito, para que un deploy no borre el corpus offline. Ese diseño se conserva.

### 3.4 🟡 Peso del bundle y tiempo de carga — empeora, casi todo por §2.1

Construí ambas ramas con `npx vite build` en un *worktree* aislado con `node_modules` propio (medidas comparables):

| Métrica | `main` | `dev` | Δ |
|---|---|---|---|
| `dist/` total | 43 MB | 49 MB | **+6 MB** |
| JS + CSS | 11,99 MB | 12,61 MB | **+5,1 %** |
| chunks JS | 471 | 487 | +16 |
| entry `main-*.js` | 246,3 KB | 277,9 KB | **+12,8 %** |
| `vendor-react-*.js` | 357,7 KB | 357,7 KB | 0 |
| `vendor-three-*.js` | — | 1.502,8 KB (gzip 404,8) | — |
| **`rag-embeddings.json`** | **1,62 MB** | **7,28 MB** | **+5,66 MB** |
| Tiempo de build | 45,3 s | 86,0 s | +90 % |

**El +6 MB de `dist/` se explica en ~94 % por el asset de embeddings.** Arreglado §2.1, el crecimiento real queda en **+5,1 % de JS/CSS y +31 KB en el entry** — asumible para lo que entra.

El entry sube 31,6 KB: es el costo de arranque que paga **todo** usuario, incluso el que nunca abre un mundo 3D. Vale la pena revisarlo, pero no es bloqueante.

---

## 4. Los conflictos

Fusión de prueba en *worktree* descartable, **abortada**. Medí **las dos direcciones** para poder comparar con el documento del 23-jul:

| Dirección | Conflictos |
|---|---|
| `dev` → `main` (la de producción) | **125** |
| `main` → `dev` (la que midió el doc del 23-jul) | **125** |

### 4.1 🔴 Los conflictos están creciendo — el costo de esperar es medible

| Fecha | Conflictos | Fuente |
|---|---|---|
| (antecedente del encargo) | **79** | intento previo |
| 2026-07-23 | **108** | `ops/RECONCILIACION-MAIN-DEV-2026-07-23.md` |
| **2026-07-26** | **125** | este documento (misma dirección, medido hoy) |

**+17 conflictos en 3 días ≈ +5,7 por día.** No es una brecha estable esperando ser resuelta: **se ensancha sola** mientras las dos ramas siguen activas. Cada día de espera cuesta.

### 4.2 Naturaleza de los 125

Por estado de git:

| Estado | N | Significado |
|---|---|---|
| `AA` | 80 | *add/add* — las dos ramas crearon el mismo archivo por separado |
| `UU` | 44 | las dos modificaron el mismo archivo |
| `UD` | 1 | `dev` borró / `main` modificó → `src/mockups/MundoParamo3D.jsx` |

**601 *hunks* de conflicto repartidos en 124 archivos** (media 4,8; mediana mucho menor — está muy concentrado).

Los peores (hunks por archivo):

```
51  src/mockups/MundoBoticaCana3D.jsx
24  src/mockups/MundoSueloVivo3D.jsx
23  src/visual/creatures/Jaguar.jsx
22  src/mockups/valle/Valle3D.jsx
18  src/visual/mundo3d/agua/EscenaCicloAgua.jsx
17  src/mockups/VitrinaMaestraMundos.jsx
17  src/mockups/MetalSlugCampo.jsx
16  src/visual/mundo3d/bosque/{floraParamo.geom.js, FaunaBosque.jsx}
16  src/mockups/MomentoVentaMercado3D.jsx
```

### 4.3 Mecánico vs. de diseño

**🟢 Mecánico — 109 archivos (87 %).** Resolución: **gana `dev`**, porque son evoluciones posteriores del mismo trabajo.

| Grupo | N |
|---|---|
| Arte / escenas 3D / criaturas (`src/visual/`, `src/mockups/`) | 86 |
| Componentes app 2D (`src/components/`) | 16 |
| Tests | 7 |

Son *add/add* y evoluciones divergentes de las mismas escenas. El documento del 23-jul llegó a la misma conclusión para este bloque. **No requieren juicio, requieren paciencia** (y un gate visual después).

**🔴 De diseño — 16 archivos (13 %).** Aquí **no se puede elegir un lado**; hay que portar a mano y decidir.

*Artefactos generados (5) — **regenerar desde la fuente, nunca elegir un lado**:*
```
public/rag-embeddings.json        ← §2.1: regenerar CON int8
public/grafo-relations.json       ← +6.045 líneas en dev; el doc del 23-jul ya avisó
public/chagra-stats.json
public/cycle-content/manifest.json
scripts/tsc-baseline.json
```

*Configuración, CI y elección de modelos (7) — **decisión humana**:*
```
.github/workflows/codeql.yml
scripts/build-rag-embeddings.mjs
src/config/env.js                        ← modelos por defecto
src/services/llmRouter.js                ← carriles de modelo; main tiene qwen3.5:4b (#2762)
src/services/entityExtractor.js
src/services/ragRetriever.js             ← arctic(1024d) vs nomic(768d) — ver §2.1
src/services/canonicalHostRedirect.js    ← whitelist de hosts (3d.guatoc.co)
```

*Estado y hooks compartidos (4) — **revisar a mano**:*
```
src/hooks/useAgentAvatarType.js
src/hooks/useAngelitaGuia.js
src/store/useAngelitaStore.js
src/prodApp/ProdChagraApp.jsx
```

> ⚠️ **`ragRetriever.js` + `rag-embeddings.json` deben resolverse como un par atómico.** El modelo que embebe las *queries* tiene que ser el mismo que generó el corpus, o el coseno compara vectores de dimensión distinta (1024 vs 768), se descartan todos los pares y **la capa semántica cae a cero en silencio**. El propio código lo documenta como "INVARIANTE CRÍTICA" tras haberlo sufrido el 2026-07-02. **Este es el modo de falla más peligroso del merge**, y es silencioso.

---

## 5. Cuánto de `dev` está verificado

### 5.1 🟢 Build: pasa

```
origin/dev  → npx vite build → EXIT=0, ✓ built in 1m 26s
origin/main → npx vite build → EXIT=0, ✓ built in 45.26s
```

Advertencias en `dev` (no bloquean): 2 `INEFFECTIVE_DYNAMIC_IMPORT` (`openaiStream.js`, `knowledgeIntentRouter.js` importados dinámica y estáticamente a la vez) y chunks > 500 KB.

### 5.2 🔴 CI: `dev` no corre **ningún** gate — está entrando a ciegas

Evidencia empírica, últimos 60 *runs* de CI sobre la rama `dev`:

```
{ 'CLA Assistant': 31, 'Deploy Chagra PWA (DEV)': 29 }
```

**Cero** ejecuciones de: `Unit Tests (vitest)`, `TSC Gate`, `Performance Budget`, `CodeQL SAST`, `Integraciones no consumidas`.

La causa está en los disparadores (idénticos en las dos ramas):

```yaml
# unit-tests.yml
on:
  pull_request:
    branches: [main, dev, app-3d]
  push:
    branches: [main]          # ← dev NO dispara en push
# tsc-gate.yml / perf-budget.yml
    branches: [main, feat/**, fix/**, chore/**]   # ← dev tampoco
```

Los gates corren en las ramas `feat/**`/`fix/**` **antes** del merge, y en `main`. **Nunca sobre el resultado integrado en `dev`.** Los 678 commits se acumularon sin que nadie verificara el conjunto.

Comparación: `main` sí tiene la batería verde (último push, `e6a1d81f`): `Deploy` ✅, `TSC Gate` ✅, `Performance Budget` ✅, `Unit Tests` ✅, `CodeQL SAST` ✅, `Integraciones no consumidas` ✅. (`Playwright E2E` cancelado a los 30 min, y `Nightly Click Crawl` **falló** hoy 09:31 — pendiente aparte, no de este merge.)

> Ironía relevante: el commit que arregla justamente esto — `7515fea9` *"los gates no corrían en dev ni app-3d — todo el 3D entraba a ciegas"* (#2487) — **está en `main` y no en `dev`** (§1.3 #20).

### 5.3 🟡 Tests: el gate real pasa; la suite completa no es medible aquí

**Gate que CI realmente exige** (los 5 archivos de `unit-tests.yml`), ejecutado por mí en las dos ramas:

| Rama | Resultado |
|---|---|
| `origin/dev` | **5 archivos / 149 tests — todos pasan** (exit 0) |
| `origin/main` | **5 archivos / 149 tests — todos pasan** (exit 0) |

**Diferencial sobre el núcleo de inteligencia** (`ragRetriever` + `outputGuards` + `agentService`), mismo entorno, misma máquina:

| Rama | Fallan | Pasan | Total |
|---|---|---|---|
| `origin/dev` | **7** | 373 | 381 |
| `origin/main` | **13** | 366 | 380 |

**`dev` falla menos que `main`.** Los fallos que quedan en `dev` (`flattenDoc` propaga species, `SEC-002 corpusStats`, `P0-1 FAIL-CLOSED`, y 4 de `toolEvidence`) son en su mayoría **preexistentes en producción**, no introducidos por `dev`.

La suite completa son **913 archivos de test** y no terminó en el tiempo disponible (ver §7). Nota importante: el propio `unit-tests.yml` documenta que el gate **no** es la suite completa —

> *"ALCANCE (por qué no la suite completa todavía): el job arranca enfocado en el test del entrypoint + sus dependencias deterministas […] Ampliar este gate a `npm run test:unit` (suite completa) queda pendiente"*

— así que **ni `main` está verificada de punta a punta**. La diferencia es que `main` al menos corre el subconjunto; `dev` no corre nada.

### 5.4 🟡 Mundos con lienzo vacío — y una segunda corrección al encargo

Auditoría de las 46 rutas `importLazy` de `NUCLEO_3D`, las 10 rutas legacy `Mundo3D-*` y los 211 `import()` dinámicos de `src/App.jsx`, contra el árbol de `origin/dev`:

**Cero imports rotos. Cero rutas apuntando a `src/mockups/_archivo/`.** El archivado quedó limpio.

| Mundo | Estado | Evidencia |
|---|---|---|
| `mundo3d-agua` | 🔴 **Vacío confirmado** — 0 draw calls, 0 triángulos, 0 geometrías en 3 corridas; captura muestra fondo beige liso con hotspots flotando | `ops/informes/fps-mundos-2026-07-22.{md,json}` + `ops/informes/capturas/fps-mundos-2026-07-22/mundo3d-agua-debug.png` |
| `mundo3d-animales` | 🟡 **NO confirmado como roto** | La única medición del repo lo muestra **dibujando**: 49,2 fps, **128 draw calls, 6.788 triángulos, 618 geometrías** |
| `mundo-gallinero-3d`, `mundo-botica-cana-3d`, `mundo-abejas-3d` | 🟡 Dibujan, pero **sin interactividad** (estado React nunca cableado a la escena) y **encuadre móvil roto** en 390×844 | `ops/BRIEF-FABLE-3-MUNDOS-MUERTOS.md` |
| `vitrina-3d`, `vitrina-maestra` | 🟢 No montan canvas en su estado inicial **por diseño** (2D por defecto) | mismo informe |
| `hoja-prueba-valle`, `camara-director`, `efectos-funcionales` | 🟢 0 fps por `frameloop="demand"`, **por diseño** | documentado en el código |

> **🔴 CORRECCIÓN 2 al encargo:** *"Ya sabemos que `mundo3d-animales` y `mundo3d-agua` salen vacíos"*.
> `mundo3d-animales` **no está confirmado como vacío** — la única medición del repo lo muestra dibujando 128 draw calls. Puede ser (a) un hallazgo en vivo aún sin documentar, o (b) un problema de **deploy** (hash de chunk obsoleto → *"Failed to fetch dynamically imported module"*), patrón ya documentado para `chagra-dev.guatoc.co` esa misma semana en `ops/BRIEF-FABLE-3-MUNDOS-MUERTOS.md`. **Conviene una captura fresca contra un build limpio antes de tratarlo como roto.**

> **🟢 Y lo más importante de esta sección:** `Mundo3DAgua.jsx`, `Mundo3DAnimales.jsx`, `EscenaFlujo.jsx` y `EscenaRecinto.jsx` son **byte a byte idénticos en `main` y en `dev`**. **El merge NO introduce el bug de `mundo3d-agua` — ya está en producción hoy, con este mismo código.** No es un motivo para no mergear; es una deuda aparte.

---

## 6. Alternativas, con su costo

### A) Merge completo `dev` → `main`
- **Costo:** 125 archivos / 601 hunks. Estimo **1 día** de resolución concentrada: ~109 archivos mecánicos (gana `dev`, resolución por lote) + 16 de diseño a mano + 5 artefactos a regenerar + gate visual después.
- **Riesgo de datos:** 🟢 **nulo** (§3.1).
- **Riesgo real:** el par `ragRetriever.js` / `rag-embeddings.json` (§4.3) — falla **silenciosa** si se desalinea.
- **Conserva los 34 commits de `main`:** ✅ sí.

### B) Por partes (varias PRs temáticas)
- **Costo:** mayor en total. Cada corte necesita su propia resolución, y los 601 hunks están **entrelazados** entre arte y estado compartido (`useAngelitaStore`, `EscenaBase3D`, `Valle3D`).
- **Problema de fondo:** mientras se hacen las tandas, la brecha **sigue creciendo a +5,7 conflictos/día** (§4.1). Se corre detrás del bus.
- **Cuándo sí:** si el objetivo fuera solo la inteligencia, se podría hacer una PR chica con `ragRetriever` + corpus regenerado. Pero §2.2 dice que sobre queries reales eso es **neutro**, así que rinde poco.

### C) Cherry-pick de lo de mayor valor
- **Costo:** el valor está en **arte** (§1.2, §2.3), que es exactamente lo que peor se *cherry-pickea*: 86 archivos de escenas con dependencias cruzadas entre geometría, materiales y estado.
- **Veredicto:** malo para este caso. Sirve para fixes puntuales, no para 78 commits de arte entrelazado.

### D) `dev` como nueva `main`
- **Costo:** 🔴 **pierde los 34 commits de `main`** (§1.3) — incluidos los *guards* de plaguicidas vetados (`fe417d7f`, `6f72ff3b`), el modelo `qwen3.5:4b` que ya está en producción (`5721584d`), Deep Research (`1cfdab85`), la RED de trueque (`e6a1d81f`) y el fix de gates de CI (`7515fea9`).
- **Veredicto:** ❌ **descartar.** Retrocedería seguridad y producto en vivo. La única forma segura sería portar antes los 34, y eso ya es la opción A con pasos extra.

### 🎯 Recomendación: **A, con tres condiciones previas, y pronto**

**Mergear completo `dev` → `main`**, en una rama de integración (`integra/dev-a-main-2026-07-26`), **no directo sobre `main`**.

Justificación:
1. **El riesgo que daba miedo no existe.** La capa de datos, el service worker, el `package.json` y el build son **idénticos**. Lo irreversible (datos del usuario) está **descartado con evidencia** (§3.1). Lo que queda es trabajo, no peligro.
2. **El 87 % de los conflictos no requiere juicio** — gana `dev` (§4.3).
3. **Esperar cuesta,** y está medido: +5,7 conflictos/día (§4.1). Las dos ramas siguen activas, así que la brecha no se estabiliza sola.
4. **B y C no reducen el trabajo total**, lo estiran; y **D pierde seguridad**.

**Condiciones previas (bloqueantes):**

| # | Condición | Por qué |
|---|---|---|
| 1 | **Regenerar `rag-embeddings.json` con `--quantize int8`** y verificar que `ragRetriever.js` embebe *queries* con **el mismo modelo** que generó el corpus | §2.1 + §4.3. Sin esto el merge **empeora** la carga del usuario rural 5,8× y arriesga la caída silenciosa de la capa semántica |
| 2 | **Portar `7515fea9` (gates de CI) a la rama de integración**, o cambiar los disparadores para que los gates corran en `dev` | §5.2. Mergear a ciegas 678 commits no verificados es lo que hay que dejar de hacer |
| 3 | **Gate visual por contenido** (capturas) de los mundos tocados, después de resolver | §5.4. 86 de 125 conflictos son arte; el build verde no prueba que se vea bien |

**Orden sugerido:** artefactos generados (regenerar) → los 16 de diseño a mano → los 109 mecánicos por lote con `dev` ganando → build → gate CI → gate visual → PR de integración → cerrar o rehacer la PR #2649.

**Y una decisión aparte, barata:** conservar `ent` como alias de `bosque_vivo` (§3.2) para no romper enlaces guardados. Una línea.

---

## 7. Lo que NO pude verificar, y por qué

Explícito, empezando por lo irreversible.

### Sobre pérdida de datos (lo único irreversible)

| Qué | Estado | Por qué |
|---|---|---|
| Esquema de IndexedDB idéntico | ✅ **Verificado, alta confianza** | `src/db/` byte a byte idéntico, `dbCore.js` mismo hash SHA, `DB_VERSION=27` en ambas, ningún archivo agregado/borrado. Cuatro caminos independientes. |
| **Prueba de migración con base real poblada** | ❌ **NO ejecutada** | Habría que abrir la app `main` en un navegador, sembrar datos, y luego cargar el build de `dev` contra esa misma base. Requiere navegador con estado y tiempo. **Es la única prueba que convertiría "no hay cambio de esquema" en "verificado end-to-end".** |
| Datos que vivan **fuera** de `src/db/` | 🟡 **Parcial** | Verifiqué `localStorage` vía `persistStorage.js` (idéntico) y `persistMiddleware.js` (solo preferencias). No audité exhaustivamente todo uso suelto de `localStorage`/`sessionStorage` en los 551 archivos del diff. |

**Mi lectura del riesgo:** el mecanismo por el que un usuario pierde datos en una PWA es un `onupgradeneeded` que borra o transforma *stores*. Con `DB_VERSION` igual y `dbCore.js` idéntico, **ese evento no se dispara**. Considero el riesgo **muy bajo**, pero la afirmación fuerte ("cero pérdida, probado") exige la prueba con base poblada, que **no hice**.

### Resto

| Qué | Por qué no |
|---|---|
| **Suite completa de tests (913 archivos)** | No terminó en el tiempo disponible (>25 min sin completar). Corrí el gate de CI (149 tests, verde en ambas) y un diferencial del núcleo de inteligencia (dev 7 fallos vs main 13). **No sé el número absoluto de fallos de `dev`.** |
| Primer intento de tests | ❌ **Descartado por entorno contaminado**, no lo reporto: `node_modules` con enlaces duros producía *"more than one copy of React"*. Rehecho con copia real. Menciono esto para que nadie reuse ese número. |
| **eslint** | No ejecutado — instrucción explícita del encargo (~18 min). |
| **Gate visual / capturas de los mundos de `dev`** | Fuera de alcance. Es lo que decide si el arte de `dev` es mejor, y **ningún número de este informe lo sustituye**. Corre en `stg` con pantalla real. |
| **Valor de usuario del arte (§2.3)** | Sin métrica. Dije "78 commits de arte" porque es lo que puedo medir; **no es lo mismo que "el usuario ve algo mejor"**. |
| **`mundo3d-animales` vacío** | No pude reproducir ni confirmar (§5.4). La evidencia del repo lo contradice. |
| **Resultado real de una fusión resuelta** | Solo medí conflictos y aborté. No sé si tras resolver los 601 hunks el build sigue verde — es probable, pero **no está probado**. |
| **`Nightly Click Crawl` fallando en `main` hoy** | No investigado; es anterior e independiente de esta decisión. |
| Estado de las ~200 ramas | No auditado. **No borré ninguna.** |

---

## 8. Preguntas abiertas para el operador

1. **§2.1 — ¿confirma que la pérdida de la cuantización int8 en `dev` fue accidental?** Si fue deliberada (p. ej. por precisión del coseno), la recomendación cambia y hay que medir el trade-off recall vs. 5,8× de descarga. Yo asumo accidental porque el script de `dev` cuantiza por defecto y su propio comentario lo llama error.
2. **§2.4 — ¿qué modelo manda?** `main` tiene `qwen3.5:4b` en producción (#2762, 24-jul), posterior a lo de `dev`. Al resolver `llmRouter.js` / `env.js`, ¿gana `main`?
3. **§1.3 — ¿los commits C del doc del 23-jul (murales, Mercado, captura de conversaciones, bench-gate, auditor de integraciones) se portan o se archivan?** Son decisión de producto, no técnica.
4. **§5.2 — ¿se activan los gates en `dev` de forma permanente?** Sin eso, esta brecha se vuelve a abrir en dos meses.
5. **¿Por qué existen dos ramas activas?** Es la pregunta de fondo. Mientras `main` y `dev` reciban trabajo en paralelo, el problema se repite pase lo que pase con este merge.
6. **§1.4 — ¿la PR #2649 se cierra y se rehace, o se reusa?** Lleva 5 días en `CONFLICTING`.
7. **§7 — ¿quiere que se corra la prueba de migración con base poblada** antes de mergear? Es la única forma de pasar de "muy bajo riesgo" a "verificado" en lo único irreversible.

---

## Apéndice — cómo reproducir

```sh
# Divergencia
git fetch origin --prune
git rev-list --left-right --count origin/main...origin/dev     # → 34  678
git log --no-merges --oneline origin/dev..origin/main          # los 34 peligrosos

# Volumen
git diff --shortstat origin/main origin/dev

# La capa de datos (la pregunta crítica)
git diff --stat origin/main origin/dev -- src/db/              # vacío
git rev-parse origin/main:src/db/dbCore.js origin/dev:src/db/dbCore.js   # mismo hash
git show origin/main:src/db/dbCore.js | grep 'DB_VERSION ='
git show origin/dev:src/db/dbCore.js  | grep 'DB_VERSION ='

# El asset de embeddings
git cat-file -s $(git rev-parse origin/main:public/rag-embeddings.json)  # 1695435
git cat-file -s $(git rev-parse origin/dev:public/rag-embeddings.json)   # 7637871

# Conflictos — SIEMPRE en worktree descartable, SIEMPRE abortar
git worktree add --detach /tmp/probe origin/main
cd /tmp/probe && git merge --no-commit --no-ff origin/dev
git diff --name-only --diff-filter=U | wc -l                   # → 125
git merge --abort
cd - && git worktree remove /tmp/probe

# CI: qué corre de verdad en dev
gh run list --branch dev --limit 60 --json workflowName
```

---

*Diagnóstico de solo lectura. No se fusionó, no se empujó, no se desplegó, no se borró ninguna rama. El WIP del operador no se tocó.*
