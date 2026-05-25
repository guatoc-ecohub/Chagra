# Chagra — Catálogo agroecológico público

**Licencia:** CC BY-NC-SA 4.0 (catálogo) · AGPL-3.0 (código de la PWA). Ver `LICENSE.md` en este directorio. Migrado desde CC BY-SA 4.0 el 2026-05-14 (Vector C anti-robo, ADR-043). Atribución obligatoria: "Chagra catálogo, Guatoc, v3.1, 2026". Uso institucional sin ánimo de lucro contemplado como NO COMERCIAL bajo esta licencia.

**Source of truth canónico:** este directorio en el repo público `guatoc-ecohub/Chagra`. Decisión formalizada en **ADR-026** (Scope público/privado del catálogo) y **ADR-025** (Format reconciliation markdown ↔ JSON).

## Estructura

| Archivo | Rol |
|---------|-----|
| `schema-v3.1.json` | JSON Schema draft-07 con definición formal de `species`, `biopreparado`, `source` |
| `chagra-catalog-seed-v3.1.json` | **Subset OSS público (50 species)** — consumido por la PWA via `npm run build:catalog` → `public/catalog.sqlite`. Es un subset estricto del catálogo full curado. |
| `chagra-catalog-oss-subset-v3.1.json` | Snapshot histórico del primer subset OSS (cobertura multi-piso térmico, generado por `scripts/extract-oss-subset.mjs` el 2026-05-20). Preservado por trazabilidad. |
| `chagra-catalog-seed-v3.0.json` | Versión histórica preservada (referencia para `migrate-v30-to-v31.mjs`) |
| `biopreparados-seed.json` | Catálogo de biopreparados agroecológicos |
| `sources-seed.json` | Fuentes científicas referenciadas por `species[].source_ids` |
| `AMBIGUITIES_RESOLUTION.md` | Las 11 ambigüedades del schema v3 resueltas (ADR-013) |
| `LICENSE.md` | CC BY-NC-SA 4.0 con atribución requerida (migrado 2026-05-14) |

### Subset OSS vs catálogo full

Desde 2026-05-23 (cutover step 2, ADR-024) el `chagra-catalog-seed-v3.1.json` que vive aquí es un **subset curado de ~50 species** apto para divulgación pública bajo CC-BY-NC-SA 4.0. El catálogo **full** (~495 species, con curaduría editorial diferencial: variedades ICA detalladas, endemismos paramunos, cultivares específicos) vive en repo privado hermano y se aplica solo en modo Pro (`CHAGRA_TIER=PRO`, contractual).

Composición del subset OSS (50 species, criterio editorial-v2):

| Categoría editorial | Count |
|---------------------|------:|
| Cultivos comerciales colombianos | 12 |
| Árboles de sombra (companions café) | 8 |
| Medicinales tradicionales | 8 |
| Leguminosas / abonos verdes | 6 |
| Invasoras prioritarias (valor pedagógico de advertencia) | 6 |
| Hortalizas básicas | 5 |
| Species especiales (demos: quinoa, amaranto, chía, uchuva, mora) | 5 |

`biopreparados-seed.json` **queda íntegro en OSS** (36 biopreparados públicos — decisión 2026-05-23, valor pedagógico inmediato + sin curaduría editorial Pro diferencial).

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

> Chagra (2026). Chagra species catalog v3.1 (OSS subset 50 species). CC-BY-NC-SA 4.0. https://github.com/guatoc-ecohub/Chagra

## Boundary OSS / Pro

Este catálogo (capas 1-2 de ADR-026) es **OSS público**. Los componentes Pro (catálogo full ~495 species, gremios receta curados, planes nutrición optimizados, casos exitosos documentados, presets certificación) viven en repo privado hermano `chagra-pro`, NO aquí. Específicamente:

- Subset OSS (50 species) → este repo, `chagra-catalog-seed-v3.1.json`.
- Catálogo full (~495 species) → repo privado, `data/catalog/chagra-catalog-full-v3.1.json`. Diferencial editorial: variedades ICA detalladas, endemismos paramunos (Espeletia, Aragoa, Diplostephium), cultivares con curaduría profunda.
- `biopreparados-seed.json` → este repo (decisión 2026-05-23, queda OSS por valor pedagógico inmediato).

Test rápido para saber si un campo nuevo va aquí o a Pro: ver ADR-026 §regla nuclear y §sub-i 5 reglas operativas.
