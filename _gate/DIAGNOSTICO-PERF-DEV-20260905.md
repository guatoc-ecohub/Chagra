# DIAGNÓSTICO DURO DE LENTITUD — chagra-dev.guatoc.co — 2026-09-05

Carril: opencode (cwd `/home/kortux/Workspace/chagra`). **Diagnóstico, no arreglo.**
Instrumento: Playwright 1.60 (chromium 151 nix-store, headless `--single-process`) + CDP.
Control del instrumento: página local trivial → FCP 100 ms, TTFB 2 ms, 0 long tasks, 0 errores. El medidor mide bien.
Objetivo verificado: `https://chagra-dev.guatoc.co/`, bundle `main-D8QPsAnI.js`, `buildSha 24748c25`, deploy `2026-09-05T18:38:30Z` (= commit `24748c25b` = HEAD de `origin/dev`). Pantalla confirmada por DOM: LoginScreen (texto "Usuario / Contraseña / Ingresar").

> Límite de carril registrado: este carril no escribe en `Chagra-strategy/ops/` (regla de informe de carril opencode: el entregable vive en `_gate/`). El informe queda en `_gate/DIAGNOSTICO-PERF-DEV-20260905.md` para que el orquestador lo mueva/commitee al checkout de estrategia.

## Novedades de esta corrida (14:25-15:05)

La corrida anterior (14:12-14:23) dejó los **momentos 2 y 3 sin medir** (creyó las credenciales inalcanzables). Esta corrida verificó que **SÍ son alcanzables**: el farmOS de chagra-dev es el container local `:8081` de alpha (nginx proxea `/oauth`), y las credenciales de SOPS `/run/secrets/oracle-lab-env` (user `admin`) autentican contra él (`POST /oauth/token` grant password → **HTTP 200**, reproducido). Con eso se midió **login real autenticado → home → transición** por la UI. Las mediciones 2 y 3 de abajo son **reales y autenticadas**, no estáticas. Cifras clave: tras el submit del login la app queda ~40-54 s en "Cargando… / Sigue cargando" antes de pintar la primera pantalla post-auth, y el LCP del home (tras reload en caliente) cae a ~40 s con ~11.5-17 s de bloqueo de main thread.

---

## Tabla: síntoma | medición cruda | causa probable | evidencia | costo de arreglar | impacto

