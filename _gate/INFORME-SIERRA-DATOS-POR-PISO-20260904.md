# INFORME — Sierra: datos reales por piso térmico (panel en VistaGlobalSierra)

Fecha: 2026-09-04 · Rama: `feat/sierra-datos-por-piso-20260904` · PR: [#3141](https://github.com/guatoc-ecohub/Chagra/pull/3141) (draft, base `dev`)

## Entregado

1. **Capa de datos reales** por piso termico, derivada (no escrita a mano):
   - `scripts/build-sierra-pisos-datos.mjs` — cruza el catálogo OSS (`thermal_zones`) con `public/grafo-relations.json` (`_piso_termico` + rango altitudinal por species). Flags `--dry` / `--write` (default escribe). Exporta `deriveSierraPisosDatos`, `sanearTextoUI`, rutas.
   - `src/data/sierra-pisos-datos.json` — GENERADO y commiteado (6 pisos mar→cima, `_total_catalogo: 581`).
   - `src/services/sierraPisosDatos.js` — selector puro; `TOTAL_ESPECIES_CATALOGO=581`, `PISOS_SIERRA_SIN_DATO`, `datoPisoPorId(id)` → ficha o `null`.
2. **Panel en la vista**: `PanelDatosPiso` en `src/visual/mundo3d/VistaGlobalSierra.jsx` (montado en `.vsierra-chrome`, `aria-live`, `data-testid`). Sin piso activo → `null`. Con dato → nombre, altitud (m) + temperatura (°C), `catalogo_total` + `grafo_rango`, formación, hasta 8 representativos + «y N más», nota con el total 581. Sin dato → «Sin datos para este piso: sin especies documentadas en el catálogo.» + formación.
3. **Tests** (verdes): 10 en `tests/unit/sierraPisosDatos.test.js` (incl. fresca exacta contra catálogo+grafo vivos) y 4 en `tests/unit/vistaSierraPanelDatos.test.jsx`.

## Números por piso (catalogo_total / grafo_rango / representativos)

| piso | catálogo | grafo rango | representativos |
|---|---|---|---|
| cálido | 277 | 56 | 18 |
| templado | 357 | 87 | 17 |
| frío | 297 | 80 | 39 |
| páramo | 62 | 28 | 6 |
| superpáramo | 0 | 0 | 0 (`con_dato:false`) |
| nival | 0 | 0 | 0 (`con_dato:false`) |

## Verificación GPU (requerida por el brief: capturas headed)

- Gate X: **VIVO** (`gate-x-estado.sh`). GPU real, navegador lanzado.
- La app real pide login (shell `App.jsx`); `#sierra_global` es pública en `ProdChagraApp` pero el entry dev monta el shell con auth → **harness standalone temporal** (`sierra-cap.html` + `sierra-cap-entry.jsx`, montando `VistaGlobalSierra` sola, sin auth) servido por vite dev; capturas validadas y el harness **eliminado** tras verificar.
- Por cada piso se extrajo evidencia DOM con WebGL 2.0 real y el texto exacto del panel (12 capturas: `shot3d --headed` + checks DOM). Cero errores de consola salvo favicon 404 del harness.
- Extras en `/tmp/opencode/sierra-cap/` (PNG por piso + DOM checks): evidencia cruda, no commitada.

## Veredicto 581 vs 743

- **581** cuenta el **catálogo OSS** (`chagra-catalog-oss-subset-v3.2.json`, todas las especies con `thermal_zones`). Es la fuente que pinta el panel.
- **743** (medición 2026-09-02) y **721** (`src/data/graph-stats-snapshot.json`, rancio 2026-07-01, usado por `public/chagra-stats.json`) cuentan el **grafo**, no el catálogo.
- El panel no mezcla unidades: pinta catálogo (581) y, por separado, el rango del grafo. Superpáramo/nival quedan honestamente «sin datos».

## Límites de este carril

- Informe externo a `Chagra-strategy/ops/SIERRA-DATOS-POR-PISO-20260904.md` y lectura del token Telegram → fuera de cwd / auto-rechazados. Queda registrado; este informe vive en `./_gate/`.
- Suite completa de base: 14 tests fallidos en 6 archivos de origin/dev (migración catálogo v3.1→v3.2, audit de huérfanos, compai/criaturas) + 18 suites vendored de promptfoo en `eval/` — **verificadas en worktree limpio de origin/dev** (mismas 14), ajenas a este diff. Mis suites pasan (14/14).
- No toca la escala de la Sierra (`CUMBRE.y`, `LINEA_NIEVE`, topes de `BANDAS`) ni el guard anti-fabricación de `cropSuggestions`.

## Estado

- Commit `4bcbd4fb7` (6 files, +899) solo con los archivos de la tarea.
- PR draft contra `dev`, labels `glm-generated` + `needs-review`. Sin merge (regla GLM).