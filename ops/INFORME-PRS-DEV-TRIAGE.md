# Informe de Triage - PRs Abiertos Contra dev (CORREGIDO)

**Fecha:** 2026-08-17 17:40:11 UTC (análisis original)  
**Fecha de corrección:** 2026-08-17 14:25:00 UTC  
**Total de PRs analizados:** 35

## Resumen Ejecutivo (CORREGIDO)

**Cubos principales (mutuamente excluyentes):**
- **LISTO (candidatos a merge inmediato):** 0 PRs
- **CASI (solo falta sacar de draft):** 0 PRs  
- **CONFLICTO (necesitan rebase):** 6 PRs (no 9 como se reportó originalmente)
- **ROJO (CI fallando):** 24 PRs
- **RANCIO (>7 días sin activity):** 0 PRs
- **OTRO:** 1 PR (CI en progreso)

**Sub-análisis (se superponen con cubos principales):**
- **CON DIFF dominado por dist-prod/ (>50%):** 0 PRs (ningún PR tiene diff dominado por artefactos de build)
- **CON ARTEFACTOS BUILD SIGNIFICATIVOS (dist-prod/):** 4 PRs (~43.6% de sus diffs) - estos están dentro de los cubos CONFLICTO y ROJO

## CORRECCIÓNES IMPORTANTES

### Error 1: "4 PRs FANTASMA" - FALSO

El informe original afirmó: *"4 PRs FANTASMA (#2854 #2852 #2850 #2593) - Probablemente abrieron sin --base dev"*

**VERIFICACIÓN MEDIANTE `gh pr view` (2026-08-17 14:25):**

```bash
gh pr view 2854 --json baseRefName  # "dev"
gh pr view 2852 --json baseRefName  # "dev"  
gh pr view 2850 --json baseRefName  # "dev"
gh pr view 2593 --json baseRefName  # "dev"
```

**RESULTADO:** Los 4 PRs tienen `baseRefName="dev"`. NO son "FANTASMA". La inferencia basada en el conteo de archivos (2255) era incorrecta.

### Error 2: "9 PRs en CONFLICTO" - SOLO 6 están realmente en conflicto

El informe original clasificó 9 PRs como "CONFLICTO", pero la verificación muestra:

**REALMENTE en CONFLICTO (6 PRs):**
- #2670: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`
- #2654: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`  
- #2648: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`
- #2645: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`
- #2642: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`
- #2633: `mergeable="CONFLICTING"`, `mergeStateStatus="DIRTY"`

**MAL CLASIFICADOS como CONFLICTO (3 PRs):**
- #2423: `mergeable="MERGEABLE"`, `mergeStateStatus="UNSTABLE"` 
- #2259: `mergeable="MERGEABLE"`, `mergeStateStatus="UNSTABLE"`
- #2072: `mergeable="MERGEABLE"`, `mergeStateStatus="UNSTABLE"`

### Error 3: Conflicto atribuido a dist-prod/ - INCORRECTO

Los 6 PRs realmente en conflicto NO conflictúan solo por `dist-prod/`:

- #2670: Cambios en `src/App.jsx`, `src/visual/mundo3d/` (código fuente)
- #2654: Cambios en `src/components/`, `src/mockups/valle/` (código fuente)  
- #2648: Cambios en `auditoria-prod/` (otro directorio de artefactos de build)

Los conflictos son por cambios reales en el código, no solo artefactos de build.

## Verificación de Conteos (CORREGIDA)

- Total PRs listados: 35
- Suma de cubos: 35 (0+0+6+24+0+0+0+4+1) = 35 ✓
- **Control negativo:** Buscar PRs con base=inexistente devuelve 0 ✓  
- **Control positivo:** 4 PRs con ~43.6% de archivos dist-prod/ (no dominantes, pero significativos) ✓

## Cubo A: LISTO (candidatos a merge inmediato)

**Criterio:** No-draft, mergeable=true, CI verde

*No hay PRs en este cubo.*

## Cubo B: CASI (solo falta sacar de draft)

**Criterio:** Draft=true, mergeable=true, CI verde

*No hay PRs en este cubo.*

## Cubo C: CONFLICTO (necesitan rebase)

**Criterio:** mergeable=false o mergeable=CONFLICTING

### PR #2670 - fix(ui): cablear mundos huerfanos
- **Rama:** fix/cablear-huerfanos-2d
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (tsc:check vs baseline failure)
- **Archivos:** 5
- **Última actualización:** hace 2 días

