# INFORME 099 · Deploy de `3d.guatoc.co` rojo todo el 2026-09-05 — el guard mentía

**Card:** 099 (`glm-card-099-deploy-3d-permisos-runner-20260905`) · **Fecha:** 2026-09-05
**Autor:** GLM (programador autónomo) · **Revisor:** Claude Opus
**Alcance de este PR:** el guard del workflow ahora distingue *no existe* de *no puedo atravesar*, con control negativo automatizado. **NO se tocó ningún permiso** (prohibido por el encargo).

---

## 1. Datación: qué cambió y cuándo (con evidencia)

El encargo pedía descartar entre tres sospechosos: `runs-on` del workflow, usuario del
runner, o permisos del home. **El culpable es el workflow: el target de deploy cambió.**

### Respuesta corta

El commit **`418dc7186`** (2026-08-15 12:30:05 -0500, "fix(ci): verify served 3d deployment")
cambió el target de `TARGET="$HOME/demos/3d/app"` a `TARGET=/home/kortux/demos/3d/app`
hardcodeado. Ese commit **no llegó a `dev` hasta el merge `77c4ea40a`
(2026-08-24 18:42:27 -0500, "merge: feat/fix-deploy-3d-served-verify")**. La primera corrida
que ejecutó el target nuevo fue `32790589713` a las **18:43:12 -0500** y falló con el mensaje
mentiroso. Todas las corridas desde entonces son rojas (261 examinadas; cero `success` después
de la frontera).

### Los tres sospechosos, uno por uno

| Sospechoso | Veredicto | Evidencia |
|---|---|---|
| `runs-on` del workflow | ❌ nunca cambió | Creado `[self-hosted, alpha]` en `d463101b7` (jul 29) y sin ningún commit posterior que lo toque (`git log -S self-hosted` sobre el archivo: solo el commit de creación) |
| Usuario del runner | ❌ no cambió en la ventana | Último commit en `guatoc-nixos/modules/cicd-runner.nix`: `ca0d689` (2026-06-24), ANTES del workflow mismo. `user = "runner"` vigente; unit vivo confirma `User=runner` y `Environment="HOME=/var/lib/github-runner/work"` |
| Permisos de `/home/kortux` | ❌ no hay cambio detectable en la ventana ago 24 | Ningún commit en guatoc-nixos toca modo del home (`git log -S homeMode` → vacío; NixOS `isNormalUser` tiene default 700). El ACL huérfano `user:openfang:--x` con `mask::---` indica un home cerrado de antigua fecha + un intento previo de abrirlo neutralizado después por un chmod (ver §3) |
| **Target del workflow** | ✅ **ESTE cambió** | `418dc7186` (ago 15 12:30) → merge a dev `77c4ea40a` (**ago 24 18:42:27 -0500**) |

### La frontera exacta, corrida a corrida (`gh run list`, workflow deploy-3d-guatoc)

| Corrida | UTC | Resultado | Qué ejecutó |
|---|---|---|---|
| `32790285905` | 2026-08-24 23:39:06 | ✅ success (última verde) | **Workflow VIEJO**: el log muestra el comentario del esquema grupo-users («grupo dueno del arbol…») y `TARGET="$HOME/..."` → escribió en `/var/lib/github-runner/work/demos/3d/app` |
| `77c4ea40a` | 2026-08-24 23:42:27 (merge) | — | El target nuevo llega a `dev` |
| `32790589713` | 2026-08-24 23:43:12 | ❌ **failure (primera roja)** — 4 min 06 s después de la última verde | **Workflow NUEVO**: log termina en `El padre del target no existe: /home/kortux/demos/3d/app` → `##[error]Process completed with exit code 1.` |
| … | 2026-08-25 → hoy | ❌ failure en todas | Ídem |

### Consecuencia incómoda: las verdes anteriores eran falsos positivos

Entre jul 29 y ago 24 el workflow "verde" hacía `rsync` a **`$HOME/demos/3d/app` del
propio runner** (`/var/lib/github-runner/work/demos/3d/app`, según el `Environment` del
unit) — un directorio que **nada sirve**. El sitio de verdad (`/home/kortux/demos/3d/app`,
servido por `microapp-3d.service`) **nunca fue actualizado por CI**. El `app/` con fecha
**ago 15 14:17** es compatible con copia manual del operador ese mismo día (el commit
`418dc7186` es de las 12:30), no con ninguna corrida de CI: ninguna corrida con el target
nuevo fue verde jamás. El paso "Verify served deployment" añadido en `418dc7186` existe
precisamente porque los verdes viejos no se correspondían con lo servido.

