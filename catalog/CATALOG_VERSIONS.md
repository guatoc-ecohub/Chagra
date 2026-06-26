# Estado de los archivos de catálogo (versionado)

> Última actualización: **2026-06-25** (ampliación grounded grafo→catálogo).
> Este documento aclara cuál archivo es la **verdad** y qué es cada uno de los
> demás, para que ningún script ni contributor tome el seed equivocado. No se
> borró ningún archivo: los stale se documentan aquí y se conservan por
> trazabilidad / referencia de scripts.

## La verdad (lo que SHIPEA)

| Archivo | species | Estado | Quién lo consume |
|---|---:|---|---|
| **`chagra-catalog-oss-subset-v3.2.json`** | **530** | ✅ **CANÓNICO / SHIPEA** | `DEFAULT_SEED` de `scripts/build-catalog-sqlite.mjs` → `public/catalog.sqlite` → PWA (directorio + agente). Es **self-contained**: incluye `species[]`, `sources[]` (71) y `biopreparados[]` (36) inline. |

`chagra-catalog-oss-subset-v3.2.json` es la única fuente de verdad para lo que
ve el usuario. Pasa `node scripts/validate-catalog.mjs --lenient-schema
catalog/chagra-catalog-oss-subset-v3.2.json` (rc=0): todos los validadores
semánticos (AMB-05/10/13/14/16/17/18/28/29) en verde. Los warnings restantes de
schema estricto son el patrón legacy de `sources[]` (`_url_pendiente` /
`_isbn_pendiente`) y `estrato` ausente en frutales perennes (varía vid/arbusto/
árbol — se deja honesto, no se inventa).

### Historia de conteo de v3.2
- 105 (curación inicial intelligence-first, `extract-oss-subset-v32.mjs`)
- → 263 (+58 páramo Cruz Verde, 2026-06-10, `_paramo_enrichment`)
- → **530** (+267 ampliación grounded grafo→catálogo, 2026-06-25): especies
  cultivables y nativas con asocio construidas desde `public/cycle-content/<id>.json`
  (prosa + requirements + source_ids grounded) + el grafo AGE `chagra_kg`
  (companions/antagonists vía `COMPATIBLE_WITH`/`ANTAGONIST_OF`) + foto en
  `public/species-images.json`. Backfill simétrico de asociaciones a las
  entradas existentes (AMB-10). +3 sources con metadata del grafo.

## Archivos STALE / legacy (NO son la verdad — conservados)

| Archivo | species | Qué es | ¿Por qué no se borra? |
|---|---:|---|---|
| `chagra-catalog-seed-v3.1.json` | 72 | **Stale.** Base histórica formato v3.1 referenciada por scripts de validación/ETL y por el **default hardcodeado** de `scripts/validate-catalog.mjs` (línea ~50) + el gate `lefthook`/`.github/workflows/catalog-validate.yml` (corren el validador sin argumento → validan ESTE archivo, no el que shipea). El corpus full curado vive en el repo privado hermano `chagra-pro`. | Moverlo rompería el default del validador, `lefthook`, CI y ~12 scripts (`catalog-to-age.mjs`, `extract-oss-subset-v32.mjs`, etc.). |
| `chagra-catalog-graph-export.json` | 200 | **Stale.** Export viejo del grafo→catálogo (`export-graph-to-catalog.mjs`), anterior a v3.2. | Referencia para `validate-catalog-export.mjs` / `catalog-graph-export.test.mjs`. |
| `chagra-catalog-oss-subset-v3.1.json` | 50 | Snapshot histórico del primer subset OSS (editorial-v2, 2026-05-20). Deprecado tras revert PR #1012 (cortaba aguacate/tomate/lechuga/acelga). | Ruta de rollback / trazabilidad. |
| `chagra-catalog-seed-v3.0.json` | 0 | **Roto** (`species[]` vacío). Solo referencia de estructura para `migrate-v30-to-v31.mjs`. | Lo usa el migrador como esqueleto histórico. |

## Nota sobre el gate de CI

`catalog-validate.yml` y `lefthook` corren `validate-catalog.mjs --lenient-schema`
**sin argumento**, por lo que validan el default `chagra-catalog-seed-v3.1.json`
(72 species stale), **no** el catálogo que shipea (v3.2, 530). El archivo que
shipea se valida en el pipeline de build (`prebuild` → `build-catalog-sqlite.mjs`,
que falla si el conteo no cuadra) y en `tests/unit/catalog-count.test.js` (gate
de CI `unit-tests.yml`, que asierta `species.length === 530`). Apuntar el gate del
validador a v3.2 es una mejora pendiente fuera del alcance de este cambio (evita
tocar la config de CI en el mismo PR de datos).
