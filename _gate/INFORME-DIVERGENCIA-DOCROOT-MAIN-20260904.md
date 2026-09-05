# Diagnóstico: docroot productivo vs origin/main (2026-09-04)

Carril: opencode (cwd = /home/kortux/Workspace/chagra, repo guatoc-ecohub/Chagra).
Fecha de ejecución: 2026-09-04 ~18:25 (-05:00).

## Veredicto en una línea

**No hay divergencia que reconciliar en este repo: el commit que el docroot declara
(`6d3aa5ac`) ES el commit vivo de `origin/main` (`6d3aa5ace09a2f814701478627663218e1817525`).**
El bloqueante reportado en PRECONDICIONES-CUTOVER (que `origin/main` estaría en
`a436b199...`) **no se reproduce**: ese SHA no existe en GitHub (HTTP 422), no aparece en
ninguna de las 3541 refs remotas, no está en el object store local ni en el reflog de
`origin/main`.

## Evidencia cruda

### 1. `6d3aa5ac` existe y es un commit de este repo
```
$ git cat-file -t 6d3aa5ac
commit
$ git show -s --format='%H%n%ci%n%s' 6d3aa5ace
6d3aa5ace09a2f814701478627663218e1817525
2026-09-04 14:42:04 -0500
fix(ci): el CLA de main usa la allowlist corta y la llave equivocada de firmas (#3136)
```
No es un commit perdido ni un árbol huérfano: es el tip actual de `origin/main`.

### 2. `a436b199` no existe en ninguna parte alcanzable
```
$ git cat-file -t a436b1992009cbe47bd5b9b10d71f5dc4dec3e5c
fatal: git cat-file: could not get object info
$ git ls-remote origin | grep '^a436b199'
(ausente de las 3541 refs remotas)
$ git ls-remote origin main
6d3aa5ace09a2f814701478627663218e1817525  refs/heads/main
$ gh api repos/guatoc-ecohub/Chagra/commits/a436b1992009cbe47bd5b9b10d71f5dc4dec3e5c
{"message":"No commit found for SHA: a436b199..."} (HTTP 422)
```
GitHub no conoce ese commit en `guatoc-ecohub/Chagra`. La premisa del doc de precondiciones
no se puede reproducir contra este repo.

### 3. Reflog de `origin/main`: hoy main solo avanzó por fast-forward
```
6d3aa5ace refs/remotes/origin/main@{0}: fetch origin: fast-forward   <- este fetch
545fe438e refs/remotes/origin/main@{1}: fetch origin dev main: fast-forward
ff08db3fc refs/remotes/origin/main@{2}: fetch origin --prune: fast-forward
80e0ebeea refs/remotes/origin/main@{3}: fetch origin: fast-forward
```
Historia reciente de la línea (todas con su fecha):
```
6d3aa5ace 2026-09-04 14:42  fix(ci): el CLA de main usa la allowlist corta y la llave equivocada de firmas (#3136)
545fe438e 2026-08-31 15:50  fix(sembrar): restaura los imports que SeedingLog perdió en #2427 (#3081)
ff08db3fc 2026-08-27 21:12  fix(home): chagra.app pide login a anónimos (regresión, main desactualizado) (#2970)
80e0ebeea 2026-08-12 19:52  fix(modelos): barrer residuos de gemma4:e2b/gemma3:4b tras el swap a qwen3.5:4b (#2765)
```
`a436b199` no está en la línea visible de main ni en el reflog de las últimas 4 actualizaciones.

### 4. Ancestría formal y diff de árbol
```
$ git merge-base --is-ancestor 6d3aa5ace origin/main && echo ancestro    # sí
$ git merge-base --is-ancestor origin/main 6d3aa5ace && echo ancestro    # sí
$ git log --oneline --left-right origin/main...6d3aa5ace                  # vacío
$ git diff --stat origin/main 6d3aa5ac                                    # vacío
```
Ambos nombres resuelven al mismo commit. No hay lado izquierdo ni derecho.
`git diff --stat a436b199 6d3aa5ac` no se puede ejecutar: `fatal: bad object a436b199...`.

### 5. El único delta que separó al docroot del main previo es CI, no producto
```
$ git diff --stat 545fe438e 6d3aa5ace
 .github/workflows/cla.yml | 6 +++---
 1 file changed, 3 insertions(+), 3 deletions(-)
```
`6d3aa5ace` es un squash (parent único `545fe438e`) y toca solo el workflow de CLA.

## Clasificación (caso a/b/c del brief)

