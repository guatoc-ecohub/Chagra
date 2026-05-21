# AGENTS.md — Chagra (público, AGPL-3.0)

> Reglas para cualquier agente (humano o AI) que toque código de persistencia, sync, o UI que consuma estado de Assets/Logs.
>
> Las **3 reglas inviolables del modelo de datos** abajo son la fuente normativa para todo contributor externo. No requieren acceso a ningún repo privado.
>
> Existe un ADR técnico mantenido en un repositorio privado interno con la justificación extendida (alternativas evaluadas, plan de migración por fases). Su lectura es **opcional y reservada a mantenedores** con acceso a ese repo; no es requisito para contribuir desde el público.

## Modelo de datos: las 3 reglas inviolables

**1. IA jamás muta Asset directo.** Toda inferencia (visión, OCR, LLM textual, telemetría con interpretación) entra como `log--observation` con `metadata.ai = {source, model_version, confidence, needs_human_review, reasoning?}`. Mientras `needs_human_review: true`, los logs son sugerencias para la UI, no estado. La proyección de un Asset jamás se construye sobre logs con `needs_human_review: true`.

**2. Vistas derivadas NO se almacenan como campo de Asset.** Si el valor puede computarse leyendo logs, se computa en hooks/selectores y se cachea en memoria. NO se persiste en IndexedDB ni en `attributes` de FarmOS asset. Anti-patrones conocidos a refactorizar en una fase futura:

- `asset--plant.latestHarvest` ← debe ser derivada de `getLogsByAsset(plantId).filter(t='harvest')`.
- `asset--plant.status='harvested'` ← debe ser derivada de `exists(log--harvest where asset_id=plantId)`.
- `asset--material.inventory_value` ← debe ser derivada de `initial - sum(log--input.quantity)`.
- "Hoja de vida" de una planta ← UI que renderiza timeline de logs, jamás entidad almacenada.

**3. Surcos, camas, zonas son Assets `bundle:land` (con `land_type`), NUNCA padres estructurales.** Plantas, sensores, equipo referencian zona via `relationships.parent` o `relationships.location` — referencias navegacionales, no estructurales. Una planta puede existir sin zona. Eliminar zona NO elimina plantas. Cualquier diseño que implique dependencia existencial planta→zona o cascade delete está prohibido.

## Forma del modelo

Dos primitivas planas en raíz de IndexedDB y FarmOS:

- **Asset** — entidad estática, mutable a nivel campo. Bundles: `plant`, `land`, `structure`, `equipment`, `material`, `sensor`, `person`.
- **Log** — evento append-only, inmutable post-creación. Bundles: `seeding`, `harvest`, `input`, `maintenance`, `observation`, `activity`, `task` (futuro).

Sin documentos-Dios. Sin nesting estructural. Sin children embebidos. Las relaciones JSON:API son references por id.

## Mass-ops por estructura

Una operación masiva = UN Log con `relationships.asset = [id1, id2, ..., idN]`. No N logs idénticos. La hoja de vida de la planta-i se computa filtrando logs cuyo `relationships.asset` contenga `id_i`. Mass-ops es gratis estructuralmente; UI específica viene cuando hay caso de uso real, no antes.

## Identificadores

- Bundles existentes: **UUIDv4** (mantener; no migrar histórico).
- Bundles nuevos (`log--task`, futuros `log--*`, etc.): **ULID** para indexación lex-ordenada en IndexedDB. Util en `src/utils/id.js`.

## Sync conflicts

- **Logs**: append-only, idempotentes por id. Dedup en `bulkPut`. Sin conflicto formal.
- **Assets**: LWW a nivel campo, NO a nivel documento. Patrón actual (`_pending` flag + preservación post-pull en `assetCache.bulkPut`) es suficiente hasta que emerja edición multi-dispositivo concurrente real.
- **CRDTs Yjs/Automerge full**: NO se usan. YAGNI hoy.

## Antes de tocar código de persistencia o sync

