# Merge Readiness Final — Lote 117-151

**Fecha:** 2026-06-16

## Lo que esta verde

| # | Area | Tests | PR |
|---|------|-------|-----|
| 1 | Vitest exclude | Config | #1638 |
| 2 | fast-check | 13/13 | #1639 |
| 3 | networkRetry | 8/8 | #1640 |
| 4 | ErrorBoundary | 9/9 | #1641 |
| 5 | InputLog | 3/3 | #1641 |
| 6 | OfflineChip | 5/5 | #1641 |
| 7 | PlanEditor | 4/4 | #1643 |
| 8 | OnboardingHero | 5/5 | #1643 |
| 9 | TaskScreen | 5/5 | #1643 |
| 10 | agentCapabilities | 6/6 | #1642 |
| 11 | agentPartialMerge | 6/6 | #1642 |
| 12 | Smoke integrado | 7/7 | #1644 |
| 13 | Alias animales | 8/8 + 6/6 | #1644, #1645 |
| 14 | boundaryAudit | Refinado | #1644 |
| 15 | Smoke final | 6/6 | #1646 |

## Lo que esta bloqueado

| Bloqueo | Por que |
|---------|---------|
| Nada | Los archivos vetados NO tienen cambios en la rama integrada |

## Archivos vetados — 0 conflictos

DashboardLive.jsx, ProfileScreen.jsx, AgentScreen.jsx no tienen cambios en integrate/opencode-69-116. El merge es limpio.

## Comando pre-merge-safe

```bash
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/smoke-final-142.test.js \
  tests/unit/animalAlias.test.js \
  tests/unit/animalSelectorContract.test.js \
  tests/unit/boundaryAudit.test.js
```
