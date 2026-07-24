# Triage de PRs abiertos — 2026-07-20

**Base de comparación:** `origin/integra/todo-3d-a-prod` (HEAD `7294c674`).
**Total de PRs abiertos al momento del corte:** 72
- Mergeable: 42
- Conflicting: 30

**Método:** dedup semántico por contenido del diff (no por título ni SHA). Para
cada PR se inspeccionó la lista de archivos tocados y se comparó contra la
base. Cuando un archivo ya existe en base, se hace diff de contenido para
decidir si el PR está:
- **SUPERSEDED**: el contenido del PR ya llegó a base por otra vía (otro PR
  mergeado, squash, etc.). El PR se puede cerrar.
- **PARTIALLY_SUPERSEDED**: parte del PR ya está en base, pero quedan
  cambios útiles. Rebase + descartar lo duplicado.
- **DUPLICATE**: otro PR abierto hace lo mismo. Se recomienda cuál keep.
- **UNIQUE**: no está en base ni duplicado. Candidato a review/merge.
- **STALE_CONFLICT**: la base avanzó y el PR ya no aplica limpio.

**Lotes:** el análisis se procesó en 8 lotes de 10 PRs (último con 2).

> Nota: este informe **no mergea ni cierra** ningún PR. Solo clasifica y
> recomienda al operador (Miguel) la acción. Las decisiones de cierre/merge
> son del operador o de Claude Opus.

## Resumen ejecutivo

| Veredicto | Cuenta | Acción sugerida |
|-----------|--------|-----------------|
| UNIQUE | 51 | Review normal, merge directo si pasa CI |
| SUPERSEDED | 8 | Cerrar (contenido ya en base) |
| PARTIALLY_SUPERSEDED | 6 | Rebase o excavar diffs; uno requiere ESCALATE_TO_OPUS |
| DUPLICATE | 7 | Cerrar el perdedor del clúster (6 a cerrar; 1 es el winner) |

**Total:** 72 PRs.

### Clústeres de duplicados (decisión required)

| Clúster | PRs | Ganador | Perdedores (cerrar) |
|---------|-----|---------|---------------------|
| Frutales mockup | 2605, 2608 | **#2608** (encuadre pulido) | #2605 |
| Reindex RAG | 2544, 2548, 2553 | **#2553** (clamp, más nuevo) | #2544, #2548 |
| Bosque+Home (alternativa artística) | 2510, 2513, 2515 | **#2510 o #2513** (operador elige) | el no elegido + #2515 si #2510 |
| Montaña Mundos | 2249, 2258 | **#2258** (pasada 2 cine) | #2249 |
| Modo Campo Voz | 2199, 2162 | **#2162** (iris escucha) | #2199 |

### Lista completa de PRs para CERRAR (14)

| PR | Razón | Veredicto técnico |
|----|-------|-------------------|
| #2605 | Sustituido por #2608 (mismo mockup + script de encuadre) | DUPLICATE |
| #2591 | DetalleSueloValle idéntico en base (commit 778f333f) | SUPERSEDED |
| #2588 | MinimapaValle ya en base en versión más nueva (7bfc7262, 94c92c3e) | SUPERSEDED |
| #2548 | Reindex RAG — ver #2553 (más nuevo y más extenso) | DUPLICATE |
| #2544 | Reindex RAG — ver #2553 (más nuevo y más extenso) | DUPLICATE |
| #2539 | Auditoría render v2 vs actual — MD y PNGs ya en base | SUPERSEDED |
| #2290 | Librería scenes ya en base con contenido más rico | SUPERSEDED |
| #2287 | Librería laminas ya en base con contenido más rico | SUPERSEDED |
| #2286 | Librería effects ya en base con contenido más rico | SUPERSEDED |
| #2264 | Lámina maíz ya entregada vía `src/visual/laminas/LaminaMaiz.jsx` | SUPERSEDED |
| #2262 | Lámina cafeto ya entregada vía `src/visual/laminas/LaminaCafeto.jsx` | SUPERSEDED |
| #2249 | Sustituido por #2258 (Montaña Mundos pasada 2) | DUPLICATE |
| #2199 | Sustituido por #2162 (iris escucha + capa viva) | DUPLICATE |
| #2253 (parcial) | 1/5 archivos idénticos a base; rebasar y descartar | PARTIALLY_SUPERSEDED |

### Lista de PRs que requieren ESCALATE_TO_OPUS (3)

| PR | Razón |
|----|-------|
| #2478 | Mega-PR 100 archivos; 30 idénticos + 31 triviales + 39 con diff real. Imposible rebasar limpio. Decidir entre cerrar y abrir PRs chicos por feature. |
| #2440 | PR 100 archivos de micro-cambios (cleanup whitespace/i18n). El feature real (guard variedad fantasma) se ahogó. Extraer solo `outputGuards.js` en PR nuevo. |
| #2060 | Mega-PR "mano red viva" hace 16 días en CONFLICTING. La feature sigue siendo estratégicamente querida? |

### Lista de PRs PARTIALLY_SUPERSEDED que sí se pueden recuperar (3)

| PR | Qué queda |
|----|-----------|
| #2613 | Reforma visual de RuanaGuardian.jsx y CriaturasNocturnas.jsx. Descartar los 5 archivos ya mergedos. |
| #2253 | 4/5 paneles (GuardianEspiritu, PanelVitalidadEspiritu, RelojFrailejon, vitalidadEspirituService) con diffs únicos. Descartar ArbolDeMundos.jsx idéntico. |
| #2533 | Solo el test (`flattenDoc indexa campos cortos de clima...`) vale; la implementación ya está en base (más amplia). |

### Lista de PRs UNIQUE listos para review (51)

Ordenados por urgencia/impacto (subjetivo, basado en si tocan bugs vivos):

**Críticos (bugs vivos en prod):**
- **#2487** — CI gates no corren en `dev`/`app-3d`. Fix chico (4 líneas), alta criticidad.
- **#2586** — `buildFallbackResponse` usa shapes stale (bug verificado en base).
- **#2558** — Canario C1: agente no advierte plaguicidas vetados.
- **#2275** — A11y P1: fondos hardcodeados en BoticaScreen.
- **#2218** — Unificación barrio/vereda (34 archivos, toca mucho).

