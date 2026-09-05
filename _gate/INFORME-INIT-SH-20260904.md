# INFORME — init.sh sensor computacional para Chagra (carril opencode/deepseek-v4-flash)

Carril: opencode/deepseek-v4-flash · cwd: `/home/kortux/Workspace/chagra` · fecha: 2026-09-04
Tarea: `escribir-init-sh-chagra-20260904` · PR: https://github.com/guatoc-ecohub/Chagra/pull/3137

## Entregado

`./init.sh` en la raíz del repo público `guatoc-ecohub/Chagra` (guatoc-ecohub/Chagra es PUBLIC, verificado `gh repo view`), rama `chore/init-sh-sensor-reviewer-20260904` desde `origin/dev`, PR **#3137 draft**, base `dev`. Commit único `4b9be4e46`, 1 archivo, 259 inserciones, mode 100755.

Verificación del entregable (verbatim):
- `git log --oneline origin/dev..HEAD` → `4b9be4e46 chore(ops): init.sh sensor computacional (sustrato A del reviewer-gate)`
- `git diff --stat origin/dev..HEAD` → `init.sh | 259 ++ · 1 file changed`
- `git diff --diff-filter=D --name-only origin/dev..HEAD` → vacío (sin deletes)
- `gh pr list --repo guatoc-ecohub/Chagra --state open --json number | jq '.[].number' | sort -n` → incluye `3137` (número nuevo, el más alto)

## Desviaciones reportadas (brief vs realidad)

1. **Base `dev`, no main.** El brief decía "commitea al HEAD de main (no crees rama)". La realidad del repo: `main` solo recibe merges de deploy (PR #2649 dev→main); todo feature PR a `dev` (los 7 PR abiertos de hoy apuntan a dev); `dev` está 2 commits adelante de `main`. Commitear a main directo además contradice las reglas de branching de AGENTS.md (Regla 2: rama desde origin/main/dev fresh) y el propio criterio de entrega del brief (un PR nuevo visible: un push directo a main no crea PR). Elegí el camino que satisface el criterio de entrega y la convención del repo; base `dev`.
2. **Interface sin argumento posicional, no `$1`=archivo de rutas.** El brief proponía `CHANGED_FILES="$1"`. Verifiqué el consumidor real (`~/.local/bin/reviewer-gate.sh`, fuera del repo): corre `INIT_BASE_REF="$BASE" ./init.sh` SIN argumentos y exige `./init.sh` ejecutable. Si el archivo no está, el gate bloquea: "no hay ./init.sh ejecutable". El sensor detecta el área tocada solo: diff committed vs `INIT_BASE_REF` (default `origin/dev`, fallback HEAD) + staged + unstaged. Si un juez lo invoca con `$1` (variante del brief), el arg se ignora y mide igual contra su base; no rompe.
3. **Config real del repo ≠ supuestos del brief.**
   - No existe `.eslintrc.json`: el repo usa ESLint 9 flat config `eslint.config.js`. Se corre sin `--config`, con `--max-warnings=0` (misma regla que el hook pre-commit de lefthook).
   - Los tests NO viven solo en `__tests__/` por carpeta: la convención es co-localizados `*.test.{js,jsx}` o `tests/unit/` (o `eval`, `scripts/__tests__`, `bench/__tests__`, `catalog/__tests__`). `vitest.config.js` excluye `.spec.*` (Playwright E2E, otro runner). Mapeo "test directo" = basename coincidente + ruta que la config de vitest INCLUYE.
   - `.ts/.tsx`: el repo casi no tiene (8 archivos) y eslint.config.js no trae parser TS. El sensor NO lintea `.ts` (los deja al gate tsc opcional); documentado en el header.
   - Vitest SÍ está en devDeps (v4.1.5), eslint v9.39.4.

## Pruebas de control (las dos mitades, 2026-09-04)

Sensor nuevo: medido verde y medido rojo, no solo "sintaxis ok":

| Control | Cómo | Resultado |
|---|---|---|
| Vacío (sin cambios) | `./init.sh` en worktree recién creado | exit 0, "sin archivos tocados" |
| Verde | cambio staged con un test → eslint + vitest | eslint OK + vitest corre el test directo y pasa, exit 0 |
| Rojo vitest | mismo test con aserción rota | `[FAIL] vitest rojo`, exit 1 |
| Rojo eslint | variable muerta agregada a `src/utils/id.js` | `[FAIL] eslint fallo`, exit 1 (de paso descubrió y corrió el test directo real `src/utils/__tests__/id.test.js`, verde) |
| Gate real | `~/.local/bin/reviewer-gate.sh --dir <worktree>` | APPROVED (sensor computacional, juez skip), exit 0 |

Anti-OOM (aprendizaje 2026-08-23: eslint abortaba por heap en diffs grandes): `NODE_OPTIONS += --max-old-space-size=4096` + lint por lotes de 60 archivos.

## Lo que NO pude verificar

- CI del PR: el PR es draft recién creado; los checks (CLA, CodeQL, etc.) aún no corrieron. La firma del CLA del repo la valida el workflow al primer PR; no la puedo certificar desde acá.
- Correr el sensor sobre un diff committed real de otro carril (worktree clima) no se hizo para no tocar la worktree de ese carril; el camino committed vs base se cubrió con staged/unstaged equivalentes (mismo plumbing de git).
- El criterio "directo por basename" no ve un test cuyo nombre no comparta el basename del archivo tocado; eso lo cubre el CI completo (documentado en el header del script y en el body del PR).

## Notas operativas

- Worktree de entrega dejado en `.worktrees/init-sh-20260904` (rama `chore/init-sh-sensor-reviewer-20260904`), con `node_modules` symlinkeado al worktree principal solo para validar; nada de eso se commiteó. Solo `init.sh` está en la rama.
- El init.sh previo suelto y sin commitear en la raíz del worktree principal (distinto contenido, interface por `$1`) NO se tocó ni se commiteó: es material sin dueño de un carril previo; no lo firmé.
