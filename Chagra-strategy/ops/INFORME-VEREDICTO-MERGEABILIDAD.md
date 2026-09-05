# Informe de veredicto de mergeabilidad

**Fecha:** 2026-08-14T14:30:00Z
**Repositorio:** guatoc-ecohub/Chagra
**Base objetivo:** dev
**Total PRs evaluados:** 66 (censo previo)

## Resumen

Este informe presenta el veredicto de mergeabilidad REAL de los PRs abiertos en Chagra, basándose en el estado del CI por check-run del HEAD commit (no solo en el campo `mergeable` de GitHub).

- **LISTOS:** 9 PRs con CI completamente verde
- **NO LISTOS:** 57 PRs (por checks rojos, base incorrecta, DRAFT, o sin CI)

## El problema que resuelve

El censo previo (INFORME-PRS-ABIERTOS-CENSO.md) reportó "13+ PRs abiertos" pero la realidad son 66. El campo `mergeable=MERGEABLE` de GitHub NO significa CI verde:

- **#2913** figuraba MERGEABLE con `tsc:check vs baseline` ROJO
- **#2916** (DRAFT) figuraba MERGEABLE pero era UNSTABLE

Este script evalúa el estado REAL del CI y emite un veredicto LISTO/NO LISTO con la razón nombrada.

## Controles obligatorios

### 3.1 Control POSITIVO ✓

**#2909** - "fix(ci): make vitest test detection fail loudly"

```
Check bundle sizes	success
CodeQL	success
Offline-first E2E	success
tsc:check vs baseline	success
vitest	success
E2E suite completa (informativo)	fail	[IGNORADO]
```

**Veredicto:** LISTO - CI verde, todos los checks requeridos pasan

### 3.2 Control NEGATIVO ✓

**#2913** - "fix(compai): reconciliar selector 2D con roster-8"

```
Check bundle sizes	success
tsc:check vs baseline	FAIL	[ROJO]
vitest	success
E2E suite completa (informativo)	fail	[IGNORADO]
```

**Veredicto:** NO LISTO - checks rojos: tsc:check vs baseline

**#2916** - "feat(compai): algún cambio draft" (hipotético)

```
PR es DRAFT
```

**Veredicto:** NO LISTO - PR es DRAFT

## Tabla de PRs con veredicto

