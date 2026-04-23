# Chagra — Catálogo agroecológico público

Este catálogo se distribuye bajo **CC-BY-SA 4.0** (no bajo AGPL-3.0 del código). Ver `LICENSE.md` de este directorio.

**Fuentes originales** (source-of-truth): las 4 entradas JSON de este directorio se mantienen sincronizadas con el repo privado `guatoc-ecohub/Chagra-strategy` donde se hace la curaduría. Los cambios validados fluyen desde allí hacia aquí con atribución.

**Schema**: `schema-v3.1.json` (JSON Schema draft-07). Validador en `guatoc-ecohub/Chagra-strategy/scripts/validate-catalog.mjs`.

**Build**: `npm run build:catalog` produce `public/catalog.sqlite` consumido por el runtime.

**Atribución**: al usar, modificar o redistribuir este catálogo, cite:
> Chagra Strategy (2026). Chagra species catalog v3.1. CC-BY-SA 4.0.
> https://github.com/guatoc-ecohub/Chagra
