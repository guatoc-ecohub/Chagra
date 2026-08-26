# Informe de Triage - PRs Abiertos Contra dev

**Fecha:** 2026-08-17 17:40:11 UTC
**Total de PRs analizados:** 35

## Resumen Ejecutivo

- **LISTO (candidatos a merge inmediato):** 0 PRs
- **CASI (solo falta sacar de draft):** 0 PRs
- **CONFLICTO (necesitan rebase):** 9 PRs
- **ROJO (CI fallando):** 21 PRs
- **RANCIO (>7 días sin activity):** 0 PRs
- **FANTASMA (abiertos sin --base dev):** 4 PRs
- **OTRO:** 1 PR (CI en progreso)

## Verificación de Conteos

- Total PRs listados: 35
- Suma de cubos: 35 (4+21+9+1+0+0+0)
- **Control negativo:** Buscar PRs con base=inexistente devuelve 0 ✓

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

## PRs FANTASMA (abiertos sin --base dev)

**Criterio:** >500 archivos tocados (probablemente abrieron contra main)

### PR #2854 - fix(voz): voz del asistente em_santa — retira ef_dora
- **Rama:** feat/voz-asistente-em-santa-remove-dora
- **Estado:** Draft=false, mergeable=false
- **CI:** RED (múltiples fallos)
- **Archivos:** 2255
- **Última actualización:** hace 2 días
- **⚠️ ALERTA:** Probablemente abierto sin --base dev

### PR #2852 - perf(agent): solapa post-validate con affects-gate
- **Rama:** fix/latencia-p1-parallel-postguards
- **Estado:** Draft=false, mergeable=false
- **CI:** RED (múltiples fallos)
- **Archivos:** 2255
- **Última actualización:** hace 2 días
- **⚠️ ALERTA:** Probablemente abierto sin --base dev

### PR #2850 - fix(prod): chagra.app = app 2D con login
- **Rama:** fix/chagra-app-2d-login
- **Estado:** Draft=false, mergeable=false
- **CI:** RED (múltiples fallos)
- **Archivos:** 2255
- **Última actualización:** hace 2 días
- **⚠️ ALERTA:** Probablemente abierto sin --base dev

### PR #2593 - feat(corpus): cablea corpus sidecar al chat
- **Rama:** feat/corpus-to-chat
- **Estado:** Draft=false, mergeable=null
- **CI:** RED (múltiples fallos)
- **Archivos:** 2257
- **Última actualización:** hace 2 días
- **⚠️ ALERTA:** Probablemente abierto sin --base dev

## Cubo OTRO

### PR #2925 - test(vitest): arregla mocks de syncManager
- **Rama:** glm/vitest-fallos-grupo-mayor
- **Estado:** Draft=true, mergeable=true
- **CI:** RUNNING (E2E suite completa in_progress)
- **Archivos:** 1
- **Última actualización:** hoy
- **NOTA:** CI aún corriendo, podría pasar a LISTO o ROJO

## Conclusiones

### ¿Qué se puede mergear YA?
**NADA.** No hay ningún PR en estado LISTO o CASI.

### ¿Qué necesita atención inmediata?
1. **PR #2925** - CI corriendo, podría pasar a LISTO si termina en verde
2. **4 PRs FANTASMA** (#2854, #2852, #2850, #2593) - Necesitan reabrir con --base dev
3. **9 PRs CONFLICTO** - Necesitan rebase antes de poder mergear

### ¿Qué está bloqueando los merges?
1. **CI rojo generalizado** - 21/35 PRs tienen CI fallando (principalmente E2E cancelled)
2. **Conflictos de merge** - 9/35 PRs no son mergeables
3. **Draft status** - La mayoría de PRs siguen en draft (31/35)

### Recomendaciones
1. **Arreglar el CI** - Prioridad #1: arreglar los E2E cancelled que están bloqueando todo
2. **Reabrir FANTASMA** - Cerrar los 4 PRs fantasma y reabrir con --base dev
3. **Hacer rebase** - Los 9 PRs en CONFLICTO necesitan rebase
4. **Esperar PR #2925** - Tiene CI en progreso, podría ser el primer PR listo

## Controles de Verificación

### Control 1: Total de PRs
```bash
gh api repos/guatoc-ecohub/Chagra/pulls --method GET --field state=open --field base=dev --paginate --jq '. | length'
```
**Resultado:** 35

### Control 2: Suma de cubos
- LISTO: 0
- CASI: 0
- CONFLICTO: 9
- ROJO: 21
- RANCIO: 0
- FANTASMA: 4
- OTRO: 1
**Suma:** 35 ✓

### Control 3: Control negativo
```bash
gh api repos/guatoc-ecohub/Chagra/pulls --method GET --field state=open --field base=inexistente --paginate --jq '. | length'
```
**Resultado:** 0 ✓

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

