# PENDIENTE OPERADOR — Decisiones y pasos manuales

**Fecha:** 2026-06-16
**Version:** 1.0.52
**Branch actual:** `opencode/123-128-ci-build-docs`

---

## 1. Deploy steps requeridos

### Sidecar restart para #212 / #213

- [ ] **Reiniciar `chagra-pro` en alpha** tras merge de cambios que tocan MCP tools.
  ```bash
  sudo systemctl restart chagra-pro.service
  sudo systemctl status chagra-pro.service | grep Active
  ```
- [ ] Verificar que `/health` del sidecar responde con `{"status":"ok"}`.
- [ ] Verificar que `ollama` esta corriendo en alpha (`systemctl status ollama`).

### SW cache bump post-deploy

- [ ] El workflow `deploy.yml` hace el bump automatico. Verificar que el SW en prod tenga `chagra-<sha>` actual:
  ```bash
  grep CACHE_NAME /mnt/fast/appdata/farmos-pwa/sw.js
  ```

### NixOS rebuild (si aplica despues de cambios de infra)

- [ ] Si se modifico configuracion de nginx o systemd services, ejecutar:
  ```bash
  cd /home/kortux/Workspace/guatoc-nixos
  sudo nixos-rebuild switch --flake .#alpha
  ```

---

## 2. Visual baseline approval

- [ ] **Workflow `visual-regression.yml` NO EXISTE aun.** La tarea 123 confirma que no hay conflicto con `perf-budget.yml` ni `playwright.yml`, pero el workflow de regresion visual debe crearse como nuevo archivo en `.github/workflows/visual-regression.yml`.
- [ ] Una vez creado: correr contra `main` para generar baseline inicial.
- [ ] Aprobar baseline manualmente (revisar screenshots en el reporte de Playwright).

---

## 3. Merge steps manuales

### PRs draft abiertos (orden de prioridad)

| Prioridad | PR | Descripcion | Bloquea |
|-----------|-----|-------------|---------|
| **1** | #1624 | Fix operador home scroll infinito | Demo David |
| 2 | #1638 | Vitest exclude node_modules | Suite CI |
| 3 | #1639 | fast-check install | Property tests |
| 4 | #1640 | networkRetry unhandled rejections | Tests CI |
| 5 | #1641 | ErrorBoundary, InputLog, OfflineChip contracts | Tests CI |
| 6 | #1642 | agentCapabilities, agentPartialMerge | Tests CI |
| 7 | #1643 | PlanEditor, OnboardingHero, TaskScreen | Tests CI |
| 8 | #1627 | Carga sin flash, offline flujos, a11y | E2E |
| 9 | #1628 | Chaos error-injection tests | E2E |
| 10 | #1630 | Smoke tests services, utils, hooks | Coverage |
| 11 | #1632 | Smoke tests services (T116) | Coverage |
| 12 | #1633 | JSDoc typedefs for UI strings | Docs |
| 13 | #1636 | Extract pure utilities into sub-modules | Refactor |
| 14 | #1621 | E2E spec Javier (cerdos + guatoc full) | Piloto Javier |
| 15 | #1622 | Lotes 37-57 combinados | Suite larga |
| 16 | #1620 | Telemetry piloto sin PII | Observabilidad |
| 17 | #1626 | Regresion visual baseline y layout movil | Visual |
| 18 | #1613 | Playwright specs por flujo de usuario | E2E |
| 19 | #1625 | Tareas 60-68 combinadas | Suite |
| 20 | #1631 | npm audit fix + CSP + security headers | Security |

### Estrategia de merge

1. **Primero:** #1624 (critico para demo)
2. **Luego:** #1638 + #1639 (desbloquean CI)
3. **Luego:** #1640 → #1641 → #1642 → #1643 (fix de tests en cadena)
4. **Luego:** El resto en orden de prioridad

### Pasos por PR

```bash
# Para cada PR draft:
gh pr view <NUM> --json title,state,mergeable,statusCheckRollup
# Si CI verde y sin conflictos:
gh pr merge <NUM> --squash --delete-branch
```

---

## 4. Limpieza post-merge

- [ ] Eliminar ramas `opencode/*` ya mergeadas:
  ```bash
  git branch -r --merged origin/main | grep 'opencode/' | while read b; do
    git push origin --delete "${b#origin/}"
  done
  ```
- [ ] Eliminar ramas `codex/*` ya mergeadas.
- [ ] Verificar que no queden ramas `wip/*` sin mergear.
- [ ] `git fetch --prune` para sincronizar local.

---

## 5. Verificaciones post-deploy

- [ ] `curl -sI https://chagra.guatoc.co/ | head -10` — HTTP 200, security headers presentes.
- [ ] `curl -s https://chagra.guatoc.co/sw.js | grep CACHE_NAME` — cache version actualizada.
- [ ] Abrir PWA en Android (Free / Javier) y verificar que carga sin pantalla blanca.
- [ ] Verificar que `/mnt/fast/appdata/farmos-pwa/index.html` tiene sha256 distinto al deploy anterior.
- [ ] Webhook HA `chagra_deployed` recibido (verificar en HA logs).

---

## 6. Creacion de workflow visual-regression.yml

El workflow NO existe. Debe crearse con:

- Trigger: `pull_request` contra `main` + `push` a `main` (para actualizar baseline)
- Job: Playwright con screenshots de rutas clave (home, agent, profile, seguimiento)
- Artefacto: screenshots como `visual-regression-report` con retention 30d
- Baseline: almacenada como artifact o en branch `visual-baseline`

### Rutas a capturar (minimo)

| Ruta | Descripcion |
|------|-------------|
| `/` | Home dashboard con cards |
| `/agent` | AgentScreen con colibri 3D |
| `/profile` | ProfileScreen con selector IA |
| `/seguimiento/cerdos` | Detalle de cerdos |
| `/carbono` | GlaciarReporteScreen |
| `/catalogo` | CatalogueScreen |

---

## 7. Decisiones pendientes del operador

- [ ] **Aprobar o rechazar** creacion de `visual-regression.yml` en este lote (123-128) o en lote separado.
- [ ] **Definir estrategia de merge** para los 15+ PRs draft: merge secuencial o batch.
- [ ] **Validar** que el fix del Home (#1624) no rompa el gating de otros perfiles.
- [ ] **Decidir** si los PRs de E2E specs largos (#1613, #1621, #1622) deben mergearse ya o esperar a tener el visual-regression baseline.
- [ ] **Confirmar** que `visual-regression.yml`, `perf-budget.yml` y `playwright.yml` no colisionan (confirmado en tarea 123: no hay conflictos; `visual-regression.yml` no existe aun, `perf-budget.yml` mide bundle sizes, `playwright.yml` corre E2E offline-first).
