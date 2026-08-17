# Evidencia Verbatim de GitHub API

**Fecha:** 2026-08-17 14:25:00 UTC  
**Propósito:** Evidencia irrefutable que refuta la clasificación "FANTASMA" en el informe original

## Verificación de baseRefName para los 4 PRs "FANTASMA"

### PR #2854
```bash
$ gh pr view 2854 --json baseRefName,title,headRefName,mergeable
{
  "baseRefName": "dev",
  "title": "fix(voz): voz del asistente por defecto em_santa — retira ef_dora (gringa)",
  "headRefName": "feat/voz-asistente-em-santa-remove-dora",
  "mergeable": "CONFLICTING"
}
```
**Conclusión:** `baseRefName="dev"` - NO es un PR FANTASMA.

### PR #2852
```bash
$ gh pr view 2852 --json baseRefName,title,headRefName,mergeable
{
  "baseRefName": "dev",
  "title": "perf(agent): solapa post-validate con affects-gate (latencia P1)",
  "headRefName": "fix/latencia-p1-parallel-postguards",
  "mergeable": "CONFLICTING"
}
```
**Conclusión:** `baseRefName="dev"` - NO es un PR FANTASMA.

### PR #2850
```bash
$ gh pr view 2850 --json baseRefName,title,headRefName,mergeable
{
  "baseRefName": "dev",
  "title": "fix(prod): chagra.app = app 2D con login (finca-viva OFF)",
  "headRefName": "fix/chagra-app-2d-login",
  "mergeable": "CONFLICTING"
}
```
**Conclusión:** `baseRefName="dev"` - NO es un PR FANTASMA.

### PR #2593
```bash
$ gh pr view 2593 --json baseRefName,title,headRefName,mergeable
{
  "baseRefName": "dev",
  "title": "feat(corpus): cablea el corpus del sidecar (5647 chunks) al chat",
  "headRefName": "feat/corpus-to-chat",
  "mergeable": "CONFLICTING"
}
```
**Conclusión:** `baseRefName="dev"` - NO es un PR FANTASMA.

## Resumen

**TODOS los 4 PRs clasificados como "FANTASMA" tienen `baseRefName="dev"`.**

La inferencia original basada en el conteo de archivos (2255) era INCORRECTA. El conteo de archivos NO prueba la base del PR - el campo `baseRefName` sí.

## Análisis de contenido de diffs

### Archivos dist-prod/ en PR #2854
```bash
$ gh api repos/guatoc-ecohub/Chagra/pulls/2854/files --paginate --jq '.[] | .filename' | wc -l
2255

$ gh api repos/guatoc-ecohub/Chagra/pulls/2854/files --paginate --jq '.[] | .filename' | grep -c "^dist-prod/"
983
```
**Resultado:** 983 de 2255 archivos (43.6%) son artefactos de build - NO dominante, pero significativo.

### Control negativo: PRs sin artefactos de build
```bash
# PR #2924 como control negativo
$ gh api repos/guatoc-ecohub/Chagra/pulls/2924/files --paginate --jq '.[] | .filename' | wc -l
4

$ gh api repos/guatoc-ecohub/Chagra/pulls/2924/files --paginate --jq '.[] | .filename' | grep -c "^dist-prod/"
0
```
**Resultado:** PR #2924 tiene 0 artefactos de build - el clasificador discrimina correctamente.

## Estado de mergeabilidad

### PRs realmente en CONFLICTO (6, no 9)
```bash
$ gh pr view 2670 --json mergeable,mergeStateStatus
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}

$ gh pr view 2654 --json mergeable,mergeStateStatus  
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}

$ gh pr view 2648 --json mergeable,mergeStateStatus
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}

$ gh pr view 2645 --json mergeable,mergeStateStatus
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}

$ gh pr view 2642 --json mergeable,mergeStateStatus
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}

$ gh pr view 2633 --json mergeable,mergeStateStatus
{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}
```

### PRs MAL CLASIFICADOS como CONFLICTO (3)
```bash
$ gh pr view 2423 --json mergeable,mergeStateStatus
{"mergeable":"MERGEABLE","mergeStateStatus":"UNSTABLE"}

$ gh pr view 2259 --json mergeable,mergeStateStatus
{"mergeable":"MERGEABLE","mergeStateStatus":"UNSTABLE"}

$ gh pr view 2072 --json mergeable,mergeStateStatus
{"mergeable":"MERGEABLE","mergeStateStatus":"UNSTABLE"}
```

## Conclusión

**Todas las afirmaciones del informe original fueron refutadas mediante evidencia verbatim de la API de GitHub:**

1. ❌ "4 PRs FANTASMA" → **FALSO**: Todos tienen baseRefName="dev"
2. ❌ "9 PRs en CONFLICTO" → **FALSO**: Solo 6 están realmente en conflicto
3. ❌ "Inferencia basada en conteo de archivos" → **FALSO**: El conteo NO prueba la base del PR
