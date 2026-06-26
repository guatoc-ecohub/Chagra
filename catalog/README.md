# Chagra — Catálogo agroecológico público

**Licencia:** CC BY-NC-SA 4.0 (catálogo) · AGPL-3.0 (código de la PWA). Ver `LICENSE.md` en este directorio. Migrado desde CC BY-SA 4.0 el 2026-05-14 (Vector C anti-robo, ADR-043). Atribución obligatoria: "Chagra catálogo, Guatoc, v3.1, 2026". Uso institucional sin ánimo de lucro contemplado como NO COMERCIAL bajo esta licencia.

**Source of truth canónico:** este directorio en el repo público `guatoc-ecohub/Chagra`. Decisión formalizada en **ADR-026** (Scope público/privado del catálogo) y **ADR-025** (Format reconciliation markdown ↔ JSON).

## Estructura

| Archivo | Rol |
|---------|-----|
| `schema-v3.1.json` | JSON Schema draft-07 con definición formal de `species`, `biopreparado`, `source` |
| `chagra-catalog-oss-subset-v3.2.json` | **Catálogo OSS canónico que SHIPEA (530 species, 36 biopreparados, 71 fuentes)** — el archivo que **realmente** consume la PWA via `npm run build:catalog` → `public/catalog.sqlite` (es el `DEFAULT_SEED` en `scripts/build-catalog-sqlite.mjs`). Es self-contained: ya no se deriva en vivo de otro seed. Ver `CATALOG_VERSIONS.md` para el estado de cada archivo. |
| `chagra-catalog-seed-v3.1.json` | Catálogo fuente (formato v3.1) del cual se extrae el subset OSS via `scripts/extract-oss-subset-v32.mjs`. El corpus full curado vive en el repo privado hermano; en este repo público se conserva la base referenciada por los scripts de validación/ETL. |
| `chagra-catalog-oss-subset-v3.1.json` | Snapshot histórico del primer subset OSS (50 species, cobertura multi-piso térmico, generado por `scripts/extract-oss-subset.mjs` el 2026-05-20). Deprecado tras el revert PR #1012; preservado por trazabilidad y como ruta de rollback. |
| `chagra-catalog-seed-v3.0.json` | Versión histórica preservada (referencia para `migrate-v30-to-v31.mjs`) |
| `biopreparados-seed.json` | Catálogo de biopreparados agroecológicos |
| `sources-seed.json` | Fuentes científicas referenciadas por `species[].source_ids` |
| `AMBIGUITIES_RESOLUTION.md` | Las 11 ambigüedades del schema v3 resueltas (ADR-013) |
| `LICENSE.md` | CC BY-NC-SA 4.0 con atribución requerida (migrado 2026-05-14) |

### Subset OSS vs catálogo full

Desde 2026-05-23 (cutover step 2, ADR-024) lo que se publica bajo CC-BY-NC-SA 4.0 es un **subset curado**. El catálogo **full** (con curaduría editorial diferencial: variedades ICA detalladas, endemismos paramunos, cultivares específicos) vive en repo privado hermano y se aplica solo en modo Pro (`CHAGRA_TIER=PRO`, contractual).

El subset que **realmente ships** y compila a `public/catalog.sqlite` es `chagra-catalog-oss-subset-v3.2.json`:

- **530 species** — curación inicial top-uso (205 species, criterio intelligence-first, ver `SUBSET_OSS_V3.2_RATIONALE.md`) + enriquecimiento de páramo Cruz Verde (58 species, 2026-06-10) + ampliación grounded grafo→catálogo (+267 species cultivables y nativas con asocio construidas desde `public/cycle-content` + el grafo AGE `chagra_kg` + `public/species-images.json`, 2026-06-25).
- **36 biopreparados** — `biopreparados-seed.json` queda íntegro en OSS (decisión 2026-05-23, valor pedagógico inmediato, sin curaduría editorial Pro diferencial).
- **71 fuentes** científicas referenciadas (68 + 3 añadidas con metadata del grafo: `agrosavia-forrajeras-2022`, `agrosavia-estrella`, `correa-pabon-carulla-2008`).

