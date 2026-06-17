# Merge Readiness Report — integrate/opencode-69-116 → main

**Fecha:** 2026-06-16

## Bloqueantes

| # | Archivo | Estado | Accion |
|---|---------|--------|--------|
| — | `DashboardLive.jsx` (VETADO) | Conflicto con integrate | Resolver manual: mantener version de main |
| — | `ProfileScreen.jsx` (VETADO) | Conflicto con integrate | Resolver manual: mantener version de main |
| — | `AgentScreen.jsx` (VETADO) | Conflicto con integrate | Resolver manual: mantener version de main |

## No bloqueantes

| Item | Estado |
|------|--------|
| `better-sqlite3` build | Fallido en este entorno (nativo). No bloquea deploy. |
| Suite completa unit tests | 5957 pass, 15 skip en main. Integrate tiene ~12 fallos adicionales por contratos nuevos — ya reparados en PRs 1638-1645. |
| Playwright E2E | Requiere servidor Vite corriendo. No bloquea merge. |

## PRs requeridos antes del merge

| PR | Cubre |
|----|-------|
| #1638 | Vitest exclude node_modules |
| #1639 | fast-check install |
| #1640 | networkRetry fix |
| #1641 | ErrorBoundary, InputLog, OfflineChip |
| #1642 | agentCapabilities, agentPartialMerge |
| #1643 | PlanEditor, OnboardingHero, TaskScreen |
| #1644 | Smoke unificado, boundaryAudit, bench validator |

## Smoke de validacion

```bash
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/smoke-137-lote.test.js \
  tests/unit/smoke-132-integration.test.js \
  tests/unit/animalAlias.test.js \
  tests/unit/animalSelectorContract.test.js
```

## Decision: NO mergear hasta que PRs 1638-1644 esten mergeados a main
