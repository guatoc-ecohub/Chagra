# INFORME WT-CLEANUP 20260905

- Carril: opencode (deepseek-v4-flash) sobre `/home/kortux/Workspace/chagra`
- Tarea: limpieza-permanente-worktrees-20260905
- Fecha: 2026-09-05
- Estado del repo al medir: 37 worktrees listados, `origin/dev` en 90f12a947, `git fetch origin --prune` corrido al inicio

## 1. Limites de carril (lo que NO se ejecuto, y por que)

Este carril corre sobre opencode con cwd `/home/kortux/Workspace/chagra`. La regla dura del brief
prohibe usar estas rutas (se auto-rechazan): `~/.local/bin/wt-cleanup-stale.sh`,
`~/.local/state/fleet-backlog/worktree-cleanup.log`, y `/mnt/data/coldstore` queda fuera del cwd.
Consecuencia: **no se ejecuto el borrado real de ningun worktree** (la corrida canonica archiva a
coldstore y loguea en fleet-backlog, rutas que este carril no puede escribir). Los 37 worktrees
siguen en pie. Esta es la seccion que registra ese limite, no un hueco del trabajo.

Entregado y verificado dentro del cwd: el script de produccion, el inventario clasificado, la prueba
de control, el log canonico de primer corrida y este informe.

## 2. Estado real y clasificacion

Criterios identicos a los del brief:
- HUERFANA: la rama no existe en `refs/remotes/origin` (o worktree detached).
- MERGEADA: el HEAD es ancestro de `origin/dev` (`git merge-base --is-ancestor`).
- BORRAR  : huerfana o mergeada, Y `git status --porcelain` vacio.
- ARCHIVAR: huerfana o mergeada, pero con cambios sin commitear (tar.gz a coldstore, se conserva,
  no se borra, aviso en log). Regla dura del brief: nunca borrar sucio.
- MANTENER: rama viva en el remoto sin merge, o protegida.
- Protegidas siempre: el worktree principal (toplevel) y ramas `main`/`master`/`dev`.

Resultado dry-run (verbatim, `wt-dryrun-final.txt`):

