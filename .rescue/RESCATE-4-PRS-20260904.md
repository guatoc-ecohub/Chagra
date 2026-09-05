# RESCATE-4-PRS-20260904 — informe de entrega

Fecha: 2026-09-04. Límite registrado: el informe fue pedido originalmente en
`/home/kortux/Workspace/Chagra-strategy/ops/RESCATE-4-PRS-20260904.md`, ruta
auto-rechazada por el cwd del carril (opencode: `external_directory;
auto-rejecting`). Se entrega commiteado aquí, dentro del cwd, como
`.rescue/RESCATE-4-PRS-20260904.md`.

Base de todo el trabajo: `origin/dev` actual (736eca52e,
`feat(compai): la explicación de la pantalla sale SIEMPRE en la pizarra (#3115)`).
`origin/dev` fue reescrito hoy (perdió 1.142 commits y se restauró por
force-push); encima entraron a dev varios PRs de la jornada (#3134, #3101,
#3137, #3111, #3139, #3115, #3140, #3141).

## Resultado por PR

### 1. #3119 — chore/095-control-componente-huerfano — RESUELTO

- Rebasado contra `origin/dev` post-rewrite y empujado con `--force-with-lease`.
- Conflicto en `ops/componentes-huerfanos-allowlist.json` resuelto por UNIÓN,
  verificada entrada por entrada contra origin/dev (regla dura: un JSON que
  parsea puede estar mal resuelto).
- El PR quedó **cerrado sin merge por `guatoc-ecohub`** (automatización), no por
  conflicto. El control positivo 095 queda rojo en la base para todos
  (`componentes-huerfanos`).
- Checks: clérigos del gate del allowlist en verde; el 095 es rojo de base.

### 2. #3115 — glm/compai-explica-en-pizarra — RESUELTO

- Rebasado y empujado: `37af217a7...3216a4fed` (forced update) en
  `glm/compai-explica-en-pizarra`.
- Regla dura del operador conservada: la pizarra es el ÚNICO aviso del compai
  (BurbujaPizarraPeek, tiza nunca madera, otros globos eliminados).
- Conflictos resueltos conservando ambas intenciones con el trabajo de compai
  que ya entró a dev (#3129, perfiles de conducta): NOTA de GuiaEspecieCards de
  dev conservada + piezas de la pizarra cableadas fuera de hallazgos. Entrada
  obsoleta de `compaiExplicaPantallas` retirada de
  `ops/integraciones-no-consumidas.json`.
- tsc mejorado de base: 3 fixes de JSDoc en `3216a4fed` (755 < baseline 756).
- Comentario publicado: `#3115#issuecomment-5548741767`.
- Checks: vitest de los archivos tocados 116/116; los 13 rojos restantes de la
  suite son de base (ver sección común).

### 3. #3124 — chore/laminas-fuera-solo-tintas-20260904 — RESUELTO

Rama re-rebasada en DOS pasadas porque dev avanzó en el medio (la 1ra pasada
quedó sobre un dev que ya no era el actual). Estado final: 7 commits sobre
`origin/dev` actual, push final `c98f9cbe1...f00fd5946` (forced update).

- 2da pasada: 0 conflictos.
- 1ra pasada: 1 conflicto en `scripts/__tests__/audit-componente-huerfano.test.mjs`,
  resuelto por unión: imports unificados; se descartó el test
  «ChivitoPunkLaminaViva sigue siendo HUERFANO (#3108)» (el archivo ya no vive
  en `src/visual/creatures/`, pasa a `_archivo/`); se conservaron el test de
  GuiaEspecieCards DECLARADA y el bloque TANDA 1 de dev.
- 2 commits propios añadidos al PR:
  - `6f10b108e` fix(gate): repuntar a `_archivo/` las 4 entradas de láminas en
    `ops/integraciones-no-consumidas.json` + `IDS_REGRESION_090C`
    (el rojo de audit-integraciones era pre-existente en la rama del autor:
    las rutas declaradas apuntaban a archivos que la propia rama archivaba).
  - `c98f9cbe1` test(creatures): sanear `capas.test.jsx` del render de la lámina
    archivada y excluir `src/visual/creatures/_archivo/**` de vitest. Razón:
    las láminas archivadas viven como SYMLINKS al disco frío
    (`/mnt/data/coldstore/chagra-laminas-fuera-20260904/`, fuera del repo) y
    Vite no sirve módulos fuera de la raíz (`fs.allow`). El PR original corría
    esas suites porque en su rama el árbol aún estaba dentro del repo.
- Verificación de que NO se borra nada en uso:
  - `git diff --diff-filter=D origin/dev..HEAD` = solo las 6 láminas-viva +
    `__tests__/JaguarLaminaViva.test.jsx`.
  - Angelita intacta (base del contrato compai).
  - Sin `rm`: movimiento a `_archivo/` (symlink al disco frío).
  - Únicos importadores «vivos» de láminas fuera de `_archivo` son comentarios.
- Checks:
  - tsc: PASS local en ambas pasadas (755 < baseline 756), sin errores en los
    archivos tocados por el PR.
  - vitest dirigido sobre todos los archivos del PR: 97/97 verde.
  - Suite completa (local, contra dev actual): 16 fallos + 1 error evitable;
    **2 de ellos son flakes por carga** y pasan aislados 26/26
    (`audit-integraciones:369`, `compaiUnaPresencia2d:111` y el error
    `App.compost-route` / usePendingSyncCount). El resto son los rojos de base
    (migrate-v31-to-v32 7, Guacamaya 3, Angelita 1, Luciernaga.render 1,
    LuciernagaCompaiEscena 1, huerfano «seis casos» 1).
  - `mergeStateStatus: UNSTABLE` = MERGEABLE pero con checks base en rojo
    (audit-integraciones y CLAAssistant son rojos de base para todos los PRs,
    confirmado en el brief; E2E completa es informativo).
- Comentario publicado en el PR #3124 resoluciones y estadística:
  `#3124#issuecomment-5549046301`.

### 4. #2859 — feat/idea-23-crm-agroecologico — NO SE PUEDE REBASAR (detalle)

La rama `feat/idea-23-crm-agroecologico` es un **fork del dev pre-rewrite**, no
un feature branch:

- **1022 commits adelante / 1029 atrás** de `origin/dev` (rev-list left-right).
- Árbol divergente: 3.367 archivos solo de la rama.
- `git merge-tree --write-tree origin/dev HEAD` = **143 conflictos** repartidos
  por TODO el codebase (avatars, compai, clima, catalog seed, integraciones,
  tts, tests, mundo3d, mockups), la mayoría `agregar/agregar` de implementaciones
  paralelas que ya existen en dev.
- Rebasar 1022 commits re-jugaría ~1000 commits ya mergeados a dev (dup), una
  maratón de conflictos de días. No es «un conflicto», es un árbol duplicado.

**El delta REAL del PR es chico y recuperable.** Dos commits:
- `77bc90ea3` feat(crm): CRM agroecológico mínimo con contactos e interacciones
- `44d76cd88` feat(crm): completar modelo, pruebas e integración

= 16 archivos del feature (`src/components/crm/*`, `src/services/crmService.js`,
`src/types/crm.js`, `src/constants/crmConstants.js`, `src/hooks/useInteraccionUsuario.js`,
`src/components/red/contactoPublico.js`, `src/mockups/CrmAgroecologico.jsx` +
tests) + wiring en `src/App.jsx` (mockup route `mockups/crm-agroecologico`,
ErrorFallback).

**Verificación empírica (cherry-pick seco, worktree scratch sobre origin/dev):**
ambos commits aplican sobre el `origin/dev` actual **con 0 conflictos**
(`Auto-fusionando src/App.jsx`; 0 archivos `U`).

**Recomendación verificada:** NO rebasar; reconstruir el PR limpiamente con
esos 2 commits sobre una rama nueva de `origin/dev` (16 archivos + App.jsx).
Queda documentado; esa rama nueva NO se creó (decisión del operador, y el
encargo ordenaba parar y reportar el choque).

No se tocó la rama original (worktree de inspección `rescue-2859-crm`, detached
en 44d76cd88, sin commits propios).

## Rojos de base comunes (no perseguidos, reproducidos en árbol limpio)

- 13 tests en 5 archivos: `migrate-v31-to-v32` (7), `GuacamayaCompaiCompai` (3),
  `AngelitaGuia` (1), `Luciernaga.render` (1), `LuciernagaCompaiEscena` (1).
- `audit-componente-huerfano` «los seis casos aparecen en el reporte» (1).
- CI: `audit-integraciones` y `CLAAssistant` rojo de base para todos los PRs
  (confirmado en brief; otro carril atiende el de integraciones).
- Referencia: suite completa de la jornada (carril hermano sobre la misma base):
  14 fallos / 13.987 tests exactamente esos rojos.

## Estado de CI al cierre

- #3115 y #3124: checks re-disparados por el force-push (QUEUED/IN_PROGRESS).
   Bola en cancha de CI; los verdes locales son los reportados acá.
- #2859: pendiente decisión del operador (rama limpia de 2 commits).

## Worktrees creados por este carril

- `.worktrees/rescue-2859-crm` (detached 44d76cd88, inspección de #2859)
- `.worktrees/rescue-3124-laminas` (rama chore/laminas-fuera-solo-tintas-20260904)
- `.worktrees/informe-rescate` (este doc)
- Se retiraron `precheck-3115-base`, `precheck-dev-clean`, `rescue-3115-pizarra`,
  `rescue-3119-huerfano` y `scratch-crm-dry` (rama `tmp/dry-crm-check` queda
  local sin worktree, ref temporal del dry-run).