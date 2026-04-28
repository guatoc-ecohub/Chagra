# Chagra — Catálogo agroecológico público

**Licencia:** CC-BY-SA 4.0 (no bajo AGPL-3.0 del código). Ver `LICENSE.md` en este directorio.

**Source of truth canónico:** este directorio en el repo público `guatoc-ecohub/Chagra`. Decisión formalizada en **ADR-026** (Scope público/privado del catálogo) y **ADR-025** (Format reconciliation markdown ↔ JSON).

## Estructura

| Archivo | Rol |
|---------|-----|
| `schema-v3.1.json` | JSON Schema draft-07 con definición formal de `species`, `biopreparado`, `source` |
| `chagra-catalog-seed-v3.1.json` | Seed canónico — consumido por la PWA via `npm run build:catalog` → `public/catalog.sqlite` |
| `chagra-catalog-seed-v3.0.json` | Versión histórica preservada (referencia para `migrate-v30-to-v31.mjs`) |
| `biopreparados-seed.json` | Catálogo de biopreparados agroecológicos |
| `sources-seed.json` | Fuentes científicas referenciadas por `species[].source_ids` |
| `AMBIGUITIES_RESOLUTION.md` | Las 11 ambigüedades del schema v3 resueltas (ADR-013) |
| `LICENSE.md` | CC-BY-SA 4.0 con atribución requerida |

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

> Chagra (2026). Chagra species catalog v3.1. CC-BY-SA 4.0. https://github.com/guatoc-ecohub/Chagra

## Boundary OSS / Pro

Este catálogo (capas 1-2 de ADR-026) es **OSS público**. Los componentes Pro (gremios receta curados, planes nutrición optimizados, casos exitosos documentados, presets certificación) viven en repo privado `chagra-pro` cuando se construyan, NO aquí.

Test rápido para saber si un campo nuevo va aquí o a Pro: ver ADR-026 §regla nuclear y §sub-i 5 reglas operativas.
