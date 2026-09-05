# INFORME-WORKTREES-20260901 — Dictamen de merge/cierre

Fecha: 2026-09-01 · Carril: opencode (cwd `/home/kortux/Workspace/chagra`)
Método: SOLO LECTURA. Sin `merge/rebase/push/checkout/reset/stash/branch -D/worktree remove`.
Índice de git del repo `chagra` intacto (no se ejecutó `git add`).

## Alcance y límites de este carril

- Repo `~/Workspace/chagra`: **auditado completo** (es el cwd). 22 worktrees secundarios + main.
- Repo `~/demos/3d`: **no medido** — la ruta no existe en esta máquina (`fatal: cannot change to .../demos/3d`).
- Repo `~/Workspace/Chagra-strategy`: **no medido** — ruta fuera del cwd y explícitamente prohibida por el carril. `git worktree list` alcanzó a mostrar 3 worktrees (rama `feat/GATE-nuevo`, `chore/gate-instrumentos-sync-20260817`, `chore/guardian-gpu-lock`) pero no se auditaron por la regla dura.
- Ruta de entrega pedida (`~/.local/state/fleet-backlog/INFORME-WORKTREES-20260901.md`) está **fuera del cwd**: opencode la auto-rechaza. Por la regla del carril el informe se escribe en `./_gate/INFORME-WORKTREES-20260901.md`.
- Nota sobre el informe pedido: el cargo pedía UNA tabla por repo; solo `chagra` es auditable desde este carril. `~/demos/3d` no existe en esta máquina (verificar ruta real con el orquestador, quizá vive en otro host o fue movido).

## Repo `chagra` — worktrees (22 secundarios)

