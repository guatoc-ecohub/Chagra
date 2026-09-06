# Auditoría — por qué está bloqueado el paso a producción (PR #2649, `dev` → `main`)

Carril: Claude (Opus) · host `alpha` (verificado con `hostnamectl`: Static hostname = `alpha`, NixOS 26.11)
Fecha de medición: 2026-09-05, ~20:05–20:30 (-05:00)
Alcance: **solo lectura**. No se mergeó, no se hizo push, no se tocó `main`, no se sacó ningún PR de draft,
no se hizo checkout ni se tocó el índice del repo (tres carriles trabajando en paralelo en el working tree).

---

## Veredicto en una línea

**El bloqueo NO es el docroot. «docroot diverge» fue un error de medición: se comparó el SHA del docroot
de la PWA contra el `main` del repo EQUIVOCADO (`Chagra-strategy`, privado) en vez del de `Chagra`.
El bloqueo real, vivo y reproducible hoy, es el check `CodeQL` de protección de merge: reporta
111 alertas nuevas, 36 de severidad alta y 3 `error`, y la regla `code_scanning` del ruleset «main tests»
tiene umbral `high_or_higher` / `errors`.** Eso es lo único que mantiene `mergeStateStatus: BLOCKED`
con los 4 checks requeridos en verde.

---

## 1. «docroot diverge»: qué significaba y si sigue siendo cierto

### 1.1 Cuál es el docroot real de producción (medido, no de memoria)

`sudo nginx -T` **no sirve en este host**: devuelve `sudo: nginx: command not found` (el binario está en
el store de Nix y no en el PATH de sudo). Es un instrumento que miente por vacío, no por error. La config
activa se obtiene del unit:

```
$ systemctl show nginx -p ExecStart
argv[]=/nix/store/gvszlnw74zlvvxmv56s3fi4ln959s8ma-nginx-1.30.4/bin/nginx
       -c /nix/store/q5afp5gjha8aqmxmnqs0a6z1bf9ryr7g-nginx.conf
$ systemctl status nginx  ->  active (running) since Wed 2026-09-02 20:57:56 -05
```

Bloques `server` que existen en esa config (los cuatro, no un subconjunto):

| línea | `server_name` | `root` / acción |
|---|---|---|
| 25 | `chagra-dev.guatoc.co` | `root /mnt/fast/appdata/farmos-pwa-dev` |
| 238 | `chagra.app www.chagra.app prod.chagra.app` | `root /mnt/fast/appdata/farmos-pwa` **(PRODUCCIÓN)** |
| 467 | `chagra.guatoc.co` | `return 301 https://chagra.app$request_uri` |
| 474 | `lasfotos.guatoc.co` | proxy a Immich `127.0.0.1:2283` |

Confirmado en vivo:

```
$ curl -o /dev/null -w '%{http_code} %{redirect_url}' https://chagra.guatoc.co/
301 https://chagra.app/
$ curl -o /dev/null -w '%{http_code}' https://chagra.app/
200
```

**Docroot productivo = `/mnt/fast/appdata/farmos-pwa`, servido en `chagra.app`.**

### 1.2 El docroot NO diverge de `origin/main`

```
$ cat /mnt/fast/appdata/farmos-pwa/version.json
{ "sha": "6d3aa5ac", "builtAt": "2026-09-04T14:42:10-05:00" }

$ curl -s https://chagra.app/version.json
{ "sha": "6d3aa5ac", "builtAt": "2026-09-04T14:42:10-05:00" }

$ git rev-parse origin/main
6d3aa5ace09a2f814701478627663218e1817525
```

`6d3aa5ac` es exactamente el prefijo de `origin/main`. Disco y sitio vivo coinciden con el remoto.
**Divergencia: cero.** Esto cierra el hueco que el informe del 09-04
(`_gate/INFORME-DIVERGENCIA-DOCROOT-MAIN-20260904.md`) dejó abierto explícitamente: ese carril no pudo
leer el marcador del docroot productivo por estar fuera de su cwd. Yo corro en `alpha` y sí pude leerlo.

Trampa que conviene anotar: `/mnt/fast/appdata/farmos-pwa/deploy-marker.txt` dice
`deploy 2026-06-10T00:57:00Z` y el docroot de dev dice **exactamente lo mismo**. Es un marcador MUERTO,
idéntico en ambos entornos. El marcador vivo es `version.json`. Quien mire `deploy-marker.txt` va a
concluir que producción lleva tres meses congelada.