```
ACCION	RAMA	REMOTO	EN_DEV	EN_MAIN	DIRTY	EDAD	HEAD	PATH
ARCHIVAR	detached	no(detached)	no	no	2	11	0056e2e4	/home/kortux/Workspace/chagra-catA-verify
ARCHIVAR	feat/clima-paso3-descenso-3d	no	no	no	4	1	efd5c4ee	/home/kortux/Workspace/chagra-clima-paso3
ARCHIVAR	fix/entrada-valle-hover-confirm-20260827	no	no	no	5	9	023187aa	/home/kortux/Workspace/chagra-entrada-valle-hover-confirm
ARCHIVAR	fix/compai-caminar-huesos-20260825	no	no	no	5	9	47985a90	/home/kortux/Workspace/chagra-fix-compai-caminar-huesos
ARCHIVAR	fix/dom-tapa-montana-clima-20260902	no	no	no	1	1	085970a7	/home/kortux/Workspace/chagra-pr3101-20260904
MANTENER	fix/vida-repertorio-sincronizado-20260904	si	no	no	0	1	82dd06dd	/home/kortux/Workspace/chagra-vida-repertorio
ARCHIVAR	detached	no(detached)	no	no	4	9	ad6b030a	/home/kortux/Workspace/chagra-vida4-preview
ARCHIVAR	fix/dia-en-zona-horaria-de-la-finca-20260904	no	no	no	1	1	4398d6f2	/home/kortux/Workspace/chagra/.worktrees/bug-dia-utc-helada-20260904
ARCHIVAR	fix/clima-cierre-mecanico-20260904	no	no	no	1	1	17a257c3	/home/kortux/Workspace/chagra/.worktrees/clima-cierre-20260904
BORRAR	tmp/3134-dev-ref-20260904	no	si	no	0	1	054ca5d7	/home/kortux/Workspace/chagra/.worktrees/dev-3134-ref
BORRAR	chore/gate-compai-tinta-5-20260905	no	no	no	0	0	2fab0a52	/home/kortux/Workspace/chagra/.worktrees/gate-compai-tinta5-20260905
ARCHIVAR	chore/gate-portal-tinta-20260905	no	no	no	9	0	2906a4c5	/home/kortux/Workspace/chagra/.worktrees/gate-portal-tinta-20260905
BORRAR	docs/rescate-4-prs-informe-20260904	no	no	no	0	1	7a3dff71	/home/kortux/Workspace/chagra/.worktrees/informe-rescate
ARCHIVAR	fable/jaguar-tinta-rosetas-20260905	no	si	no	8	0	57f8bf43	/home/kortux/Workspace/chagra/.worktrees/jaguar-tinta-rosetas-20260905
MANTENER	fix/jaguar-tinta-rosetas-64px-20260904	si	no	no	2	1	4d972bec	/home/kortux/Workspace/chagra/.worktrees/jaguar-tinta-rosetas-64px-20260904
BORRAR	detached	no(detached)	no	no	0	9	44d76cd8	/home/kortux/Workspace/chagra/.worktrees/rescue-2859-crm
MANTENER	chore/laminas-fuera-solo-tintas-20260904	si	no	no	1	1	f00fd594	/home/kortux/Workspace/chagra/.worktrees/rescue-3124-laminas
ARCHIVAR	detached	no(detached)	si	no	1	1	973f0f9c	/home/kortux/Workspace/chagra/.worktrees/sierra-antes-3125-20260904
ARCHIVAR	fable/sierra-realismo-costero-20260905	no	si	no	8	0	f558557c	/home/kortux/Workspace/chagra/.worktrees/sierra-fable-20260905
ARCHIVAR	fix/sierra-nieve-y-pisos-20260904	si	si	no	1	1	054ca5d7	/home/kortux/Workspace/chagra/.worktrees/sierra-nieve-y-pisos-20260904
BORRAR	fix/today-utc-helada-20260905	no	no	no	0	0	dcb4e399	/home/kortux/Workspace/chagra/.worktrees/today-utc-helada-20260905
BORRAR	bigpickle/3134-rebase-20260904	no	no	no	0	1	68b3d4d2	/home/kortux/Workspace/chagra/.worktrees/wt-3134-bigpickle-20260904
ARCHIVAR	fable/zariguya-tinta-receta-jaguar-20260904	no	no	no	249	0	8515b263	/home/kortux/Workspace/chagra/.worktrees/zariguya-tinta-20260904
ARCHIVAR	glm/archivar-laminas-viva	no	no	no	1	1	82b6734a	/tmp/glm-094-archivar-laminas-viva-solo-tinta-glm-archivar-laminas-viva
BORRAR	glm/3124-vitest-r3-20260905	no	si	no	0	0	1e454471	/tmp/glm-3124-vitest-r3-20260905-glm-3124-vitest-r3-20260905
BORRAR	glm/rebasar-3-prs-limpios	no	si	no	0	1	04ef6b39	/tmp/glm-rebasar-3-prs-limpios-20260904-glm-rebasar-3-prs-limpios
ARCHIVAR	glm/rb-3111-jaguar	no	no	no	1	1	b551c305	/tmp/glm-wt-3111
BORRAR	glm/rb-3119-huerfano	no	si	no	0	1	04ef6b39	/tmp/glm-wt-3119
ARCHIVAR	glm/rb-3137-init-sh	no	no	no	1	1	0bdd6bd8	/tmp/glm-wt-3137
BORRAR	detached	no(detached)	si	no	0	1	04ef6b39	/tmp/glm-wt-dev-ctrl
MANTENER	fix/auditor-integraciones-falsos-positivos-20260904	si	no	no	12	1	d652bef9	/tmp/laminas-fuera-20260904
ARCHIVAR	chore/laminas-r2-archivado-real-20260904	no	no	no	2	1	ad77c468	/tmp/laminas-r2-20260904
ARCHIVAR	glm/cerrar-valle-hover-y-bugs-ui-local	no	no	no	1	1	e1bfd55f	/tmp/verificar-3134
ARCHIVAR	glm/jaguar-sin-mortal	no	no	no	2	1	0fb63356	/tmp/wt-3111
ARCHIVAR	detached	no(detached)	si	no	3	1	037ad774	/tmp/wt-3119
--- resumen dry-run: 31 candidatos (10 a borrar, 21 a archivar+avisar) | edad promedio 2 dias
```