**Anti-regresión / CI:**
- **#2517** — Anti-leak forward + boundary gate (case-sensitive bug).

**Features nuevas (por orden arbitrario):**
- #2259, #2311, #2313, #2423, #2454, #2458, #2459, #2460, #2462, #2464,
  #2465, #2466, #2467, #2469, #2470, #2471, #2472, #2473, #2474, #2072,
  #2082, #2162, #2253, #2254, #2256, #2258, #2261, #2263, #2272, #1999,
  #2488, #2491, #2510, #2513, #2515, #2531, #2534, #2535, #2547, #2553,
  #2564, #2566, #2585, #2593, #2594, #2596, #2607, #2608, #2613.

## Lote 1 — PRs #2613 a #2586

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2613 | ruana/zarigüeya — arte | CONFLICTING | PARTIALLY_SUPERSEDED |
| 2608 | frutales encuadre | CONFLICTING | UNIQUE (dedup winner vs 2605) |
| 2607 | yuca y quinua mundo3D | CONFLICTING | UNIQUE |
| 2605 | mundo de los frutales | MERGEABLE | DUPLICATE — cerrar (ver 2608) |
| 2596 | metalslug Dante/Oliver | MERGEABLE | UNIQUE |
| 2594 | voz Angelita anti-solapamiento | MERGEABLE | UNIQUE |
| 2593 | corpus-to-chat (base main) | MERGEABLE | UNIQUE (ojo: base ≠ integra) |
| 2591 | DetalleSueloValle | CONFLICTING | SUPERSEDED |
| 2588 | MinimapaValle | CONFLICTING | SUPERSEDED |
| 2586 | fix buildFallbackResponse shapes | MERGEABLE | UNIQUE (bug vivo en base) |

### Detalle Lote 1

**#2613 `art(fauna): la ruana pierde las mangas · la zarigüeya deja de ser el gurre`**
- 20 archivos, +2258/-144, base `integra/todo-3d-a-prod`, CONFLICTING.
- 5/20 archivos ya están en base con contenido **idéntico** (diff vacío):
  `shot-oso.jsx`, `shot-sierra.html`, `shot-sierra.jsx`,
  `src/visual/creatures/OsoGuardian.jsx`, `src/visual/creatures/osoGuardianIdentidad.js`.
  → esas adiciones llegaron a base por otra vía (probablemente merges
  recientes de `fable/oso-*` o `fable/angelita-*`).
- Lo que sí es único: la reforma visual de `RuanaGuardian.jsx` (+256 vs
  217L en base) y `CriaturasNocturnas.jsx` (+652/-103 vs 847L en base).
- **Veredicto:** PARTIALLY_SUPERSEDED. Necesita rebase + descartar los 5
  archivos ya mergedos para que el diff real se vea limpio.

**#2608 `art(frutales): rescatar el encuadre — la cámara estaba metida dentro del mango`**
- 10 archivos, +2731/-0, CONFLICTING.
- Crea 6 archivos nuevos (`FrutalesVivo3D.jsx/css`, `EscenaFrutalesVivo.jsx`,
  `FloraFrutales.jsx`, `MundoFrutales.jsx`, `floraFrutales.geom.js`) + 1
  script diagnóstico (`scripts/diag/encuadre-mundo.mjs`).
- **Gana el dedup vs #2605** porque añade el script de encuadre y pule
  geometría (+67 en `floraFrutales.geom.js`, +24 en `EscenaFrutalesVivo.jsx`).
  Ver análisis en #2605.

**#2607 `art(mundos): yuca y quinua — el arranque de la raíz y el campo de panojas`**
- 13 archivos, +4530/-0, CONFLICTING.
- Crea 12 archivos nuevos bajo `src/visual/mundo3d/{yuca,quinua}/` y los
  mockups `YucaViva3D` + `QuinuaViva3D`. Comparte con #2608 solo el script
  `scripts/diag/encuadre-mundo.mjs` (versión más corta: +249 vs +379 en
  2608). Patrones distintos (especies distintas), **no duplica** a 2605/2608.
- **Veredicto:** UNIQUE.

**#2605 `El mundo de los frutales: mango y cítricos`**
- 9 archivos, +2261/-0, MERGEABLE.
- Los 6 archivos nuevos de `FrutalesVivo3D` + flora son **subconjunto
  estricto** de #2608 (mismas líneas para 4/6 archivos, líneas menores en
  los otros 2). No añade el script de encuadre.
- **Veredicto:** DUPLICATE de #2608. Recomendación: cerrar 2605, mantener
  2608.

**#2596 `feat(metalslug): Dante y Oliver — la dupla que huele y trae`**
- 2 archivos, +562/-6, MERGEABLE.
- Añade `src/mockups/metalslug/DuoPerros.jsx` (+258) y modifica
  `MetalSlugCampo.jsx` (+304/-6 vs 999L en base). No está en base.
- **Veredicto:** UNIQUE.

**#2594 `feat(voz): la voz de Angelita — anti-solapamiento + carácter propio`**
- 15 archivos, +1277/-68, MERGEABLE.
- Añade 5 archivos nuevos (`angelitaCaracter.js`, `angelitaVoz.js`,
  `angelitaVozBridge.js` + 2 tests) y modifica 10 componentes/servicios.
- No hay PR abierto que toque `angelitaVoz*`; uniqueness alta.
- **Veredicto:** UNIQUE.

**#2593 `feat(corpus): cablea el corpus del sidecar (5647 chunks) al chat`**
- 4 archivos, +207/-1, MERGEABLE, **base `main`** (no `integra/todo-3d-a-prod`).
- Añade `corpusRetriever.js` (+100) y su test (+93). Toca `deploy.yml`
  y `AgentScreen.jsx`. Archivos nuevos no están en base integra/main.
- **Veredicto:** UNIQUE. **Ojo:** el PR apunta a `main`, no a
  `integra/todo-3d-a-prod`. Antes de merge, confirmar con Opus si debe
  cambiar de base o si se mergea directo a main y se absorbe en integra.