Lectura obligatoria (público, basta para contribuir):

- Las 3 reglas inviolables del modelo de datos (arriba).
- `CONTRIBUTING.md` (este repo) — anti-leak rules 1-7, hooks lefthook, merge gates, CLA.
- `CLA.md` — firma requerida antes del primer PR.

Lectura **opcional para mantenedores** con acceso al repositorio privado de estrategia (`guatoc-ecohub/Chagra-strategy`):

- ADR técnico del modelo de datos Asset+Log — decisiones extendidas, plan de migración por fases.
- ADR del boundary OSS / extensión comercial — razonamiento de la asimetría de imports (ver `src/core/moduleRegistry.js`).
- ADR del schema del catálogo de especies — criterio de aceptación de fuentes y tier.
- `ops/INFRA_FACTS.md` — fuente de verdad sobre el setup técnico real (hosts, services, versions, ports) **para operadores con acceso al repo privado**. No es necesario para contribuir al PWA público.

Si no tenés acceso al repo privado y necesitás clarificación sobre alguna decisión histórica, abrí un Issue con la etiqueta `question-arch` y un mantenedor extraerá el contexto público relevante.

## Archivos clave del modelo

- `src/db/dbCore.js` — schema IndexedDB. Cambios aquí requieren actualización de `tests/offline.spec.js`.
- `src/db/assetCache.js` — atomic commits + bulk put con preservación de `_pending`.
- `src/db/logCache.js` — normalización de logs, query por asset.
- `src/db/mediaCache.js` — blobs separados de logs (attachments).
- `src/store/useAssetStore.js` — Zustand state, hidratación, addAsset/addLog/refillMaterial. **Aquí viven los anti-patrones a refactorizar en fases futuras.**
- `src/services/syncManager.js` — cola `pending_transactions` con backoff exponencial. **NO refactorar sin necesidad concreta.**
- `src/services/payloadService.js` — `savePayload(bundle, payload)` con resolución de inlines.

## Reglas inviolables de branching (anti-destructive)

Aplican a todo agente AI o humano que vaya a hacer commits. Incidente 2026-05-09: agentes branchearon desde main viejo y al rebase generaron deletes masivos de ADRs, queues y archivos de producción. Estas reglas son no-negociables.

### Regla 1 — Sincronizar antes de empezar (obligatorio)

Como **primer paso** de cualquier tarea, ejecutar:

```bash
cd /home/kortux/Workspace/Chagra
git fetch origin --prune
git checkout main
git pull origin main
git log --oneline -3 origin/main  # confirmar fecha reciente del HEAD
```

Si el `git log` no muestra commits del día actual o anteriores cercanos, abortar y consultar al operador antes de continuar.

### Regla 2 — Crear rama desde origin/main fresh

```bash
git checkout -b feat/<scope>-<descripcion> origin/main
```

NO crear la rama desde HEAD local arbitrario. NO reusar branches viejas. NO branchear desde otro feature branch sin entender por qué.

### Regla 3 — Verificar punto de partida limpio

Antes del primer commit:

```bash
git log --oneline origin/main..HEAD       # debe estar vacío
git diff --stat origin/main..HEAD          # debe estar vacío
```

Si NO está vacío, abortar y consultar.

### Regla 4 — Rebase preventivo si la tarea toma > 2 horas

Antes del primer commit, si hubo más de 2 horas desde el inicio:

```bash
git fetch origin
git rebase origin/main
```

Si hay conflicts en archivos que no tocó la tarea, abortar y consultar.

### Regla 5 — Prohibido eliminar archivos sin permiso explícito

Antes de cada commit:

```bash
git diff --diff-filter=D --name-only HEAD
```