---

## 2. Tabla de pruebas re-corridas por mí (2026-09-05, host alpha)

Limitación honesta: esta sesión no tiene sudo sin password (`sudo: … debe ser propiedad del
uid 0…`), así que **no pude re-ejecutar la fila `sudo -u runner`**; dejo los comandos listos
para el operador. El control negativo del guard queda probado por la vía equivalente (bits de
permiso sin x aplican a cualquier usuario no-root, incluido el dueño) y por la suite vitest,
que en CI correrá como `runner` — la identidad exacta del incidente.

| Prueba | Resultado | rc |
|---|---|---|
| `stat -c '%A %U:%G' /home/kortux` | `drwx------ kortux:users` (0700) | — |
| `getfacl -p /home/kortux` | `user:openfang:--x #effective:---` + `mask::---` (entrada ACL neutralizada) | — |
| `id runner` | `uid=990(runner) gid=984(runner) grupos=984(runner),100(users),2011(chagra-deploy)` | — |
| `test -d /home/kortux/demos/3d` (como kortux) | SÍ lo ve | 0 |
| `bash scripts/guard-deploy-target.sh /home/kortux/demos/3d/app` (como kortux) | `guard OK` | 0 |
| `bash scripts/guard-deploy-target.sh /tmp/guard099-demo/no-esta/app` | `CAUSA: NO_EXISTE` + `namei -l` | 1 |
| `chmod 000 /tmp/guard099-demo/bloqueado` + guard sobre `…/bloqueado/sub/app` | **`CAUSA: NO_PUEDO_ATRAVESAR`** nombra el componente bloqueado + `ls -ld` + `getfacl` + `namei` (equivalente exacto del caso runner: dir existe, proceso no lo atraviesa) | 1 |
| `npx vitest run scripts/__tests__/guard-deploy-target.test.mjs` | **6 passed** (incluye el control negativo) | 0 |
| Para re-correr la tabla original (operador): `sudo -u runner test -d /home/kortux/demos/3d` | esperado rc=1 | — |
| Para re-correr (operador): `sudo -u runner bash <repo>/scripts/guard-deploy-target.sh /home/kortux/demos/3d/app` | esperado `CAUSA: NO_PUEDO_ATRAVESAR` sobre `/home/kortux` | — |

---

## 3. El gotcha de la máscara ACL (medido en el host, no opinado)

`getfacl /home/kortux` hoy:

```
user::rwx
user:openfang:--x	#effective:---
group::---
mask::---
other::---
```

Alguien ya concedió traversal a un servicio (`openfang`) con `setfacl`, pero un `chmod`
posterior re-escribió la **máscara** desde los bits de grupo (`700` → grupo `---`) y dejó la
entrada ineffective. Moraleja operativa: **cualquier `chmod` futuro sobre `/home/kortux`
volvería a romper un arreglo por ACL**. Además, `setfacl -m u:runner:x` recalcula la máscara
al vuelo (quedaría `--x`) y eso **revive también la entrada de `openfang`** (`#effective:--x`)
— decisión del operador: aceptarlo (parece que fue intencional en su momento) o rematarla con
`setfacl -m u:openfang:---`.

---

## 4. El arreglo real: opciones ordenadas por riesgo (menor → mayor)

### Opción B — `setfacl` de traversal + restaurar g+w del árbol `app/` (RECOMENDADA YA)

```bash
# 1. traversal (x) del home para el runner — solo x, sin r, sin w:
setfacl -m u:runner:x /home/kortux
#    (setfacl recalcula la máscara a --x automáticamente; verificar con getfacl)
# 2. el runner necesita ESCRIBIR en app/, y hoy está en 755 (medido:
#    drwxr-xr-x kortux:users) — rsync fallaría después del guard:
chmod g+w /home/kortux/demos/3d/app
chmod g+s /home/kortux/demos/3d/app   # setgid: hijos nuevos heredan grupo users
# 3. verificación con la identidad del runner:
sudo -u runner bash scripts/guard-deploy-target.sh /home/kortux/demos/3d/app
```

- **Por qué NO abre el home:** `x` sin `r` en un directorio permite alcanzar rutas ya
  conocidas por nombre exacto, pero **no listarlas** (`readdir` exige `r`). El runner solo
  llega a `/home/kortux/demos/3d/app` porque conoce el path; el resto del home sigue siendo
  invisible e ilegible para él. Los bits de `other::---` no cambian.
- **Pro:** 3 comandos, reversible (`setfacl -x u:runner /home/kortux; chmod g-w`), sin tocar
  infra ni servicios vivos, compatible con el `--chmod` que el rsync ya mantiene en el árbol.
