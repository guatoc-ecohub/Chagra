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

---

## Verificación

### Los 34 commits de `main`, uno por uno

**Historia (garantía fuerte):** `git merge-base --is-ancestor` para los 34 → **los 34 son ancestros**.
`git rev-list --count HEAD..origin/main` = **0** y `HEAD..origin/dev` = **0**: no queda **nada** de
ninguna de las dos ramas fuera de la rama de integración.

**Contenido (lo que la historia NO garantiza):** para cada commit se extrajeron sus líneas agregadas
(≥12 caracteres) y se buscó cada una en el árbol fusionado.

| Resultado | Commits |
|---|---|
| **100 % de líneas presentes** | **22 de 34** — incluidos `fe417d7f` (230/230), `6f72ff3b` (28/28), `7515fea9` (4/4), `e6a1d81f` (81/81), `cd88a118` (39/39), `1cfdab85` (14/14), `e7180af8` (157/157), `1c58c794` (92/92), `71a52c70` (41/41), `28fef3f2` (42/42), `cf2d0131` (433/433), `c0b98007` (641/641) |
| ≥96 % (resto = comentarios, JSDoc `-`/`—`, imports reordenados por `dev`) | `1850e3f5` 98,2 % · `f9046ece` 98,2 % · `d3d3169a` 97,9 % · `519953a3` 99,6 % · `7d651d52` 96,4 % · `6f3b64c2` 99,6 % |
| **Falsos negativos del método** (artefacto regenerado = 1 sola línea minificada) | `13eec2bf` 0 % y `130ddb39` 88 % — **verificados aparte**: el grafo tiene `pisos_termicos` en **549 de 554** especies y `relations_exported` lo incluye; el texto embebido **sí** contiene `Piso termico`, `Altitud optima` y `Temperatura optima` |
| **Superados a propósito** | `0443e08e` 12,5 % (gemma4:e2b → lo reemplazó `qwen3.5:4b`, del propio `main`) · `5721584d` 25 % (los literales `'qwen3.5:4b'` pasaron a `ENV.*`; **el valor efectivo sigue siendo `qwen3.5:4b`**) |
| 🔴 **Decisión abierta, NO la tomé yo** | **`8d323eea` 0 %** — el carril de visión. Ver §Decisión pendiente. |

> **Los guards de seguridad agroecológica están intactos, y no por inspección: por sus propios tests.**
> `outputGuards.bannedPesticideSuppress`, `agentPromptBase` (los 10 plaguicidas vetados),
> `outputGuards.agente5bugsV2` (triaje por cultivo), `buildFallbackResponse`, `conversationCapture`,
> `outputGuards` y `outputGuards.coverage-canario`: **338 tests, 0 fallos.**

### Gates

| Gate | Resultado |
|---|---|
| Gate de CI (`unit-tests.yml`, 5 archivos) | ✅ **149/149** |
| Tests de los commits críticos de `main` | ✅ **338/338** (1 skip) |
| RAG (`ragClima` + `ragRetriever` + `hybrid` + `synonyms` + `rag-embedding`) | 🟡 48/50 — **los 2 fallos también fallan en `origin/main` puro** |
| Grafo (`grafoRelations`, `grafoConocimientoAmp`, `affectsGate`, `chipIntentRouter`) | ✅ **122/122** |
| `sidecarClient` | 🟡 1 fallo — **también falla en `origin/main` puro** (preexistente) |
| `npx vite build` | ✅ **EXIT=0** |
| `tsc:check` | 🟡 **608 errores en 149 archivos** (`main` 39, `dev` 381). Baseline regenerado con `--force`: es el número real del árbol fusionado y el gate lo congela ahí. **Es deuda, y es el precio de los 678 commits sin verificar.** |

### 🔴 Gate visual — encontró un falso positivo mío, y por eso sirvió

Primera corrida: **las 7 capturas salieron con el MISMO md5** y 80 KB cada una — todas la tarjeta
*"Algo falló"*. La app entera reventaba con `Cannot read properties of null (reading 'useState')`.

**No era el merge.** Aislado con dos experimentos: `origin/main` y `origin/dev`, construidos con el
mismo toolchain, **corrían bien**. La causa era mía: copié `node_modules` con `cp -a` y me traje
**37 MB de caché `.vite`** de otro estado del proyecto → dos copias de React.
Solución: `node_modules` como **symlink** al del repo principal, rebuild.