### 1.3 De dónde salió el SHA fantasma `a436b199` (causa raíz)

`Chagra-strategy/ops/PRECONDICIONES-CUTOVER-20260904.md`, precondición #1, declara NO CUMPLE con esta
salida cruda:

```
$ jq -r .sha /mnt/fast/appdata/farmos-pwa/version.json;
  git -C /home/kortux/Workspace/Chagra-strategy ls-remote origin refs/heads/main
docroot sha: 6d3aa5ac
origin/main: a436b1992009cbe47bd5b9b10d71f5dc4dec3e5c
```

El `git -C /home/kortux/Workspace/Chagra-strategy` apunta al repo **Chagra-strategy**, no a **Chagra**.
Se comparó el SHA de un build de la PWA contra el tip de `main` de otro repositorio. Verificado:

```
$ cd /home/kortux/Workspace/Chagra-strategy
$ git cat-file -t a436b1992009cbe47bd5b9b10d71f5dc4dec3e5c   -> commit
$ git show -s --format='%H%n%ci%n%s' a436b199...
  a436b1992009cbe47bd5b9b10d71f5dc4dec3e5c
  2026-08-07 16:32:56 -0500
  docs(ops): la jornada del 2026-08-07 — gate de pantalla, sondas y el steal de floci (#167)
$ git reflog show origin/main
  661d3495 refs/remotes/origin/main@{0}: fetch origin main: fast-forward
  a436b199 refs/remotes/origin/main@{1}: fetch origin --prune: fast-forward   <-- era el tip el 09-04
$ git remote -v -> https://github.com/guatoc-ecohub/Chagra-strategy.git
$ gh repo view --json visibility -> {"visibility":"PRIVATE"}
```

`a436b199` **sí existe**, pero es un commit de documentación de `Chagra-strategy` y era el tip de `main`
de ESE repo el 09-04. El carril del 09-04 probó correctamente que no existía en `Chagra` (HTTP 422,
ausente de las 3541 refs) pero no pudo decir de dónde salía; ahora está cerrado.

Es el mismo patrón que la casa ya tiene documentado: el instrumento (el `-C` al repo equivocado) mintió
antes que el sujeto, y produjo un bloqueante que llevaba dos días parando un cutover que por ese lado
nunca estuvo bloqueado.

### 1.4 Hallazgo colateral: `INFRA_FACTS.md` está desactualizado en la topología de deploy

`INFRA_FACTS.md`, sección «Las 3 versiones de Chagra», dice:

| Versión | rama | deploy | según INFRA_FACTS |
|---|---|---|---|
| PROD | `release` | GHA en `release.published` | `chagra.guatoc.co` |
| DEV | `main` | auto en push a `main` | `chagra-dev.guatoc.co` |

Medido empíricamente, **eso es falso hoy**:

```
$ git show origin/main:.github/workflows/deploy.yml | head
  name: Deploy Chagra PWA
  on: push: branches: [main]
  ...
  rsync ... dist/ /mnt/fast/appdata/farmos-pwa/          <-- PRODUCCIÓN

$ git show origin/main:.github/workflows/dev-deploy.yml
  on: push: branches: ['dev', 'dev/*']
  TARGET=/mnt/fast/appdata/farmos-pwa-dev                <-- DEV
```

Y la rama `release` **no existe** (control hecho con el mismo comando para descartar un cero falso):

```
$ git ls-remote origin 'refs/heads/main'    -> 6d3aa5ace...   (el comando funciona)
$ git ls-remote origin 'refs/heads/dev'     -> a9a9744a7...   (el comando funciona)
$ git ls-remote origin 'refs/heads/release*'-> (vacío)
$ git ls-remote origin | grep -i release    -> (vacío)
```

**Consecuencia operativa dura: `main` ES producción.** Mergear #2649 dispara `deploy.yml`, que hace
`rsync` a `/mnt/fast/appdata/farmos-pwa` y cambia `chagra.app` en minutos, sin paso manual intermedio.
Quien crea la tabla de `INFRA_FACTS.md` va a creer que mergear a `main` solo toca el entorno de dev.
No es así.

---

## 2. El bloqueo REAL, con evidencia

Estado del PR al momento de la medición:

