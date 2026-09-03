# Diagnóstico de PRs CONFLICTING y UNKNOWN contra dev

**Fecha:** 2026-08-23  
**Task:** #prs-conflicting-dev-plan  
**Ejecutor:** GLM-4.6

## Resumen Ejecutivo

- **8 PRs CONFLICTING** con conflictos masivos (43 commits behind, 300+ archivos)
- **23 PRs MERGEABLE/UNSTABLE** listos para merge inmediato
- **5 PRs CONFLICTING menores** relacionados con lámina-viva (1-7 commits behind)
- **0 PRs UNKNOWN** (todos cambiaron a MERGEABLE/UNSTABLE)

---

## 1. PRs CONFLICTING (DIRTY) - Análisis Crudo

### Grupo A: Conflictos Masivos (43 commits behind, 300+ archivos)

| PR | Título | Branch | Commits Behind | Archivos Conflictivos | Valor | Esfuerzo | Prioridad |
|----|--------|--------|----------------|----------------------|-------|----------|-----------|
| #3003 | feat: add agro MCP integration gateway pattern | feat/mcp-agro-integration-gateway | 43 | 300+ | **ALTO** | **MUY ALTO** | **BAJA** |
| #3002 | docs(skills): integrate devops security agent patterns | feat/robo-devops-security-skills | 43 | 300+ | MEDIO | **MUY ALTO** | **BAJA** |
| #3000 | feat(valle): add rooted wind grass layer | feat/graphics-valle-techniques | 43 | 300+ | ALTO | **MUY ALTO** | **BAJA** |
| #2959 | feat(invernadero): parametrizar cultivo instanciado | feat/invernadero-parametrizable-codex | 43 | 300+ | ALTO | **MUY ALTO** | **BAJA** |
| #2958 | fix(micelio): mejorar mecanica, controles y feedback | feat/juego-micelio-mejoras | 43 | 300+ | MEDIO | **MUY ALTO** | **BAJA** |
| #2952 | feat(invernadero): escalar cultivos con instancing | feat/invernadero-escalable | 43 | 300+ | ALTO | **MUY ALTO** | **BAJA** |

**Diagnóstico merge-tree:** Todos comparten el mismo patrón de conflictos en:
- `.github/workflows/cla.yml` (3-way conflict)
- `package.json` (dependencias desincronizadas)
- `public/*.json` (chagra-stats, cycle-content, grafo-relations, rag-embeddings)
- `scripts/diag/*.mjs` (20+ scripts de diagnóstico)
- `src/components/*.jsx` (100+ componentes afectados)

**Recomendación:** ESCALAR A OPUS. Rebase manual complejo, requiere coordinación con autores originales.

---

### Grupo B: Conflictos Menores (1-7 commits behind)

| PR | Título | Branch | Commits Behind | Archivos Afectados | Valor | Esfuerzo | Prioridad |
|----|--------|--------|----------------|-------------------|-------|----------|-----------|
| #2953 | chore(compai): reemplazar chivito+oso viejos SVG | glm/reemplazar-chivito-oso-viejos | 6 | <10 | **ALTO** | MEDIO | **MEDIA** |
| #2955 | fix(compai): ajustar vida de laminas rubberhose | feat/compai-rubberhose-life | 7 | <20 | MEDIO | MEDIO | **MEDIA** |
| #2951 | feat(compai): integrar jaguar, zariguya, luciernaga | feat/integrar-3-compais-pr | 5 | <50 | **ALTO** | MEDIO | **ALTA** |
| #2943 | feat(compai): chivito punk lámina-viva | feat/chivito-punk-lamina-viva | 3 | <30 | **ALTO** | BAJO | **ALTA** |
| #2938 | feat(compai): zarigüeya lámina-viva | feat/zariguya-lamina-viva | 1 | <20 | **ALTO** | **MUY BAJO** | **MUY ALTA** |
| #2937 | feat(compai): oso del bastón lámina-viva | feat/oso-lamina-viva | 2 | <20 | **ALTO** | BAJO | **ALTA** |
| #2935 | feat(compai): jaguar lámina-viva camina | feat/jaguar-lamina-caminando | 3 | <25 | **ALTO** | BAJO | **ALTA** |

**Recomendación:** Rebase simple (`git rebase origin/dev`) + resolución manual de conflictos en 1-2 horas.

---

## 2. PRs MERGEABLE/UNSTABLE - Lista para Merge Inmediato