Ninguno de los tres. Es el caso **(d): alineados, mismo commit**.
- No (a) "producción adelante": docroot = main, y si en algún momento de hoy el docroot
  quedó +1 sobre el main previo, ese +1 fue `6d3aa5ace` (#3136, solo CI), hoy ya en main.
- No (b) "producción atrás": no hay commits de main ausentes del docroot.
- No (c) "divergen": `git log --left-right origin/main...6d3aa5ac` está vacío.

Origen probable del bloqueante fantasma: el SHA `a436b199` proviene de otra fuente (otro
clone con ref remota vieja, otro repo, o error de transcripción). En el estado vivo del
repo el primer bloqueante del cutover ya no existe.

## Clasificación de riesgo de las diferencias

| Comparación | Archivos que difieren | Riesgo |
|---|---|---|
| docroot `6d3aa5ac` vs `origin/main` | ninguno (árboles idénticos) | nulo |
| `6d3aa5ace` vs su parent `545fe438e` (el único delta del día) | `.github/workflows/cla.yml` | inocuo: workflow de CI, no llega a usuarios |
| `main` LOCAL (`520e4ba5`) vs `origin/main` | 1 detrás (falta `6d3aa5ace`), **7 adelante con trabajo local sin empujar** | **riesgo de trampa**: ver abajo |

### Advertencia sobre el `main` local
El `main` local de este checkout está en `520e4ba52` y lleva **7 commits que NO están en
`origin/main`** (entre ellos trabajo de producto: refactor de Angelita para Fast Refresh,
`feat(compai) P5 AngelitaAvisoGlobal burbuja visible en prod 2D`, migración a ESLint 9 flat
config, cambios a `init.sh`, vista de flota tailnet). Si algún paso del cutover compara o
despliega desde `main` local (no desde `origin/main`), va a ver una divergencia falsa y
grande, y podría desplegar código que nunca se mergeó. **Toda reconciliación del cutover
debe usar `origin/main` como base, nunca el `main` local.** Esos 7 commits locales no
están aprobados como parte del cutover salvo que el operador diga lo contrario.

## Recomendación de orden de reconciliación para un cutover seguro

1. **No reconciliar nada por contenido**: docroot y `origin/main` son el mismo árbol
   (`6d3aa5ac`). Un paso de "poner main al día contra el docroot" o viceversa es no-op.
2. **Descartar el SHA `a436b199`** como dato de precondiciones: no existe en
   `guatoc-ecohub/Chagra`. Corregir la fuente que lo produjo (clone viejo o repo
   equivocado) antes de confiar en el resto de PRECONDICIONES.
3. **Verificar contra el remote vivo** al momento del cutover: `git ls-remote origin main`
   debe dar `6d3aa5ace...`. Si difiere, repetir este diagnóstico con ese SHA.
4. **Asegurar la base del build de producción** sobre `origin/main` (nunca el `main` local
   de `520e4ba5`, que tiene 7 commits sin mergear y produciría una divergencia real).
5. Si PRECONDICIONES fue generado contra OTRO repo (p.ej. el del sitio 3D o el repo de
   estrategia), repetir esta misma comparación en ese repo: aquí el bloqueante no se
   reproduce.

## Lo que NO verifiqué

- No pude leer `Chagra-strategy/ops/PRECONDICIONES-CUTOVER-20260904.md` (fuera del cwd de
  este carril). Tomo como dado del brief que el docroot "declara 6d3aa5ac"; confirmé que
  ese SHA mapea a este repo y equivale a `origin/main` vivo, lo que cierra el lazo si el
  marcador del docroot se leyó de un build de este repo.
- No pude leer el marcador real del docroot productivo en el servidor (fuera del cwd). Los
  `deploy-marker.txt` de `public/`, `dist/` y `dist-prod/` de este checkout son viejos
  (2026-06-10) y `dist/version.json` registra `76e0f1bd5` (build 2026-09-03): ninguno es el
  marcador que PRECONDICIONES leyó como `6d3aa5ac`.
- No pude escribir el entregable canónico en
  `/home/kortux/Workspace/Chagra-strategy/ops/DIVERGENCIA-DOCROOT-MAIN-20260904.md` ni
  commitear en `Chagra-strategy`: esa ruta está fuera del cwd de este carril y opencode la
  auto-rechaza. Este archivo queda en `_gate/` del cwd para que el orquestador lo
  reubique y commitee en el repo de estrategia.
- No pude descartar al 100% que `a436b199` haya existido como tip efímero de main y fuera
  reescrito antes de llegar a este clone (GitHub responde 422 para commits huérfanos). Lo
  descarta la evidencia combinada: ausente de la línea visible de main, ausente del reflog
  de fast-forwards consecutivos de hoy y ausente de las 3541 refs remotas.
