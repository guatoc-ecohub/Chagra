# AGENTS.md — Chagra (público, AGPL-3.0)

> Reglas para cualquier agente (humano o AI) que toque código de persistencia, sync, o UI que consuma estado de Assets/Logs.
>
> Decisión completa en `Chagra-strategy/adrs/ADR-019-data-model-asset-log.md`. Lectura obligatoria antes del primer edit.

## Modelo de datos: las 3 reglas inviolables

**1. IA jamás muta Asset directo.** Toda inferencia (visión, OCR, LLM textual, telemetría con interpretación) entra como `log--observation` con `metadata.ai = {source, model_version, confidence, needs_human_review, reasoning?}`. Mientras `needs_human_review: true`, los logs son sugerencias para la UI, no estado. La proyección de un Asset jamás se construye sobre logs con `needs_human_review: true`.

**2. Vistas derivadas NO se almacenan como campo de Asset.** Si el valor puede computarse leyendo logs, se computa en hooks/selectores y se cachea en memoria. NO se persiste en IndexedDB ni en `attributes` de FarmOS asset. Anti-patrones conocidos a refactorizar (Fase 2 ADR-019):

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

Lectura obligatoria:

- `Chagra-strategy/adrs/ADR-019-data-model-asset-log.md` — modelo de datos completo + plan de migración por fases.
- `Chagra-strategy/adrs/ADR-002-oss-pro-boundary.md` — boundary OSS/Pro.
- `Chagra-strategy/adrs/ADR-013-schema-v3-ambiguities-resolved.md` — schema v3.1 del catálogo.
- `CONTRIBUTING.md` (este repo) — anti-leak rules 1-7, hooks lefthook, merge gates.

## Archivos clave del modelo

- `src/db/dbCore.js` — schema IndexedDB. Cambios aquí requieren actualización de `tests/offline.spec.js`.
- `src/db/assetCache.js` — atomic commits + bulk put con preservación de `_pending`.
- `src/db/logCache.js` — normalización de logs, query por asset.
- `src/db/mediaCache.js` — blobs separados de logs (attachments).
- `src/store/useAssetStore.js` — Zustand state, hidratación, addAsset/addLog/refillMaterial. **Aquí viven los anti-patrones a refactorizar en Fases 2 y 4.**
- `src/services/syncManager.js` — cola `pending_transactions` con backoff exponencial. **NO refactorar sin necesidad concreta.**
- `src/services/payloadService.js` — `savePayload(bundle, payload)` con resolución de inlines.

## Convención de commits

`feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`, `docs(...)`. Conventional Commits obligatorio (lefthook valida). Refs ADR-019 cuando el commit toque modelo de datos.

## Boundary OSS/Pro

Este repo es público AGPL-3.0. NO importar estáticamente de `chagra-pro`. Integración via `src/core/moduleRegistry.js` en runtime. Ver `ADR-002` y `oss-pro/PROHIBITED_IN_PUBLIC.md`.

## Anti-leak

- Sin URLs internas, IPs RFC1918, tokens, secretos, hostnames operativos. Ver `CONTRIBUTING.md` reglas 1-7.
- Pre-commit `lefthook` corre escaneo + ESLint `--max-warnings=0` + bloqueo de imports estáticos a `chagra-pro` + `strategic-content-scan`.
- Post-build `npm run audit:bundle` verifica `dist/` contra `oss-pro/PROHIBITED_IN_PUBLIC.md`.

## Contenido estratégico — boundary

Más allá de identificadores técnicos, **no introducir contenido descriptivo de**:

- **Modelo de negocio** (pricing, tiers, revenue, cap table, valuación, founding team).
- **Estrategia / roadmap futuro** que telegrafía Pro o monetización antes de release público.
- **Identidad personal** del operador o trabajadores (nombres reales hardcoded; usar env var `VITE_PRIMARY_WORKER_NAME` o equivalente, default genérico).
- **Infraestructura operativa propia** (nombres de hosts internos, agentes, código-gen pipelines internos).
- **ADRs estratégicos** por nombre o resumen: ADR-009/010/014/017/018 son privados. Las **referencias por número son OK**; añadir el título o un resumen entre paréntesis es leak.

ADRs OK-públicos (técnicos/legales): ADR-002, ADR-008, ADR-011, ADR-013, ADR-015, ADR-019.

Lista universal de patterns en `oss-pro/PROHIBITED_IN_PUBLIC.md`. Identificadores específicos (nombres internos de agentes, infra propia) viven en `chagra-pro/PROHIBITED_INTERNAL.md` y se cargan en lefthook si `CHAGRA_PRO_PATH` está set localmente.

Cuando dudes si algo es estratégico, default privado y consulta. El leak histórico de la industria (Anthropic 2026-03-31, sourcemap) cuesta menos como precaución que como remediation.

## Estilo de copy UI, sin em dashes

**NO usar em dashes (`—`, U+2014) en strings UI** (JSX text content, props como `title=`, `aria-label=`, toasts, mensajes al usuario). Razón: David Loka 2026-05-06 lo identificó como fingerprint repetitivo de Claude AI ("ese hpta tiene una fijación con eso"). Reemplazar por:

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