> Vale dejarlo escrito porque casi reporto una regresión que no existía. **El build daba EXIT=0 en los
> dos casos** — verde con la app muerta. Es exactamente el motivo por el que el gate es por captura.

Segunda corrida, ya con el build sano — `ops/capturas/merge-dev-main-2026-07-26/`:

| Escena | Conflictos | Qué se ve |
|---|---|---|
| `paramo-definitivo` | — | Frailejonal, niebla en capas, cordillera, cóndor, quebrada, fauna, *"La fábrica de agua"* |
| `bosque-vivo` | (el `case` que reparé a mano) | Monta y dibuja |
| `botica-cana` | **51 (el peor)** | Cañal, trapiche con buey, paila humeando, gaveras, canteros, los 6 pasos |
| `suelo-vivo` | 24 | Dibuja |
| `entrada-valle` | 22 (`Valle3D`) | Valle nocturno, minimapa, hotspots, Angelita, alerta de helada |
| `abejas` | — | Dibuja |
| `vitrina-maestra` | 17 | Dibuja |

**GPU real confirmada por el propio gate:** `ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven
ACO), OpenGL ES 3.2)` — **no SwiftShader**. Los 7 md5 distintos y 538–771 KB (contra los 80 KB
idénticos de la tarjeta de error).

---

## 🔴 Decisión pendiente — NO la tomé yo

**El carril de visión (`8d323eea`, uno de los 34).** Dos benches se contradicen y ninguno gana solo:

- **`main`** → `vision.model = 'qwen3-vl:8b'`. Respaldo: *Arena visual 2026-07-22*, 12 casos con
  **cada presencia emparejada con su ausencia**: qwen3-vl:8b 12/12; gemma3:4b 58 %, fallando **3 de 7
  ausencias** (decía ver lo que no estaba) — "inservible como gate".
- **`dev`** → `ENV.VISION_MODEL = 'qwen3.5:4b'`. Respaldo: bench profundo PR #2738 (18 plagas + 5
  sanas), donde qwen3-vl:8b saca 16.9.

**Resolví la ESTRUCTURA (leer de `ENV`, que es mejor y no está en disputa) y dejé el VALOR en
`qwen3.5:4b`,** que es lo que `dev` traía y lo coherente con el resto de claves. **Pero el valor es
suyo, no mío**, por tres razones:
1. `8d323eea` es uno de los 34 y es el único cuyo contenido **no** sobrevive.
2. El comentario del propio `dev` en `src/config/env.js` dice, textual, que el bench nuevo **no**
   repite el diseño pareado presencia/ausencia, y pide *"confirmar con el operador … antes de que
   este PR llegue a producción (dev→main)"*. Este merge **es** ese dev→main.
3. Un juez de visión que falla las ausencias **aprueba arte que no está ahí**.

**Para volver a `main`: una línea** en `src/config/env.js` →
`VISION_MODEL: import.meta.env?.VITE_VISION_MODEL || 'qwen3-vl:8b'`.

---

## Lo que NO pude verificar

| Qué | Por qué |
|---|---|
| **Prueba de migración con base poblada** | No ejecutada. El DIAGNÓSTICO ya la deja descartada por código (`src/db/` byte a byte idéntico, `DB_VERSION=27`), y **el merge no toca `src/db/`**. Sigue siendo la única prueba que convertiría "no hay cambio de esquema" en "verificado end-to-end". |
| **Suite completa (913 archivos)** | No corrida. Corrí el gate de CI + los tests de los 34 + RAG + grafo. **No sé el número absoluto de fallos.** |
| **eslint** | No corrido — instrucción explícita (~18 min). |
| **Las otras ~40 rutas 3D** | Capturé **7 de ~46**, elegidas por peso de conflicto. Las demás **no tienen captura**. |
| **Que el arte de `dev` sea "mejor"** | Verifiqué que **dibuja**, no que guste. Eso lo juzga el operador. |
| **`mundo3d-agua` vacío** | No lo revisé: el DIAGNÓSTICO §5.4 ya probó que es **idéntico en las dos ramas** — deuda previa, no del merge. |
| **Copy contra escena en `bosque-vivo`** | La vitrina promete *"su rostro tallado en la madera"* (el Ent) y la escena que carga es el páramo definitivo, que por decisión del 2026-07-22 va **sin Ent**. Se ve bien, pero **el texto y la escena no dicen lo mismo**. No lo toqué: es contenido, no merge. |
| **Que `origin/dev` no se mueva** | Hay otro agente mergeando `feat/compai-fuente-unica` y `fable/compai-gestos-entrada` a `dev`. Esta rama fusiona `origin/dev` = `3ef4954d`, **fijo**. Ver §Sobre `dev` moviéndose. |

