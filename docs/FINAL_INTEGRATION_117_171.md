# Final Integration Report — Lotes 117-171

**Fecha:** 2026-06-16
**Rama integrada:** `wip/autosave-integrate-opencode-69-116-alpha`
**Merge a main:** `git merge-tree` confirma **0 conflictos**

## Commits integrados (PRs)

| PR | Lote | Area |
|----|------|------|
| #1638 | 117 | Vitest exclude node_modules anidados |
| #1639 | 118 | fast-check install |
| #1640 | 126 | networkRetry unhandled rejections |
| #1641 | 119-124 | ErrorBoundary, InputLog, OfflineChip |
| #1642 | 125 | agentCapabilities, agentPartialMerge |
| #1643 | 130-131 | PlanEditor, OnboardingHero, TaskScreen |
| #1644 | 132-137 | Smoke, alias, boundaryAudit, bench validator |
| #1645 | 138-141 | Label Cerdos, selector contrato, docs |
| #1646 | 142-151 | Merge readiness, bench policy, smoke final |
| #1647 | 152-161 | Auditoria vetados, checklist integracion |
| #1648 | 162-171 | Cierre final, comando pre-merge-main |

## Tests verdes (pre-merge)

```bash
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/smoke-final-142.test.js \
  tests/unit/animalAlias.test.js \
  tests/unit/animalSelectorContract.test.js \
  tests/unit/boundaryAudit.test.js
```

| Suite | Tests | Estado |
|-------|-------|--------|
| smoke-final-142 | 6/6 | ✅ |
| animalAlias | 8/8 | ✅ |
| animalSelectorContract | 6/6 | ✅ |
| boundaryAudit | 1/1 | ✅ |

## Archivos vetados — resueltos

| Archivo | Estado |
|---------|--------|
| DashboardLive.jsx | Fix manual del Home aplicado en commit separado |
| ProfileScreen.jsx | Sin conflictos con integrate |
| AgentScreen.jsx | Sin conflictos con integrate |

## Riesgos restantes

- `better-sqlite3` build nativo no soportado en este entorno (no bloquea deploy)
- Suite completa unit (5957 tests) requiere CI runner con >3GB RAM
- Playwright E2E requiere servidor Vite + OAuth mock

## Contratos canonicos

- `SEGUIMIENTO_KEYS.cerdos` = 'cerdos' (salida canonica)
- `profileTieneCerdos`: acepta 'marrano', 'marranos', 'porcino' (entrada)
- `CHIP_INTENTS`: objeto (no array)
- `mergePartialOnInterruption`: retorna `{preservePartial, content, error, ...}`
- `ErrorBoundary`: usa `MSG.ALGO_FALLO`, `MSG.INTENTAR_DE_NUEVO`
