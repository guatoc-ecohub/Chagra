# Bitácora — merge completo `dev` → `main`

**Rama de integración:** `integra/dev-a-main-2026-07-26`
**Worktree:** `/home/kortux/Workspace/wt-integra-dev-main` (host `stg`)
**Base:** `origin/main` = `e6a1d81f` · **Se fusiona:** `origin/dev` = `3ef4954d`
**Diagnóstico de partida:** `ops/DIAGNOSTICO-brecha-dev-main.md` (no se re-mide lo ya medido allí)

**Límites del encargo (no negociables):**
- ❌ NO mergear a `main` · ❌ NO pushear a `main` · ❌ NO desplegar a `chagra.app` · ❌ NO borrar ramas
- ✅ Rama de integración pusheada, entregada para revisión del operador

---

## Bitácora cronológica

### 2026-07-26 — Paso 0: contexto y preparación

- Host verificado: `stg` (`hostnamectl` → `stg`). No es `alpha`. Sin `sudo` fuera de whitelist.
- `git fetch origin --prune`. Refs confirmadas idénticas a las del diagnóstico:
  - `origin/main` = `e6a1d81f`
  - `origin/dev`  = `3ef4954d`
  - `git rev-list --left-right --count origin/main...origin/dev` → **34 / 678** ✅ coincide
- Árbol de trabajo principal (`/home/kortux/Workspace/chagra`, rama `feat/compai-fuente-unica`):
  **sin WIP sin commitear** al momento de arrancar (solo `ops/DIAGNOSTICO-brecha-dev-main.md` sin seguimiento).
  Se trabaja en worktree separado para **no pisar** a los otros agentes activos.
- Worktrees ajenos vivos detectados (no se tocan): `fable/compai-gestos-entrada` (`/home/kortux/Workspace/wt-compai-gestos`),
  `fable/zariguya-crias-al-lomo`, `fable/abejas-vivas`, `fable/paramo-*`, `fable/milpa-y-cerdos`, `fable/vaca-y-oso-produccion`, y ~25 más.
- Worktree de integración creado: `git worktree add -b integra/dev-a-main-2026-07-26 … origin/main`.
- Modelos de embedding disponibles en `stg` (para la condición #1): `nomic-embed-text:latest` (274 MB) y
  `snowflake-arctic-embed2:latest` (1,2 GB) — ambos locales, no hace falta `alpha`.

