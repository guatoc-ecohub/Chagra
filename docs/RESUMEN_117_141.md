# Resumen operativo post-estabilizacion 117-141

## Que quedo estable

| Area | PR | Estado |
|------|-----|--------|
| Vitest config | #1638 | Excluye node_modules anidados |
| fast-check | #1639 | Instalado, 13 property tests |
| ErrorBoundary | #1641 | Usa MSG, 9/9 tests |
| InputLog | #1641 | 3/3 tests |
| OfflineChip | #1641 | Regex accent-insensitive |
| PlanEditor | #1643 | queryByDisplayValue, 4/4 |
| OnboardingHero | #1643 | localStorage key + testid, 5/5 |
| TaskScreen | #1643 | Placeholder regex, 5/5 |
| agentCapabilities | #1642 | CHIP_INTENTS objeto |
| agentPartialMerge | #1642 | Retorna objeto |
| networkRetry | #1640 | mockImplementation async |
| Smoke integrado | #1644 | 7/7 tests |
| Alias animales | #1644 | Entrada marrano, salida cerdos |
| boundaryAudit | #1644 | Allowlist bench/data refinado |
| Bench validator | #1644 | script validate-bench-history.mjs |
| Label cerdos UI | #1645 | Sin "marranos" en label |
| Selector contrato | #1645 | 6/6 tests |
| Bench policy | #1644+#1645 | Bench history versionado |

## Que sigue pendiente (fuera del lote)

| Item | Nota |
|------|------|
| Merge integrate→main | Requiere merge de PRs 1638-1645 primero |
| Conflictos vetados | DashboardLive, ProfileScreen, AgentScreen — resolucion manual |
| better-sqlite3 | Build nativo no soportado en este entorno |
| Suite E2E completa | Requiere servidor Vite + OAuth mock |
| PlanEditor dose >0 | Contrato documentado, validacion en onBlur |
| OnboardingHero compact | Comportamiento documentado |