```
$ gh pr view 2649 --json mergeable,mergeStateStatus,headRefOid,reviewDecision
{"headRefOid":"a9a9744a7e208b1fee4c51b17d1af0148e44669c",
 "mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE","reviewDecision":""}
```

`main` NO tiene branch protection clásica (`gh api .../branches/main/protection` -> 404 «Branch not
protected»). Tiene un **ruleset** llamado «main tests» (id 15190486, `enforcement: active`,
`bypass_actors: []`) con estas reglas: `deletion`, `non_fast_forward`, `pull_request`,
`required_status_checks`, `code_scanning`, `required_linear_history`.

### 2.1 Los 4 checks requeridos están en VERDE

```
Analyze (javascript-typescript)  COMPLETED  SUCCESS  (4m51s)
Check bundle sizes               COMPLETED  SUCCESS  (2m1s)
Offline-first E2E                COMPLETED  SUCCESS  (1m11s)
tsc:check vs baseline            COMPLETED  SUCCESS  (1m37s)
```

Revisiones requeridas: `required_approving_review_count: 0`. No hay review pendiente que bloquee.

### 2.2 El que falla es el check `CodeQL` de protección de merge

Es un check DISTINTO del job `Analyze (javascript-typescript)` (que compila y sí pasó). Lo emite la app
`github-advanced-security` y falla en 8 segundos:

```
$ gh api repos/guatoc-ecohub/Chagra/check-runs/101368103239
name: CodeQL
status: completed   conclusion: failure
app: github-advanced-security
title: 111 new alerts including 36 high severity security vulnerabilities
summary:
  ### New alerts in code changed by this pull request
  Security Alerts:  * 36 high   * 15 medium
  Other Alerts:     * 3 errors  * 5 warnings  * 52 notes
  _Alerts not introduced by this pull request might have been detected
   because the code changes were too large._
```

Contra la regla del ruleset:

```
"type": "code_scanning",
"code_scanning_tools": [{ "tool": "CodeQL",
                          "security_alerts_threshold": "high_or_higher",
                          "alerts_threshold": "errors" }]
```

36 alertas `high` superan `high_or_higher`, y 3 alertas `error` superan `errors`. **Las dos condiciones
se disparan.** Ese es el `BLOCKED`.

### 2.3 Dónde viven esas alertas (esto cambia el juicio)

Perfil de las 100 alertas que devuelve la API para `refs/pull/2649/merge`
(`note` 49, `high` 31, `medium` 14, `error` 3, `warning` 3):

| n | severidad | regla |
|---|---|---|
| 47 | note | `js/unused-local-variable` |
| 12 | high | `js/insecure-temporary-file` |
| 8 | high | `js/regex/missing-regexp-anchor` |
| 6 | high | `js/file-system-race` |
| 6 | medium | `js/file-access-to-http` |
| 2 | high | `js/regex-injection` |
| 2 | high | `js/xss-through-dom` |
| 2 | medium | `js/shell-command-injection-from-environment` |

Rutas de las `high` (las 31 devueltas): `scripts/__tests__/detector-confusion-taxonomica.test.mjs` (10),
`scripts/__tests__/audit-integraciones.test.mjs`, `scripts/__tests__/reindex-rag.test.mjs`,
`scripts/audit/verificar-fichas-bestiario.mjs`, `scripts/migrate-v31-to-v32.mjs`,
`scripts/rag-chunking-bench.mjs`, `scripts/sync-compai-nucleo.mjs`, `scripts/detect-unwired.mjs`,
`scripts/audit-componente-huerfano.mjs`, `scripts/gate-real-gpu.mjs`, `vite.config.js:60`,
8 en archivos `*.test.js(x)` de `src/`, y **2 en `demos/adopta-frailejon/frailejon.js` (`js/xss-through-dom`)**.

**Ninguna de esas rutas llega al usuario.** El deploy de producción solo rsyncea `dist/`:

```
rsync -avzO --delete --exclude='/assets/' --exclude='/pro-modules/' dist/ /mnt/fast/appdata/farmos-pwa/
rsync -avzO dist/assets/ /mnt/fast/appdata/farmos-pwa/assets/
```

Verificado en disco (con control para no comer un cero falso):