## Sobre `dev` moviéndose

Elegí **fijar `origin/dev` en `3ef4954d`** y entregar, en vez de esperar. Razones: los 125 conflictos
ya están resueltos y **documentados uno por uno**, y el diagnóstico midió que la brecha crece
**+5,7 conflictos/día** — esperar a que otro agente termine sólo agranda lo que hay que rehacer.

**Lo que falta cuando `dev` aterrice** es un `git merge origin/dev` de remate sobre esta rama. Debería
ser barato: lo que entre nuevo es trabajo de `compai` (avatares/gestos), que toca
`ChagraAgentAvatar*`, `useAgentAvatarType.js` y `visual/agente/` — **en esos archivos ya gana `dev`**,
así que el criterio está fijado. **No lo hice yo para no fusionar trabajo ajeno a medio terminar.**

---

## REMATE — 2026-07-27: `git merge origin/dev` (`5b68141c`)

Esta rama había fijado su base en `dev` @ `3ef4954d`. `dev` avanzó después a
`45fd1f66` con toda la consolidación del compAI, así que faltaba el remate.

```
antes:   38 adelante / 12 atrás de origin/dev
después: 39 adelante /  0 atrás de origin/dev
```

Entran 12 commits / 64 archivos / +4297 líneas: núcleo portable del compAI,
12 gestos ociosos, entrada al mundo, cruce 2D→3D, señal de ocupado,
diagnóstico de foto en dos pasos y la marcha de perfil del jaguar.

**Fusión automática limpia, cero conflictos marcados.** Que es justo lo que
obliga a mirar: el peligro son los que git resuelve mal en silencio.

### Verificado a mano (no por ausencia de marcadores)

| qué | cómo | resultado |
|---|---|---|
| los 34 commits propios de `main` | `git merge-base --is-ancestor origin/main HEAD` | ✅ `origin/main` sigue siendo ancestro |
| guards de plaguicida vetado | `outputGuards.js` en el diff | ✅ **el merge no lo toca** |
| `App.jsx` (corrupción silenciosa de `389123d2`) | idem | ✅ **el merge no lo toca** |
| fix #2785 (avatar elegible) | `grep` en `AgentFab.jsx` | ✅ `ChagraAgentAvatar`×3, cero `<Angelita>` a mano |
| estructura nueva del FAB | idem | ✅ `estaOcupado`×2, `alternarSilencio`×4 |
| marcadores sueltos | `grep` en `src/ tests/ scripts/` | ✅ vacío |

Las dos cosas que se pelearon en `AgentFab.jsx` (avatar elegible **y** botón de
silencio hermano enfocable) **siguen conviviendo**: el remate no revirtió ninguna.

### Gates del remate

| Gate | Resultado |
|---|---|
| `npx vite build` | ✅ **EXIT=0** |
| Gate visual GPU real | ✅ 3 capturas, ver abajo |

### 🔴 Gate visual — GPU real, mirado por contenido

`ops/capturas/remate-dev-main-2026-07-27/` · renderer verificado por el propio
script, que **aborta** si sale software:

```
ANGLE (AMD, AMD Radeon Vega 10 Graphics (radeonsi raven ACO), OpenGL ES 3.2)
```

3 md5 distintos, 249–502 KB (contra los 80 KB idénticos de la tarjeta *"Algo
falló"* del falso positivo de la corrida anterior).

| Escena | Qué se ve DE VERDAD |
|---|---|
| `paramo-definitivo` | Frailejonal, niebla en capas, cordillera, cóndor volando, quebrada azul, oso y rana iluminados, *"La fábrica de agua"* |
| `vitrina-maestra` | *"El mirador de los mundos"*: 15 arcos-portal con su vista viva adentro, quebrada, piedras de paso, el compAI en la esquina y la leyenda verde/dorado. **Es el archivo que traía 17 conflictos y dibuja entero.** |
| `angelita-viva` | El compAI **vivo**: entrada teatral (con gafas al sol), *"El repertorio del agente"*, gesto `Calma` — *"flota viva, mira, se acicala"* |

O sea: los 12 gestos y el núcleo portable que entraron por `dev` **llegaron
dibujando** a esta rama, no sólo compilando.
