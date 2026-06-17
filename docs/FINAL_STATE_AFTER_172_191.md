# Final State After Lots 117-191

**Fecha:** 2026-06-16
**Rama integrada:** `wip/autosave-integrate-opencode-69-116-alpha`

## Estado del merge

| Metrica | Valor |
|---------|-------|
| Commits ahead de main | 56 |
| Commits behind de main | 0 |
| Conflictos merge-tree | 0 |
| Archivos vetados con cambios | 0 |

## PRs en draft (pendientes de merge a main)

| # | Tarea | Archivos clave |
|---|-------|----------------|
| 1638 | Vitest exclude | `vitest.config.js` |
| 1639 | fast-check | `package.json` |
| 1640 | networkRetry | `networkRetry.test.js` |
| 1641 | ErrorBoundary | `ErrorBoundary.test.jsx`, `InputLog`, `OfflineChip` |
| 1642 | agent contracts | `agentCapabilities.test.js`, `agentPartialMerge.test.js` |
| 1643 | componentes | `PlanEditor`, `OnboardingHero`, `TaskScreen` tests |
| 1644 | smoke + auditoria | `smoke-137-lote.test.js`, `animalAlias.test.js`, `boundaryAudit.test.js`, `validate-bench-history.mjs` |
| 1645 | limpieza + docs | `userProfileService.js` (label), `animalSelectorContract.test.js` |
| 1646 | merge readiness | `smoke-final-142.test.js`, `MERGE_READINESS.md` |
| 1647 | auditoria vetados | `VETADOS_CONFLICT_AUDIT.md`, `MERGE_READINESS_FINAL.md` |
| 1648 | cierre integracion | `pre-merge-main.sh`, `FINAL_INTEGRATION_117_171.md` |

## Verificaciones

### Smoke (transversal a todos los lotes)
- smoke-final-142: 6/6 — PlanEditor, OnboardingHero, TaskScreen, alias, agent contracts
- animalAlias: 8/8 — marrano/porcino → cerdos
- animalSelectorContract: 6/6 — selector acepta alias, nunca lo muestra
- boundaryAudit: refinado con allowlist de bench/data
- networkRetry: 8/8, 0 unhandled rejections

### Contratos canonicos verificados
- `SEGUIMIENTO_KEYS.cerdos` = 'cerdos' (canonica)
- `profileTieneCerdos`: acepta marrano/marranos/porcino/porcicultura (entrada)
- `CHIP_INTENTS`: objeto (no array)
- `mergePartialOnInterruption`: `{preservePartial, content, error, reason}`
- `ErrorBoundary`: `MSG.ALGO_FALLO`, `MSG.INTENTAR_DE_NUEVO`
- `OnboardingHero`: `chagra:profile:v1`, `data-testid="onboarding-piso-confirm"`
- `PlanEditor`: dose render como input (editable) o span (vista)
- `TaskScreen`: placeholder "Ej: Riego fertiorgánico"

### Archivos vetados — limpios
- DashboardLive.jsx: fix del Home en commit separado, 0 conflictos con integrate
- ProfileScreen.jsx: 0 cambios en integrate
- AgentScreen.jsx: 0 cambios en integrate

## Riesgos restantes

| Riesgo | Impacto | Mitigacion |
|--------|---------|------------|
| better-sqlite3 build | Bajo — no bloquea deploy | Entorno especifico |
| Suite completa unit | Medio — requiere CI >3GB | Smoke cubre contratos |
| Playwright E2E | Bajo — requiere servidor | Specs escritos, no automatizados |

## Comando de validacion (post-merge)

```bash
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run \
  tests/unit/smoke-final-142.test.js \
  tests/unit/animalAlias.test.js \
  tests/unit/boundaryAudit.test.js
```

## Pendientes fuera del lote

- [ ] Merge de los 11 PRs draft a main (1638-1648)
- [ ] Validacion del fix manual del Home por el operador
- [ ] Suite completa unit en CI con >3GB RAM
- [ ] Limpieza de ramas opencode ya absorbidas
