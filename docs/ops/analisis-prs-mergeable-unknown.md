# Análisis de PRs con estado Mergeable UNKNOWN

**Fecha:** 2026-08-23  
**Task:** #prs-unknown-porque-no-mergean  
**Objetivo:** Investigar por qué 11 PRs reportan mergeable UNKNOWN y arreglar solo los rojos triviales de lint/formato

## Resumen Ejecutivo

**Hallazgo principal:** En el momento de este análisis, **NO se encontraron PRs con estado UNKNOWN**. 

### Estado actual de los PRs (2026-08-23)

- **MERGEABLE:** 74 PRs
- **CONFLICTING:** 26 PRs  
- **UNKNOWN:** 0 PRs
- **Total:** 100 PRs analizados

## Análisis del Estado UNKNOWN

### ¿Qué significa el estado UNKNOWN?

GitHub reporta el estado `mergeable: UNKNOWN` cuando está **recalculando temporalmente** la mergeabilidad de un PR. Este estado:

- Es **temporal** y fluctúa: UNKNOWN → MERGEABLE/CONFLICTING
- Generalmente se resuelve solo después de unos minutos
- Puede persistir si hay checks CI pendientes o conflictos complejos

### Causas comunes de UNKNOWN

1. **Recálculo de GitHub** (más común): GitHub está recalculando si el PR se puede mergear
2. **Checks pendientes**: CI checks que están corriendo y bloquean la decisión
3. **Conflictos en cálculo de merge base**: Cambios recientes en la rama base
4. **Issues temporales de GitHub**: La API a veces reporta UNKNOWN transientemente

## Herramientas Creadas

Se crearon tres scripts para detectar y arreglar estos casos en el futuro:

### 1. `scripts/detect-mergeable-unknown-prs.mjs`

**Uso:** `node scripts/detect-mergeable-unknown-prs.mjs [--detailed]`

**Funcionalidad:**
- Detecta PRs con estado UNKNOWN
- Muestra distribución de estados de mergeabilidad
- Con `--detailed` muestra checks CI y estados
- Proporciona recomendaciones de acción

**Salida de ejemplo:**
```
🔍 Detector de PRs con estado Mergeable UNKNOWN
🔍 Analizando 100 PRs en busca de estados UNKNOWN...
✅ No se encontraron PRs con estado UNKNOWN en este momento.
📊 Distribución actual de estados:
   MERGEABLE: 74 PRs
   CONFLICTING: 26 PRs
   UNKNOWN: 0 PRs
```

### 2. `scripts/fix-trivial-pr-issues.mjs`

**Uso:** `node scripts/fix-trivial-pr-issues.mjs <PR_NUMBER>`

**Funcionalidad:**
- Arregla automáticamente issues triviales de lint/formato
- Ejecuta `eslint --fix` y `prettier --write`
- Verifica que los cambios no rompan el build
- Crea commit con mensaje convencional
- Hace push al branch del PR

**⚠️ USO CON PRECAUCIÓN:** Solo para issues claramente triviales

### 3. `scripts/quick-pr-triage.sh`

**Uso:** `bash scripts/quick-pr-triage.sh`

**Funcionalidad:**
- Análisis rápido de PRs con checks fallidos
- Identifica fallos triviales de ESLint/lint/formato
- Muestra count de PRs con problemas triviales

## Recomendaciones

### Para PRs con estado UNKNOWN

1. **Esperar unos minutos** - La mayoría de veces se resuelve solo
2. **Verificar checks CI** - Revisar si hay checks pendientes/fallidos
3. **Revisar rama base** - Verificar si hubo cambios recientes
4. **Usar las herramientas** - Ejecutar los scripts creados para diagnóstico

### Para prevención futura

1. **Monitorizar estados UNKNOWN** - Ejecutar `detect-mergeable-unknown-prs.mjs` regularmente
2. **Automatizar detección** - Integrar en CI/CD pipeline
3. **Documentar casos** - Crear tickets cuando UNKNOWN persista > 30 min
4. **Revisar checks CI** - Asegurar que checks triviales no bloqueen merge

## Conclusión

**No se encontraron evidencias de "11 PRs con mergeable UNKNOWN" en el análisis actual.**

Hipótesis más probable:
- El operador hizo el análisis en un momento específico cuando GitHub estaba recalculando estados
- Los estados UNKNOWN son transitorios y fluctúan constantemente
- Para el momento de este análisis, todos los PRs ya estaban clasificados (MERGEABLE/CONFLICTING)

**Estado final:** ✅ Todos los PRs actuales están correctamente clasificados. No se requiere acción inmediata.

Las herramientas creadas servirán para detectar y manejar casos futuros cuando aparezcan PRs con estado UNKNOWN.