**#2591 `art(valle): DetalleSueloValle — suelo vivo AoE + surcos de cultivo`**
- 2 archivos, +576/-0, CONFLICTING.
- Ambos archivos (`DetalleSueloValle.jsx`, `detalleSueloValle.geom.js`)
  ya existen en base con **idéntico** contenido (207L + 369L = 576L total,
  coincide con additions del PR).
- El diff real contra `origin/integra/todo-3d-a-prod` es de 1 archivo, 5
  líneas (ruido de whitespace o similar).
- Llegó a base vía commit `778f333f feat(valle): integrar AoE parte 2 —
  suelo vivo detallado + minimapa RTS`.
- **Veredicto:** SUPERSEDED. Cerrar.

**#2588 `art(valle): MinimapaValle — minimapa RTS del valle (AoE del campo)`**
- 2 archivos, +546/-0, CONFLICTING.
- Ambos archivos ya están en base, pero **base tiene más** (MinimapaValle.jsx
  base=389L vs PR=300L; minimapaValle.css base=333L vs PR=246L). Base recibió
  una versión más nueva (`7bfc7262 fix(valle): minimapa legible + hato con
  aire + paneles que ya no tapan la escena`, `94c92c3e feat(minimapa):
  labels dinamicos por blip`).
- **Veredicto:** SUPERSEDED por iteración más nueva. Cerrar.

**#2586 `fix(agente): buildFallbackResponse chequeaba shapes de tools stale`**
- 2 archivos, +125/-16, MERGEABLE, base `main`.
- Modifica `src/services/agentService.js` (+55/-16) y añade su test (+70).
- Verificado: la base `origin/integra/todo-3d-a-prod` todavía tiene el bug
  (usa `result.species_name`, `result.controls`, `result.recipes` — shapes
  que ningún tool devuelve). El fix es vivo.
- **Veredicto:** UNIQUE.


## Lote 2 — PRs #2585 a #2535

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2585 | angelita squash&stretch | MERGEABLE | UNIQUE (entrada/salida one-shot no en base) |
| 2566 | valle-fino-v2 abeja+paramo | CONFLICTING | UNIQUE |
| 2564 | sacar oso feo y borugo | CONFLICTING | UNIQUE (cleanup no aplicado aún) |
| 2558 | canary C1 plaguicidas vetados | MERGEABLE | UNIQUE |
| 2553 | reindex-rag clamp | MERGEABLE | DUPLICATE winner (ver 2548/2544) |
| 2548 | reindex-rag fix schema | MERGEABLE | DUPLICATE — cerrar (ver 2553) |
| 2547 | mercado standalone demo | MERGEABLE | UNIQUE |
| 2544 | reindex-rag codex | MERGEABLE | DUPLICATE — cerrar (ver 2553) |
| 2539 | auditoría render v2 vs actual | MERGEABLE | SUPERSEDED |
| 2535 | reparto portales valle | MERGEABLE | UNIQUE |

### Detalle Lote 2

**#2585 `art(angelita): entrada/salida con squash&stretch (rh-entra/rh-sale)`**
- 2 archivos, +63/-3, MERGEABLE.
- El cuerpo del PR reconoce que "casi todo ya existe en base y mejor hecho"
  (visemas, cejas, parpadeo). Lo único nuevo: props `entrando`/`saliendo` en
  `AbejaAngelita.jsx` (one-shot squash-&-stretch, ~25 líneas nuevas) + ajuste
  de CSS. Verificado: la prop no está en base.
- **Veredicto:** UNIQUE (chico, fácil de review).

**#2566 `feat(valle): re-aplica abeja inteligente + acceso al páramo sobre v2 limpio`**
- 5 archivos, +269/-11, CONFLICTING.
- Recupera 3 features perdidas en rollback del valle a v2 (abeja, páramo,
  rótulos). Los 2 scripts de diagnóstico (`valle-fino-click-paramo.mjs`,
  `valle-fino-verify.mjs`) **no están en base**.
- **Veredicto:** UNIQUE. Rebase conflicto.

**#2564 `chore(creatures): sacar oso café y borugo del elenco`**
- 37 archivos, +157/-971, CONFLICTING.
- Limpieza: archiva `Borugo.jsx` y `OsoAndino.jsx` en `src/visual/creatures/_archivo/`
  y los quita de registros vivos. **Verificado:** base todavía tiene
  `Borugo.jsx` y `OsoAndino.jsx` activos → el cleanup NO está aplicado.
- Los 33 archivos "ya en base" del reporte son archivos que el PR **modifica**
  (no añade); las modificaciones aún no llegaron.
- **Veredicto:** UNIQUE. Rebase conflicto.

**#2558 `fix(prompt): cubrir los 10 plaguicidas vetados del banco del canario (C1)`**
- 2 archivos, +33/-2, MERGEABLE, base `main`.
- Basado en canario 2026-07-18. Verificado: `agentPromptBase.js` en base no
  contiene la lista de vetados (grep "vetados" → 0 hits).
- **Veredicto:** UNIQUE.