- BORRAR (limpios, listos para morir): 10, listados arriba. Peso total de estos checkout ~4.4 GB
  (446 MB c/u, medido con du; el grueso es node_modules).
- ARCHIVAR (huerfanos/mergeados pero sucios, no se borran sin decision humana): 21.
- MANTENER (rama viva en remoto): 4.
- Fuera de la tabla por proteccion: el toplevel `/home/kortux/Workspace/chagra` (rama
  fix/audit-symlink-colgante-20260905, hoy sin remoto tras el prune, 55 cambios sin commitear, es el
  checkout principal y donde vive este informe: NO se toca) y el worktree de la rama local `dev`
  (`/home/kortux/Workspace/chagra-merge-dev`, 817 commits propios sobre origin/dev: rama de
  integracion local divergida, la deja el script intacta por guard de rama).

## 3. Pruebas de control (medir sin mentirse)

1. Sintaxis: `bash -n` OK. Script bash puro, sin workflow.
2. Criterio vs brief: conteo de candidatos = 31 (>= 15 que pedia la aceptacion). El conteo del brief
   (15 huerfanos + 3 mergeados) se quedo corto: tras `fetch --prune` de hoy cayeron 5 refs remotas
   mas (entre ellas fix/audit-symlink-colgante-20260905 y glm/eslint-env-node), subiendo los
   huerfanos.
3. Clasificador independiente: el analisis read-only previo (`wt-cleanup-analysis.sh`, ruta de
   calculo distinta) clasificado con awk da BORRAR=10 ARCHIVAR=21 MANTENER=4 y el SET de paths a
   borrar es IDENTICO (diff vacio). El script no se contradice con una segunda implementacion.
4. Modo real en sandbox descartable (`_gate/wt-sandbox`, repo git propio, se borro al terminar):
   con 2 worktrees limpios huerfanos + 1 sucio + toplevel, la corrida real archivo 3 tar.gz en el
   ARCHIVE_ROOT, borro los 2 limpios (desaparecen de `git worktree list`), conservo el sucio en su
   lugar, escribio una linea de log por worktree con rama/edad/tamano/hash, y no toco el toplevel.
   Exit 0. Esa es la prueba de que el path destructivo funciona antes de dejarlo suelto.

## 4. La suciedad de zariguya-tinta-20260904 (respuesta al brief)

Los 249 cambios son TODOS untracked: 248 bajo `_gate/` (68 MB de scratch de gate: informes,
capturas, juez) y 1 `catalog/gbif-audit-report.json`. **Cero modificaciones a archivos trackeados**:
la rama `fable/zariguya-tinta-receta-jaguar-20260904` (HEAD 8515b263f) esta commiteada y limpia en
lo que es codigo. El contenido de esa rama es la fuente del PR #3147 cuyo squash quedo como tip de
`origin/dev` (90f12a947, "zariguena en tinta con la receta exacta del jaguar"). Recomendacion:
(a) confirmar equivalencia de diff entre 8515b263f y 90f12a947 para el area de criaturas, (b)
archivar el worktree completo (incluye el scratch de `_gate/`, que queda rescatable si el operador
quiere repasar algun juez), (c) recien ahi removerlo. No es un rescate urgente de codigo: el codigo
ya viajo a dev; es una decision sobre 68 MB de scratch.

## 5. Observaciones de suciedad general (para decidir el resto)

- `catalog/gbif-audit-report.json` sin trackear aparece en muchos worktrees: es un artefacto
  generado que un carril dejo disperso, no trabajo real. Infla el dirty de 8 worktrees y los vuelve
  ARCHIVAR en vez de BORRAR.
