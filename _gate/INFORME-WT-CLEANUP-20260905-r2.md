# INFORME WT-CLEANUP 20260905 — r2 (re-dispatch del brief 12:33)

- Carril: opencode (deepseek-v4-flash) sobre `/home/kortux/Workspace/chagra`
- Tarea: limpieza-permanente-worktrees-20260905
- Fecha/hora medicion: 2026-09-05 12:35-12:37 -05 (brief regenerado 12:33)
- Estado medido: **40 worktrees** (38 en tabla + 2 protegidos fuera de tabla).
  `git fetch origin --prune` corrido al inicio (exit 0, sin refs nuevas).
  `origin/dev` en 90f12a947 (`feat(compai): zarigüeya en tinta ... (#3147)`).

Nota: existe pasada previa r1 de esta misma tarea (11:34-11:40, `_gate/wt-dryrun-final.txt`,
`_gate/wt-cleanup-stale.sh`, `_gate/INFORME-WT-CLEANUP-20260905.md`). El brief se regenero a las
12:33 sin que el script este instalado (verificado: `command -v wt-cleanup-stale.sh` vacio). Este r2
re-mide el estado ACTUAL y actualiza cifras; no borra ni pisa los archivos r1.

## 1. Limites de carril (lo que NO se ejecuto, y por que)

Regla dura del brief: opencode auto-rechaza rutas fuera del cwd. No se escribio ni ejecuto nada en:
`~/.local/bin/wt-cleanup-stale.sh`, `~/.local/state/fleet-backlog/worktree-cleanup.log`,
`/mnt/data/coldstore/`. Consecuencia identica a r1: **no hubo corrida real** (archivo a coldstore +
log en fleet-backlog son prerrequisito del borrado; ambas rutas fuera de alcance). Los 40 worktrees
siguen en pie. Seccion de registro del limite, no hueco de trabajo.

`fleet-enqueue.sh` SI esta instalado (`~/.local/bin/fleet-enqueue.sh`), pero su destino
(pending.txt de fleet-refill) vive fuera del cwd: la integracion del item 2 queda como accion del
orquestador, igual que el cron nocturno y el gancho post-merge (item 3).

## 2. Estado real y clasificacion (dry-run fresco, verbatim en `wt-dryrun-r2-20260905.txt`)