- **Contra (medido):** es invisible y frágil ante chmods futuros — el propio host ya tiene
  la cicatriz (`openfang` neutralizado, §3). Mitigación: dejar la regla documentada en
  `guatoc-nixos` (tmpfiles `a`/nota) y confiar en que este guard nuevo, si vuelve a romperse,
  ahora dirá `NO_PUEDO_ATRAVESAR` nombrando `/home/kortux` en el primer intento.
- **Efecto colateral a decidir por el operador:** revive `user:openfang:--x` (§3).
- **Quién lo corre:** el operador (kortux). ⛔ GLM no ejecuta cambios de permisos del home.

### Opción C — mover el target fuera del home (RECOMENDADA COMO ARREGLO DEFINITIVO)

`/srv/guatoc-demos/3d/app` (o `/var/lib/guatoc-demos/3d/app`), `0775 kortux:users`, y
actualizar `microapp-3d.service` (root servido) + `TARGET` del workflow.

- **Pro:** elimina para siempre la clase de bug (CI nunca más depende de permisos del home
  de una persona); permisos explícitos y visibles.
- **Contra:** toca un servicio vivo del valle (3d.guatoc.co) + migración del árbol + cambio
  en `guatoc-nixos` → **ESCALATE_TO_OPUS** (cambio de infra).
- **Riesgo:** medio — ventana de servicio tocado, pero reversible con revert del unit.

### Opción D — servicio intermedio (inbox + rsync propiedad de kortux)

CI deposita el build en un inbox mundialmente-escrito (`/var/lib/deploy-inbox/3d/`) y un unit
systemd de `kortux` (path unit) lo rsyncea al destino.

- **Pro:** separación de privilegios limpia; el runner jamás necesita tocar el home.
- **Contra:** componente nuevo de infra que diseñar/mantener (guatoc-nixos), más piezas que
  fallar, latencia extra → **ESCALATE_TO_OPUS**.
- **Riesgo:** medio.

### Opción A — correr el job en un runner que sea `kortux` (NO recomendada)

- **No existe hoy (medido):** los runners registrados son `alpha-chagra` (usuario `runner`),
  `alpha-nixos` (`nixos-deployer`) y `alpha-claude-code` (`claude-runner`, sin el label
  `alpha`). Habría que crear uno.
- **Riesgo ALTO:** un job de CI ejecuta código de PRs; hacerlo correr con los plenos poderes
  del usuario del operador (claves ssh, history, tokens en `~/.config`) convierte cualquier
  PR (o dependencia del build) en escalada al home. Además, dos runners con label `alpha`
  hacen el picking no determinista (hoy eso ya se maneja con el hack `Detect runner identity`).

---

## 5. Qué falta para el verde (explícito, según el encargo)

El deploy **NO queda verde con este PR** — a propósito: el arreglo real toca permisos del
home, que son decisión del operador. Estado tras mergear este PR:

1. El paso de deploy seguirá falliendo, pero ahora con diagnóstico accionable:
   `CAUSA: NO_PUEDO_ATRAVESAR … sobre: /home/kortux` (+ `namei` + `getfacl`).
2. El operador corre los comandos de la **Opción B** (§4).
3. La siguiente corrida a `dev` debe ponerse verde: guard OK → rsync (ahora con g+w) →
   verify served hash → smoke 200.
   Verificación previa recomendada del operador:
   `sudo -u runner bash scripts/guard-deploy-target.sh /home/kortux/demos/3d/app` → debe dar
   `guard OK` antes de confiar en el workflow.

**Mientras tanto, lo que sirve `app/` sigue congelado en ago 15 14:17** (el valle raíz se
sirve al día por otro mecanismo, por eso el sitio "parece" vivo).

## 6. Cambios de este PR

- `scripts/guard-deploy-target.sh` (nuevo): guard honesto — distingue `NO_EXISTE` de
  `NO_PUEDO_ATRAVESAR`, nombra el primer componente bloqueado, imprime `id`, `ls -ld`,
  `getfacl` y `namei -l` cuando están disponibles.
- `.github/workflows/deploy-3d-guatoc.yml`: el paso de deploy usa el guard nuevo (fuera el
  mensaje mentiroso).
- `scripts/__tests__/guard-deploy-target.test.mjs` (nuevo): 6 tests, incluido el control
  negativo exigido: dir existente sin traversal ⇒ `NO_PUEDO_ATRAVESAR` (nunca "no existe"),
  y dir ausente ⇒ `NO_EXISTE`. En CI corre como `runner`.
- Este informe.