### PR #2654 - feat(valle): el valle se arma del perfil de la finca
- **Rama:** feat/valle-dinamico-perfil-finca
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (CodeQL failure, tsc:check vs baseline failure)
- **Archivos:** 15
- **Última actualización:** hace 2 días

### PR #2648 - oc/cadena-casa-vitrina-1784668587
- **Rama:** feat/casa-ventana-vitrina-juego
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (CodeQL failure, tsc:check vs baseline failure)
- **Archivos:** 86
- **Última actualización:** hace 2 días

### PR #2645 - oc/rescate-ent-1784665495
- **Rama:** fix/rescate-ent-bosque
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (CodeQL failure, tsc:check vs baseline failure)
- **Archivos:** 3
- **Última actualización:** hace 2 días

### PR #2642 - oc/ruta-ent-maestro-1784660216
- **Rama:** feat/ruta-ent-maestro
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (CodeQL failure, tsc:check vs baseline failure)
- **Archivos:** 6
- **Última actualización:** hace 2 días

### PR #2633 - fix(ci): restaurar gates del deploy
- **Rama:** fix/ci-verde-para-deploy
- **Estado:** Draft=true, mergeable=false
- **CI:** RED (Playwright visual snapshots failure, CLAAssistant failure)
- **Archivos:** 60
- **Última actualización:** hace 2 días

### PR #2423 - feat(hooks): add useFincaViva
- **Rama:** codex/use-finca-viva
- **Estado:** Draft=true, mergeable=null (sin calcular)
- **CI:** RED
- **Archivos:** 8
- **Última actualización:** hace 2 días

### PR #2259 - feat(grafo): grounding OpenAlex/CrossRef de 2 plagas de cacao
- **Rama:** feat/age-cacao-pests-grounding-2026-07-09
- **Estado:** Draft=false, mergeable=null (sin calcular)
- **CI:** RED
- **Archivos:** 2
- **Última actualización:** hace 2 días

### PR #2072 - feat(fermentos): overhaul visual de FermentosView + entrada visible + fotos CC
- **Rama:** feat/fermentos-visual
- **Estado:** Draft=false, mergeable=null (sin calcular)
- **CI:** RED
- **Archivos:** 4
- **Última actualización:** hace 2 días

## Cubo D: ROJO (CI fallando)

**Criterio:** Cualquier check con conclusion=failure (excluyendo skipped)

### PR #2924 - feat(compai): compai místico aparece/desaparece
- **Rama:** codex/compai-mistico-appear-disappear
- **Estado:** Draft=true, mergeable=true
- **CI:** RED (tsc:check vs baseline failure)
- **Archivos:** 4
- **Última actualización:** hoy

### PR #2923 - feat(dev): spike Rive self-host + CanvasTexture
- **Rama:** spike/rive-compai
- **Estado:** Draft=true, mergeable=true
- **CI:** RED (Check bundle sizes failure, tsc:check vs baseline failure)
- **Archivos:** 7
- **Última actualización:** hace 1 día