Criterios del brief (identicos a r1): huerfana = sin ref en `refs/remotes/origin` (o detached);
mergeada = HEAD ancestro de `origin/dev`; BORRAR = (huerfana O mergeada) Y `status --porcelain`
vacio; ARCHIVAR = mismo criterio pero sucio (se archiva, NO se borra, aviso); MANTENER = el resto.
Protegidos siempre: toplevel y ramas `main`/`master`/`dev`.

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
MANTENER	feat/sierra-absorbe-clima-20260904	si	no	no	1	0	94332ec9	/home/kortux/Workspace/chagra/.worktrees/sierra-absorbe-clima-20260904
ARCHIVAR	detached	no(detached)	si	no	1	1	973f0f9c	/home/kortux/Workspace/chagra/.worktrees/sierra-antes-3125-20260904
ARCHIVAR	fable/sierra-realismo-costero-20260905	no	si	no	9	0	f558557c	/home/kortux/Workspace/chagra/.worktrees/sierra-fable-20260905
ARCHIVAR	fix/sierra-nieve-y-pisos-20260904	si	si	no	1	1	054ca5d7	/home/kortux/Workspace/chagra/.worktrees/sierra-nieve-y-pisos-20260904
BORRAR	fix/today-utc-helada-20260905	no	no	no	0	0	dcb4e399	/home/kortux/Workspace/chagra/.worktrees/today-utc-helada-20260905
BORRAR	bigpickle/3134-rebase-20260904	no	no	no	0	1	68b3d4d2	/home/kortux/Workspace/chagra/.worktrees/wt-3134-bigpickle-20260904
ARCHIVAR	fable/zariguya-tinta-receta-jaguar-20260904	no	no	no	249	0	8515b263	/home/kortux/Workspace/chagra/.worktrees/zariguya-tinta-20260904
ARCHIVAR	glm/archivar-laminas-viva	no	no	no	1	1	82b6734a	/tmp/glm-094-archivar-laminas-viva-solo-tinta-glm-archivar-laminas-viva
BORRAR	glm/3124-vitest-r3-20260905	no	si	no	0	0	1e454471	/tmp/glm-3124-vitest-r3-20260905-glm-3124-vitest-r3-20260905
BORRAR	glm/rebasar-3-prs-limpios	no	si	no	0	1	04ef6b39	/tmp/glm-rebasar-3-prs-limpios-20260904-glm-rebasar-3-prs-limpios
BORRAR	glm/rescate-5-ramas-sierra-clima-r2-20260905	no	si	no	0	0	90f12a94	/tmp/glm-rescate-5-ramas-sierra-clima-r2-20260905-glm-rescate-5-ramas-sierra-clima-r2-20260905
ARCHIVAR	glm/rb-3111-jaguar	no	no	no	1	1	b551c305	/tmp/glm-wt-3111
BORRAR	glm/rb-3119-huerfano	no	si	no	0	1	04ef6b39	/tmp/glm-wt-3119
ARCHIVAR	glm/rb-3137-init-sh	no	no	no	1	1	0bdd6bd8	/tmp/glm-wt-3137
BORRAR	detached	no(detached)	si	no	0	1	04ef6b39	/tmp/glm-wt-dev-ctrl
MANTENER	fix/auditor-integraciones-falsos-positivos-20260904	si	no	no	12	1	d652bef9	/tmp/laminas-fuera-20260904
ARCHIVAR	chore/laminas-r2-archivado-real-20260904	no	no	no	2	1	ad77c468	/tmp/laminas-r2-20260904
ARCHIVAR	glm/rescate-r2/1-clima-atmosfera-arte	no	si	no	2	0	90f12a94	/tmp/rescate-r2-wt
ARCHIVAR	glm/cerrar-valle-hover-y-bugs-ui-local	no	no	no	1	1	e1bfd55f	/tmp/verificar-3134
ARCHIVAR	glm/jaguar-sin-mortal	no	no	no	2	1	0fb63356	/tmp/wt-3111
ARCHIVAR	detached	no(detached)	si	no	3	1	037ad774	/tmp/wt-3119
--- resumen dry-run: 33 candidatos (11 a borrar, 22 a archivar+avisar) | edad promedio 2 dias
```

Resumen:
- **BORRAR (limpios, listos para morir): 11**, peso total ~4,915 MB (4.8 GB; ~446 MB c/u, el grueso
  node_modules). Detalle en seccion 3.
- **ARCHIVAR (huerfanos/mergeados pero sucios; no se borran sin decision humana): 22**, peso total
  ~11,109 MB (11.1 GB).
- **MANTENER (rama viva en remoto o protegida): 5**: vida-repertorio, jaguar-64px,
  rescue-3124-laminas, laminas-fuera, sierra-absorbe-clima.
- Fuera de tabla por proteccion (2): toplevel `/home/kortux/Workspace/chagra` (rama
  `fix/audit-symlink-colgante-20260905`, sin remoto tras el prune, pero checkout principal: NO se
  toca) y `chagra-merge-dev` (rama local `dev` de integracion: guard por nombre de rama).

## 3. Delta r1 -> r2 (por que cambio el conteo 31 -> 33 candidatos)

- El conteo del brief (37 wt / 15 huerfanas / 3 mergeadas) y el de r1 (37 wt / 31 candidatos) estan
  superados: hoy hay **40 wt** y **33 candidatos**. La aceptacion (>=15 candidatos) se cumple con
  holgura.
- Nuevos worktrees desde r1 (3):
  - `/home/kortux/Workspace/chagra/.worktrees/sierra-absorbe-clima-20260904` -> MANTENER (rama ya
    existe en origin). No es candidato.
  - `/tmp/glm-rescate-5-ramas-sierra-clima-r2-20260905...` -> BORRAR. Rama sin remoto tras el
    prune, limpio, HEAD == tip de `origin/dev` (90f12a94): el trabajo de ese carril YA viajo a dev.
  - `/tmp/rescate-r2-wt` -> ARCHIVAR. Ahora con rama `glm/rescate-r2/1-clima-atmosfera-arte` (a las
    12:32 estaba detached; otro carril la adjunto en vivo: NO tocar de dia).
- Clasificaciones que cambiaron entre r1 y r2: las dos anteriores (eran nuevas) mas `sierra-fable`
  (dirty 8 -> 9) y `gate-portal-tinta` (dirty 9, se mantiene). Nada paso de BORRAR a MANTENER.

## 4. Pruebas de control (medir sin mentirse)

1. Sintaxis: `bash -n` OK. Script bash puro, sin workflow (el de r1, sin modificar: sigue siendo la
   version validada).
2. Control independiente: el clasificador read-only `wt-cleanup-analysis.sh` (ruta de calculo
   distinta, awk/TSV) contra el script de produccion da el MISMO set de BORRAR: 11 = 11, diff
   vacio. El script no se contradice con una segunda implementacion.
3. Dry-run no escribe nada (verificado por diseno del flag); el log canonico de estado actual se
   genero aparte con `--report-only` (33 lineas `|DECISION|`, `worktree-cleanup-r2-20260905.log`).
4. Path destructivo real: validado por r1 en sandbox descartable (2 limpios borrados, 1 sucio
   conservado, tar.gz + log por worktree, toplevel intacto). El script no cambio desde esa
   validacion; esta corrida no ejecuto modo real (rutas de archive fuera del cwd).

## 5. Suciedad de zariguya-tinta-20260904 (respuesta al brief)

Medido hoy, identico a r1: **249 cambios, todos untracked** (248 bajo `_gate/`, scratch de gate de
ese carril, + 1 `catalog/gbif-audit-report.json`). **Cero modificaciones a archivos trackeados**: la
rama `fable/zariguya-tinta-receta-jaguar-20260904` (HEAD 8515b263f) esta limpia en lo que es codigo.
La rama NO existe en origin (huerfana) pero su contenido viajo a `origin/dev` como squash del PR
#3147 (dev tip 90f12a947, subject explicito "zarigüeya en tinta con la receta exacta del jaguar").

Respuesta: **no es rescate urgente de codigo** (ya esta en dev y el commit queda alcanzable en el
repo compartido aunque se borre el worktree). Decision para el operador: (a) archivar el worktree
completo con el script (queda rescatable el scratch de `_gate/`, ~68 MB de jueces/capturas por si
quiere repasar alguno), (b) recien ahi removerlo, (c) opcional: borrar la rama local
`fable/zariguya-tinta-receta-jaguar-20260904` tras confirmar el diff contra dev. El script lo marca
ARCHIVAR (sucio), que es exactamente el tratamiento correcto: no se borrara solo.

## 6. Ojo antes de la corrida real (carriles vivos hoy, edad 0)

Cuatro de los 11 BORRAR son de HOY y pertenecen a carriles que estaban o estan vivos:
`gate-compai-tinta5-20260905`, `today-utc-helada-20260905`, `/tmp/glm-3124-vitest-r3-20260905` y
`/tmp/glm-rescate-5-ramas-sierra-clima-r2-20260905` (este con HEAD == dev tip). Limpios y sin remoto
porque el carril cerro sin pushear o su contenido ya fue a dev. El archive previo los hace
recuperables, pero **si la corrida real se hace de dia, conviene excluirlos o esperar a la corrida
nocturna** (el diseno del cron es 2 AM, cuando la flota esta idle). El script no tiene hoy una
ventana de edad: se comporta igual de dia que de noche.

## 7. Por que no se llega a ~20 en una corrida

La aceptacion 3 esperaba `git worktree list | wc -l` <= ~20. En el estado real solo mueren los
limpios: **primera corrida real esperada 40 -> 29** (se borran 11). Los otros 22 candidatos estan
SUCIOS y la regla dura prohibe borrarlos: se archivan y se avisan. Para bajar de 29 hay que
resolver los 22 sucios (archivados en coldstore como respaldo, listos para decision manual de
borrado). Coherente con lo que ya explico r1.

## 8. Para ejecutar la corrida real (carril canonico, fuera de opencode)

```bash
git -C /home/kortux/Workspace/chagra fetch origin --prune   # prerrequisito: deteccion de huerfanas fresca
install -m 0755 /home/kortux/Workspace/chagra/_gate/wt-cleanup-stale.sh ~/.local/bin/wt-cleanup-stale.sh
mkdir -p ~/.local/state/fleet-backlog
~/.local/bin/wt-cleanup-stale.sh --dry-run          # tabla de decisiones (33 candidatos hoy)
~/.local/bin/wt-cleanup-stale.sh                    # corrida real: archiva 33, borra los 11 limpios
git -C /home/kortux/Workspace/chagra worktree list | wc -l   # esperado 29
```

Log canonico en `~/.local/state/fleet-backlog/worktree-cleanup.log`, tar.gz en
`/mnt/data/coldstore/wt-archive/$(date +%Y%m%d)/`. Las 33 lineas de decision esperadas ya estan en
`_gate/worktree-cleanup-r2-20260905.log` para contrastar. Despues de la corrida, encolar el reporte
en fleet-refill via `fleet-enqueue.sh` (instalado) y, si se aprueba, el cron `0 2 * * *` + gancho
post-merge quedan como automatizacion (item 3 del brief, fuera del alcance de este carril).

## 9. Archivos entregados en cwd (bajo `_gate/`, scratch, sin commitear)

- `_gate/wt-cleanup-stale.sh`: script de produccion (de r1, sin cambios: version validada).
- `_gate/wt-dryrun-r2-20260905.txt`: tabla de decisiones verbatim de hoy (33 candidatos).
- `_gate/wt-analysis-r2.tsv`: clasificador independiente (control, set BORRAR identico).
- `_gate/worktree-cleanup-r2-20260905.log`: 33 lineas de decision canonicas de hoy.
- `_gate/INFORME-WT-CLEANUP-20260905-r2.md`: este informe (r1 intacto al lado).

Lo que NO pude verificar en este carril: el borrado real (depende de instalacion en `~/.local/bin`
y archive a coldstore, ambos fuera del cwd) y la bajada a 29 en `git worktree list`. Todo lo demas
queda medido y contrastado sobre el estado de 12:35: 40 wt -> 33 candidatos (11 limpios a borrar,
4.9 GB liberables de inmediato; 22 sucios a archivar+avisar, 11.1 GB de respaldo).
