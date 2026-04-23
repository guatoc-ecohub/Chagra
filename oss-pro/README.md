# oss-pro/ — boundary OSS/Pro

Este directorio documenta cómo el repo público (`guatoc-ecohub/Chagra`, AGPL-3.0) se separa del repo privado hermano (`guatoc-ecohub/chagra-pro`, comercial) para evitar el tipo de leak Anthropic (31-mar-2026).

- `PROHIBITED_IN_PUBLIC.md` — lista viva de patrones que el bundle público nunca debe contener. El script `scripts/audit-bundle.mjs` consulta este archivo.
- ADRs relacionados: ADR-002 (boundary), ADR-011 (moduleRegistry), ADR-015 (anti-leak) — viven en `guatoc-ecohub/Chagra-strategy/adrs/`.

## Mecanismos de enforcement

1. **Pre-commit hook** (`lefthook.yml` en raíz): scan de secretos sobre diff staged, grep de patterns prohibidos, lint.
2. **Auditor de bundle** (`scripts/audit-bundle.mjs`): corre tras `npm run build`, inspecciona `dist/` contra `oss-pro/PROHIBITED_IN_PUBLIC.md`. Falla build si hay hits.
3. **ESLint rule** (`eslint.config.js`): `no-restricted-imports` bloquea cualquier `import` desde `../chagra-pro`, `@guatoc/chagra-pro`, etc.
4. **PR review**: todo cambio al público pasa revisión manual del mantenedor.

## Dev local con Pro

```bash
# Sin Pro (OSS puro):
npm run dev

# Con Pro path-relative (requiere clone de chagra-pro al lado):
VITE_PRO_MODULES_PATH=../chagra-pro/modules npm run dev
```

El `moduleRegistry` (ver `src/core/moduleRegistry.js`) detecta la env var, carga módulos vía dynamic import, y la UI consulta capabilities para renderizar la variante enriquecida cuando está disponible.

## Flujo de un nuevo módulo Pro

1. Crear ADR en `Chagra-strategy/adrs/` describiendo el módulo y qué capability expone.
2. Escribir el módulo en `chagra-pro/modules/<nombre>/` conformando la interfaz `ChagraModule`.
3. Agregar el id del módulo a `KNOWN_PRO_MODULES` en `src/core/loadProModules.js`.
4. Añadir a `PROHIBITED_IN_PUBLIC.md` cualquier string literal único del módulo que no deba fugarse.
5. Si el módulo reemplaza/aumenta un componente público, actualizar el componente para consultar `registry.byCapability(...)` y renderizar la variante enriquecida cuando esté presente.