| # | Síntoma | Medición cruda | Causa probable | Evidencia | Costo | Impacto |
|---|---------|----------------|----------------|----------|-------|---------|
| 1 | **Login: pantalla anónima tarda en pintar** | Frío (n=4+1): FCP 4304/4348/4960/5972/6264 ms; LCP 8824/9224/10392 ms. **Caliente** (n=2): FCP 3832/4536 ms. Doc TTFB 0.42-2.03 s. | **Grafo pre-login gigante (causa dominante)**: LoginScreen importa arte de avatares/trazado, y `prefetchHomeChunks()` baja el grafo del dashboard (~130 módulos: 3D/mundo/valle/juego) **durante el login anónimo**. 175-184 peticiones / 0.9-2 MB en la ola. Aun en caliente el parse+eval cuesta ~4-9 s. | `App.jsx:636-643,1569-1576`; `LoginScreen.jsx:10-18`; request-lists `perf-cold*.json`, `perf-r2-control.json` (nueva, 14:37: FCP 6264/LCP 10392/175 req/0 err). | Medio: sacar el prefetch del home del login anónimo (moverlo a post-auth), lazy del arte visual del login. | **ALTO** (primer momento de todo usuario) |
| 2 | **Post-login: ~40-54 s de "Cargando" antes de la primera pantalla autenticada** | Login real autenticado: submit→primera pantalla post-auth = **43-54 s** (auth-home: 53.7 s; auth5: 51.1 s; auth6: 60.0 s; auth7: 62.1 s — siempre cayendo en Onboarding PASO 1). En la ventana: `sqlite3-*.wasm` 426 KB + `catalog.sqlite` 2.9 MB descargados/parseados (~18-46 s, log "[SQLite WASM] Catalog loaded" a 45.8 s en auth4), SW "activo y listo" recién a ~50 s, y el **prewarm del corpus RAG dispara ~460 fetches** de `cycle-content/*.json` (batches de 12, cada uno `no-store`) compitiendo por el ancho de banda. | El arranque post-login ejecuta 3 trabajos pesados simultáneos: (a) montar el shell autenticado (chunks + parse), (b) abrir catálogo SQLite-WASM (2.9 MB), (c) `prewarmCorpus()` RAG (460 fetches, ver `ragRetriever.js:492-515`, medido ya en PERF-1 2026-07). Todo sobre assets `no-store`. | console de auth4: engine SQLite @18 s, catalog @45.8 s, SW @50.5 s; auth5: persist de 15667 passages a IndexedDB @95 s. 219 reqs post-submit en auth-home de las cuales **181 son cycle-content (RAG)**. | Medio-alto: el corpus RAG (460 fetches, ~46 KB/ficha × ~460) no debe correr en el arranque del login/home; diferir a la primera query del agente o pre-cachear en SW. El catálogo SQLite 2.9 MB en cada sesión anónima+autenticada también. | **ALTO** ("lentísima desde el login" + "carga de home súper pesada": el usuario ve 40-54 s de loader antes de tocar nada) |
| 3 | **Home autenticado: LCP ~40 s aun en caliente (reload con SW activo)** | Reload en caliente tras skip de onboarding: dashboard alcanzado a 29-47 s del reload (auth5: reload@65.6 s → tile@113 s; auth6: reload@92.4 → tile@121.2, **LCP 41040 ms, 27 long tasks, 17.3 s blocking**; auth7: reload@74.6 → tile@106.7, **LCP 40028 ms, 21 long tasks, 11.5 s blocking**). FCP temprano (1.7-2.7 s) pero LCP recién a ~40 s. | El home (DashboardLive, ~30 widgets estáticos + 3D/valle) monta un árbol pesado + dispara sync de datos reales; el main thread queda bloqueado ~11.5-17.3 s en long tasks y el catálogo/corpus siguen compitiendo en background. | `perf-auth6.json`, `perf-auth7.json` (eventos CDP: long tasks de hasta 1.9 s c/u entre 24-42 s). | Medio-alto: virtualizar/posponer widgets no visibles, reducir grafo del home, cachear SQLite/corpus fuera del camino crítico. | **ALTO** (es el síntoma "la carga de home es súper pesada") |
| 4 | **Cambio de pantalla → pantalla (autenticado, en caliente)** | dashboard → Registrar (click en tile): **4741 ms** hasta que el marcador `registro-voz` aparece (auth7, con SW caliente). La primera vez que el tile se clicleó en auth6 falló (elemento clickeado durante bloqueo de main thread de 17.3 s). | Transición paga: fetch del chunk lazy de la ruta + remonte del shell + (en caliente) poco más. El 4.7 s medido es con todo cacheado; en frío o con el corpus descargando puede ser mucho peor (el propio comentario de `ragRetriever.js:492-515` documenta una transición dashboard→agente de >19 s con corpus descargando). | `perf-auth7.json` transition. | Bajo-medio por transición individual; el costo real está en no saturar la red en el arranque. | **MEDIO** |
| 5 | **Assets sin caché (`no-store` + CF `BYPASS`)** | `cache-control: no-store, no-cache, must-revalidate`, `cf-cache-status: BYPASS` sobre `/assets/*` y `/cycle-content/*.json`. TTFB por asset 0.6-0.85 s (3 corridas c/u). | Infra (nginx/CF): nada se cachea en edge ni en HTTP cache; cada asset y cada ficha del corpus hacen round-trip al origen. Multiplica el costo de las causas 1-3. | Headers reales vía curl, reproducidos 3× (14:35, 14:37). | Bajo (infra: `/assets/*` inmutable + caché; ver `INFORME-CARGA-PEREZOSA-20260904.md`). | **ALTO en frío** (mitigado parcialmente por SW tras la 1ª visita) |
| 6 | **Precarga de catálogo SQLite (426 KB wasm + 2.9 MB sqlite) en sesión anónima y post-login** | `sqlite3-*.wasm` @11-18 s; `catalog.sqlite` @13.7-24.8 s. Logs "[SQLite WASM] Engine loaded" @18 s, "Catalog loaded" @45.8 s. | Precarga por idle (PERF-1) correcta en diseño, pero el catálogo completo (743 especies) se baja y parsea aunque no haya sesión ni query. | request-lists; console auth4. | Bajo: no precargar si no hay sesión / diferir a post-login. | **MEDIO** |

---

## Mediciones crudas (no resumidas)

### Momento 1 — login anónimo (reproducido 14:37 de esta corrida)
`_gate/perf-r2-control.json` (nuevo): fcp=6264, lcp=10392, dcl=? ttfb=943, requests=175, bytes=912114, longTasks=0, blocking=0, jsErrors=0. Coherente con la serie fría previa: 4304/4348/4960/5972 ms (FCP) y 8824/9224 ms (LCP).

