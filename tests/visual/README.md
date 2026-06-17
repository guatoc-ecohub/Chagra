# Regresion visual

Suite pixel-a-pixel de Chagra con Playwright `toHaveScreenshot`. Los baselines
son provisionales mientras la UI sigue en integracion (#1653); cuando la UI se
estabilice se debe hacer un re-baseline revisado.

## Entorno determinista

Generar y comparar siempre dentro de la misma imagen oficial de Playwright:

```bash
docker run --rm -t \
  -v "$PWD:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -lc "npm ci && npx playwright test --project=visual"
```

Para re-generar baseline:

```bash
docker run --rm -t \
  -v "$PWD:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -lc "npm ci && npx playwright test --project=visual --update-snapshots"
```

No generar snapshots en hosts locales con fuentes distintas. Si no hay Docker,
usar el `workflow_dispatch` de `.github/workflows/visual-regression.yml`.

## Cobertura

`app-visual-regression.spec.js` captura las pantallas principales por perfil:

- Home, agente, perfil, mis zonas, insumos, informes.
- Seguimientos: reforestacion, silvopastoreo, paramo y cerdos.
- Sub-vista carbono dentro de reforestacion.
- Aprender, onboarding y glaciar para perfiles autorizados.

Perfiles cubiertos: campesino, urbano, institucional, operador, porcicultor y
guia glaciar.

Estados cubiertos:

- `empty`: IndexedDB sin datos de finca.
- `with-data`: assets, logs, inventario, procesos y reporte glaciar fijos.
- `offline`: datos fijos con `context.setOffline(true)` y evento `offline`.

Cada caso genera captura desktop `1280x800` y mobile `390x844`.

`component-gallery.spec.js` cubre componentes compartidos y variantes del avatar.

## Mocks y mascaras

La suite evita red real:

- OAuth, FarmOS JSON:API, APIs internas y clima devuelven fixtures fijas.
- Recursos externos se reemplazan por JSON vacio o un PNG transparente.
- El reloj se congela en `2026-06-17T10:30:00-05:00`.
- `prefers-reduced-motion` queda en `reduce`.
- Animaciones/transiciones se apagan por CSS y por `toHaveScreenshot`.
- Canvas y capas de constelacion/biopunk se ocultan para evitar flake.
- Timestamps, regiones marcadas `data-visual-dynamic` y respuesta del agente se
  enmascaran cuando aplican.
- Ruido esperado de SQLite-WASM, CSP, favicon, manifest y WebGL se ignora.

## Criterio de fallo

La tolerancia global es `maxDiffPixelRatio: 0.01`. Cualquier diferencia mayor
debe revisarse: si es intencional, re-baseline en Docker; si no, corregir UI.
