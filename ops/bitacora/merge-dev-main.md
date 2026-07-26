# Bitácora — merge completo `dev` → `main`

**Rama de integración:** `integra/dev-a-main-2026-07-26`
**Worktree:** `/home/kortux/Workspace/wt-integra-dev-main` (host `stg`)
**Base:** `origin/main` = `e6a1d81f` · **Se fusiona:** `origin/dev` = `3ef4954d`
**Diagnóstico de partida:** `ops/DIAGNOSTICO-brecha-dev-main.md` (no se re-mide lo ya medido allí)

**Límites del encargo (no negociables):**
- ❌ NO mergear a `main` · ❌ NO pushear a `main` · ❌ NO desplegar a `chagra.app` · ❌ NO borrar ramas
- ✅ Rama de integración pusheada, entregada para revisión del operador

---

## Bitácora cronológica

### 2026-07-26 — Paso 0: contexto y preparación

- Host verificado: `stg` (`hostnamectl` → `stg`). No es `alpha`. Sin `sudo` fuera de whitelist.
- `git fetch origin --prune`. Refs confirmadas idénticas a las del diagnóstico:
  - `origin/main` = `e6a1d81f`
  - `origin/dev`  = `3ef4954d`
  - `git rev-list --left-right --count origin/main...origin/dev` → **34 / 678** ✅ coincide
- Árbol de trabajo principal (`/home/kortux/Workspace/chagra`, rama `feat/compai-fuente-unica`):
  **sin WIP sin commitear** al momento de arrancar (solo `ops/DIAGNOSTICO-brecha-dev-main.md` sin seguimiento).
  Se trabaja en worktree separado para **no pisar** a los otros agentes activos.
- Worktrees ajenos vivos detectados (no se tocan): `fable/compai-gestos-entrada` (`/home/kortux/Workspace/wt-compai-gestos`),
  `fable/zariguya-crias-al-lomo`, `fable/abejas-vivas`, `fable/paramo-*`, `fable/milpa-y-cerdos`, `fable/vaca-y-oso-produccion`, y ~25 más.