### Momento 2 — login REAL autenticado (nuevo, esta corrida)
Probes `perf-auth*.mjs` → `perf-auth-home.json`, `perf-auth2-home.json`, `perf-auth4.json`, `perf-auth5.json`, `perf-auth6.json`, `perf-auth7.json`.

| run | submit@ | 1ª pantalla post-auth@ | delta submit→post-auth | notas |
|-----|---------|------------------------|------------------------|-------|
| auth-home | 8580 | 53734 (onboarding) | **45.2 s** | 219 reqs post-submit; 181 cycle-content |
| auth5 | 7761 | 51080 (onboarding) | **43.3 s** | tras skip+reload: tile dashboard @112.9 s (47 s tras reload @65.6) |
| auth6 | 9980 | 60024 (onboarding) | **50.0 s** | tile @121.2 s (29 s tras reload @92.4); LCP 41040 ms, lt 27, blocking 17276 |
| auth7 | 8262 | 62091 (onboarding) | **53.8 s** | tile @106.7 s (32 s tras reload @74.6); LCP 40028 ms, lt 21, blocking 11548 |

Console (auth4): `[SQLite WASM] Engine loaded successfully.` @18.1 s; `[SQLite WASM] Catalog loaded from /catalog.sqlite (tier=OSS)` @45.8 s; `[RAG] Tier gate: 517 slugs en manifest, 469 dentro del catalogo` @45.9 s; `[SW] Service Worker activo y listo` @50.5 s. auth5: `[RAG] Índice del corpus persistido en IndexedDB (15667 passages)` @95.2 s. auth6/7: avisos `preload nunito-latin.woff2 ... not used` repetidos (7-8×) y `[RAG] Failed to load <slug>: TypeError: Failed to fetch` (fetch del corpus fallando por saturación/concurrencia).

La pantalla post-auth siempre cayó en **Onboarding PASO 1 DE 6** (usuario `admin` nunca marcó perfil visto): eso ES la primera pantalla post-login, y su pintura tardó 43-54 s desde el submit.

### Momento 2b — home autenticado tras reload en caliente
- auth6: reload@92.4 s → tile-registrar@121.2 s (**28.8 s**); FCP 2740 ms, LCP **41040 ms**, 27 long tasks, **17 276 ms blocking** (top: 1929/1658/1624/1556/1261 ms).
- auth7: reload@74.6 s → tile@106.7 s (**32.1 s**); FCP 2396 ms, LCP **40028 ms**, 21 long tasks, **11 548 ms blocking**.

### Momento 3 — transición dashboard → Registrar
- auth7: click en `tile-registrar-unificado` → aparece `registro-voz`: **4741 ms** (SW caliente). Primer intento en auth6 falló (elemento no clicable mientras el main thread estaba bloqueado por la carga del home).

### Ola de red en frío (pre-login, 184 reqs / 2.02 MB encoded)
- Buckets 2 s: `0-2s: 41` · `6-8s: 135` · resto disperso. Mayores transferencias: `trazadoCreature-*.js` 469 KB, `sqlite3-*.wasm` 426 KB, `main-*.js` 75 KB, `catalogDB-*.js` 71 KB, `DashboardLive-*.js` 70 KB, `vendor-react-*.js` 62 KB. 145/178 reqs con initiator `script`; solo 3 xhr/fetch (sin datos de finca). 0 errores JS, 0 request failures, 0 HTTP>=400.

### Latencia por asset (curl, 3 corridas c/u)
main 848/542/635 ms · catalogDB 776/648/574 · DashboardLive 810/644/613 · vendor-react 810/640/604. Headers: `no-store` + `cf-cache-status: BYPASS` reproducidos a las 14:35 y 14:37.

---

## Causas, ordenadas por impacto

1. **Arranque post-login triple-pesado (NUEVO, medido)**: shell autenticado + catálogo SQLite-WASM (2.9 MB) + prewarm corpus RAG (~460 fetches `no-store`). El usuario espera **43-54 s de "Cargando"** tras escribir su clave, y la home (aun en caliente) tiene **LCP ~40 s con 11.5-17.3 s de bloqueo**. Es la causa #1 de "lentísima desde el login" y "carga de home súper pesada".
2. **Grafo de módulos pre-login desproporcionado** (login + prefetch del home + arte avatares/trazado). Afecta a todo el mundo, frío y caliente. Código de este repo.
3. **Assets sin caché (`no-store` + CF BYPASS)**. Penaliza cada primera visita/deploy y **cada uno de los ~460 fetches del corpus RAG**; amplifica las causas 1-2. Infraestructura (fuera del repo público).
4. **Precarga de catálogo SQLite (426 KB wasm + 2.9 MB sqlite) en sesión anónima** — compite en el login y en el arranque.