```
$ ls -d /mnt/fast/appdata/farmos-pwa/demos    -> No existe el fichero o el directorio
$ ls -d /mnt/fast/appdata/farmos-pwa/scripts  -> No existe el fichero o el directorio
$ ls -d /mnt/fast/appdata/farmos-pwa/assets   -> /mnt/fast/appdata/farmos-pwa/assets  (control OK)
```

O sea: son hallazgos SAST reales en herramientas de build, tests y una demo suelta, **no en el bundle
servido**. Eso no las vuelve falsas; las vuelve de riesgo distinto. La decisión de si eso se arregla o
se descarta con justificación es del operador, no mía.

Un matiz que el propio GitHub advierte y que no hay que tapar: *«Alerts not introduced by this pull
request might have been detected because the code changes were too large»*. Con 1813 archivos, parte de
esas 111 pueden ser deuda preexistente de `dev` que CodeQL atribuye al PR por tamaño del diff.

Nota sobre por qué no se puede contrastar contra `dev` directamente: `codeql.yml` dispara en
`push` a `main`, `feat/**`, `fix/**`, `chore/**`, `refactor/**` — **`dev` no está en la lista**. Por eso
`gh api .../code-scanning/alerts?ref=refs/heads/dev` devuelve `0` mientras `refs/heads/main` devuelve 37.
Ese cero es de cobertura del instrumento, no del mundo.

### 2.4 Segundo bloqueo, estructural: `required_linear_history`

El ruleset incluye `required_linear_history`, que impide empujar commits de merge a `main`.
Y un fast-forward tampoco cabe:

```
$ git merge-base --is-ancestor origin/main origin/dev  -> NO
$ git log --oneline origin/dev..origin/main
  6d3aa5ace fix(ci): el CLA de main usa la allowlist corta y la llave equivocada de firmas (#3136)
```

`main` tiene un commit propio que `dev` no tiene. Con historia lineal obligatoria, **la única forma de
cerrar #2649 es squash o rebase**, nunca «Create a merge commit», aunque el ruleset liste los tres
métodos en `allowed_merge_methods`. Eso es una decisión de forma que nadie ha tomado y que cambia
mucho el después (ver §5).

Dato tranquilizador sobre ese commit único: su contenido **ya está en `dev`**, idéntico.

```
$ git diff --name-status $(git merge-base origin/main origin/dev) origin/main
  M  .github/workflows/cla.yml
$ git diff --name-status origin/dev origin/main -- .github/workflows/cla.yml
  (vacío)
```

Ambos lados convergieron al mismo blob (`fefaa26fe` -> `81842bb34`). **El merge no revierte el fix del
CLA** y por eso `mergeable: MERGEABLE` con 0 conflictos.

---

## 3. El diff real `origin/main..origin/dev`

```
$ git rev-list --count origin/main..origin/dev   -> 1174 commits
$ git rev-list --count origin/dev..origin/main   -> 1
$ git diff --shortstat origin/main...origin/dev
  1813 files changed, 255209 insertions(+), 8590 deletions(-)
$ git diff --diff-filter=D --name-status origin/main...origin/dev | wc -l  -> 0 (no borra nada)
Rango temporal: 2026-07-11 -> 2026-09-05 (8 semanas)
package.json version: main 1.0.55 == dev 1.0.55 (NO se bumpeó)
```

**Ojo**: el cuerpo del PR dice «565 commits». Hoy son **1174**. El PR se abrió el 2026-07-21 y `dev` no
ha parado; su descripción describe otra cosa que la que se mergearía.

Tipos de commit (convencionales):

| n | tipo | | n | tipo |
|---|---|---|---|---|
| 465 | feat | | 22 | test |
| 267 | fix | | 9 | perf |
| 67 | art | | 5 | ci |
| 61 | merge | | 4 | refactor |
| 36 | docs | | 3 | revert |
| 35 | chore | | 173 | **sin convención** |

Reparto del diff por destino:

| bloque | archivos | líneas | ¿llega al usuario? |
|---|---|---|---|
| `src/` + `public/` + `vite.config.js` + `package*.json` | 1218 | +170.077 / −7.991 | **SÍ** |
| `ops/` `_gate/` `.rescue/` `docs/` `scripts/` `tests/` `eval/` `demos/` `Chagra-strategy/` | 528 | +60.496 / −524 | no |
| `.github/workflows/` | 10 archivos | — | CI, no usuario |