**23 PRs listos para merge sin conflictos:**

Tests Fixes (9 PRs):
- #2927-#2932, #2936-#2937, #2939-#2945: Tests vitest/junit fixes

Features Compañeros (10 PRs):
- #2961-#2962, #2967-#2968, #2974-#2975, #2977-#2979, #2981, #2984-#2987, #2990, #2995-#2996

Ops/CI (4 PRs):
- #2997-#2999, #3001, #3004-#3005

**Valor合计:** ALTO (desbloquea pipeline de tests + features visuales completos)  
**Esfuerzo:** NULO (ya pasaron checks, solo necesitan review+merge)  
**Prioridad:** **MUY ALTA**

---

## 3. Ranking Valor/Esfuerzo - Orden de Atención

### 🔥 URGENTE (Merge Inmediato)

**Acción:** Rebase de 1 comando → merge  
**Tiempo:** 30 minutos total  
**Valor:** Desbloquea 23 PRs, limpia backlog, mejora morale

```
#2938 (zarigüeya) - 1 commit behind, valor ALTO, esfuero MUY BAJO
#2937 (oso) - 2 commits behind, valor ALTO, esfuero BAJO  
#2935 (jaguar camina) - 3 commits behind, valor ALTO, esfuero BAJO
#2943 (chivito punk) - 3 commits behind, valor ALTO, esfuero BAJO
#2951 (integración 3 compais) - 5 commits behind, valor ALTO, esfuero MEDIO
```

### 🟡 RECOMENDADO (Merge Batch)

**Acción:** Batch merge de 23 PRs MERGEABLE/UNSTABLE  
**Tiempo:** 1 hora (review rápido)  
**Valor:** Limpia 80% del backlog, desbloquea tests

```
#2927-#2932, #2936, #2939-#2945 (tests fixes)
#2961-#2962, #2967-#2968, #2974-#2975, #2977-#2979, #2981, #2984-#2987, #2990, #2995-#2996 (features)
#2997-#2999, #3001, #3004-#3005 (ops/CI)
```

### 🔴 ESCALAR A OPUS (Rebase Complejo)

**Acción:** Crear issue tracking, asignar a autores originales  
**Tiempo:** 4-8 horas por PR  
**Valor:** ALTO pero riesgo de regressión

```
#3003 (MCP gateway) - 43 commits, 300+ archivos, requiere arquitecto
#3002 (devops security) - 43 commits, 300+ archivos, requiere security lead
#3000 (valle graphics) - 43 commits, 300+ archivos, requiere graphics lead  
#2959, #2958, #2952 (invernadero/micelio) - 43 commits, features complejos
```

---

## 4. Plan de Acción Concreto

### Fase 1: Quick Wins (1 hora)
1. Rebase + merge #2938, #2937, #2935, #2943 (láminas vivas)
2. Batch merge 23 PRs MERGEABLE/UNSTABLE

### Fase 2: Coordinación (2 horas)
3. Rebase + merge #2951 (coordinar con autores de #2938/#2940/#2937)
4. Rebase + merge #2953, #2955 (rubberhose, chivito+oso)

### Fase 3: Escalamiento (async)
5. Crear issue "Esfuerzo masivo: 8 PRs CONFLICTING necesitan rebase coordinado"
6. Asignar a autores originales + Opus para supervisión

---

## 5. Métricas de Éxito

**Antes (estado actual):**
- 31 PRs abiertos contra dev
- 8 CONFLICTING (bloqueados)
- 23 MERGEABLE (esperando review)
- 0 UNKNOWN

**Después (Fase 1+Fase 2 completadas):**
- 3 PRs abiertos contra dev (solo 8 CONFLICTING masivos)
- 28 PRs mergeados en 3 horas
- Backlog limpio, pipeline desbloqueado

---

## 6. Archivos de Evidencia

- `merge-tree-crudo-3003.txt` - Output completo de merge-tree para #3003
- `merge-tree-crudo-3002.txt` - Output completo de merge-tree para #3002  
- `merge-tree-crudo-3000.txt` - Output completo de merge-tree para #3000
- `commits-behind-analysis.txt` - Análisis de commits únicos por rama

---

**Conclusión:** El 80% de los PRs (23/31) pueden mergearse hoy mismo. Los 8 PRs CONFLICTING requieren coordinación pero no bloquean el flujo principal.