El primer subset OSS (`chagra-catalog-oss-subset-v3.1.json`, 50 species, criterio editorial-v2) cortaba species críticas (aguacate, tomate, lechuga, acelga) y fue revertido en PR #1012; se conserva solo como snapshot histórico / rollback.

Para reconstruir el subset desde el full Pro (idempotente):

```bash
node scripts/build-oss-subset.mjs <ruta-al-full> catalog/chagra-catalog-seed-v3.1.json
```

El script poda automáticamente `companions[]` / `antagonists[]` / `recommended_covers[]` / `recommended_fences[]` / `especies_nativas_sustitutas[]` para que solo apunten a IDs presentes en el subset, manteniendo AMB-10 (simetría) y AMB-13 (cross-refs) verdes.

## Pipeline ADR-025 (markdown frontmatter → JSON)

Las fichas narrativas viven en `docs/species/[NN]-[id].md`. Cuando una ficha tiene frontmatter YAML completo cubriendo el schema v3.1, el script `scripts/md-fichas-to-catalog-json.mjs` la migra al seed JSON. Fichas legacy sin frontmatter se conservan saltadas (warning, no error).

```bash
# Regenerar JSON desde fichas markdown
node scripts/md-fichas-to-catalog-json.mjs

# Validar coherencia (CI mode — no escribe)
node scripts/md-fichas-to-catalog-json.mjs --check

# Validar JSON contra schema + reglas semánticas (AMB-05/10/11/13/14/15)
node scripts/validate-catalog.mjs

# Build SQLite WASM consumible por la PWA
npm run build:catalog
```

## Convención de IDs

`species[].id` sigue patrón `género_especie` snake_case estable. Ej: `persea_americana`, `coffea_arabica`, `inga_edulis`.

`source_ids` sigue patrón `<institucion>-<año>-<slug>`. Ej: `agrosavia-2020-aguacate`, `humboldt-2020-frailejones`, `restrepo-1996-abc-agricultura-organica`.

## Validación humana (ADR-016)

Cada `species[]` lleva campo `validation_level`:
- `claude_draft` — generada por LLM, sin revisar
- `operator_reviewed` — el operador la verificó
- `agronomist_validated` — un agrónomo con registro profesional la firmó (campo `validated_by[]`)
- `community_attested` — saber tradicional documentado y atestiguado por custodios

Las contribuciones externas vía PR DEBEN venir con `validation_level: claude_draft` o superior + `source_ids[]` poblado.

## Atribución requerida

Al usar, modificar o redistribuir este catálogo, cite:

> Chagra (2026). Chagra species catalog v3.2 (OSS subset, 530 species). CC-BY-NC-SA 4.0. https://github.com/guatoc-ecohub/Chagra

## Boundary OSS / Pro

Este catálogo (capas 1-2 de ADR-026) es **OSS público**. Los componentes Pro (catálogo full ~495 species, gremios receta curados, planes nutrición optimizados, casos exitosos documentados, presets certificación) viven en repo privado hermano `chagra-pro`, NO aquí. Específicamente:

- Subset OSS (530 species) → este repo, `chagra-catalog-oss-subset-v3.2.json` (compila a `public/catalog.sqlite`).
- Catálogo full (~495 species) → repo privado, `data/catalog/chagra-catalog-full-v3.1.json`. Diferencial editorial: variedades ICA detalladas, endemismos paramunos (Espeletia, Aragoa, Diplostephium), cultivares con curaduría profunda.
- `biopreparados-seed.json` → este repo (decisión 2026-05-23, queda OSS por valor pedagógico inmediato).

Test rápido para saber si un campo nuevo va aquí o a Pro: ver ADR-026 §regla nuclear y §sub-i 5 reglas operativas.
