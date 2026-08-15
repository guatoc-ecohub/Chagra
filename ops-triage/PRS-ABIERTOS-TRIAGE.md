# PRs abiertos — triage para drenaje

Fecha de medición: 2026-08-06. Solo lectura de git/GitHub; nada se mergeó ni se cerró.

## Total de PRs abiertos: **80**

Desglose por base: `main` 42 · `dev` 26 · `integra/todo-3d-a-prod` 8 · `app-3d` 3 · `feat/nightly-canary` 1.

Nota de contexto: el flujo real tiene 3 pisos (`dev` → `integra/todo-3d-a-prod` → `main`).
PRs a `main` no son todos "base equivocada": 2649 (`dev`→`main`) y 2628 (`integra`→`main`) son los vehículos de promoción legítimos. La sospecha de base equivocada aplica a PRs de producto chico que debieran aterrizar en `dev` primero (marcados en su cubeta).

## Reglas de merge reales (repositorio)

- `main` tiene el ruleset **"main tests"**: requeridos = `Analyze`, `Offline-first E2E`, `Check bundle sizes`, `tsc:check vs baseline` + CodeQL (scan). Revisión humana: 0 (no exige approvals).
- `dev` e `integra/todo-3d-a-prod` **no tienen protección**: un PR ahí se puede mergear sin checks. Además, la CI de PR solo dispara con `branches: [main]`; los PRs a `dev`/`integra`/`app-3d` casi nunca corren la suite completa (solo `CLAAssistant` o push-triggered).
- `E2E suite completa (informativo)` y `Playwright visual snapshots` **no bloquean**: la primera está etiquetada informativo y la segunda no es requerida. No se contaron como rojas.
- `CLAAssistant` falla en decenas de PRs viejos; no es check requerido → no bloquea.

## Cobertura del inventario

- Los 80 PRs tienen `mergeable` calculado por GitHub (44 MERGEABLE / 36 CONFLICTING). **Ninguno quedó UNKNOWN**: no hubo que re-consultar por merge indeterminado.
- En PRs draft a `dev` marcados "solo informativo rojo", la suite completa no corrió; su "verde" es por ausencia de CI, no por correrla. Decirlo honesto: mergear a dev no los valida.

## Cubeta VERDE-YA — mergeable hoy (2)

| PR | Título | base | draft | estado | días crea/upd | Δ | checks requeridas rojas | qué falta |
|---|---|---|---|---|---|---|---|---|
| 2847 | feat(mundo3d): mundo-paramo — rescate de trabajo huérfano a dev | dev | no | UNSTABLE | 5/0 | +1190/-0 (5) | — | mergeable hoy; base dev, sin conflicto, checks requeridas verdes; rescate de arte pagado (caveat: gate visual) |
| 2855 | fix(compai): sync-compai-nucleo apuntaba a un destino inexistente | dev | no | UNSTABLE | 3/3 | +4/-1 (1) | — | mergeable hoy; base dev, sin conflicto, sin checks requeridas rojas |

## Cubeta ARREGLO CHICO — una sola cosa los bloquea (55)

Ordenado: primero arte fable/rescates, después producto, después infra/scripts. La mayoría son drafts mergeables que solo esperan un-draft + rebase, o una check roja puntual, o un conflicto en pocos archivos.