**#2553 `fix(experimentos): clamp reindex rag chunks`** — GANADOR del clúster reindex
- 2 archivos, +1215/-0, MERGEABLE, base `main`.
- Versión más nueva (Jul 18) y más extensa del loader `reindex-rag.mjs`
  (855 líneas vs 773 en #2544 y 668 en #2548). Añade: clamp de chunks
  sobre-dimensionados, retry en HTTP 500 partiendo el chunk a la mitad, y
  tests de regresión para clamp+retry+env-driven sizing.
- No toca `package.json` (los otros dos añaden una dep — suponemos que ya
  está en base o no hace falta para esta versión).
- **Veredicto:** UNIQUE y winner del clúster reindex-rag.

**#2548 `fix(experimentos): align reindex rag with corpus_chunks schema`**
- 4 archivos, +1036/-0, MERGEABLE, base `main`. Creado Jul 17 03:56.
- Mismos archivos que #2544 pero más chico (888 líneas de código vs 1022).
  Iteración intermedia.
- **Veredicto:** DUPLICATE de #2553. Cerrar.

**#2544 `feat(experimentos): reindex rag fanout`**
- 4 archivos, +1170/-0, MERGEABLE, base `main`. Creado Jul 17 00:21 (más viejo).
- Primera iteración del loader. Mismo esqueleto que #2548 y #2553.
- **Veredicto:** DUPLICATE de #2553. Cerrar.

**#2547 `feat(mercado): sitio demo público standalone (mercado.chagra.bio)`**
- 3 archivos, +62/-0, MERGEABLE, base `main`.
- Añade `mercado.html` + `src/entries/mercado.jsx` + tweak en `vite.config.js`.
  Ninguno está en base.
- **Veredicto:** UNIQUE.

**#2539 `docs(valle): auditoría render v2 vs actual — portales-espejo confirmados`**
- 9 archivos, +224/-0, MERGEABLE.
- El MD principal (`ops/COMPARACION-VALLE-V2-VS-ACTUAL.md`, 224L) **idéntico**
  en base. Las 8 imágenes PNG en `ops/valle-comparacion-evidencia/` también
  están en base con los mismos tamaños de byte.
- **Veredicto:** SUPERSEDED. Cerrar.

**#2535 `docs(valle): reparto de portales — 6 principales vs secundarios`**
- 1 archivo, +209/-0, MERGEABLE.
- Añade `ops/REPARTO-PORTALES-VALLE-2026-07-16.md`. No está en base.
- **Veredicto:** UNIQUE.


## Lote 3 — PRs #2534 a #2487

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2534 | auditoría 3D biodiversidad | MERGEABLE | UNIQUE |
| 2533 | fix flattenDoc campos cortos | CONFLICTING | PARTIALLY_SUPERSEDED (test válido, impl ya cubierta) |
| 2531 | audit graph-bug-hunt AGE | MERGEABLE | UNIQUE |
| 2517 | anti-leak forward + CI gate | MERGEABLE | UNIQUE (base `app-3d`) |
| 2515 | home portada pulida | CONFLICTING | UNIQUE — incluido en #2510 |
| 2513 | bosque TAKE A naturalista | CONFLICTING | UNIQUE — alternativa artística vs #2510 |
| 2510 | bosque TAKE B toon | CONFLICTING | UNIQUE — alternativa artística vs #2513; incluye #2515 |
| 2491 | PasosMundo onboarding | CONFLICTING | UNIQUE |
| 2488 | puente Nonco graph | MERGEABLE | UNIQUE |
| 2487 | CI corre en dev/app-3d | MERGEABLE | UNIQUE (base todavía filtra solo `main`) |

### Detalle Lote 3

**#2534 `docs(audit): auditoría dura de biodiversidad en todo el 3D`**
- 1 archivo, +541/-0, MERGEABLE.
- Añade `ops/AUDIT-3D-BIODIVERSIDAD-2026-07-16.md`. No está en base.
- **Veredicto:** UNIQUE.

**#2533 `fix(rag): index short climate fields in flattenDoc`**
- 2 archivos, +58/-6, CONFLICTING, base `main`.
- La implementación que propone (`isContextualField` con regex para
  clima/ph/altitud/...) es **más estrecha** que la que ya está en base
  (`addDatoCorto` indexa TODOS los campos cortos con prefijo de clave, más
  un sistema `CLAVES_RUIDO` para excluir plumbing). El bug ya está fijado
  en base de forma más amplia.
- El test nuevo (`it('flattenDoc indexa campos cortos de clima...')`) sí
  aporta coverage específico para campos numéricos/clima.
- **Veredicto:** PARTIALLY_SUPERSEDED. Del PR solo valdría la pena portar
  el test. Recomendación: cerrar y abrir PR chico solo con el test, o
  pedirle al autor rebasar y dejar solo el test.

**#2531 `feat(audit): script de auditoría de bugs en grafo agroecológico AGE`**
- 4 archivos, +1106/-0, MERGEABLE, base `main`.
- Añade `scripts/audit/graph-bug-hunt.mjs` (+721) y su test (+237). Toca
  `package.json`/lock (añade dep). No está en base.
- **Veredicto:** UNIQUE.

**#2517 `fix(anti-leak): sanear fugas forward + cablear el guardián al CI`**
- 19 archivos, +152/-60, MERGEABLE, base `app-3d`.
- Modifica `boundaryAudit.test.js` (case-insensitive), añade workflow
  `boundary-gate.yml` (+59) y sanea fugas en 18 archivos. Base todavía
  tiene el guardián case-sensitive (verificado por el diff del PR).
- **Veredicto:** UNIQUE.

**#2515 / #2513 / #2510 — Clúster Bosque+Home**
Estos tres PRs están entrelazados. Análisis en bloque:

- **#2515 `art(portada): home finca-viva pulido`** — 5 archivos, +367/-26.
  Toca `FincaVivaHero.jsx` (+152/-1), `finca-viva-hero.css` (+85/-15),
  `Valle3D.jsx` (+31/-9), `visualTestUtils.js` (+1/-1) + añade
  `shot-home-portada.mjs` (+98). Independiente del clúster Bosque.
  Veredicto: UNIQUE por sí solo.

- **#2513 `feat(bosque): TAKE A — el bosque de niebla al calibre del valle`**
  — 3 archivos, +1248/-110. TAKE A (naturalista): rehace `EscenaBosqueVivo.jsx`
  (+660/-106), `FloraParamo.jsx` (+14/-4) + añade `bosqueTakeA.geom.js` (+574).

- **#2510 `feat(bosque): toma B en clave Switch — toon por bandas, domo y godrays`**
  — 9 archivos, +2147/-194. TAKE B (toon estilizado): misma escena con
  dirección alternativa. Modifica los 3 archivos de Bosque con contenido
  DIFERENTE al TAKE A (EscenaBosqueVivo +636/-93, FloraParamo +2/-1,
  bosqueTakeA.geom.js +574/-0 idéntico), AÑADE `bosqueTakeB.geom.js` (+519),
  floraParamo.geom.js (+147/-74) **Y INCLUYE los 4 archivos de #2515
  (FincaVivaHero, css, Valle3D.jsx, visualTestUtils.js) línea por línea**.

**Decisión del clúster:** 2510 y 2513 son **alternativas artísticas** (toma
A vs toma B). El operador elige una; la otra se cierra. 2515 es ortogonal
(portada del home) pero ya viene incluido en 2510. Si se elige 2510 →
cerrar 2513 y 2515. Si se elige 2513 → mantener 2515 abierto.

**#2491 `feat(mundo3d): add reusable PasosMundo onboarding`**
- 14 archivos modificados + 9 archivos nuevos, +1585/-42, CONFLICTING,
  base `app-3d`.
- Añade `PasosMundo.jsx`/`.css`, `pasosMundo.js`, workflow
  `integraciones-audit.yml`, script `audit-integraciones.mjs` (+264),
  `ops/integraciones-no-consumidas.json` (+57). Ninguno está en base.
- **Veredicto:** UNIQUE (PR grande, mucho contenido nuevo).

**#2488 `fix(grafo): tender puentes CO_RELEVANT entre NoncoPest y Pest`**
- 3 archivos, +881/-0, MERGEABLE, base `main`.
- Añade `scripts/puente-nonco.mjs` (+458), su test (+232) y la auditoría
  `ops/AUDIT-PUENTE-NONCO-2026-07-15.md` (+191). Ninguno en base.
- **Veredicto:** UNIQUE.

**#2487 `fix(ci): los gates no corrían en dev ni app-3d — todo el 3D entraba a ciegas`**
- 4 archivos, +4/-4, MERGEABLE, base `main`.
- Cambia `branches: [main]` → `branches: [main, dev, app-3d]` en 4 workflows
  (`perf-budget.yml`, `playwright.yml`, `tsc-gate.yml`, `unit-tests.yml`).
- Verificado: base todavía tiene `branches: [main]` en `tsc-gate.yml`. El
  fix sigue vivo.
- **Veredicto:** UNIQUE (chico, crítico, fácil).


## Lote 4 — PRs #2478 a #2465

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2478 | integración 3D completa (mega) | CONFLICTING | PARTIALLY_SUPERSEDED + STALE_CONFLICT |
| 2474 | visión cafe RoCoLe resultado negativo | MERGEABLE | UNIQUE |
| 2473 | embedder fine-tune grafo | MERGEABLE | UNIQUE |
| 2472 | normalizar esquema altitud | MERGEABLE | UNIQUE |
| 2471 | GBIF fotos plagas (96 JPGs) | MERGEABLE | UNIQUE |
| 2470 | bench embedder grafo | CONFLICTING | UNIQUE |
| 2469 | derivar piso térmico | MERGEABLE | UNIQUE |
| 2467 | T41-50 smoke CI/backoff/clima/batería | MERGEABLE | UNIQUE |
| 2466 | T31-40 búsqueda/atajos/admin/splash | MERGEABLE | UNIQUE |
| 2465 | T21-29 error boundaries/WCAG/onboarding | MERGEABLE | UNIQUE |

### Detalle Lote 4

**#2478 `feat(3d): integracion completa del arte de fable a prod.chagra.app`**
- 100 archivos (95 listados como "ya en base" + 5 nuevos), +30442/-607, CONFLICTING,
  base `app-3d`.
- Análisis con `git diff origin/integra/todo-3d-a-prod origin/feat/integracion-3d-completa`:
  - 30/100 archivos con diff idéntico (ya en base)
  - 31/100 con diff trivial (≤10 líneas, comentarios/whitespace)
  - 39/100 con diff real — los más grandes:
    `fincaRealista.geom.js` (~1836 líneas diff), `Valle3D.jsx` (~1506),
    `EscenaEntMaestro.jsx` (~1231), `micorrizas.geom.js` (~1103),
    `floraParamo.geom.js` (~721).
- El commit `37af78fb integra(arte): rescatar 6 features que solo vivian en el
  PR #2478 (#2484)` confirma que ya se hizo un "rescue" parcial.
- **Veredicto:** PARTIALLY_SUPERSEDED + STALE_CONFLICT. El PR es enorme y la
  base ya absorbió la mayor parte. Acción recomendada: **cerrar** y, si los
  39 archivos con diff real todavía aportan, abrir PRs chicos por feature.
  ESCALATE_TO_OPUS: decidir si cerrar directo o excavar los 39 archivos.

**#2474 `docs(vision-cafe): clasificador cafe RoCoLe+BRACOL - resultado negativo honesto`**
- 6 archivos, +1272/-0, MERGEABLE, base `main`.
- Documenta un experimento ML de visión café con resultado negativo. Todos
  archivos nuevos (`ops/VISION-CAFE-2026-07-15.md` + 5 scripts Python).
- **Veredicto:** UNIQUE.

**#2473 `experiment(embedder): fine-tune contrastivo sobre nombres regionales del grafo`**
- 9 archivos, +4891/-0, MERGEABLE, base `main`.
- Scripts Python para fine-tune del embedder (`scripts/embedder-finetune/`).
  Todos nuevos.
- **Veredicto:** UNIQUE.

**#2472 `fix(agro): normalizar esquema altitud en grafo AGE`**
- 5 archivos, +865/-0, MERGEABLE, base `main`.
- Script de migración + auditoría + JSON de conflictos. Todos nuevos.
- **Veredicto:** UNIQUE.

**#2471 `feat(plagas): GBIF photos for 55 pests + attribution + resolver`**
- 100 archivos, +5889/-509, MERGEABLE, base `main`.
- Añade 96 JPGs nuevos en `public/plaga-images/` (verificado: en base solo
  hay 18, el PR aporta 96 especies/plagas). Modifica los manifests JSON
  (`fotos-atribucion.json`, `plaga-images.json`) para referenciarlos.
- Nota: deep_check reportó "96 idénticos" por un bug del script con archivos
  binarios (cuento líneas +/-; binarios no tienen). Verificado manualmente:
  los 96 JPGs **no están en base**.
- **Veredicto:** UNIQUE (bien grande, riesgo de conflicto bajo porque la
  mayoría son archivos nuevos).

**#2470 `feat(bench): add graph-backed embedder benchmark`**
- 8 archivos, +38287/-268, CONFLICTING, base `main`.
- Añade `data/bench-runs/embedder-bench-2026-07-15.json` (+37126 — huge),
  script `bench-embedders.mjs` (+860/-267), test, reporte. Todos nuevos o
  modificados sobre archivos que no están relacionados con otros PRs.
- **Veredicto:** UNIQUE.

**#2469 `fix(graph): derivar piso_termico para especies del grafo AGE`**
- 3 archivos, +960/-0, MERGEABLE, base `main`.
- Script + test + auditoría. Todos nuevos.
- **Veredicto:** UNIQUE.

**#2467 / #2466 / #2465 — Batch "Tareas"**
Los tres PRs (`feat: T41-50`, `feat: T31-40`, `feat: T21-29`) son **ortogonales**:
cero solapamiento de archivos entre ellos (verificado con overlap.py). Cada
uno añade features distintas (admin panel, splash, búsqueda, batería,
i18n, etc.). Ninguno toca al otro. Bases `app-3d`.

- **#2467 `feat: T41-50 — smoke CI, backoff, validación, clima, batería, sonidos, lectura, adopción`** — 10 archivos nuevos. UNIQUE.
- **#2466 `feat: T31-40 — búsqueda, atajos, admin, splash, audit, i18n, bundle dashboard`** — 7 archivos nuevos. UNIQUE.
- **#2465 `feat: T21-29 error boundaries WCAG onboarding ExitosChagra health`** — 6 archivos nuevos. UNIQUE.


## Lote 5 — PRs #2464 a #2311

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2464 | T13/14/17/20 foto offline + perfil + extensionista + bench | MERGEABLE | UNIQUE |
| 2462 | T11 modo campo offline | CONFLICTING | UNIQUE |
| 2460 | T6-10 compresión + i18n shell + onboarding + galería | MERGEABLE | UNIQUE |
| 2459 | T1 valle 3D público + T2 deploy + T3 E2E + T5 métricas | MERGEABLE | UNIQUE |
| 2458 | telemetría flywheel | MERGEABLE | UNIQUE |
| 2454 | canary B0b foto file-upload fix | CONFLICTING | UNIQUE |
| 2440 | output-guards variedad fantasma (mega-PR) | CONFLICTING | PARTIALLY_SUPERSEDED + STALE_CONFLICT |
| 2423 | useFincaViva hook | MERGEABLE | UNIQUE |
| 2313 | agente dibuja — laminas + AgentLamina | CONFLICTING | UNIQUE |
| 2311 | script QLoRA-DPO (B7) | MERGEABLE | UNIQUE |

### Detalle Lote 5

**#2464 `feat: T13 fotos offline + T14 perfil finca real + T17 extensionista + T20 bench`**
- 7 archivos, +492/-0, MERGEABLE, base `app-3d`. Todos archivos nuevos.
- **Veredicto:** UNIQUE.

**#2462 `feat(offline): T11 modo campo offline — sync indicator + cola de reintentos`**
- 4 archivos, +160/-3, CONFLICTING, base `app-3d`. 3 nuevos + 1 modificación.
- **Veredicto:** UNIQUE.

**#2460 `feat: T6-T10 — compresión assets + i18n shell + onboarding espíritu + galería`**
- 2 archivos, +82/-1, MERGEABLE, base `app-3d`. 1 nuevo (script) + 1 modificación.
- **Veredicto:** UNIQUE.

**#2459 `feat(shell): T1 valle 3D público + T2 deploy + T3 E2E + T5 métricas`**
- 5 archivos, +277/-7, MERGEABLE, base `app-3d`. 3 nuevos + 2 mods.
- **Veredicto:** UNIQUE.

**#2458 `feat(telemetry): flywheel de telemetría del agente — privacidad-first, SFT/DPO desde uso real`**
- 5 archivos, +666/-0, MERGEABLE, base `app-3d`. Todos nuevos.
- **Veredicto:** UNIQUE.

**#2454 `fix(canary): B0b sube la foto por /api/file/upload (flujo real), no octet-stream (403)`**
- 1 archivo, +16/-12, CONFLICTING, base `feat/nightly-canary`.
- Modifica `scripts/lib/canary-modules.mjs` (no en base). Fix del canario
  B0b (subida de foto). Único archivo, diff chico.
- **Veredicto:** UNIQUE. **Ojo:** la base es `feat/nightly-canary` — confirma
  con Opus si debe cambiar a `main`.

**#2440 `fix(output-guards): cerrar gap de variedad de cultivo fabricada`**
- 100 archivos, +35982/-1890, CONFLICTING, base `main`. Creado Jul 13.
- El feature principal (guard variedad fantasma en `outputGuards.js`) es
  pequeño y útil. El bulk del PR es 99 archivos con micro-cambios (1-5 líneas
  c/u, looks like whitespace/eslint cleanup pre-i18n o similar) que se
  solapan con cleanup posterior en base.
- Sample check: `src/components/Settings/AvatarSelector.jsx` y
  `src/App.jsx` todavía tienen diffs reales vs base ( whitespace/i18n
  no aplicado). `MundosDeMiFinca.jsx` ya está idéntico en base.
- **Veredicto:** PARTIALLY_SUPERSEDED + STALE_CONFLICT. Imposible rebasar
  limpio. ESCALATE_TO_OPUS: extraer solo el cambio de `outputGuards.js`
  en un PR nuevo y cerrar este.

**#2423 `feat(hooks): add useFincaViva`**
- 8 archivos, +686/-268, MERGEABLE, base `dev`.
- Añade `src/hooks/useFincaViva.js` (+306) y su test (+316). No está en base.
- **Veredicto:** UNIQUE.

**#2313 `feat(visual): agente dibuja - laminas fiables + AgentLamina`**
- 14 archivos, +1291/-0, CONFLICTING, base `main`.
- Añade `AgentLamina.jsx`, `LaminaMilpa.jsx`, `LaminaPisoTermico.jsx`,
  `AgenteDibuja.jsx` + CSS + 3 laminas más. Ninguno en base.
- **Veredicto:** UNIQUE.

**#2311 `feat(bench): script de entrenamiento QLoRA-DPO (B7)`**
- 2 archivos, +248/-0, MERGEABLE, base `main`. 2 archivos nuevos (script
  Python + requirements).
- **Veredicto:** UNIQUE.


## Lote 6 — PRs #2290 a #2259

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2290 | librería scenes (src/visual/scenes) | CONFLICTING | SUPERSEDED |
| 2287 | librería laminas (src/visual/laminas) | CONFLICTING | SUPERSEDED |
| 2286 | librería effects (src/visual/effects) | CONFLICTING | SUPERSEDED |
| 2275 | a11y P1 contraste y tamaño | CONFLICTING | UNIQUE |
| 2272 | cross-thermal filter grafo | CONFLICTING | UNIQUE |
| 2264 | lámina maíz (en components/milpa/) | MERGEABLE | SUPERSEDED (llegó a src/visual/laminas/) |
| 2263 | yerbabuena botica | MERGEABLE | UNIQUE |
| 2262 | lámina cafeto (en components/cafe/) | MERGEABLE | SUPERSEDED (llegó a src/visual/laminas/) |
| 2261 | biopunk home polish (4 paneles) | MERGEABLE | UNIQUE |
| 2259 | cacao pests grounding (AGE) | MERGEABLE | UNIQUE |

### Detalle Lote 6

**#2290 / #2287 / #2286 — Trío de librerías visuales**
Los tres PRs crean las librerías `src/visual/{scenes,laminas,effects}/`. Las
tres librerías **ya existen en base** con archivos por nombre idéntico y
contenido **más rico** que el del PR (la base añadió JSDoc, type casts,
`eslint-disable` comments y defaults que las ramas de los PRs no tienen).

- **#2290** `feat(visual): librería reutilizable de escenas base` — diff vs
  base en `src/visual/scenes/`: +5/-10 líneas (todos ajustes que YA están
  en base). **SUPERSEDED.**
- **#2287** `feat(visual): librería de láminas de cuaderno` — diff vs base
  en `src/visual/laminas/`: +8/-18 líneas (todas posteriores a base).
  **SUPERSEDED.**
- **#2286** `feat(visual): librería de EFECTOS reutilizables` — diff vs
  base en `src/visual/effects/`: +5/-9 (posteriores a base). **SUPERSEDED.**

Acción: cerrar los tres.

**#2275 `fix(a11y): contraste y tamaño legible`**
- 5 archivos, +27/-20, CONFLICTING, base `main`.
- Hallazgos ALTA de auditoría a11y (tokens `bg-surface-card` en vez de
  hexcodes hardcodeados en `BoticaScreen.jsx`). Verificado: base todavía
  tiene `bg-[#182016]` y `bg-[#141b12]` hardcodeados → fix vivo.
- **Veredicto:** UNIQUE.

**#2272 `fix(agente): filtro de altitud en forrajeras + guard graph-backed cross_thermal`**
- 8 archivos, +1373/-149, CONFLICTING, base `main`.
- Modifica grafo-relations.json (+743/-130) y servicios de diagnóstico.
  Añade 3 scripts nuevos (`enrich-grafo-relations-altitud.mjs` y tests).
- **Veredicto:** UNIQUE.

**#2264 `feat(milpa): lámina de cuaderno de campo de la mata de maíz`**
- 2 archivos, +339/-0, MERGEABLE, base `main`.
- Crea `src/components/milpa/LaminaMaiz.jsx`. Concepto ya entregado en base
  vía `src/visual/laminas/LaminaMaiz.jsx` (ubicación centralizada que
  prefirió el operador). El archivo del PR en `components/milpa/` no está
  en base, pero es redundante con la versión ya adoptada.
- **Veredicto:** SUPERSEDED (mover a `src/visual/laminas/` si se quiere
  merged; el contenido del PR es calidad pero la ubicación quedó obsoleta).

**#2263 `feat(botica): yerbabuena (Mentha spicata) en la huerta medicinal`**
- 5 archivos, +93/-11, MERGEABLE, base `main`.
- Añade `public/botica/yerbabuena.jpg` y entry en `boticaCampesina.js`.
  Verificado: ni la imagen ni la mención a yerbabuena/Mentha están en base.
- **Veredicto:** UNIQUE.

**#2262 `feat(cafe): lámina de cuaderno de campo del cafeto (SVG)`**
- 2 archivos, +280/-0, MERGEABLE, base `main`.
- Crea `src/components/cafe/LaminaCafeto.jsx`. Mismo caso que #2264:
  concepto ya entregado en base vía `src/visual/laminas/LaminaCafeto.jsx`.
- **Veredicto:** SUPERSEDED.

**#2261 `style(home-biopunk): pulir los 4 paneles del home finca-viva`**
- 7 archivos, +193/-28, MERGEABLE, base `main`.
- Pulido visual (legibilidad al sol, contrastes). Verificado: base tiene
  versiones anteriores de `TagSvg` (ArbolDeMundos.jsx) → fix vivo.
- **Veredicto:** UNIQUE.

**#2259 `feat(grafo): grounding OpenAlex/CrossRef de 2 plagas de cacao`**
- 2 archivos, +473/-0, MERGEABLE, base `main`.
- Script + test nuevos. No en base.
- **Veredicto:** UNIQUE.


## Lote 7 — PRs #2258 a #2072

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2258 | Montaña Mundos pasada 2 cine | CONFLICTING | UNIQUE — supersedes #2249 |
| 2256 | botón A v4 (herramientas forman la A) | MERGEABLE | UNIQUE |
| 2254 | spike mercado mockup | MERGEABLE | UNIQUE (spike; distinto de #2547) |
| 2253 | 3 paneles biopunk integrados | CONFLICTING | PARTIALLY_SUPERSEDED |
| 2249 | Montaña de los Mundos (original) | CONFLICTING | DUPLICATE — cerrar (ver #2258) |
| 2218 | unifica barrio y vereda app-wide | CONFLICTING | UNIQUE |
| 2199 | rotación suave ejemplos voz | MERGEABLE | DUPLICATE — cerrar (ver #2162) |
| 2162 | modo campo espectacular + iris escucha | CONFLICTING | UNIQUE — supersedes #2199 |
| 2082 | agente "organismo que conversa" | MERGEABLE | UNIQUE |
| 2072 | overhaul visual FermentosView | MERGEABLE | UNIQUE |

### Detalle Lote 7

**Clúster Montaña Mundos (#2258 vs #2249)**
- **#2249** `feat(mockup): Montaña de los Mundos — navegación como paisaje de pisos térmicos, 3 direcciones artísticas` — 4 archivos, +1529/-1, CONFLICTING.
- **#2258** `feat(mockup): Montana Mundos pasada 2 cinematografica` — 10 archivos, +3601/-3, CONFLICTING.
- **Análisis:** #2258 es SUPERSET estricto de #2249:
  - 4 archivos comunes: `MontanaMundos.jsx` (idéntico 637/+0), `montana-mundos.css` (idéntico 785/+0), smoke test (idéntico 78/+0), `App.jsx` (45/+1 en 2258 vs 29/+1 en 2249).
  - 2258 añade 6 archivos propios: `MontanaMundosCine.jsx` (+894/-0), `montana-mundos-cine.css` (+1006/-0), 2 tests cine, `captura-tmp.mjs`, etc.
- **Veredicto:** #2258 UNIQUE (ganador del dedup). #2249 DUPLICATE → cerrar.

**#2256 `feat(fab): boton A v4 (herramientas forman la A)`**
- 3 archivos, +329/-25, MERGEABLE.
- Modifica AgentScreen y AgentHero (+8/-8 y +17/-17), añade
  `BotonAnarquiaGlyph.jsx` (+304). El nuevo archivo no está en base.
- **Veredicto:** UNIQUE.

**#2254 `spike(mercado): mockup mercado.chagra.bio`**
- 1 archivo, +1339/-0, MERGEABLE.
- Spike HTML standalone en `spikes/mercado-chagra/index.html`. **No duplica**
  a #2547 (que cablea el entry production en `mercado.html` + `src/entries/mercado.jsx`).
  Spike = experimento visual; #2547 = producción.
- **Veredicto:** UNIQUE (spike).

**#2253 `feat(home): 3 paneles biopunk a prod`**
- 21 archivos, +3470/-0, CONFLICTING.
- 1/5 archivos muestreados idénticos a base (`ArbolDeMundos.jsx`: 0 líneas
  de diff). Los otros 4 (`GuardianEspiritu.jsx`, `PanelVitalidadEspiritu.jsx`,
  `RelojFrailejon.jsx`, `vitalidadEspirituService.js`) todavía tienen diffs
  reales (17, 35, 55, 64 líneas respectivamente).
- **Veredicto:** PARTIALLY_SUPERSEDED. Rebase necesario; descartar archivos
  ya mergedos.

**#2218 `fix(location): unifica barrio y vereda en la app`**
- 34 archivos, +1838/-57, CONFLICTING, base `main`.
- 24 modificaciones + 10 archivos nuevos (4 veredas JSON nuevas, test
  `gen-veredas.test.mjs`, etc.). El fix de unificación no está en base.
- **Veredicto:** UNIQUE.

**Clúster Modo Campo Voz (#2199 vs #2162)**
- **#2199** `feat(modo-campo): rotación suave de ejemplos «hola chagra»` — 3 archivos, +165/-29.
- **#2162** `feat(modo-campo): capa viva — ejemplos en cascada + iris de escucha espectacular` — 7 archivos, +695/-6.
- **Análisis:** #2162 es SUPERSET estricto:
  - 3 archivos comunes — `EjemplosVoz.jsx` (2162=+189 vs 2199=+78), test (+103 vs +67), css (+108 vs +20). 2162 siempre más grande.
  - 2162 añade 4 archivos: `EscuchaFab.jsx`, `EscuchaOverlay.jsx`, `escucha.css`, `ModoCampoPanel.jsx`.
- **Veredicto:** #2162 UNIQUE (ganador). #2199 DUPLICATE → cerrar.

**#2082 `feat(agente): "el organismo que conversa"`**
- 6 archivos, +590/-7, MERGEABLE, base `main`.
- 3 mods + 3 archivos nuevos (`AgentLivingScene.jsx` +292, test +56, css +191).
- **Veredicto:** UNIQUE.

**#2072 `feat(fermentos): overhaul visual de FermentosView + entrada visible + fotos CC`**
- 4 archivos, +360/-131, MERGEABLE, base `main`.
- Modifica `FermentosView.jsx` (+262/-129), añade `fermentoFotos.js` (+96).
- **Veredicto:** UNIQUE.


## Lote 8 — PRs #2060 y #1999

| PR | Título corto | Estado | Veredicto |
|----|--------------|--------|-----------|
| 2060 | mano red viva 2 niveles (mega-PR) | CONFLICTING | PARTIALLY_SUPERSEDED + STALE_CONFLICT |
| 1999 | SIPSA price chip en Ciclo Vivo | CONFLICTING | UNIQUE |

### Detalle Lote 8

**#2060 `feat(agente): mano de Chagra red viva de 2 niveles`**
- 100 archivos, +17313/-746, CONFLICTING, base `main`. Creado Jul 4 (más
  viejo del lote).
- Mega-PR que reescribe el menú del agente como red radial. Sample de
  diffs vs base: `App.jsx` 2921 líneas, `AgentScreen.jsx` 1199 líneas,
  `FincaVivaHero.jsx` 958 líneas — todos con diffs reales pero en archivos
  que la base ha tocado extensamente desde Jul 4.
- Descripción propia del PR: "NO mergear a ciegas" — diseñado para sign-off
  en DEV. Lleva 16 días en CONFLICTING.
- **Veredicto:** PARTIALLY_SUPERSEDED + STALE_CONFLICT. ESCALATE_TO_OPUS:
  decidir si la feature sigue viva (y abrir PR nuevo chico sobre la base
  actual) o si se cierra. Imposible rebasar limpio.

**#1999 `fix(ciclo-vivo): wire live SIPSA price chip`**
- 11 archivos, +403/-22, CONFLICTING, base `dev`.
- 3 archivos nuevos (`sipsaPriceService.js`, `useSipsaLatestPrice.js`,
  test) + 8 modificaciones en componentes de Ciclo Vivo. El service y el
  hook **no están en base**.
- **Veredicto:** UNIQUE.