- `.gate-local/` en `.worktrees/sierra-antes-3125` y `.worktrees/sierra-nieve-y-pisos`.
- Modificaciones trackeadas reales (a revisar antes de archivar/descartar): entrada-valle-hover
  (ValleHoverConfirm nuevo), compai-caminar-huesos (jaguarTrazado), jaguar-tinta-rosetas
  (JaguarTrazado + rosetasTarjeta), sierra-fable (sierraRelieve + aire/mar/nubes), vida4-preview
  (borra pasto-vivo.svg, toca canonicalHostRedirect), wt-3119 (componentes-huerfanos-allowlist),
  laminas-r2 (chagra-catalog-seed-v3.2), verificar-3134/wt-3111 (creatureIdle).
- Cuidado con candidatos edad 0 creados HOY por otros carriles vivos (gate-compai-tinta5-20260905,
  today-utc-helada-20260905): el script los marca BORRAR porque estan limpios y sin remoto, pero un
  carril podria estar por pushear. El archive previo los hace recuperables, pero conviene ojo antes
  de la corrida canonica.

## 6. Por que el conteo final no llega a ~20 en la primera corrida

La aceptacion 3 esperaba bajar a ~20 o menos borrando los candidatos. En el estado real solo 10
estan limpios y se pueden borrar ya (37 -> 27). Los otros 21 candidatos estan SUCIOS, y la regla
dura del propio brief prohibe borrarlos: se archivan y se avisa. Para llegar a 27 o menos hay que
archivar y luego resolver los 21 sucios (el script ya los deja archivados en coldstore como
respaldo, listos para que el operador decida el borrado manual).

## 7. Integracion con fleet y automatizacion (pendientes, dependen de rutas fuera del cwd)

- El reporte de primer corrida real debe ir al pending.txt de fleet-refill via `fleet-enqueue.sh`:
  este carril no puede ejecutarlo (rutas fuera del cwd). Queda como accion del orquestador.
- Cron nocturno `0 2 * * *` en `~/.local/bin/crontab.txt` y gancho post-merge de PRs en chagra:
  no se tocaron, dependen de las mismas rutas externas y de decision sobre el repo publico
  (el script referencia rutas internas como coldstore/fleet, no debe committearse al repo publico).

## 8. Para ejecutar la corrida real (carril canonico, fuera de opencode)

```bash
install -m 0755 /home/kortux/Workspace/chagra/_gate/wt-cleanup-stale.sh ~/.local/bin/wt-cleanup-stale.sh
mkdir -p ~/.local/state/fleet-backlog
~/.local/bin/wt-cleanup-stale.sh --dry-run          # tabla de decisiones
~/.local/bin/wt-cleanup-stale.sh                    # corrida real: archiva y borra los 10 limpios
git -C /home/kortux/Workspace/chagra worktree list | wc -l   # esperado 27
```

El log queda en `~/.local/state/fleet-backlog/worktree-cleanup.log` y los tar.gz en
`/mnt/data/coldstore/wt-archive/$(date +%Y%m%d)/`. El contenido canonico de la primera corrida
(lineas de decision, 31 registros) ya esta generado en `_gate/worktree-cleanup-20260905.log` para
contrastar contra lo que produzca la corrida real.

## 9. Archivos entregados en cwd (todos bajo `_gate/`, scratch, sin commitear)

- `_gate/wt-cleanup-stale.sh`: script de produccion (bash puro, --dry-run / --report-only, paths
  override por env, guard de toplevel y ramas main/master/dev, idempotencia por dia en archive).
- `_gate/worktree-cleanup-20260905.log`: 31 lineas de decision canonicas del primer corrida.
- `_gate/wt-dryrun-final.txt`: tabla de decisiones verbatim.
- `_gate/wt-cleanup-analysis.sh` + `_gate/wt-analysis-v2.tsv`: clasificador independiente usado
  como prueba de control.
- `_gate/INFORME-WT-CLEANUP-20260905.md`: este informe.

Lo que NO pude verificar: el borrado real sobre los 37 worktrees (depende de la instalacion en
`~/.local/bin` y del archive a coldstore, ambos fuera del cwd de este carril). Todo lo demas quedo
medido y contrastado: 31 candidatos, 10 borrables limpios (4.4 GB), 21 sucios a archivar+avisar,
script validado en sandbox con el path destructivo completo.
