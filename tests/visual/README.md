# Regresion visual

Suite pixel-a-pixel de Chagra con Playwright `toHaveScreenshot`. Los baselines
son provisionales mientras la UI sigue en integracion (#1653); cuando la UI se
estabilice se debe hacer un re-baseline revisado.

## Dos servidores: legacy (5173, flag OFF) y F2 (5174, flag ON)

Desde el QA de cierre del go-live F2 (2026-07-05), `playwright.config.js`
levanta DOS `webServer`:

- `:5173` — flag `VITE_FINCA_VIVA_HOME_PERFIL` OFF. Lo usan los proyectos
  `chromium`/`mobile-*` (offline.spec.js y el resto de la suite E2E legacy).
- `:5174` — flag ON (+ `VITE_USE_SIDECAR_AGRO_MCP=true`), la MISMA
  configuracion que deploy.yml/dev-deploy.yml sirven en prod/stg. El proyecto
  `visual` (este directorio) apunta su `baseURL` ahi: los baselines
  reflejan el home "Finca Viva" (FincaVivaHero + MundosDeMiFinca) y el
  `ScreenShellF2` que ve el usuario de verdad, no el shell legacy.

## Entorno determinista

Generar y comparar siempre dentro de la misma imagen oficial de Playwright
(la MISMA que usa `.github/workflows/visual-regression.yml`):

```bash
docker run --rm -t \
  -v "$PWD:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.60.0-jammy \
  bash -lc "npm ci && npx playwright test --project=visual"
```

Para re-generar baseline:

```bash
docker run --rm -t \
  -v "$PWD:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.60.0-jammy \
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

`finca-viva-temas.spec.js` — regresion del home F2 por los 5 temas
seleccionables (biopunk2/biopunk/nature/verde-vivo/minimalista): monta, escena
de autor correcta, header completo, sin errores ni overflow (evidencia en
`test-results/capturas-temas/`, no es toHaveScreenshot).

`click-through-completo.spec.js` (QA de cierre 2026-07-05) — crawl funcional
(NO regresion de pixeles) de toda la interfaz F2: los 4 portales del home, los
9 mundos, ayuda, perfil y el fallback "Vista no disponible". Asserta montaje
sin error JS ni overflow horizontal.

`agente-responde-desde-todas-partes.spec.js` (QA de cierre 2026-07-05) —
verifica que el chat del agente ABRE Y RESPONDE (con backend mockeado) desde
cada entrada: boton "A", tarjeta "Pregúntele a Chagra", pie de un mundo, el
deep-link de ayuda groundeada («Chagra enseña a usar Chagra», #2050), en
ambos modos de respuesta (claro/detallado) y con/sin grounding del sidecar.
El badge visual del "semáforo" de confianza (#2074) vive en una rama aparte
(`feat/semaforo-confianza-ui`) todavia sin mergear — este spec usa
`source-badge`/`confianza-badge` (ya mergeados) como evidencia visible de
grounding; la cobertura del campo `grounding` de punta a punta vive en
`tests/unit/coverage-jornada-48h.test.js`.

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