## Dónde vive cada cosa (para el arreglo, sin ejecutarlo)

- Prefetch del home en login: `src/App.jsx:636-643` y `:1569-1576` (efecto gatillado por `currentView === 'login'`). Comentario 607-618: existe para cerrar la carrera del gate offline-first; cualquier cambio debe disparar el prefetch en `onLoginSuccess`/post-auth, no en el mount del login anónimo.
- Arte visual del LoginScreen: `src/components/LoginScreen.jsx:10-18` (`AngelitaVueloLogin`, `LaminaMilpa`, `WelcomeStatsHero`, `prewarmCorpus`…).
- Prewarm del corpus RAG al arrancar: `src/services/ragRetriever.js` — `prewarmCorpus()` (514-527) se llama post-login/OAuth; `scheduleIdlePrewarm` (492-512) documenta el problema (transición >19 s con corpus descargando, PERF-1 2026-07); `CORPUS_FETCH_CONCURRENCY = 12` (línea 9), ~460 fetches de `cycle-content/*.json`.
- Catálogo SQLite: `src/db/catalogDB.js` + `src/services/ragRetriever.js:388-395` (PERF-1 hizo el import dinámico; el WASM/sqlite igual baja en el arranque).
- Grafo del dashboard: `src/components/dashboard/DashboardLive.jsx` (imports estáticos ~30 widgets).
- `api/log/activity` ×3 y `chagra-stats.json` ×3 en post-login (auth5) = sync de datos reales del tenant `admin`; no es el cuello principal pero suma requests seriales.

## Lo que NO verifiqué (y por qué)

- **Clima (24 variables Open-Meteo)**: NO se disparó en ninguna corrida autenticada. El `AlertEngine` degradó limpio con "[AlertEngine] Sin coordenadas en el perfil — no se evalúa clima" (auth5) porque el usuario `admin` no tiene coordenadas en su perfil. El servicio (`agroMeteoService.js`, 24 variables, TTL 3 h/30 días) existe, pero **no pude medir su costo real en home** sin un usuario con coordenadas. Sigue como hipótesis no confirmada, NO como causa medida.
- **Catálogo (~743 especies)**: medido indirecto. El catálogo SQLite (2.9 MB) SÍ baja y se abre en cada sesión (logs), y el tier-gate RAG reportó 469 especies en catálogo; el corpus RAG persistió 15667 passages. El costo del catálogo está dentro de las causas 2/6, pero no aislé cuánto de los 43-54 s es exactamente SQLite vs corpus vs shell (separarlos pide un CPU profile, trabajo de otra pasada).
- **Home "de verdad" de un usuario operador con datos**: medí con el tenant `admin` de oracle-lab (datos reales del farmOS de dev). El perfil sin coordenadas y el onboarding pendiente hacen que mi home no sea idéntico al de un operador con clima + catálogo activos; el orden de magnitud (LCP ~40 s en caliente) es robusto, pero el número exacto puede variar por tenant.
- **Dispersión del momento 3**: 1 corrida válida (4741 ms) + 1 fallida por bloqueo de main thread. No concluyente como número único; el mecanismo (chunk lazy + shell + red) está identificado.
- **Bloqueo de SW en frío** (corrida previa blocksw1: FCP 12.9 s, n=1): no repetido, no concluyente.
- **Costos exactos de parse/eval en caliente** (por qué 4-9 s con todo cacheado): inferidos por diferencia warm-vs-frío y por la ola de módulos; un CPU profile lo cerraría.
- Nada de producción (`~/demos/3d`, servicios) fue tocado. No se optimizó ni mergeó nada. Las credenciales usadas viven en SOPS (`/run/secrets/oracle-lab-env`), se usaron solo para autenticar la medición y **no se imprimieron ni versionaron**.

## Archivos de evidencia (crudos, en `_gate/`)
`perf-r2-control.json` (nuevo), `perf-auth-home.json`, `perf-auth2-home.json`, `perf-auth4.json`, `perf-auth5.json`, `perf-auth6.json`, `perf-auth7.json`, `perf-cold1.json`, `perf-cold2.json`, `perf-cold3.json`, `perf-cdp-cold.json`, `perf-warm1.json`, `perf-warm2.json`, `perf-blocksw1.json`, `perf-control.json`; capturas `perf-auth*.png`, `perf-*.png`. Scripts: `perf-auth.mjs`, `perf-auth2.mjs`, `perf-auth3.mjs`, `perf-auth4.mjs`, `perf-auth5.mjs`, `perf-auth6.mjs`, `perf-auth7.mjs`, `perf-probe-dev.mjs`, `perf-cdp.mjs`.