Si ese comando lista archivos eliminados, **PARAR y CONSULTAR**. Eliminación de ADRs, queue items, deepresearch, .private/, INDEX.md, public/cycle-content/*.json, public/icon-*.png, scripts/auto-bump-version.mjs, jsconfig.json, vitest.config.js, tests/*, CHANGELOG.md, AGENTS.md, lefthook.yml, package-lock.json, public/manifest.json o public/sw.js sin justificación documentada en el queue item es **violación crítica**.

Solo se eliminan archivos del scope explícito de la tarea, declarados antes de empezar, y aprobados por el operador en el queue/prompt.

### Regla 6 — Output verificable obligatorio

Cuando se reporta tarea completada al operador, incluir verbatim:

- Output de `git log --oneline origin/main..HEAD`
- Output de `git diff --stat origin/main..HEAD`
- Output de `git diff --diff-filter=D --name-only origin/main..HEAD` (debe estar vacío salvo deletes pre-aprobados)
- URL del PR creado (si dice "PR creado" sin URL real, es alucinación)

Reportes "completed" sin estos outputs son inválidos. El operador debe rechazar y pedir verificación.

## Convención de commits

`feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`, `docs(...)`. Conventional Commits obligatorio (lefthook valida). Referenciá el ADR técnico aplicable cuando el commit toque modelo de datos.

## Boundary con extensión comercial

Este repo es público AGPL-3.0. Existe una capa comercial privada en un repositorio hermano (acceso restringido a mantenedores) que **NO** se importa estáticamente desde aquí. La integración entre ambos planos ocurre en runtime mediante `src/core/moduleRegistry.js` + `src/core/loadProModules.js`.

Para contributors del público:

- El bundle se construye con o sin la capa comercial; sin ella, la UI degrada elegantemente.
- Los hooks de `lefthook.yml` bloquean cualquier import estático que cruce el límite.
- No hace falta acceso al repo privado para contribuir a Chagra; el contrato de extensión está completamente expresado en `src/core/moduleRegistry.js`.

## Anti-leak

- Sin URLs internas, IPs RFC1918, tokens, secretos, hostnames operativos. Detalles en `CONTRIBUTING.md` reglas 1-7.
- Pre-commit `lefthook` corre escaneo + ESLint `--max-warnings=0` + bloqueo de imports estáticos a la extensión comercial + `strategic-content-scan`.
- Post-build `npm run audit:bundle` verifica `dist/` contra una lista universal de patterns prohibidos.

## Contenido estratégico

Reglas detalladas viven en archivo privado interno (`AGENTS.md` del repo de estrategia). Resumen aplicable aquí:

- **No** introducir descripciones de modelo de negocio, pricing, roadmap monetización, identidad personal del operador o trabajadores, ni nombres específicos de infraestructura interna.
- Cuando dudes si algo cae en el lado privado, **default privado y consulta** antes de commitear.

## Estilo de copy UI, sin em dashes

**NO usar em dashes (`—`, U+2014) en strings UI** (JSX text content, props como `title=`, `aria-label=`, toasts, mensajes al usuario). Razón: un usuario externo lo identificó como fingerprint repetitivo de Claude AI (feedback 2026-05-06). Reemplazar por:

- `,` cuando es continuación de oración
- `.` cuando es cierre + nueva idea
- `:` cuando introduce un concepto
- `(...)` cuando es nota lateral

**Excepciones aceptables**: `'—'` como placeholder de empty state ("no hay valor aún"), comments JSDoc/JS internos no visibles al usuario.

Auditoría: tras barrido inicial de PR #176 quedan <10 ocurrencias legítimas en JSX. Antes de mergear cualquier PR con texto UI nuevo, correr `grep -rn " — " src/**/*.jsx` y verificar que no se reintroduce el patrón.

## Merge gates obligatorios

- `CodeQL / Analyze` — SAST.
- `Playwright E2E / Offline-first E2E` — contrato offline-first (`tests/offline.spec.js`).

Cambios sobre `src/db/dbCore.js`, `src/services/syncManager.js`, `src/services/payloadService.js`, `public/sw.js` deben actualizar el E2E correspondiente si la superficie offline cambia.
