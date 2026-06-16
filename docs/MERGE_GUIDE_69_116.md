# Merge guide: integrate/opencode-69-116 → main

## Pre-flight checks

```bash
# 1. Smoke del lote
NODE_OPTIONS=--max-old-space-size=2048 npx vitest run tests/unit/smoke-137-lote.test.js

# 2. Boundary audit
npx vitest run tests/unit/boundaryAudit.test.js

# 3. Smoke de contratos reparados
npx vitest run tests/unit/animalAlias.test.js tests/unit/animalSelectorContract.test.js
```

## Merge steps

```bash
git fetch origin
git checkout main
git pull origin main
git merge origin/wip/autosave-integrate-opencode-69-116-alpha

# Resolver conflictos en estos archivos (son VETADOS, tratar con cuidado):
# - src/components/dashboard/DashboardLive.jsx
# - src/components/ProfileScreen.jsx
# - src/components/AgentScreen/AgentScreen.jsx
# Estrategia: mantener version de main, luego aplicar cambios de integrate
# solo en funciones no-vetadas (ej: imports nuevos, wrappers ErrorBoundary)

# Verificar
npm run test:unit -- tests/unit/smoke-137-lote.test.js
npm run build 2>&1 | tail -5

# Push
git push origin main
```

## Notas

- Los archivos vetados DashboardLive.jsx, ProfileScreen.jsx, AgentScreen.jsx requieren resolucion manual
- El build puede fallar por better-sqlite3 (nativo) en algunos entornos — no bloqueante
- El smoke de unit tests es el gate principal