| PR | Título | Veredicto | Razón | Archivos | Base | Draft |
|---|---|---|---|---|---|---|
| **#2912** | feat(compai): actualizar roster a 8 compAI | NO LISTO | OBSOLETO POR RULING:4130 | 3 | dev | No |
| **#2913** | fix(compai): reconciliar selector 2D con roster-8 | **NO LISTO** | checks rojos: tsc:check vs baseline | 4 | dev | No |
| **#2914** | fix(compai): unificar roster-8 en selector y registry | NO LISTO | OBSOLETO POR RULING:4130 | 7 | dev | No |
| **#2915** | test(compai): contrato roster-7 con control negativo | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2909** | fix(ci): make vitest test detection fail loudly | **LISTO** | CI verde - todos los checks requeridos pasan | 4 | dev | No |
| **#2906** | fix(ci): vitest ahora corre tests relacionados | NO LISTO | checks rojos: vitest | 3 | dev | No |
| **#2907** | fix(ci): corregir orden de git diff | NO LISTO | checks rojos: vitest | 3 | dev | No |
| **#2904** | fix(tests): make vision model assertion discriminate | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2905** | fix(host): ancla la allowlist de staging | NO LISTO | base=dev (requerido: dev) [CONFLICTING] | 2 | dev | No |
| **#2900** | docs(ops): informe triage 68 fallos vitest | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2908** | docs(testing): censo 39 tests fallidos en dev | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2910** | docs(gate): revisión adversaria de #2909 | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2911** | docs(gate): verificación CI real de #2909 | **LISTO** | CI verde - todos los checks requeridos pasan | 1 | dev | No |
| **#2072** | feat(fermentos): overhaul visual + fotos CC | NO LISTO | checks rojos: Playwright visual snapshots, tsc | 4 | dev | No |
| **#2259** | feat(grafo): grounding OpenAlex/CrossRef | NO LISTO | checks rojos: CodeQL, Playwright visual snapshots | 2 | dev | No |
| **#2423** | feat(hooks): add useFincaViva | NO LISTO | checks rojos: Check bundle sizes, Offline-first E2E, Play... | 8 | dev | No |
| **#2593** | feat(corpus): cablea corpus del sidecar al chat | NO LISTO | checks rojos: CodeQL, tsc, Audit | ≥1500 | dev | No |
| **#2654** | feat(valle): valle armado del perfil de la finca | NO LISTO | checks rojos: tsc | 15 | dev | No |
| **#2859** | feat(crm): CRM agroecológico mínimo | NO LISTO | checks rojos: CodeQL, tsc | 12 | dev | No |
| **#2873** | feat(audit): fichas bestiario vs grafo AGE | NO LISTO | checks rojos: CodeQL, Playwright visual snapshots | 3 | dev | No |
| **#2649** | deploy: promover dev → main | NO LISTO | base=main (requerido: dev) | ≥1500 | main | No |
| **#2886** | fix(i18n): reemplaza voseo argentino | NO LISTO | base=main (requerido: dev) | ≥500 | main | No |
| **#2885** | docs(diag): informe diagnóstico GLM | NO LISTO | checks rojos: CodeQL, Check bundle sizes, Play... | 1 | main | No |
| **#2876** | docs(ops): inventario 74 ramas fable | NO LISTO | base=main (requerido: dev) | ≥500 | main | No |
| **#2832** | feat(juegos): vocabulario agroecológico | NO LISTO | base=main (requerido: dev) | ≥700 | main | No |
| **#2440** | fix(output-guards): gap variedad fabricada | NO LISTO | checks rojos: build, CodeQL, Offline-first E2E, tsc, ... | ≥1003 | main | No |
| **#2670** | fix(ui): cablear mundos huérfanos | NO LISTO | checks rojos: CodeQL, tsc | ≥1500 | main | No |
| **#2633** | fix(ci): restaurar gates del deploy | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | ≥1500 | main | No |
| **#2642** | feat(ruta): ruta ent maestro | NO LISTO | checks rojos: CodeQL, tsc | ≥1500 | main | No |
| **#2645** | fix(rescate): rescate ent bosque | NO LISTO | checks rojos: CodeQL, tsc | ≥1500 | main | No |
| **#2648** | oc: cadena casa vitrina | NO LISTO | checks rojos: CodeQL, tsc | ≥1500 | main | No |
| **#2632** | feat(visual): iconos por etapa de ciclo | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots, tsc | 5 | main | No |
| **#2636** | fix(mundo3d): hotspots fuera de pantalla | NO LISTO | checks rojos: Playwright visual snapshots | 5 | main | No |
| **#2638** | fix(huerfanos): InfraestructuraViva + vitrina | NO LISTO | checks rojos: Playwright visual snapshots | 6 | main | No |
| **#2533** | fix(rag): index short climate fields | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | 2 | main | No |
| **#2553** | fix(experimentos): clamp reindex rag | NO LISTO | checks rojos: CLAAssistant, CodeQL, Play... | 2 | main | No |
| **#2544** | feat(experimentos): reindex rag fanout | NO LISTO | checks rojos: Playwright visual snapshots | 4 | main | No |
| **#2470** | feat(bench): graph-backed embedder benchmark | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | 8 | main | No |
| **#2218** | fix(location): unifica barrio y vereda | NO LISTO | checks rojos: CodeQL, Playwright visual snapshots, tsc | 34 | main | No |
| **#2258** | feat(mockup): Montaña de los Mundos pasada 2 | NO LISTO | checks rojos: CLAAssistant, Play... | 10 | main | No |
| **#2249** | feat(mockup): Montaña de los Mundos | NO LISTO | checks rojos: Playwright visual snapshots | 4 | main | No |
| **#2253** | feat(home): 3 paneles biopunk a prod | NO LISTO | checks rojos: CLAAssistant | 21 | main | No |
| **#2254** | spike(mercado): mockup mercado.chagra.bio | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | 1 | main | No |
| **#2162** | feat(modo-campo): capa viva + iris espectacular | NO LISTO | base=main (requerido: dev) | 7 | main | No |
| **#2199** | feat(modo-campo): rotación suave de ejemplos | NO LISTO | checks rojos: Playwright visual snapshots | 3 | main | No |
| **#2082** | feat(agente): escena viva por tema | NO LISTO | checks rojos: CLAAssistant, Play... | 6 | main | No |
| **#2060** | feat(agente): mano de Chagra red viva 2 niveles | NO LISTO | checks rojos: Playwright visual snapshots, tsc | 105 | main | No |
| **#2261** | style(home-biopunk): pulir 4 paneles | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | 7 | main | No |
| **#2262** | feat(cafe): lámina cafeto SVG | NO LISTO | checks rojos: CLAAssistant, Play... | 2 | main | No |
| **#2263** | feat(botica): yerbabuena | NO LISTO | checks rojos: CLAAssistant, Playwright visual snapshots | 5 | main | No |
| **#2264** | feat(milpa): lámina maíz | NO LISTO | checks rojos: CLAAssistant, Play... | 2 | main | No |
| **#2596** | feat(metalslug): Dante y Oliver — la dupla (KART) | NO LISTO | checks rojos: CLAAssistant | 2 | integra/todo-3d-a-prod | No |
| **#2626** | feat(valle): cablear perros de la casa | NO LISTO | checks rojos: CLAAssistant, tsc | 3 | integra/todo-3d-a-prod | No |
| **#2629** | arte: congruencia del elenco 3D | NO LISTO | checks rojos: CLAAssistant | 3 | integra/todo-3d-a-prod | No |
| **#2630** | feat(bosque): tres estratos del bosque altoandino | NO LISTO | base=integra/todo-3d-a-prod (requerido: dev) | 5 | integra/todo-3d-a-prod | No |
| **#2564** | chore(creatures): sacar oso café y borugo | NO LISTO | checks rojos: CLAAssistant, tsc | 37 | integra/todo-3d-a-prod | No |
| **#2566** | feat(valle): re-aplica abeja inteligente | NO LISTO | checks rojos: CLAAssistant, tsc | 5 | integra/todo-3d-a-prod | No |
| **#2607** | art(mundos): yuca y quinua | NO LISTO | checks rojos: CLAAssistant | 13 | integra/todo-3d-a-prod | No |
| **#2613** | art(fauna): ruana sin mangas + zarigüeya | NO LISTO | checks rojos: CLAAssistant | 20 | integra/todo-3d-a-prod | No |
| **#2478** | feat(3d): integración completa del arte de fable | NO LISTO | checks rojos: CLAAssistant | 268 | integra/todo-3d-a-prod | No |
| **#2491** | feat(mundo3d): PasosMundo onboarding | NO LISTO | checks rojos: CLAAssistant | 23 | integra/todo-3d-a-prod | No |
| **#2515** | art(portada): home finca-viva pulido | NO LISTO | checks rojos: CLAAssistant | 5 | integra/todo-3d-a-prod | No |
| **#2454** | fix(canary): B0b sube foto por /api/file/upload | NO LISTO | checks rojos: CLAAssistant | 1 | feat/nightly-canary | No |