Dentro de `src/` (1074 archivos): `src/visual` 468, `src/components` 216, `src/services` 130,
`src/mockups` 116, `src/hooks` 41, `src/compai` 26.

### Lo riesgoso, señalado

1. **`.github/workflows/deploy.yml` cambia** — es el pipeline que corre al mergear. El cambio es
   defensivo y está bien: agrega `VITE_HOME_CAMPESINO_B: "false"` con este comentario en el código:
   *«homeCampesinoBActivo() hace DEFAULT ON cuando VITE_HOME_CAMPESINO_B no está seteada. Sin esto, al
   promover dev→main la home campesina B reemplazaría la home NORMAL del PWA en producción.»*
   O sea: alguien ya vio esta trampa y la blindó. **Si se promoviera el `src/` de dev SIN este cambio de
   workflow, producción cambiaría de home.** Van juntos; no separar.
2. **`Chagra-strategy/` dentro del repo PÚBLICO `Chagra`** (`gh repo view --json visibility` ->
   `PUBLIC`). El directorio ya existe en `main`; el PR le suma 4 archivos
   (`INFORME-BUNDLE-AUDIT-BASELINE.md`, `INFORME-VEREDICTO-MERGEABILIDAD.md`,
   `INVENTARIO-74-RAMAS-FABLE.md`, `herramientas/veredicto-mergeabilidad.mjs`). Sumado a `ops/` (168),
   `_gate/` (128) y `.rescue/` (2), son ~320 documentos internos que quedan públicos.
   Escaneo anti-leak sobre esos 320 añadidos (regex controlado contra una cadena con IPs conocidas
   antes de confiar en el cero): **0 IPs privadas/tailscale**, **1 sola referencia a ruta de secreto**:
   `/run/secrets/chagra-agro-mcp-env` en `ops/informes/test-inteligencia-chagra-2026-07-23.md`
   (es el NOMBRE de la ruta, no un valor). Riesgo bajo pero no nulo, y hay nombres propios en nombres de
   archivo de esa tanda. **Esto es juicio del operador, no un defecto técnico.**
3. **173 commits sin convención** en una rama que va a producción.
4. **`delete_branch_on_merge: true`** en el repo y **`dev` sin ninguna regla de protección**
   (`gh api .../rules/branches/dev` -> `NINGUNA`). Hay **4 PRs abiertos con base `dev`**.
5. **`version.json` no sube de versión**: prod pasaría de `1.0.55` a `1.0.55` con 1174 commits adentro.

---

## 4. Qué falta EXACTAMENTE para poder promover (pasos verificables, en orden)

1. **Dar por muerto el bloqueante «docroot diverge».** Corregir
   `Chagra-strategy/ops/PRECONDICIONES-CUTOVER-20260904.md` precondición #1: el comando usó
   `git -C .../Chagra-strategy`. El comando correcto es
   `git -C /home/kortux/Workspace/chagra ls-remote origin refs/heads/main`.
   Verificable: `jq -r .sha /mnt/fast/appdata/farmos-pwa/version.json` == prefijo de
   `git -C /home/kortux/Workspace/chagra rev-parse origin/main`. Hoy: `6d3aa5ac` == `6d3aa5ac`. CUMPLE.