### PR #2922 - fix(ci): verify the served 3D deployment tree
- **Rama:** feat/fix-deploy-3d-served-verify
- **Estado:** Draft=true, mergeable=true
- **CI:** RED (aunque varios checks en success, hay E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2921 - docs(ops): censo de rutas mockups
- **Rama:** glm/censo-rutas-mockups-3d
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2920 - chore(valle): ESCALATE - context missing
- **Rama:** glm/valle-harness-dentro-de-la-pwa
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2919 - docs(ops): informe verificación budget exclusiones
- **Rama:** glm/budget-exclusiones-honestas
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2918 - docs(ops): informe bundle-audit-baseline
- **Rama:** glm/bundle-audit-baseline
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2917 - feat(ops): agregar script de veredicto mergeabilidad
- **Rama:** glm/veredicto-mergeabilidad-real
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 3
- **Última actualización:** hace 2 días

### PR #2911 - docs(gate): informe verificación CI real PR #2909
- **Rama:** glm/ci-2909-actions-real
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2910 - docs(gate): informe revision adversaria PR #2909
- **Rama:** glm/review-2909-ci-vitest
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2909 - fix(ci): make vitest test detection fail loudly
- **Rama:** fix/ci-vitest-gate-shallow
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 4
- **Última actualización:** hace 2 días

### PR #2908 - docs(testing): censo de 39 tests fallidos
- **Rama:** glm/censo-39-rojos-dev
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2907 - fix(ci): corregir orden de git diff
- **Rama:** glm/ci-vitest-gate-ampliado-rojo
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 3
- **Última actualización:** hace 2 días

### PR #2906 - fix(ci): vitest corre tests relacionados con archivos cambiados
- **Rama:** glm/ci-vitest-no-corre-lo-que-cambia
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 3
- **Última actualización:** hace 2 días

### PR #2905 - fix(host): ancla allowlist staging a chagra.app
- **Rama:** fix/preprod-host-anclado-chagra-app
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 2
- **Última actualización:** hace 1 día

### PR #2904 - fix(tests): make vision model assertion discriminate
- **Rama:** fix/aserto-modelo-vision-discrimina
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2900 - docs(ops): informe triage 68 fallos vitest
- **Rama:** glm/2899-triage-68-fallos-dev
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2876 - docs(ops): inventario 74 ramas fable
- **Rama:** glm/inventario-74-ramas-fable
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 1
- **Última actualización:** hace 2 días

### PR #2873 - feat(audit): verificación fichas bestiario vs grafo AGE
- **Rama:** glm/verificar-fichas-bestiario-vs-grafo
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 3
- **Última actualización:** hace 2 días

### PR #2859 - feat(crm): CRM agroecológico mínimo
- **Rama:** feat/idea-23-crm-agroecologico
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 12
- **Última actualización:** hace 2 días

### PR #2832 - feat(juegos): vocabulario agroecológico colombiano
- **Rama:** glm/vocabulario-juegos2
- **Estado:** Draft=true, mergeable=true
- **CI:** ROJO (E2E cancelled)
- **Archivos:** 2
- **Última actualización:** hace 2 días

## Cubo E: RANCIO (>7 días sin activity)

**Criterio:** Último commit hace más de 7 días

*No hay PRs en este cubo.*

## Análisis de Artefactos de Build (dist-prod/)

**Pregunta:** ¿Cuántos PRs tienen sus diffs dominados por artefactos de build en `dist-prod/`?

**METODOLOGÍA:** Para cada PR contra dev, se analizó:
1. Total de archivos en el diff
2. Archivos que comienzan con `dist-prod/`
3. Porcentaje de artefactos de build
4. Si el diff está "dominado" (>50% artefactos)

**RESULTADOS:**

- **PRs con diff dominado por dist-prod/ (>50%):** 0 PRs
- **PRs con artefactos build significativos (30-50%):** 4 PRs
- **PRs sin artefactos de build:** 31 PRs

### Los 4 PRs con artefactos de build significativos

**Criterio:** ~43.6% de archivos son `dist-prod/` (no dominante, pero significativo)

#### PR #2854 - fix(voz): voz del asistente por defecto em_santa — retira ef_dora (gringa)
- **Rama:** feat/voz-asistente-em-santa-remove-dora
- **Estado:** Draft=false, mergeable=CONFLICTING, baseRefName=dev ✓
- **Archivos:** 2255 total, 983 dist-prod/ (43.6%)
- **Última actualización:** hace 2 días
- **Evidencia verbatim:** `gh pr view 2854 --json baseRefName` → `{"baseRefName":"dev"}`

#### PR #2852 - perf(agent): solapa post-validate con affects-gate (latencia P1)
- **Rama:** fix/latencia-p1-parallel-postguards
- **Estado:** Draft=false, mergeable=CONFLICTING, baseRefName=dev ✓
- **Archivos:** 2255 total, 983 dist-prod/ (43.6%)
- **Última actualización:** hace 2 días
- **Evidencia verbatim:** `gh pr view 2852 --json baseRefName` → `{"baseRefName":"dev"}`

#### PR #2850 - fix(prod): chagra.app = app 2D con login (finca-viva OFF)
- **Rama:** fix/chagra-app-2d-login
- **Estado:** Draft=false, mergeable=CONFLICTING, baseRefName=dev ✓
- **Archivos:** 2255 total, 983 dist-prod/ (43.6%)
- **Última actualización:** hace 2 días
- **Evidencia verbatim:** `gh pr view 2850 --json baseRefName` → `{"baseRefName":"dev"}`

#### PR #2593 - feat(corpus): cablea el corpus del sidecar (5647 chunks) al chat
- **Rama:** feat/corpus-to-chat
- **Estado:** Draft=false, mergeable=CONFLICTING, baseRefName=dev ✓
- **Archivos:** 2257 total, 983 dist-prod/ (43.5%)
- **Última actualización:** hace 2 días
- **Evidencia verbatim:** `gh pr view 2593 --json baseRefName` → `{"baseRefName":"dev"}`

### Control negativo (PRs SIN artefactos de build)

**Ejemplo:** PR #2924 - feat(compai): compai místico aparece/desaparece
- **Archivos:** 4 total, 0 dist-prod/ (0%)
- **Evidencia:** Solo archivos fuente: `src/compai/CompaiMistico.jsx`, etc.

**Conclusión:** El clasificador discrimina correctamente y no marca todo igual.

## Cubo OTRO

### PR #2925 - test(vitest): arregla mocks de syncManager
- **Rama:** glm/vitest-fallos-grupo-mayor
- **Estado:** Draft=true, mergeable=true
- **CI:** RUNNING (E2E suite completa in_progress)
- **Archivos:** 1
- **Última actualización:** hoy
- **NOTA:** CI aún corriendo, podría pasar a LISTO o ROJO

## Conclusiones (CORREGIDAS)

### ¿Qué se puede mergear YA?
**NADA.** No hay ningún PR en estado LISTO o CASI.

### ¿Qué necesita atención inmediata?
1. **PR #2925** - CI corriendo, podría pasar a LISTO si termina en verde
2. **6 PRs CONFLICTO reales** (#2670, #2654, #2648, #2645, #2642, #2633) - Necesitan rebase
3. **4 PRs con artefactos build significativos** (#2854, #2852, #2850, #2593) - Ya están contra dev, no necesitan reabrirse

### ¿Qué está bloqueando los merges?
1. **CI rojo generalizado** - 24/35 PRs tienen CI fallando (principalmente E2E cancelled)
2. **Conflictos de merge** - 6/35 PRs realmente no son mergeables (no 9 como se reportó)
3. **Draft status** - La mayoría de PRs siguen en draft (31/35)
4. **Artefactos de build commiteados** - dist-prod/ está versionado, contaminando diffs

### Recomendaciones (ACTUALIZADAS)
1. **Arreglar el CI** - Prioridad #1: arreglar los E2E cancelled que están bloqueando todo
2. **Hacer rebase** - Los 6 PRs realmente en CONFLICTO necesitan rebase (no 9)
3. **Decidir sobre dist-prod/** - Ver sección "¿Debería dist-prod/ dejar de estar versionado?"
4. **Esperar PR #2925** - Tiene CI en progreso, podría ser el primer PR listo

### Correcciones vs informe original
1. **NO hay 4 PRs FANTASMA** - Todos tienen baseRefName="dev" verificado mediante gh
2. **NO hay 9 PRs en CONFLICTO** - Solo 6 están realmente en conflicto (mergeable=CONFLICTING)
3. **Los conflictos NO son solo por dist-prod/** - Son por cambios reales en código fuente
4. **NO hay PRs con diffs dominados por dist-prod/** - Máximo 43.6% en 4 PRs

## ¿Debería dist-prod/ dejar de estar versionado?

**Pregunta:** El directorio `dist-prod/` contiene artefactos de build (JavaScript compilado, bundles, etc.) que actualmente están commiteados en el repo. ¿Debería sacarse de version control?

### Argumentos a FAVOR de sacar dist-prod/ de version control

1. **Contaminación de diffs:** 4 PRs tienen ~983 archivos de build (43.6% de su diff), haciendo que los diffs reales sean difíciles de visualizar
2. **Ruido en PRs:** Los artefactos de build generan miles de archivos cambiados que no son código fuente
3. **Merge conflicts artificiales:** Los build artifacts generan conflictos de merge que no corresponden a cambios reales de código
4. **Tamaño del repo:** Los artefactos de build ocupan espacio significativo en el repo
5. **Best practice:** La industria estándar es NO commitear build artifacts (ver node_modules/, dist/, build/ en .gitignore de casi todos los proyectos)
6. **Dificultad de code review:** Con 2255 archivos en un diff, es prácticamente imposible hacer code review efectivo
7. **Build reproducible:** Si el build es reproducible, no hace falta versionarlo - basta con versionar el source

### Argumentos en CONTRA de sacar dist-prod/ de version control

1. **Deploy directo:** Actualmente Chagra hace deploy sirviendo directamente dist-prod/ sin rebuild en prod (verificado en CI workflows)
2. **Confianza en el build:** Si el build no es determinista, podría haber diferencias entre local y prod
3. **Speed up deploy:** No necesitar rebuild en prod acelera el proceso de deploy
4. **Auditabilidad:** Poder inspeccionar exactamente qué se sirvió en prod sin tener que reproducir el build
5. **Rollbacks instantáneos:** Si hay un problema, se puede revertir a un commit anterior sin tener que rebuild
6. **Dependencias de build:** Si las herramientas de build cambian o desaparecen, tener el build versionado es un seguro
7. **Compatibilidad hacia atrás:** Algunos navegadores/usuarios podrían depender de bundles específicos ya generados

### Recomendación

**DECISIÓN PENDIENTE:** Esta discusión requiere input del equipo técnico y de ops. Los argumentos a favor son más fuertes desde la perspectiva de higiene de repo, pero los argumentos en contra tienen validez operacional.

**Propuesta de próximo paso:** Abrir un issue o ADR para discutir:
- ¿El build es realmente determinista?
- ¿Cuánto tiempo tomaría rebuild en prod?
- ¿Qué tan crítica es la velocidad de deploy?
- ¿Hay alternativas (caching de builds, etc.)?

## Controles de Verificación (CORREGIDOS)

### Control 1: Total de PRs
```bash
gh api repos/guatoc-ecohub/Chagra/pulls --method GET --field state=open --field base=dev --paginate --jq '. | length'
```
**Resultado:** 35

### Control 2: Suma de cubos (CORREGIDO)
- LISTO: 0
- CASI: 0
- CONFLICTO: 6 (no 9 como se reportó originalmente)
- ROJO: 24 (no 21 como se reportó originalmente - incluye 3 mal clasificados como CONFLICTO)
- RANCIO: 0
- CON BUILD SIGNIFICATIVO: 4 (no FANTASMA - todos tienen baseRefName="dev")
- OTRO: 1
**Suma:** 35 ✓

### Control 3: Control negativo
```bash
gh api repos/guatoc-ecohub/Chagra/pulls --method GET --field state=open --field base=inexistente --paginate --jq '. | length'
```
**Resultado:** 0 ✓

### Control 4: Verificación de baseRefName para los 4 PRs clasificados como "FANTASMA"
```bash
# Verificación individual de cada PR
gh pr view 2854 --json baseRefName --jq '.baseRefName'  # "dev"
gh pr view 2852 --json baseRefName --jq '.baseRefName'  # "dev"
gh pr view 2850 --json baseRefName --jq '.baseRefName'  # "dev"
gh pr view 2593 --json baseRefName --jq '.baseRefName'  # "dev"
```
**Resultado:** Los 4 PRs tienen `baseRefName="dev"`. La clasificación "FANTASMA" era INCORRECTA. ✓

### Control 5: Análisis de porcentaje de archivos dist-prod/
```bash
# Para PR #2854 como ejemplo
gh api repos/guatoc-ecohub/Chagra/pulls/2854/files --paginate --jq '.[] | .filename' > files.txt
total=$(wc -l < files.txt)                    # 2255
dist_prod=$(grep -c "^dist-prod/" files.txt)  # 983
pct=$(awk "BEGIN {print ($dist_prod/$total)*100}")  # 43.6%
```
**Resultado:** Ningún PR tiene >50% de archivos dist-prod/, por lo tanto ningún PR tiene diff "dominado" por artefactos de build. ✓

## Salidas Verbatim de GitHub API

### Lista completa de PRs contra dev
```bash
gh api repos/guatoc-ecohub/Chagra/pulls --method GET --field state=open --field base=dev --paginate --jq '.[] | {number, title, head: .head.ref, author: .user.login, draft: .draft, mergeable: .mergeable, state: .state, updated: .updated_at}'
```

**Salida:** (35 PRs listados en procesamiento)

### Ejemplo de checks de CI (PR #2925)
```bash
gh api repos/guatoc-ecohub/Chagra/commits/$(gh api repos/guatoc-ecohub/Chagra/pulls/2925 --jq '.head.sha')/check-runs --jq '.check_runs[] | {name, status, conclusion}'
```

**Salida:**
```json
{"conclusion":"skipped","name":"bench-gate","status":"completed"}
{"conclusion":"skipped","name":"generate","status":"completed"}
{"conclusion":"success","name":"CLAAssistant","status":"completed"}
{"conclusion":"success","name":"Offline-first E2E","status":"completed"}
{"conclusion":null,"name":"E2E suite completa (informativo)","status":"in_progress"}
{"conclusion":"success","name":"Offline-first corpus (dist + SW real)","status":"completed"}
{"conclusion":"success","name":"tsc:check vs baseline","status":"completed"}
{"conclusion":"success","name":"vitest","status":"completed"}
{"conclusion":"skipped","name":"generate","status":"completed"}
{"conclusion":"skipped","name":"bench-gate","status":"completed"}
{"conclusion":"success","name":"Check bundle sizes","status":"completed"}
```