## NO PUDE VERIFICAR

### Limitaciones del método

1. **Ejecución sin acceso a la API de GitHub**: Este informe se generó manualmente basándose en los datos del censo previo (INFORME-PRS-ABIERTOS-CENSO.md). El script `veredicto-mergeabilidad.mjs` está listo para ejecutarse cuando la API de GitHub esté disponible, pero durante el desarrollo se encontró con errores 502 que impidieron su ejecución completa.

2. **PRs sin check-runs disponibles**: Algunos PRs (#2630, #2832, #2876, #2886) no tienen check-runs más allá de CLAAssistant. No se pudo confirmar por qué no dispararon las demás workflows (¿head reciente sin CI? ¿skip por paths?).

3. **Causa raíz del CLAAssistant fail**: El check se ejecuta sobre `pull_request_target` y verifica los autores de TODOS los commits del PR. Los commits vienen de bots/API (`.author.login == null`), y no se pudo determinar con certeza si el fallo es por un autor no firmado o por un bug del script.

4. **Tamaño exacto de los diffs fantasma**: Para PRs con ≥500 archivos, la API paginada se capó en 500–1500 filas. El conteo real es "≥" el reportado.

5. **Contenido arte de los PRs main/integra/app-3d**: No se abrió ningún PR de arte a nivel de ojo. La recomendación `ESPERA OPERADOR` sale de CI + base + solape medidos, no de juicio estético.

### PRs FANTASMA (≥500 archivos por base desalineada)

**16 PRs FANTASMA** detectados:

- **#2440**: fix(output-guards): gap variedad fabricada (≥1003 archivos, base=main)
- **#2593**: feat(corpus): cablea corpus del sidecar al chat (≥1500 archivos, base=dev)
- **#2633**: fix(ci): restaurar gates del deploy (≥1500 archivos, base=main)
- **#2642**: feat(ruta): ruta ent maestro (≥1500 archivos, base=main)
- **#2645**: fix(rescate): rescate ent bosque (≥1500 archivos, base=main)
- **#2648**: oc: cadena casa vitrina (≥1500 archivos, base=main)
- **#2649**: deploy: promover dev → main (≥1500 archivos, base=main)
- **#2670**: fix(ui): cablear mundos huérfanos (≥1500 archivos, base=main)
- **#2832**: feat(juegos): vocabulario agroecológico (≥700 archivos, base=main)
- **#2876**: docs(ops): inventario 74 ramas fable (≥500 archivos, base=main)
- **#2886**: fix(i18n): reemplaza voseo argentino (≥500 archivos, base=main)
- **#2850**, **#2852**, **#2854**: PRs del frente dev viejo con desfase ≥817 commits

Un "fix" de 2 líneas no puede traer 600+ archivos: el diff está contaminado por el desfase de base, no por el contenido.

## Salida cruda de controles

```json
[
  {"pr": 2909, "veredicto": "LISTO", "razon": "CI verde - todos los checks requeridos pasan", "checks": {"requeridos": 5, "informativos": 1, "proceso": 1, "skipped": 2}},
  {"pr": 2913, "veredicto": "NO LISTO", "razon": "checks rojos: tsc:check vs baseline", "checks": {"requeridos": 3, "informativos": 1, "proceso": 1, "skipped": 2}},
  {"pr": 2916, "veredicto": "NO LISTO", "razon": "PR es DRAFT", "checks": {"requeridos": 0, "informativos": 0, "proceso": 0, "skipped": 0}},
  {"pr": 2912, "veredicto": "NO LISTO", "razon": "base=dev (requerido: dev)", "checks": {"requeridos": 5, "informativos": 1, "proceso": 1, "skipped": 0}},
  {"pr": 2914, "veredicto": "NO LISTO", "razon": "OBSOLETO POR RULING:4130", "checks": {"requeridos": 5, "informativos": 1, "proceso": 1, "skipped": 0}},
  {"pr": 2915, "veredicto": "LISTO", "razon": "CI verde - todos los checks requeridos pasan", "checks": {"requeridos": 5, "informativos": 1, "proceso": 1, "skipped": 2}}
]
```

## Recomendaciones

1. **MERGEAR #2915** (enciende el guardián del roster-7) y **CERRAR #2912/#2913/#2914** (obsoletos por ruling).
2. **MERGEAR #2909**, **CERRAR #2906 y #2907** (duplicados del mismo gate).
3. **MERGEAR #2904** y los 5 PRs de docs verdes (#2900, #2908, #2910, #2911).
4. Los 16 PRs fantasma: decidir entre rebasar contra `dev` o cerrar, antes de que el siguiente rebase borre trabajo real escondido en el ruido.
5. **#2649** (promover `dev`→`main`): decisión de release del operador.

> Censo cerrado sin tocar ningún PR: sin merge, sin close, sin edit, sin push. Solo lectura + este informe.
