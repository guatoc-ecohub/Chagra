# Estado post-estabilizacion 117-131

## Que quedo estable

| Area | Estado | PRs |
|------|--------|-----|
| Vitest config | Excluye `**/node_modules/**` | #1638 |
| fast-check | Instalado, 13 property tests verdes | #1639 |
| ErrorBoundary | Usa MSG, 9/9 tests | #1641 |
| InputLog | 3/3 tests, accent en string | #1641 |
| OfflineChip | Regex accent-insensitive, 5/5 | #1641 |
| PlanEditor | queryByDisplayValue, 4/4 | #1643 |
| OnboardingHero | localStorage key y testid, 5/5 | #1643 |
| TaskScreen | Placeholder regex, 5/5 | #1643 |
| agentCapabilities | CHIP_INTENTS es objeto | #1642 |
| agentPartialMerge | Retorna `{preservePartial,...}` | #1642 |
| networkRetry | mockImplementation async throw | #1640 |
| smoke integrado | 7/7 tests, 3 componentes | #1644 |
| alias animales | Marrano/porcino aceptado, salida canonica cerdos | #1644 |
| boundaryAudit | Allowlist refinado (bench/data/catalog) | #1644 |

## Comando de validacion

```bash
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run tests/unit/smoke-137-lote.test.js
```

## Pendiente

- PlanEditor: la validacion de dosis > 0 esta documentada como contrato (onBlur), no como render
- OnboardingHero: la logica `compact + pisoConfirmado` oculta CTA pero no garantiza render vacio
- Merge de `integrate/opencode-69-116` a main — requiere smoke verde y resolucion de conflictos con DashboardLive.jsx y ProfileScreen.jsx (vetados)

## PRs creados en este lote

8 PRs: #1638 a #1644, mas #1633-1637 del lote 69-92.