- Worktree de integración creado: `git worktree add -b integra/dev-a-main-2026-07-26 … origin/main`.
- Modelos de embedding disponibles en `stg` (para la condición #1): `nomic-embed-text:latest` (274 MB) y
  `snowflake-arctic-embed2:latest` (1,2 GB) — ambos locales, no hace falta `alpha`.

### Paso 1: la fusión

`git merge --no-commit --no-ff origin/dev` sobre la rama de integración (basada en `origin/main`).
**125 archivos en conflicto** — coincide exactamente con el diagnóstico. Por estado: 80 `AA`, 44 `UU`, 1 `UD`.

### Paso 2: mapa de los 34 commits de `main` contra los conflictos

Antes de resolver nada se cruzó, commit por commit, qué archivos de los 34 caen en zona de conflicto.
Resultado (lo que guio TODA la resolución):

- **`fe417d7f` y `6f72ff3b` (los guards del plaguicida vetado) NO están en conflicto.**
  Sus archivos (`outputGuards.js`, `agentPromptBase.js`, y sus tests) fusionaron limpio.
- `7515fea9` (gates de CI): sus 4 workflows **no están en conflicto** → los disparadores arreglados de `main` sobreviven intactos. **La condición #2 la satisface la propia dirección del merge.**
- `1cfdab85` (Deep Research), `cd88a118` (juez async), `e6a1d81f` (RED de trueque), `71a52c70` (captura), `1c58c794`, `e7180af8`, `28fef3f2` (mercado): **ninguno en conflicto**.
- Sí requieren criterio: `5721584d`/`8d323eea`/`0443e08e` (modelos), `f9046ece` (Angelita), `d3d3169a`, `130ddb39`, `13eec2bf`, `fdb134a3` (RAG/grafo), `519953a3`, `7d651d52`.
- `1850e3f5` toca 124 de los 125 archivos: es un *port masivo* de `main` a las escenas 3D, no aporta señal por archivo — se trató archivo por archivo.

**Comprobación de contenido (no de historia):** en el árbol ya fusionado, estos archivos quedan
**idénticos a `origin/main`**: `agentPromptBase.js`, los 4 workflows de CI, `sidecarClient.js`,
`redService.js`, `conversationCaptureService.js`, `agentService.js`, `mercado.html`,
`src/entries/mercado.jsx`, `vite.config.js`, `deploy.yml`.
Dos difieren y se auditaron a mano: `outputGuards.js` y `aiService.js` (ver §Hallazgos).

### Paso 3: los 104 conflictos mecánicos — gana `dev`

Arte, escenas 3D, criaturas y componentes 2D: `git checkout --theirs`. Son evoluciones posteriores
del mismo trabajo. Antes de aplicarlo se verificó que `dev` ya contuviera el contenido de `main` en
los archivos donde caían commits de los 34:

| Commit de `main` | Archivo mecánico | ¿`dev` ya lo trae? |
|---|---|---|
| `519953a3` PerformanceMonitor | `valle/Valle3D.jsx`, `escenas/EscenaBase3D.jsx` | ✅ sí (8 marcadores en ambas ramas) |
| `7d651d52` thermal grounding | `AssetDetailView.jsx`, `GuildSuggestions.jsx`, `TelemetryAlerts.jsx` | ✅ sí (`speciesThermalZones` presente en ambas) |

Se **excluyeron** del lote y se trataron a mano 21 archivos (los 16 de diseño del diagnóstico + 5 que
agregué porque tocan los 34 commits o el login): `outputGuards.test.js`, `visual/agente/index.js`,
`MundoParamo3D.jsx`, `rutasProdChagraApp.js`, `LoginScreen.jsx`.

### Paso 4: los 21 conflictos de diseño, uno por uno

| # | Archivo | Resolución | Por qué |
|---|---|---|---|
| 1 | `src/services/ragRetriever.js` | **UNIÓN** | Ver §Hallazgo 1. Estructura de `dev` + las 2 garantías de `main`. |
| 2 | `scripts/build-rag-embeddings.mjs` | `dev` | `dev` reestructura el texto embebido (cabecera de identidad, #2733) y **conserva todos los campos de clima/altitud que agregó `main` en #2583**. Superset. |
| 3 | `public/rag-embeddings.json` | **REGENERADO** | Artefacto: nunca se elige un lado. Condición #1. |
| 4 | `public/grafo-relations.json` | **UNIÓN** | Ver §Hallazgo 2. |
| 5 | `public/cycle-content/manifest.json` | `main` | Diferencia ÚNICA: el campo `generated_at`. Contenido byte a byte igual. Se toma el más nuevo (07-24). |
| 6 | `public/chagra-stats.json` | `main` | Idem: solo `generated_at`. |
| 7 | `scripts/tsc-baseline.json` | **REGENERADO** | `main` 39 errores vs `dev` 381. Ninguno describe el árbol fusionado. |
| 8 | `.github/workflows/codeql.yml` | `dev` | `dev` solo **agrega** exclusiones de ruta (`stress/**`, `bench/**`). Aditivo. |
| 9 | `src/config/env.js` | `dev` | `dev` es **superset**: crea las 5 claves de modelo como fuente única de verdad, y **las 5 valen `qwen3.5:4b`** — exactamente el modelo que `main` puso en producción en #2762. `main` solo tenía `NLU_MODEL`. No hay regresión de modelo. |
| 10 | `src/services/llmRouter.js` | `dev` | Misma razón: pasa de literales a `ENV.*`. Valor efectivo idéntico al de `main`. **Excepción abierta: el carril de visión — ver §Decisión pendiente.** |
| 11 | `src/services/entityExtractor.js` | `dev` | `main` fijaba `'qwen3.5:4b'`; `dev` lee `ENV.EXTRACTOR_MODEL`, que ahora vale `qwen3.5:4b`. Mismo valor, mejor estructura. Se corrigió un comentario *stale* de `dev` que decía "gemma4:e4b". |
| 12 | `src/services/canonicalHostRedirect.js` | `dev` | `dev` **agrega** `isThreeDWorldHost()` para `3d.guatoc.co`. Aditivo — y es justo el gancho de separación de hosts que pide la decisión de producto de los dos valles. |
| 13 | `src/hooks/useAgentAvatarType.js` | `dev` | Aditivo: agrega `zariguya` como 3er avatar y el mapa `AVATAR_NOMBRE`. |
| 14 | `src/hooks/useAngelitaGuia.js` | `dev` | Única diferencia: guion `-` vs raya `—` en JSDoc. Cosmético. |
| 15 | `src/store/useAngelitaStore.js` | `dev` | Idem, cosmético (`-` vs `—`). |
| 16 | `src/prodApp/ProdChagraApp.jsx` | `dev` | Quita el lazy de `MundoParamo3D` (archivado) y agrega `EntradaCampesina` (reactivada). Coherente con #18 y #20. |
| 17 | `src/services/__tests__/outputGuards.test.js` | `dev` | Única diferencia: `toContain('ica.gov.co')` → `toMatch(/ica\.gov\.co/i)`. Misma intención, insensible a mayúsculas. **No debilita el guard.** |
| 18 | `src/visual/agente/index.js` | `dev` | Aditivo (`TEXTO_NO_SE`). Se verificó que **sobreviven los exports `AngelitaGuia` y `useAngelitaGuia` que agregó `f9046ece`**. |
| 19 | `src/components/LoginScreen.jsx` | `dev` | `main` fijaba `ChagraAgentAvatarAngelita`; `dev` usa el genérico `ChagraAgentAvatar`, que respeta el avatar elegido por el usuario (coherente con #13). Cosmético, **no toca autenticación**. |
| 20 | `src/mockups/MundoParamo3D.jsx` (`UD`) | `dev` (borrado) | Ver §Hallazgo 3 — es la única pérdida parcial de los 34, y es deliberada. |
| 21 | `src/config/rutasProdChagraApp.js` | `dev` **+ 1 línea** | Decisiones documentadas de `dev` (páramo definitivo, `EntradaCampesina` fuera de EXCLUIDO). **Se conserva el alias `ent`** que `dev` quitaba, para no romper enlaces guardados (DIAGNÓSTICO §3.2). |

---

## Hallazgos

### Hallazgo 1 — `ragRetriever.js`: `dev` rompía un test que `dev` mismo trae

El conflicto de `flattenDoc` son **dos arreglos independientes del mismo bug** (el umbral
`length > 20` botaba el 62% del saber):

- **`main` (#2579, `fdb134a3`, uno de los 34):** indexa el dato corto como `clave: valor` y añade una
  lista negra de *plumbing* (`CLAVES_RUIDO`: `id`, `slug`, `version`…).
- **`dev`:** etiquetas legibles + `isContextualField` (números y claves de clima/altitud) +
  `esTextoIndexable` (bota `"12"`, ids hex, `"si"/"no"`).

**Medido, no opinado.** Corriendo `ragClima.test.js` + `ragRetriever.test.js` + `hybrid` + `synonyms`:

| Resolución | Tests que fallan |
|---|---|
| lado `dev` puro | **5** |
| lado `main` puro | **no compila** — su hunk usa `${prefix}${key}` y el código compartido de abajo usa `path`, que solo define `dev`. Empalmarlo a secas rompe la función. |
| **UNIÓN (la aplicada)** | **2** |

Los 2 que quedan (`SEC-002 corpusStats`, `P0-1 FAIL-CLOSED`) **fallan también en `origin/main` puro**
(verificado: `origin/main` falla 9 en ese archivo). Son **preexistentes en producción**, no los
introduce el merge.

Los 2 que fallaban con `dev` y la unión arregla son literalmente:
`el dato corto lleva su clave: "calido" suelto no dice nada` y
`NO indexa plumbing (id/slug/version) — diluiria el IDF`.

> **Esto es la tesis del diagnóstico hecha carne:** `dev` traía el test de `main` en el árbol y lo
> estaba **fallando sin que nadie se enterara**, porque los gates nunca corrieron en `dev` (§5.2).

**El par atómico quedó alineado y verificado:**

| | valor |
|---|---|
| `ragRetriever.js` → `embedQuery` | `model: 'nomic-embed-text'` |
| `scripts/build-rag-embeddings.mjs` → `EMBED_MODEL` | `nomic-embed-text` |
| Dimensión comprobada contra Ollama en vivo | **768** |

No hay riesgo de 1024d contra 768d: **los dos lados dicen `nomic-embed-text` y el endpoint devuelve 768.**

### Hallazgo 2 — `grafo-relations.json`: el export de `dev` era un mes más viejo

| | `main` | `dev` |
|---|---|---|
| `generated_at` | **2026-07-18** | 2026-06-20 |
| especies | **550** | 134 |
| `pisos_termicos` por especie (#2582) | ✅ | ❌ |
| secciones de conocimiento | ❌ | ✅ 9 (`_pest_synonyms`, `_pest_index`, `_piso_termico`, `_micorrizas`, `_polinizacion`, `_cambio_climatico`, `_fitoquimica`, `_alelopatia`, `_pest_synonyms_note`) |

Elegir un lado perdía algo en cualquier dirección. **Se construyó la unión:** base `main` (550
especies con piso térmico) + las **4 especies que solo tenía `dev`** (`guazuma_ulmifolia`,
`ceroxylon_quindiuense`, `thunbergia_alata`, `cenchrus_clandestinus`) + las **9 secciones de
conocimiento de `dev`** + los campos de auditoría de `_meta` de `dev`.

Resultado: **554 especies**, 345 KB. `_meta.merge_note` deja escrito el procedimiento.
Verificado con `grafoRelations.test.js`, `grafoConocimientoAmp.test.js`, `affectsGate.test.js`,
`chipIntentRouter.test.js`: **122/122 en verde** (el primer intento falló 1 porque `_meta` no llevaba
los campos de auditoría de `dev`; se corrigió).

### Hallazgo 3 — la única pérdida parcial de los 34 commits: `f9046ece`

`dev` **archivó** `src/mockups/MundoParamo3D.jsx` (a `src/mockups/_archivo/`) por decisión del
2026-07-22, y re-apuntó `diorama_paramo` a `MundoEntBosque`. `main`, en `f9046ece`, le había agregado
a ese archivo **un botón** ("Explorar la vida del suelo" → `#/mockups/mundo-microfauna-3d`).

**Se aceptó el archivado de `dev`** (es la decisión más nueva y documentada). Lo que se pierde es ese
botón, dentro de un mundo que ya no está ruteado. **Todo el resto de `f9046ece` sobrevive y se
verificó archivo por archivo:** `AngelitaGuia.jsx`, `angelita-guia.css`, `useAngelitaGuia.js`,
`MundoMicrofauna3D.jsx`, `MicrofaunaSuelo.jsx`, y los exports en `visual/agente/index.js`.

> ⚠️ **Y de paso, un bug que el merge habría metido en producción:** `main` (en `1850e3f5`) agregó
> `const MundoParamo3DMockup = lazy(() => import('./mockups/MundoParamo3D'));` en `src/App.jsx`.
> Esa constante **no se usa en ningún lado**, y `App.jsx` fusiona **limpio** — así que el merge dejaba
> un `import` a un archivo que `dev` borra: **build roto, sin conflicto que lo avisara.**
> Se retiró el import muerto y quedó documentado en el propio archivo.

### Hallazgo 4 — `outputGuards.js`: `dev` quitó las guardas de nulo (fusionó limpio, nadie lo vería)

`outputGuards.js` **no está en conflicto**, pero el árbol fusionado difiere de `main` en 46 líneas.
Todas del mismo tipo: `if (x && x.modified)` → `if (x.modified)`. Es un cambio de `dev` sobre el
archivo que contiene los guards del plaguicida vetado.

No es un cambio inocuo por definición: si algún guard devolviera `undefined`, la cadena entera
lanzaría. **Verificado empíricamente que hoy no rompe** (los tests de guards pasan, ver §Verificación),
pero **queda anotado como deuda**: es una red de seguridad que `dev` retiró sin que ningún gate lo
mirara.

### Hallazgo 5 — `aiService.js`: el merge queda MEJOR que cualquiera de los dos lados

También fusionó limpio, también difiere de `main`. `main` tenía **tres** modelos de visión
hardcodeados en distintos sitios (`gemma3:4b`, `llama3.2-vision:11b`). `dev` los unifica leyendo
`ENV.VISION_MODEL`. Combinado con la resolución de `env.js`, el resultado es un solo modelo,
configurable, sin literales dispersos — y retira `llama3.2-vision:11b`, que según el bench de `dev`
da **0% de honestidad y alucina diagnóstico en TODAS las muestras sanas de control** (peligroso en una
función de salud de planta).