Contexto crítico de medición:
- `origin/dev` tiene **1073 commits que `main` no tiene** (dev = línea de integración, main = producción). Toda rama basada en dev reporta conteos altísimos de `main..rama`; eso es divergencia de base, NO trabajo propio.
- Conteo honesto usado: commits de la rama que **no** están ni en `origin/dev` ni en `origin/main` (por patch-id, `git log --no-merges --cherry-pick --right-only` + intersección `comm`).
- `origin/main = 545fe438e` (2026-08-31) · `main` local = 520e4ba52 (7 commits locales no pusheados, docs/ops del día).
- `hotfix/sembrar`: su único contenido (2ec37e6a6) ya está aplicado en main como 545fe438e (#3081, squash): diff contra main = 0 archivos, cherry vs main = 0 `+`.

| rama | worktree | commits_propios | archivos_tocados | dirty | último_commit | ya_en_main? | VEREDICTO | razón |
|---|---|---|---|---|---|---|---|---|
| `feat/compai-tinta-dev` | `/home/kortux/Workspace/chagra-tinta-fix` | 1 (f40e8b07a) | 13 | 0 | f40e8b07a 2026-09-01 `fix(visual): mount tinta avatars in dev` | NO | **MERGEAR** | 1 commit real (avatar tinta en dev), no en dev ni main, merge-tree vs dev limpio |
| `fix/entrada-valle-hover-confirm-20260827` | `/home/kortux/Workspace/chagra-entrada-valle-hover-confirm` | era (253, sujeto tip ya en dev) | 1379 | 5 | 023187aac 2026-08-27 `fix(compai): matar patinaje ... (#3054)` | NO | **RESCATAR-DIRTY** | dirty incluye `ValleHoverConfirm.jsx` + test + css NO en dev/main: componente sin commitear que se pierde |
| `fix/compai-caminar-huesos-20260825` | `/home/kortux/Workspace/chagra-fix-compai-caminar-huesos` | era (254) + WIP | 1206 | 5 | 47985a90c 2026-08-27 `wip: checkpoint pre-poda 0827-1943` | NO | **RESCATAR-DIRTY** | dirty real: parche `parcheVientreHombro` en pielTrazado.js (0 en main) + harness jaguar-marcha untracked |
| `dev` (rama dev local) | `/home/kortux/Workspace/chagra-merge-dev` | 252 (era local, 0 en main) | 1292 | 6 | fe8f29932 2026-08-25 merge dev-integracion | NO | **RESCATAR-DIRTY** | local dev ATRASADA vs origin/dev (252 commits viejos no en origin/dev); dirty galería jaguar + gbif-audit + catalog-seed |
| detached (preview) | `/home/kortux/Workspace/chagra-vida4-preview` | era (253, sujeto tip ya en dev) | 1353 | 4 | ad6b030ae 2026-08-27 `feat(compai): vida forward — gaze-follow guacamaya + ojo derecho zarigüeya` | NO | **RESCATAR-DIRTY** | dirty real: soporte tailscale/`.ts.net`/CGNAT en `canonicalHostRedirect.js` NO en dev ni main; borra `pasto-vivo.svg` |
| `fix/ci-vitest-fixes-20260830` | `/tmp/glm-ci-vitest-fix-ci-vitest-fixes-20260830` | 0 (tip ya en dev) | 1423 | 10 | 0d30f34a2 2026-08-29 `feat(home): entrada 3D-desde-2D ... (#3051)` | NO | **RESCATAR-DIRTY** | dirty real: `chipIntentRouter.js` (+asociaciones/fuente_doi NO en dev), `sidecarClient.js`, `comentarista.js`, tests M |
| `feat/p1-107-drain-20260830` | `/tmp/chagra-p1-drain` | 0 (tip ya en dev) | 1468 | 7 | 4a0c71035 2026-08-31 `chore(tsc): record dev baseline drift` | NO | **RESCATAR-DIRTY** | dirty incluye `tests/visual/gate-7-compai.html/jsx` + `gbif-audit-report.json` untracked (no en dev) |
| `fix/clima-atmosfera-cultivos` | `/home/kortux/Workspace/chagra/.worktrees/clima-atmosfera-cultivos` | 2 (0bfa96e34 y 634f7bcfe, MISMO subject) | 1493 | 0 | 7b3574622 2026-09-01 `chore(clima): conserva pruebas del radar` | NO | **REVISAR** | 2 commits propios con subject idéntico (dup/rebased) `conecta lecturas Open-Meteo al mundo 3D`; verificar antes de mergear a dev |
| `fix/bug-03-mcp-finalize-20260831` | `/home/kortux/Workspace/chagra-bug03` | 0 (tip ancestro de dev) | 1460 | 0 | c84441690 2026-08-31 `fix(agent): finalize chat after MCP stream failures` | NO | **CERRAR** | contenido ya integrado en origin/dev; worktree desechable |
| `codex/fix-bug05-cucurbita-pepo-20260831` | `/home/kortux/Workspace/chagra-bug05` | 0 (tip ancestro de dev) | 1455 | 0 | b4d7e7302 2026-08-31 `fix(catalog): add Cucurbita pepo AGE grounding` | NO | **CERRAR** | contenido ya en dev (PR #3090, ver merge-clean) |
| detached (verify) | `/home/kortux/Workspace/chagra-catA-verify` | era (252, sujeto tip ya en dev) | 1222 | 2 | 0056e2e4e 2026-08-25 `docs(ops): censo de rutas mockups ... (#2921)` | NO | **CERRAR** | tip = #2921 ya en dev (8ade4554e); dirty solo stats/manifest regenerables |
| `feat/clima-horasfrio-spi-spei` | `/home/kortux/Workspace/chagra-clima-work` | 0 (tip ancestro de main) | 1 | 0 | ff08db3fc 2026-08-27 (#2970) | **SÍ** | **CERRAR** | tip ya en main (ancestro de origin/main) |
| `codex/tinta-jaguar-v2-20260831` | `/home/kortux/Workspace/chagra-codex-tinta-jaguar-v2-20260831` | 0 (tip ancestro de dev) | 20 | 9 | 588c878d0 2026-08-31 `feat(compai): trazar chivito y luciernaga con receta jaguar` | NO | **CERRAR** | contenido ya en dev; dirty solo `_gate/*.png` capturas regenerables |
| `fix/hc1-nlu-persist` | `/home/kortux/Workspace/chagra-hc1` | 0 (tip ancestro de dev) | 1457 | 0 | ee80ad0cf 2026-08-31 `fix(agent): persist complex natural-language ingestion` | NO | **CERRAR** | contenido ya en dev |
| `rebase-pr-3053` | `/home/kortux/Workspace/chagra-rebase-3053` | era (254, sujeto tip ya en dev) | 1383 | 2 | 24a0efb27 2026-08-27 `feat(campesino-B): home B rica ... (#3053)` | NO | **CERRAR** | #3053 ya en dev (cc647dbeb); dirty trivial (catalog-seed 1 línea + whitespace flag) |
| `feat/clima-spei` | `/home/kortux/Workspace/chagra-spei` | 0 (tip ancestro de dev) | 1447 | 0 | 3703cb79a 2026-08-31 `docs(ops): corregir formato del informe SPEI` | NO | **CERRAR** | contenido ya en dev |
| `feat/integrar-tinta-chivito-luciernaga` | `/home/kortux/Workspace/chagra-tinta-integration` | 0 (tip ancestro de dev) | 1461 | 0 | db0b716a5 2026-08-31 merge | NO | **CERRAR** | contenido ya en dev |
| `hotfix/sembrar-imports-main-20260831` | `/home/kortux/Workspace/chagra/.claude/worktrees/hotfix-sembrar-main` | 0 | 0 | 2 | 2ec37e6a6 2026-08-31 `fix(sembrar): restaura imports #2427` | **SÍ** | **CERRAR** | contenido ya en main como #3081 (diff vs origin/main = 0) |
| `fix/clima-reachable-dev-20260830` | `/tmp/chagra-clima-fix` | 2 | 1422 | 3 | b1692d9db 2026-08-30 `fix(clima): hacer alcanzable el boletin 2d canonico` | NO | **CERRAR** | DUPLICADO: superado por `fix/clima-reachable-dev-fresh-20260831` que ya está en dev |
| `fix/clima-reachable-dev-fresh-20260831` | `/tmp/chagra-clima-reachable-dev-fresh` | 0 (tip ancestro de dev) | 1447 | 0 | e4a14101f 2026-08-31 `fix(clima): route climate world to canonical bulletin` | NO | **CERRAR** | ya en dev; cerrar la vieja 0830 primero (no-duplicate ruling) |
| detached (merge PR #3090) | `/tmp/chagra-merge-clean` | 0 (ancestro de dev) | 1489 | 0 | 165ac6977 2026-09-01 `Merge PR #3090 (bug05)` | NO | **CERRAR** | merge de bug05 ya absorbido en dev |
| `main` (base) | `/home/kortux/Workspace/chagra` | 7 locales (no pusheados) | — | 2 | 520e4ba52 2026-09-01 `docs(gate): validar build + E2E después de sensor A` | NO | (no aplica) | worktree principal; 7 commits locales no en origin/main; dirty = `.worktrees/` + `_gate/` (míos) |

### Duplicados detectados (ruling no-duplicate-branch)
- **`fix/clima-reachable-dev-20260830` vs `fix/clima-reachable-dev-fresh-20260831`**: mismo tema; la fresh ya está en dev. Cerrar la vieja 0830.
- **4 ramas tema tinta**: `codex/tinta-jaguar-v2-20260831` (en dev), `feat/integrar-tinta-chivito-luciernaga` (en dev), `fix/compai-caminar-huesos-20260825` (WIP sucio, no integrado), `feat/compai-tinta-dev` (1 commit pendiente). No son duplicados 1:1 pero pisan archivos de compai/jaguar: mergear en orden y no abrir nuevas.

## Archivos dirty por worktree (trabajo que no se puede perder)

Cada uno listado arriba como RESCATAR-DIRTY tiene archivos reales:
- `chagra-entrada-valle-hover-confirm`: `src/components/dashboard/ValleHoverConfirm.jsx` (nuevo), `__tests__/ValleHoverConfirm.test.jsx`, `valle-hover-confirm.css`, `FincaVivaHero.jsx` (M), `public/valle-teaser/`.
- `chagra-fix-compai-caminar-huesos`: `src/visual/creatures/jaguarTrazado/pielTrazado.js` (M, parche vientre), `JaguarTrazado.integral.test.jsx` (M), `tests/visual/jaguar-marcha-harness.{html,jsx}` (nuevos).
- `chagra-vida4-preview`: `src/services/canonicalHostRedirect.js` (M, tailscale), borra `public/valle/pasto-vivo.svg`.
- `chagra-merge-dev` (rama dev): `catalog/chagra-catalog-seed-v3.2.json` (M), `catalog/gbif-audit-report.json`, `jaguar-galeria.{html,jsx}`, `vite.galeria.config.js`, `dist-jaguar-galeria/`.
- `/tmp/glm-ci-vitest-*`: `src/services/chipIntentRouter.js` (M, chips asociaciones/fuente_doi NO en dev), `src/services/sidecarClient.js` (M), `src/compai/nucleo/comentarista.js` (M), 4 tests (M), `catalog/gbif-audit-report.json`.
- `/tmp/chagra-p1-drain`: `tests/visual/gate-7-compai.{html,jsx}` (nuevos), `catalog/gbif-audit-report.json`, `catalog-seed` (M).

Regenerables (NO rescatar, se rehacen): `public/chagra-stats.json`, `public/cycle-content/manifest.json`, `public/valle/pasto-vivo.svg`, `_gate/*.png` (capturas gate).

## Comandos usados (evidencia por dato)
- Lista worktrees: `git -C <repo> worktree list --porcelain`
- commits propios: `git log --no-merges --cherry-pick --right-only origin/main...<tip>` contado + intersección con `origin/dev` vía `comm` (mismo patch-id). Divergencia dev: `git rev-list --count origin/main..origin/dev` = 1073.
- ya_en_main/ya_en_dev: `git merge-base --is-ancestor <tip> origin/main|origin/dev`
- cherry vs main: `git cherry origin/main <tip> | grep -c '^+'`
- dirty: `git -C <wt> status --porcelain`
- merge limpio: `git merge-tree --write-tree origin/dev <rama>` (exit 0 sin conflictos para compai-tinta-dev y clima-atmosfera)
- hotfix vs main: `git diff --name-only 2ec37e6a6 origin/main` = 0 archivos
- sujetos ya en dev: `git log origin/dev --grep=<subject>` (catA #2921→8ade4554e, vida4→6e1638cbc, entrada→5db99e0d8, rebase→cc647dbeb, bug03/bug05/hc1/clima-spei/tinta/integrar = ancestros directos de origin/dev)

## RECOMENDACIÓN (orden para bajar worktrees de 22 → objetivo con mínimo riesgo)

1. **MERGEAR** `feat/compai-tinta-dev` → origin/dev (1 commit real, merge-tree limpio). Libera 1 worktree.
2. **RESCATAR DIRTY y luego cerrar** (en orden):
   - `chagra-vida4-preview`, `chagra-entrada-valle-hover-confirm`, `chagra-fix-compai-caminar-huesos`: commitear/parchear el trabajo dirty pendiente a ramas vivas o a dev, luego CERRAR.
   - `/tmp/glm-ci-vitest-*` y `/tmp/chagra-p1-drain`: el contenido commitado ya está en dev; rescatar dirty (chipIntentRouter, gate-7) en un commit y CERRAR.
   - `chagra-merge-dev` (dev local): NO cerrar sin antes sincronizar a `origin/dev` (`git reset --hard origin/dev` o merge); el branch local quedó 252 commits atrás/divergido.
3. **REVISAR** `fix/clima-atmosfera-cultivos`: 2 commits de subject idéntico → aclarar si es dup antes de mergear a dev.
4. **CERRAR directo** (content ya en dev/main, dirty solo regenerable): `fix/bug-03-mcp-finalize`, `codex/fix-bug05`, `chagra-catA-verify`, `feat/clima-horasfrio-spi-spei`, `codex/tinta-jaguar-v2`, `fix/hc1-nlu-persist`, `rebase-pr-3053`, `feat/clima-spei`, `feat/integrar-tinta`, `hotfix/sembrar`, `fix/clima-reachable-dev-fresh`, `/tmp/chagra-merge-clean`. Cerrar primero la vieja `fix/clima-reachable-dev-20260830` (dup).
5. Con 1 merge + 5 cierres directos + dup: chagra baja ~6-8 worktrees. La mayor parte del remanente (era/duplicados tinta) requiere decisión de contenido, no es desechable a ciegas.

## No verificado / límites
- `~/demos/3d`: ruta inexistente en esta máquina (¿host distinto?). Requiere el orquestador.
- `~/Workspace/Chagra-strategy`: fuera de cwd (prohibido por carril). Solo se confirmó que tiene ≥3 worktrees.
- No se pudo verificar el destino correcto del informe fuera de `./_gate/` (auto-rechazo de opencode).
- `ya_en_main?` de ramas basadas en dev = NO, porque dev entero (1073 commits) aún no está en main; eso es deuda de integración dev→main, no deuda de la rama.