2. **Resolver el check `CodeQL`.** Es el único gate rojo. Tres salidas, y elegir es del operador (§5):
   arreglar las 36 `high`; descartarlas una a una en la pestaña Security con justificación
   («used in tests» / «won't fix»); o excluir `scripts/**`, `**/__tests__/**` y `demos/**` del scope de
   CodeQL vía `paths-ignore` en `codeql.yml` + `.github/codeql/codeql-config.yml`.
   Verificable: el check-run `CodeQL` del PR pasa de `failure` a `success`.
3. **Decidir squash o rebase** (merge commit está prohibido por `required_linear_history`).
   Verificable: en la UI del PR, el botón de merge ofrece solo esas dos opciones.
4. **Blindar `dev` antes de mergear.** Con `delete_branch_on_merge: true` y `dev` sin reglas, hay riesgo
   de perder la rama base de toda la flota. Mínimo: crear una ref de respaldo
   (`git push origin origin/dev:refs/heads/dev-respaldo-20260905`) y/o desmarcar el borrado automático.
   Verificable: `gh api repos/guatoc-ecohub/Chagra/rules/branches/dev` deja de decir `NINGUNA`, o existe
   la rama de respaldo.
5. **Congelar `dev` durante la ventana.** El PR se re-dispara con cada push (hoy pasó dos veces en 3
   minutos). Con la flota empujando, nunca hay una foto verde estable.
   Verificable: `git ls-remote origin refs/heads/dev` no cambia entre el gate y el merge.
6. **Actualizar el cuerpo del PR**: dice 565 commits, son 1174.
7. **Backup fresco del docroot productivo.** `restic-backup.service` **no existe** en `alpha`
   (`systemctl status restic-backup` -> «Unit could not be found»; control: 768 unidades listadas, así
   que el instrumento sí ve unidades). No hay copia previa a un despliegue de 8 semanas. Alternativa
   barata mientras tanto: `cp -a /mnt/fast/appdata/farmos-pwa /mnt/fast/appdata/farmos-pwa.pre-2649`
   — son 71 MiB contra 217 GiB libres. (El estado completo de restic-b2 está en
   `project_restic_b2_alpha_bloqueado_20260905`; no es el bloqueo de este PR y no lo re-derivé.)
8. **Gate visual sobre `chagra-dev.guatoc.co` ANTES de mergear.** Es la mejor aproximación a lo que
   quedaría en prod: hoy sirve `db8c45ac`, a 1 commit (solo `.md`) del tip de `dev`. Yo **no** hice gate
   visual: no me corresponde certificarlo y la casa prohíbe declarar un visual sin captura GPU-headed.
   Verificable: captura con `shot3d --headed` juzgada por el operador.
9. **Bumpear `package.json`** si se quiere que producción sea distinguible por versión.
10. **Mergear y verificar el despliegue**, recordando que MERGEADO ≠ DESPLEGADO ≠ VISIBLE:
    `gh run watch` del workflow «Deploy Chagra PWA», luego
    `curl -s https://chagra.app/version.json` debe traer el SHA corto del nuevo `main`.

---

## 5. Lo que exige DECISIÓN del operador (no es un arreglo técnico)

1. **Qué se hace con las 36 alertas `high` de CodeQL.** Arreglar, descartar con justificación, o sacar
   `scripts/`, tests y `demos/` del scope del SAST. El dato para decidir: ninguna de esas rutas llega al
   docroot productivo (verificado en disco). El dato en contra: `js/xss-through-dom` en
   `demos/adopta-frailejon/frailejon.js` es código que igual se publica en el repo público.
   **Cambiar el scope de CodeQL es aflojar un gate de seguridad: no lo hago yo por iniciativa propia.**
2. **Squash o rebase.** Squash: `main` recibe 1 commit y se pierden los 1174 mensajes; además la
   merge-base no avanza, así que el próximo PR `dev`→`main` va a volver a mostrar toda la historia.
   Rebase: reescribe 1174 commits sobre `main`; después hay que decidir qué se hace con `dev`
   (resetear a `main` o dejarla divergir). Ninguna es gratis.
3. **Si los ~320 documentos internos (`ops/`, `_gate/`, `.rescue/`, `Chagra-strategy/`) deben ir a un
   repo PÚBLICO.** Técnicamente no rompen nada y el escaneo no encontró IPs ni secretos; es criterio de
   frontera, y hay nombres propios en nombres de archivo.
4. **Si se promueve sin backup del docroot** (restic no existe en el host).
5. **Si se acepta desplegar con `version` sin bumpear.**
6. **Corregir la tabla de deploy de `INFRA_FACTS.md`**, que hoy induce a creer que `main` es dev y que
   existe una rama `release`. Es la fuente de verdad declarada de la casa y está mintiendo en el punto
   exacto de este cutover.

---

## 6. Riesgo de promover HOY

**Alto, y el mayor no es el código: es que el merge despliega solo.** `deploy.yml` dispara en push a
`main` y rsyncea a `/mnt/fast/appdata/farmos-pwa`. No hay paso manual. Apretar «merge» es apretar
«desplegar a `chagra.app`».

| # | Riesgo | Probabilidad | Impacto | Evidencia |
|---|---|---|---|---|
| 1 | 8 semanas y +170k líneas de `src/` entran a prod de una vez; sin gate visual, cualquier regresión visible sale en vivo | alta | alto | 1218 archivos servidos cambiados; `Visual Regression` y `Playwright E2E` en el head de `dev` estaban **en curso**, no verdes |
| 2 | **`dev` se borra al mergear** y la flota se queda sin rama base | media | alto | `delete_branch_on_merge: true`; `dev` sin reglas; 4 PRs abiertos con base `dev`. GitHub suele saltarse el borrado cuando la rama es base de PRs abiertos — **no lo pude confirmar en este repo y no lo voy a probar** |
| 3 | Sin backup del docroot: revertir exige re-desplegar `main` anterior, no restaurar | alta | medio-alto | `restic-backup.service` no existe en `alpha` |
| 4 | Rollback no es instantáneo: el SW no hace `skipWaiting`, los clientes instalados quedan con el bundle viejo hasta el prompt de update | media | medio | comentarios en `deploy.yml` sobre `--exclude='/assets/'` y GC a 30 días |
| 5 | Home del PWA cambia en prod si el `src/` viaja sin el `deploy.yml` de dev | baja si se mergea el PR completo | alto | blindaje `VITE_HOME_CAMPESINO_B: "false"` |
| 6 | ~320 documentos internos quedan públicos e indexables | certeza si se mergea | criterio del operador | repo `PUBLIC` verificado con `gh repo view --json visibility` |
| 7 | Ventana de carrera: `dev` se mueve mientras se gatea | alta | medio | 2 pushes a `dev` en 3 minutos durante esta auditoría |

**Lo que NO va a romperse** (medido, para no inflar la alarma): no hay conflictos
(`mergeable: MERGEABLE`); no se borra ningún archivo (`--diff-filter=D` -> 0); no se revierte el fix del
CLA de `main` (ambos lados tienen el mismo blob); `Check bundle sizes`, `tsc:check vs baseline`,
`Offline-first E2E` y `Analyze (javascript-typescript)` están en verde sobre el head actual; y la
divergencia de docroot que bloqueaba el cutover nunca existió.

---

## 7. Lo que NO pude verificar

- **No hice gate visual de `chagra-dev.guatoc.co` ni de `chagra.app`.** Solo constaté HTTP 200 y el
  `version.json`. No tengo captura GPU-headed y por lo tanto **no certifico nada visual**; declarar que
  dev «se ve bien» sin esa captura viola la regla de la casa. Es el paso 8 de §4 y le corresponde a
  quien tenga el gate.
- **No pude separar cuántas de las 111 alertas de CodeQL son realmente nuevas del PR y cuántas son deuda
  preexistente de `dev`.** `codeql.yml` no corre en push a `dev`, así que no hay línea base con la cual
  contrastar, y el propio GitHub advierte que con diffs grandes atribuye de más. La API devolvió las
  primeras 100 de 111 (`per_page=100`); no pagué la segunda página.
- **No confirmé si GitHub borraría `dev` al mergear.** La política documentada de GitHub es no borrar una
  rama que es base de PRs abiertos, y hay 4. No lo probé porque probarlo es exactamente la acción
  destructiva que esta auditoría tiene prohibida.
- **No verifiqué si `mergeStateStatus` pasa a `CLEAN` al resolver solo CodeQL.** Es la inferencia obvia
  (4/4 requeridos en verde, 0 reviews requeridas, sin conflictos), pero GitHub no expone el motivo del
  `BLOCKED` y la única prueba dura sería mergear.
- **No revisé el contenido de los ~320 documentos internos uno por uno** para anti-leak. Corrí un
  escaneo automatizado de IPs privadas/tailscale y rutas de secretos, con control del regex previo, y no
  leí los 320 textos completos buscando nombres de terceros.
- **No audité `#3164`** (el draft que arregla `audit-integraciones`), por instrucción explícita del
  brief. Solo constato que **no bloquea a #2649**: `audit-integraciones` aparece **pass (18s y 19s)** en
  los checks del PR, y `db8c45ac` (el merge de #3164) ya está en `dev`.
- **No verifiqué el estado de restic-b2 más allá de constatar que la unidad no existe.** El brief lo
  puso fuera de alcance.
- **El regex de IPs que usé no cubre `192.168.x.x` completo** (la alternancia quedó mal formada para ese
  rango); sí cubre `10.x` y `100.x`, que son los rangos de tailscale y LAN que importan aquí. El cero
  vale para esos dos, no para todo el espacio de direcciones.