| PR | Título | base | draft | estado | días crea/upd | Δ | checks requeridas rojas | qué falta |
|---|---|---|---|---|---|---|---|---|
| 2249 | feat(mockup): Montaña de los Mundos — navegación como paisaje de pisos t | main | sí | DIRTY | 28/28 | +1529/-1 (4) | — | CONFLICTING 4 archivos; rebase |
| 2256 | feat(fab): boton A v4 (herramientas forman la A) | main | no | BLOCKED | 28/27 | +329/-25 (3) | tsc:check vs baseline | tsc roja; base main (deberia ser dev) |
| 2258 | feat(mockup): Montana Mundos pasada 2 cinematografica | main | sí | DIRTY | 27/27 | +3601/-3 (10) | tsc:check vs baseline | CONFLICTING 10 archivos; arte fable (montana mundos pasada 2); rebase |
| 2261 | style(home-biopunk): pulir los 4 paneles del home finca-viva (vitalidad  | main | sí | UNSTABLE | 27/27 | +193/-28 (7) | — | draft; solo Playwright roja (no requerida); arte fable (home biopunk polish) |
| 2262 | feat(cafe): lámina de cuaderno de campo del cafeto (SVG) | main | sí | BLOCKED | 27/27 | +280/-0 (2) | tsc:check vs baseline | draft; tsc roja; arte fable (lamina cafeto) |
| 2263 | feat(botica): yerbabuena (Mentha spicata) en la huerta medicinal [DRAFT  | main | sí | UNSTABLE | 27/27 | +93/-11 (5) | — | draft; solo Playwright roja (no requerida); arte fable (yerbabuena) |
| 2264 | feat(milpa): lámina de cuaderno de campo de la mata de maíz (Zea mays) | main | sí | BLOCKED | 27/27 | +339/-0 (2) | tsc:check vs baseline | draft; tsc roja; arte fable (lamina maiz) |
| 2515 | art(portada): home finca-viva pulido — estampas andinas en las puertas + | app-3d | no | DIRTY | 21/21 | +367/-26 (5) | — | CONFLICTING 5 archivos sobre app-3d; base debe ser integra; arte fable (home portada pulida) |
| 2566 | feat(valle): re-aplica abeja inteligente + acceso al páramo sobre v2 lim | integra/todo-3d-a-prod | sí | DIRTY | 19/19 | +269/-11 (5) | tsc:check vs baseline | CONFLICTING 5 archivos; rebase corto |
| 2596 | feat(metalslug): Dante y Oliver — la dupla que huele y trae | integra/todo-3d-a-prod | sí | UNSTABLE | 18/18 | +562/-6 (2) | — | draft sobre integra; solo CLAAssistant roja (no requerida); arte fable |
| 2626 | feat(valle): cablear perros de la casa | integra/todo-3d-a-prod | sí | UNSTABLE | 16/16 | +165/-1 (3) | tsc:check vs baseline | draft sobre integra; tsc roja |
| 2629 | arte: congruencia del elenco 3D — auditoría + 2 fixes de outliers | integra/todo-3d-a-prod | sí | UNSTABLE | 16/16 | +179/-3 (3) | — | draft sobre integra; solo CLAAssistant roja (no requerida); arte fable |
| 2630 | feat(bosque): tres estratos del bosque altoandino diferenciados por silu | integra/todo-3d-a-prod | sí | CLEAN | 16/15 | +2035/-45 (5) | — | draft limpio sobre integra; solo un-draft + pasar por cadena integra; arte fable |
| 2632 | feat(visual): set coherente de iconos por etapa de ciclo en cards | main | sí | BLOCKED | 16/16 | +290/-14 (5) | tsc:check vs baseline | draft; tsc roja (CLAAssistant/Playwright no requeridas); arte fable |
| 2638 | fix(huerfanos): cablear InfraestructuraViva + vitrina 2D de artesanía an | main | sí | DIRTY | 16/16 | +268/-4 (6) | — | CONFLICTING 6 archivos; rebase corto |
| 2848 | feat(mundo3d): mundo-chorrera — rescate de trabajo huérfano a dev | dev | no | UNSTABLE | 5/0 | +812/-0 (6) | tsc:check vs baseline | tsc roja (rama huerfana rescatada, depende de dev) |
| 2849 | feat(mundo3d): mundo-bosque — rescate de trabajo huérfano a dev | dev | no | UNSTABLE | 5/0 | +423/-0 (7) | tsc:check vs baseline | tsc roja (rama huerfana rescatada, depende de dev) |
| 2851 | feat(valle): cablear EntsDelValle — Guardianes del gradiente (rescate hu | dev | sí | UNSTABLE | 5/0 | +134/-0 (2) | tsc:check vs baseline | draft; tsc roja |
| 2072 | feat(fermentos): overhaul visual de FermentosView + entrada visible + fo | main | no | BLOCKED | 33/28 | +360/-131 (4) | tsc:check vs baseline | tsc roja; base main (deberia ser dev) |
| 2082 | feat(agente): "el organismo que conversa" — escena viva por tema que rea | main | sí | BLOCKED | 32/28 | +590/-7 (6) | tsc:check vs baseline | draft; tsc roja; reinvencion del chat (cambio grande pero 6 archivos) |
| 2162 | feat(modo-campo): capa viva — ejemplos en cascada + iris de escucha espe | main | no | DIRTY | 29/28 | +695/-6 (7) | — | CONFLICTING 7 archivos; rebase |
| 2199 | feat(modo-campo): rotación suave de ejemplos «hola chagra» (6s, cross-fa | main | sí | UNSTABLE | 29/29 | +165/-29 (3) | — | draft; checks requeridas verdes; solo un-draft |
| 2272 | fix(agente): filtro de altitud en forrajeras + guard graph-backed cross_ | main | no | DIRTY | 27/27 | +1373/-149 (8) | tsc:check vs baseline, CodeQL | CONFLICTING 8 archivos; cross-thermal filter; rebase |
| 2275 | fix(a11y): contraste y tamaño legible (hallazgos ALTA botica/glaciar/age | main | sí | DIRTY | 27/27 | +27/-20 (5) | — | CONFLICTING 5 archivos; a11y; rebase |
| 2423 | feat(hooks): add useFincaViva | dev | sí | UNSTABLE | 24/24 | +686/-268 (8) | Offline-first E2E, Check bundle sizes, tsc:check vs baseline | draft; Offline-first E2E + Check bundle + tsc rojas |
| 2533 | fix(rag): index short climate fields in flattenDoc | main | sí | DIRTY | 21/21 | +58/-6 (2) | — | CONFLICTING 2 archivos; rebase corto |
| 2593 | feat(corpus): cablea el corpus del sidecar (5647 chunks) al chat | main | no | BLOCKED | 18/5 | +207/-1 (4) | Check bundle sizes, tsc:check vs baseline | Check bundle sizes + tsc rojas; base main (deberia ser dev) |
| 2636 | fix(mundo3d): hotspots fuera de pantalla en valle 2D + Sierra sin intera | main | sí | DIRTY | 16/16 | +410/-11 (5) | — | CONFLICTING 5 archivos; rebase corto |
| 2754 | fix(catalog): fusionar plagas binomiales duplicadas | main | sí | UNSTABLE | 13/13 | +1727/-1119 (5) | — | draft; checks requeridas verdes; solo un-draft |
| 2763 | perf(valle): instanciar rebaño chico + fix timing giro abeja (experiment | dev | sí | UNSTABLE | 12/12 | +239/-52 (2) | tsc:check vs baseline | draft; tsc roja |
| 2780 | feat(efectos): librería de etiquetas 3D anti-colisión + dedup rubber-hos | dev | sí | UNSTABLE | 12/12 | +378/-56 (7) | tsc:check vs baseline | draft; tsc roja |
| 2833 | fix(mockups): connect clima route to real world | dev | sí | UNSTABLE | 7/7 | +73/-452 (5) | Check bundle sizes, tsc:check vs baseline | draft; Check bundle sizes + tsc rojas |
| 2850 | fix(prod): chagra.app = app 2D con login (finca-viva OFF) | main | no | BLOCKED | 5/5 | +6/-5 (1) | Check bundle sizes | Check bundle sizes roja; base main (deberia ser dev) |
| 2852 | perf(agent): solapa post-validate con affects-gate (latencia P1) | main | no | BLOCKED | 4/4 | +40/-17 (1) | Check bundle sizes | Check bundle sizes roja; base main (deberia ser dev) |
| 2854 | fix(voz): voz del asistente por defecto em_santa — retira ef_dora (gring | main | no | BLOCKED | 3/3 | +27/-19 (3) | Check bundle sizes | Check bundle sizes roja; base main (deberia ser dev) |
| 2857 | fix(rag): filter plumbing fields and add thermal to contextual fields | dev | sí | CLEAN | 3/0 | +13/-1 (1) | — | draft limpio; solo un-draft + rebase |
| 2858 | feat(services): hoja de vida por mata (cruza logs + grafo AGE) | dev | sí | CLEAN | 3/0 | +720/-0 (3) | — | draft limpio; solo un-draft + rebase |
| 2859 | feat(crm): CRM agroecológico mínimo con contactos e interacciones | dev | sí | UNSTABLE | 3/0 | +1361/-2 (12) | tsc:check vs baseline, CodeQL | draft; tsc + CodeQL rojas (rebase) |
| 2864 | feat(demos): detector de anomalías en fotos de cultivo (VLM) | dev | sí | UNSTABLE | 1/1 | +932/-0 (2) | — | draft; solo check informativo rojo |
| 2867 | feat(catalog): arquetipos flora tests y docs | dev | sí | CLEAN | 0/0 | +8971/-0 (4) | — | draft limpio; solo un-draft + rebase |
| 2870 | feat(demos): adopta un frailejon - demo educativo self-contained | dev | sí | UNSTABLE | 0/0 | +1146/-0 (4) | — | draft; solo check informativo rojo |
| 2259 | feat(grafo): grounding OpenAlex/CrossRef de 2 plagas de cacao | main | no | BLOCKED | 27/27 | +473/-0 (2) | CodeQL | CodeQL roja; base main (deberia ser dev) |
| 2454 | fix(canary): B0b sube la foto por /api/file/upload (flujo real), no octe | feat/nightly-canary | no | DIRTY | 23/23 | +16/-12 (1) | — | CONFLICTING 1 archivo sobre feat/nightly-canary; rebase |
| 2470 | feat(bench): add graph-backed embedder benchmark | main | sí | DIRTY | 22/22 | +38287/-268 (8) | — | CONFLICTING 8 archivos; rebase |
| 2553 | fix(experimentos): clamp reindex rag chunks | main | no | DIRTY | 19/8 | +1215/-0 (2) | CodeQL | CONFLICTING 2 archivos; rebase corto |
| 2744 | test(abejas): actualizar foco de seleccion 3D | dev | sí | DIRTY | 13/13 | +7/-5 (1) | — | CONFLICTING 1 archivo, pero rama con 388 archivos ajenos (base equivocada); recrear desde origin/dev |
| 2765 | fix(modelos): barrer residuos de gemma4:e2b/gemma3:4b tras el swap a qwe | main | sí | UNSTABLE | 12/12 | +17/-17 (10) | — | draft; checks requeridas verdes; solo un-draft |
| 2861 | feat(catalog): auditor de biodiversidad GBIF | dev | sí | UNSTABLE | 1/1 | +458/-0 (2) | — | draft; solo check informativo rojo |
| 2862 | feat(catalog): curador de huecos del catálogo | dev | sí | UNSTABLE | 1/1 | +355/-0 (2) | — | draft; solo check informativo rojo |
| 2863 | feat(scripts): detector de código construido-no-cableado | dev | sí | UNSTABLE | 1/1 | +1533/-0 (3) | — | draft; solo check informativo rojo |
| 2868 | feat(scripts): detector de confusión taxonómica en logs (rescate de glm- | dev | sí | UNSTABLE | 0/0 | +595/-0 (2) | — | draft; solo check informativo rojo |
| 2869 | feat(oraculo): oráculo de territorio — Plus Codes, haversine y zonas (ge | dev | sí | UNSTABLE | 0/0 | +514/-0 (5) | — | draft; solo check informativo rojo |
| 2871 | feat(scripts): normalizador de variantes de nombre común de especies | dev | sí | UNSTABLE | 0/0 | +340/-0 (2) | — | draft; solo check informativo rojo |
| 2872 | feat(bench): medir delta REAL del RAG en prod tras PR #2860 | dev | sí | CLEAN | 0/0 | +718/-0 (3) | — | draft limpio; solo un-draft + rebase |
| 2873 | feat(audit): verificación de fichas del bestiario vs grafo AGE | dev | sí | UNSTABLE | 0/0 | +834/-0 (3) | Offline-first E2E, Check bundle sizes, tsc:check vs baseline, CodeQL | draft; 4 checks requeridas rojas (CodeQL, tsc, Offline-first E2E, Check bundle sizes) |

## Cubeta PESADO — necesita sesión propia (15)

Conflictos en muchos archivos, ramas enormes o cambios grandes. No son de un toque; requieren rebase/resync dedicado.

| PR | Título | base | draft | estado | días crea/upd | Δ | checks requeridas rojas | qué falta |
|---|---|---|---|---|---|---|---|---|
| 2060 | feat(agente): mano de Chagra red viva de 2 niveles | main | no | DIRTY | 33/31 | +17313/-746 (105) | tsc:check vs baseline | CONFLICTING 105 archivos; mano-red-viva 2 niveles; requiere sign-off + rebase grande |
| 2253 | feat(home): 3 paneles biopunk a prod — vitalidad + árbol/reloj + guardiá | main | sí | DIRTY | 28/28 | +3470/-0 (21) | — | CONFLICTING 21 archivos; arte fable (3 paneles biopunk); sesion de rebase |
| 2564 | chore(creatures): sacar oso café y borugo del elenco (rechazados por dis | integra/todo-3d-a-prod | sí | DIRTY | 19/19 | +157/-971 (37) | tsc:check vs baseline | CONFLICTING 37 archivos; chore de elenco (sacar oso/borugo) |
| 2607 | art(mundos): yuca y quinua — el arranque de la raíz y el campo de panoja | integra/todo-3d-a-prod | sí | DIRTY | 17/17 | +4530/-0 (13) | — | CONFLICTING 13 archivos; arte fable (yuca/quinua); requiere sesion de rebase |
| 2613 | art(fauna): la ruana pierde las mangas · la zarigüeya deja de ser el gur | integra/todo-3d-a-prod | sí | DIRTY | 17/17 | +2258/-144 (20) | — | CONFLICTING 20 archivos; arte fable (ruana/zarigueya); requiere sesion de rebase |
| 2218 | fix(location): unifica barrio y vereda en la app | main | sí | DIRTY | 28/28 | +1838/-57 (34) | tsc:check vs baseline, CodeQL | CONFLICTING 34 archivos; unifica barrio/vereda app-wide |
| 2313 | feat(visual): agente dibuja - laminas fiables + AgentLamina | main | no | DIRTY | 26/25 | +1291/-0 (14) | tsc:check vs baseline | CONFLICTING 14 archivos; agente dibuja laminas (visual + producto) |
| 2440 | fix(output-guards): cerrar gap de variedad de cultivo fabricada | main | sí | DIRTY | 24/24 | +35982/-1890 (503) | Offline-first E2E, Check bundle sizes, tsc:check vs baseline, CodeQL | CONFLICTING 503 archivos; rama enorme (guard variedad fantasma), base probablemente equivocada |
| 2491 | feat(mundo3d): add reusable PasosMundo onboarding | app-3d | sí | DIRTY | 21/21 | +1585/-42 (23) | — | CONFLICTING 23 archivos; PasosMundo; sesion propia |
| 2654 | feat(valle): el valle se arma del perfil de la finca (pasos 1-2 del spec | dev | sí | DIRTY | 16/16 | +902/-54 (15) | tsc:check vs baseline | CONFLICTING 15 archivos; valle dinamico pasos 1-2 del spec |
| 2670 | fix(ui): cablear mundos huerfanos | main | sí | DIRTY | 15/15 | +176070/-3902 (1071) | tsc:check vs baseline, CodeQL | CONFLICTING 1071 archivos; cablear huerfanos 2D, rama enorme |
| 2685 | refactor(onboarding): consolidar flujo de primera vez | dev | sí | DIRTY | 15/15 | +451/-101 (28) | tsc:check vs baseline | CONFLICTING 28 archivos; consolidacion onboarding, sesion propia |
| 2628 | deploy: integra 3D → prod (páramo frailejón, bosque siembra, Angelita 2ª | main | no | DIRTY | 16/13 | +230247/-3824 (1990) | — | CONFLICTING 1990 archivos; promo integra->prod; resync grande |
| 2633 | fix(ci): restaurar gates del deploy | main | sí | DIRTY | 16/8 | +227629/-3829 (1988) | — | CONFLICTING 1988 archivos; rama integrada enorme; body pide ESCALATE |
| 2649 | deploy: promover dev → main (Angelita guía, microfauna, valle, arreglos  | main | no | DIRTY | 16/0 | +360941/-7410 (2797) | — | CONFLICTING 2797 archivos; promo dev->main; main se movio, requiere resync grande |

## Cubeta CANDIDATO A CERRAR — proponer, nunca ejecutar (8)

Duplicados, superados o spikes. Cierre lo decide el operador.

| PR | Título | base | draft | estado | días crea/upd | Δ | checks requeridas rojas | por qué cerrar |
|---|---|---|---|---|---|---|---|---|
| 2544 | feat(experimentos): reindex rag fanout | main | no | DIRTY | 20/16 | +1170/-0 (4) | — | CONFLICTING 4 archivos; superado por 2553 (mismo script reindex-rag.mjs + clamp) |
| 2254 | spike(mercado): mockup mercado.chagra.bio | main | no | UNSTABLE | 28/28 | +1339/-0 (1) | — | spike/mockup mercado a main; tecnicamente mergeable pero es spike; verificar si aun importa o cerrar |
| 2478 | feat(3d): integracion completa del arte de fable a prod.chagra.app — 9 r | app-3d | no | DIRTY | 22/22 | +30442/-607 (134) | — | CONFLICTING 134 archivos sobre app-3d; "integracion 3D completa" superada por la cadena integra->main (2628) |
| 2642 | oc/ruta-ent-maestro-1784660216 | main | sí | DIRTY | 16/8 | +229125/-3824 (1989) | tsc:check vs baseline, CodeQL | oc/* chain worker; duplicado de 2645/2647 (mismo file list); sube artefactos dist-prod/ + docs de auditoria a raiz de main; superado por cadena integra |
| 2645 | oc/rescate-ent-1784665495 | main | sí | DIRTY | 16/8 | +228556/-3824 (1986) | tsc:check vs baseline, CodeQL | oc/* chain worker; duplicado de 2642/2647; sube artefactos dist-prod/; superado por cadena integra |
| 2647 | oc/angelita-vida-1784667113 | main | sí | DIRTY | 16/8 | +230062/-3828 (1995) | tsc:check vs baseline, CodeQL | oc/* chain worker; duplicado de 2642/2645; sube artefactos dist-prod/; superado por cadena integra |
| 2648 | oc/cadena-casa-vitrina-1784668587 | main | sí | DIRTY | 16/16 | +355601/-3828 (2075) | tsc:check vs baseline, CodeQL | oc/* chain worker; duplicado de 2642/2645/2647; sube artefactos dist-prod/ a main; superado por cadena integra |
| 2832 | feat(juegos): agrega vocabulario agroecológico colombiano (32 términos) | main | sí | DIRTY | 7/7 | +337596/-6993 (2732) | — | CONFLICTING 2732 archivos; rama corrupta (vocabulario juegos); recrear desde dev |

## Suma de cubetas

2 + 55 + 15 + 8 = **80** = total de PRs abiertos. Cuadra.

## Los 5 que yo mergearía primero, y por qué

1. **#2847 — mundo-páramo (rescate de arte pagado).** Es la definición de la cubeta VERDE-YA: base `dev`, sin conflicto, checks requeridas verdes, no draft. Trabajo de arte 3D ya hecho que hoy no está en ningún lado. Caveat del propio body: es 3D y merece un gate visual, pero técnicamente se puede mergear hoy.
2. **#2855 — fix compai (destino inexistente).** VERDE-YA, 1 línea (`+4/-1`), arregla que el sync apuntaba a un destino que no existe. Cero fricción, despeja el flujo del asistente unificado.
3. **#2857 — fix RAG 62%.** Draft limpio (base `dev`, CLEAN). Completa el fix del RAG que descartaba 62% de documentos (arregla el plumbling de campos de contexto). Un-draft + rebase y es mergeable; corrige una regresión de calidad del buscador.
4. **#2858 — hoja de vida por mata.** Draft limpio (base `dev`, CLEAN). Servicio de producto (cruza logs + grafo AGE) que desbloquea la feature de hoja de vida. Un-draft + rebase.
5. **#2630 — fable/bosque tres estratos.** Draft limpio sobre `integra/todo-3d-a-prod` (CLEAN). Arte de Fable ya pagado y verificado; solo necesita un-draft y que la cadena integra→main (2628) se resincronice. Es el rescate de arte con mejor estado de salud de la cola.

Mención honorífica: **#2872** (bench del delta real del RAG tras #2860, draft limpio) y **#2261/#2263/#2262/#2264** (láminas y home biopunk de Fable, solo les falta tsc/un-draft).

## Lo que NO pude determinar

- Si las 4 ramas `oc/*` (2642, 2645, 2647, 2648) son exactamente el mismo contenido: comparten los primeros 100 archivos idénticos y todas suben artefactos de build (`dist-prod/`) y docs de auditoría a la raíz de main. La API trunca el diff en 100 archivos, así que no pude diff completo; el operador debería confirmar antes de cerrar (probablemente se conserva UNA si alguna aporta).
- Estado real de las ramas huérfanas 2848/2849/2851 (tsc roja): la suite que corrió fue push-triggered contra la rama, no contra dev; no verifiqué localmente si el fix de tsc es 1 línea o más.
- Si #2254 (spike mercado) y #2454 (fix canary B0b) fueron superados por otra vía: lo deduje de contexto (2544 superado por 2553 sí lo verifiqué por contenido del mismo script); el resto queda para confirmación del operador.

> Reglas de esta pasada: no se mergeó, cerró, borró ni pusheó nada. Solo lectura + este archivo.

---

## Drenaje 2026-08-06

Ejecución posterior al triage: cambios de base y merges a `dev`. Nada se mergeó a `main`, nada se cerró, ninguna rama se borró (las ramas de los PRs mergeados quedaron intactas).

### PRs con base corregida (main → dev): 7

2256, 2072, 2259, 2593, 2850, 2852, 2854.

Tras el cambio de base y re-consulta de merge (esperando a que GitHub recalculara; varios pasaron por UNKNOWN antes de decidir):

- **3 MERGEABLE contra dev** pero con checks rojas heredadas del run contra `main` (la CI de PR solo dispara con `branches: [main]`, así que contra `dev` no se re-corren): **2256** (tsc:check vs baseline), **2072** (tsc:check vs baseline), **2259** (CodeQL). No se mergearon: no cumplen el criterio "checks verdes" del paso 3 y no pude verificar que el código compile contra dev. Costo para destrabarlos: re-correr la suite contra dev o correr tsc/CodeQL local; decisión del operador si acepta checks rojas heredadas.
- **4 CONFLICTING contra dev** (sus ramas divergen del contenido actual de dev; antes contra main no tenían conflicto): **2593, 2850, 2852, 2854**. Requieren rebase, eso es tocar código = otra tarea. Nota: **2850** (chagra.app = app 2D con login) parece superado por **2853** (mismo cambio, ya mergeado a dev el 05-ago, squash 3ea8319b), candidato a revisar con el operador.

### Mergeados a dev: 2 (squash, convención del repo)

| PR | Título | squash en dev | verificacion |
|---|---|---|---|
| 2847 | feat(mundo3d): mundo-paramo — rescate de trabajo huérfano a dev | `da2316c9` | state=MERGED, mergedAt=2026-08-07T03:12Z |
| 2855 | fix(compai): sync-compai-nucleo apuntaba a un destino inexistente | `b9c42231` | state=MERGED, mergedAt=2026-08-07T03:13Z; head de dev = este squash |

Después de cada merge se re-consultó el siguiente PR antes de proseguir (2855 quedó UNKNOWN tras el merge de 2847 y se esperó a que recalculara a MERGEABLE).

### No se pudieron mergear pese a estar no-draft y sin conflicto: 3

2256, 2072, 2259: base dev corregida, sin conflicto, no draft, pero con tsc:check vs baseline (2256, 2072) o CodeQL (2259) roja. Bloqueo real: checks de calidad sin re-verificar contra dev. No son "solo un-draft": hay que verificar el tipo/scan antes de meterlos a dev.

### Rescates de arte Fable: estado tras la pasada

- 2847 (mundo-paramo) y 2848/2849 (mundo-chorrera/bosque) son rescates de trabajo huérfano a dev. 2847 quedó mergeado; 2848/2849 siguen bloqueados por tsc:check vs baseline roja (2 runs FAILURE cada uno), no draft, base dev. Arreglarlas es tocar código.
- Las demás ramas de arte fable (`fable/*` no hay; marcadas "arte fable" en el triage: 2261-2264, 2515, 2566, 2596, 2626, 2629, 2630, 2632, 2253, 2607, 2613) siguen igual: drafts o sobre `integra`/`app-3d`, ninguna mergeable hoy sin tocar código.

### Conteo

- ANTES: 80 PRs abiertos.
- DESPUES: 78 PRs abiertos (2 mergeados a dev; 0 cerrados).
- Resultado neto: -2, ambos merges verificados con `gh pr view` (state + mergedAt + squash en head de dev).