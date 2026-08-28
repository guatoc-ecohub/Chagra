# Plan de merge a `dev` — 2026-08-25

**Ejecutor:** Claude (Sonnet) — LANE Claude, cierre de integración
**Modo:** SOLO LECTURA. Ningún merge fue ejecutado. Este documento es un plan para que el operador (o un agente autorizado) ejecute.
**Grounding:** parte del triage de PR #3006 (`ops/prs-dev-conflict-diagnostic.md`, rama `glm/prs-conflicting-dev-plan`, aún no mergeada a `dev`) y lo re-verifica hoy con `gh pr list --base dev` + `git merge-tree` contra `origin/dev` real (`536ffa2c`).

## Alcance excluido (otros agentes lo manejan)

- Robo-PRs: **#2989, #2991, #2999, #3002, #3003**
- PRs `*-cla-clean` (re-autorados por bug de CLA): **#3007, #3009, #3010, #3011, #3012, #3013** — hay un flujo paralelo de re-autorado de CLA en curso; no se tocan aquí para no chocar con ese carril.
- **#3001** — decisión pendiente (además, hoy aparece `CONFLICTING` contra `dev`, así que tampoco calificaría).

## Discrepancia con PR #3006

El diagnóstico de #3006 (fecha 2026-08-23) reporta "23 MERGEABLE", pero sus propias listas internas no cuadran aritméticamente con ese número (p. ej. "Tests Fixes (9 PRs)" enumera 14-15 números según la sección) y varios PRs que cita (#2984-#2987, #2990, #2995-#2996, #2974-#2975, #3004) ya no existen como abiertos contra `dev` o cambiaron de estado. Además, los 5 PRs de "lámina-viva" que #3006 marcaba como quick-win **ya estaban CONFLICTING** en su propio diagnóstico (Grupo B) — no forman parte del lote de 23 y siguen CONFLICTING hoy (#2935, #2937, #2938, #2940, #2943), fuera de este plan.

En vez de forzar el conteo original, se regeneró la lista desde cero con `gh pr list --base dev --state open` (85 PRs abiertos hoy) filtrando `mergeable == MERGEABLE`, restando las exclusiones de alcance. Resultado: **45 PRs candidatos**, todos re-verificados hoy con `git merge-tree --write-tree --merge-base <merge-base> origin/dev origin/<rama>` → **los 45 mergean LIMPIO hoy** (ninguno tiene marcador de conflicto). Todos siguen `OPEN` (verificado justo antes de escribir este documento).

## Hallazgo operativo — cluster de PRs que se pisan entre sí

**#2906, #2907 y #2909 tocan exactamente los mismos 3 archivos** (`.github/workflows/unit-tests.yml`, `scripts/detect-changed-tests.mjs`, `tests/unit/detect-changed-tests.control.test.js`). Son iteraciones sucesivas del mismo arreglo del gate de CI de vitest. Cada uno mergea limpio CONTRA `dev` hoy porque ninguno de los tres está mergeado todavía — pero si se mergea el primero, casi con certeza los otros dos quedan en conflicto. **No mergear los tres: elegir UNO** (recomendado: revisar cuál es el más completo — #2909 "fail loudly" parece la iteración final; #2910/#2911 son informes de revisión sobre #2909 específicamente). #2934 y #2945 comparten `scripts/__tests__/bench-audit-dura.test.mjs` — riesgo menor de choque, re-verificar tras el primero.

**Nota general de orden:** `git merge-tree` aquí solo prueba cada rama contra el `dev` de HOY. Cada merge real mueve `dev`; antes de cada merge subsiguiente del batch hay que re-correr `git merge-tree` (o simplemente `gh pr merge` y leer el resultado) — no asumir que el batch completo mergea en cualquier orden sin re-chequeo.

**Nota menor (no bloqueante):** varios PRs de la categoría A escriben en `Chagra-strategy/ops/*.md` — un directorio homónimo ya existente dentro del repo público `chagra` (desde PR #1341, 2026-06). No es el repo privado `Chagra-strategy` real; es contenido técnico de auditoría (dead-code, onboarding), no estratégico/político. Se documenta por precaución, no requiere acción.

---

## Categoría A — MERGEAR YA (riesgo casi nulo), ordenada por valor

Solo-docs o scripts/tests puramente aditivos, sin tocar lógica de runtime existente, sin overlap detectado entre sí.

| # | Rama | Qué integra | Draft | Mergea limpio | Comando |
|---|------|-------------|-------|----------------|---------|
| #3006 | `glm/prs-conflicting-dev-plan` | Diagnóstico fuente de este plan (8 CONFLICTING + 23 MERGEABLE, ranking valor/esfuerzo) | sí | sí | `gh pr ready 3006 && gh pr merge 3006 --squash` |
| #2917 | `glm/veredicto-mergeabilidad-real` | Script + test reutilizable de "veredicto de mergeabilidad real" (herramienta, aditivo) | sí | sí | `gh pr ready 2917 && gh pr merge 2917 --squash` |
| #2873 | `glm/verificar-fichas-bestiario-vs-grafo` | Script + test que audita fichas del bestiario contra el grafo AGE (SSOT especies) | sí | sí | `gh pr ready 2873 && gh pr merge 2873 --squash` |
| #2997 | `glm/prs-unknown-porque-no-mergean` | Scripts para detectar/arreglar PRs con `mergeable=UNKNOWN` (herramienta de triage) | sí | sí | `gh pr ready 2997 && gh pr merge 2997 --squash` |
| #3035 | `glm/voseo-audit-20260825` | Auditoría de voseo argentino en la PWA (hoy) — relevante: hard rule de la sesión sobre tono usted/tú | sí | sí | `gh pr ready 3035 && gh pr merge 3035 --squash` |
| #2876 | `glm/inventario-74-ramas-fable` | Inventario/clasificación de 74 ramas Fable | sí | sí | `gh pr ready 2876 && gh pr merge 2876 --squash` |
| #2926 | `glm/prs-dev-triage` | Informe triage 35 PRs abiertos contra dev (mergear junto con #2927 que lo corrige) | sí | sí | `gh pr ready 2926 && gh pr merge 2926 --squash` |
| #2927 | `glm/prs-dev-fantasma-refutado` | Corrige/refuta el informe #2926 con evidencia gh verbatim | sí | sí | `gh pr ready 2927 && gh pr merge 2927 --squash` |
| #2900 | `glm/2899-triage-68-fallos-dev` | Informe triage 68 fallos vitest en dev | sí | sí | `gh pr ready 2900 && gh pr merge 2900 --squash` |
| #2908 | `glm/censo-39-rojos-dev` | Censo de 39 tests fallidos en dev limpio | sí | sí | `gh pr ready 2908 && gh pr merge 2908 --squash` |
| #2918 | `glm/bundle-audit-baseline` | Informe bundle-audit-baseline | sí | sí | `gh pr ready 2918 && gh pr merge 2918 --squash` |
| #2919 | `glm/budget-exclusiones-honestas` | Informe verificación budget exclusiones | sí | sí | `gh pr ready 2919 && gh pr merge 2919 --squash` |
| #2921 | `glm/censo-rutas-mockups-3d` | Censo de 105 rutas mockups 3D/2D | sí | sí | `gh pr ready 2921 && gh pr merge 2921 --squash` |
| #2910 | `glm/review-2909-ci-vitest` | Informe revisión adversaria de #2909 (contexto — ver cluster arriba) | sí | sí | `gh pr ready 2910 && gh pr merge 2910 --squash` |
| #2911 | `glm/ci-2909-actions-real` | Informe verificación CI real de #2909 (contexto — ver cluster arriba) | sí | sí | `gh pr ready 2911 && gh pr merge 2911 --squash` |
| #2920 | `glm/valle-harness-dentro-de-la-pwa` | Nota "ESCALATE — context missing" (stub sin resolución) | sí | sí | Valorar **cerrar** en vez de mergear — es un stub muerto, no aporta. Si se mergea: `gh pr ready 2920 && gh pr merge 2920 --squash` |

**16 PRs en esta categoría.**

---

## Categoría B — REVISIÓN RÁPIDA (corren tests/CI, correr la suite antes de mergear)

Tocan tests o scripts de CI existentes. Riesgo bajo-medio individual, pero conviene correr `vitest` localmente antes de confiar en el "listo" reportado por la rama, y respetar el cluster/orden señalado arriba.

| # | Rama | Qué integra | Draft | Nota |
|---|------|-------------|-------|------|
| #2909 | `fix/ci-vitest-gate-shallow` | Gate CI vitest "fail loudly" | sí | **Cluster con #2906/#2907 — elegir UNO** |
| #2906 | `glm/ci-vitest-no-corre-lo-que-cambia` | Vitest corre tests relacionados a archivos cambiados | sí | **Cluster con #2907/#2909 — elegir UNO** |
| #2907 | `glm/ci-vitest-gate-ampliado-rojo` | Corrige orden de `git diff` en detect-changed-tests.mjs | sí | **Cluster con #2906/#2909 — elegir UNO** |
| #2925 | `glm/vitest-fallos-grupo-mayor` | Arregla mocks de syncManager | sí | grupo vitest-fallos |
| #2928 | `glm/vitest-fallos-grupo-2` | Test fotos-atribución → estructura GBIF | sí | grupo vitest-fallos |
| #2929 | `glm/vitest-fallos-grupo-3` | Fallos valleDinamico / entradaValle3D nav | sí | grupo vitest-fallos |
| #2930 | `glm/vitest-fallos-grupo-4` | 6 fallos VoiceSelector + mocks ENV SeedingLog | sí | grupo vitest-fallos |
| #2933 | `glm/ttsservice-dora-test-fosil` | Reescribe test fosilizado de ef_dora | sí | grupo vitest-fallos |
| #2934 | `glm/vitest-bench-modos-audit-dura` | Aserciones fósiles + skips bench | sí | comparte archivo con #2945 |
| #2939 | `glm/vitest-fallos-grupo-6` | Viñeta mundos + eventos chagra:nav | sí | grupo vitest-fallos |
| #2944 | `glm/vitest-fallos-grupo-8` | Tests SW RAG grounding cache-on-use | sí | grupo vitest-fallos |
| #2945 | `glm/vitest-fallos-grupo-9` | 4 tests (detector, ngsi, bench-judge, bench-audit) | sí | comparte archivo con #2934 |
| #2904 | `fix/aserto-modelo-vision-discrimina` | Aserción de modelo de visión más discriminante | sí | diff mínimo (+6/-2) |
| #2977 | `glm/fix-radial-gradient-400` | Corrige detección de radial-gradient en `useThemeBackgroundStore` | sí | toca store real, no solo test |
| #2967 | `glm/fix-2953-tsc-chivito-oso` | Fix de tipo en `useMiradaUsted` | sí | título referencia #2953 (CONFLICTING, fuera de alcance) — confirmar que el fix sigue aplicando sin ese PR |
| #3005 | `fix/ci-desatascar-compai-cla` | Destraba gates comunes de dev (CLA re-autorado) | no | toca `scripts/check-perf-budget.mjs` — gate de CI/deploy |
| #2832 | `glm/vocabulario-juegos2` | 32 términos agroecológicos + test | sí | dato nuevo, bajo riesgo |
| #2259 | `feat/age-cacao-pests-grounding-2026-07-09` | Grounding OpenAlex/CrossRef de 2 plagas de cacao (carga a AGE) | no | toca datos científicos del grafo — validar antes de cargar a prod |
| #2981 | `glm/test-laminas-assets-existen` | Test de regresión de assets de láminas (anti-404) | sí | depende de que #2979 esté mergeado primero |
| #2979 | `feat/portar-laminas-compai-dev` | Porta 4 PNG de láminas compai faltantes a dev | no | solo binarios, 0 diff textual — mergear ANTES que #2981 |

**20 PRs en esta categoría** (3 forman el cluster de #2906/#2907/#2909 → cuentan como 1 decisión).

---

## Categoría C — REVISIÓN PROFUNDA (features/visual/runtime, NO mergear a ciegas)

Cambios grandes de producto, arte o runtime. Requieren mirar el diff y, si tocan compai/visual, verificación GPU-headed antes de certificar (regla dura de la sesión: nunca certificar visual sin mirar crítico).

| # | Rama | Qué integra | Draft | Tamaño |
|---|------|-------------|-------|--------|
| #2072 | `feat/fermentos-visual` | Overhaul visual de FermentosView + fotos CC | no | +360/-131, 4 archivos |
| #2423 | `codex/use-finca-viva` | Hook nuevo `useFincaViva` | sí | +686/-268, 8 archivos |
| #2859 | `feat/idea-23-crm-agroecologico` | CRM agroecológico nuevo (contactos + interacciones) | sí | +1361/-2, 12 archivos |
| #2923 | `spike/rive-compai` | Spike Rive self-host + CanvasTexture | sí | +499/-0, 7 archivos — es un spike experimental, decisión de producto antes de integrar |
| #2961 | `fable/micorrizas-arte-suelo` | Arte suelo vivo (micorrizas, hojas masa) | no | +650/-48, 3 archivos |
| #2962 | `fix/integrar-laminas-costuras-2956` | Cierra costuras de 5 láminas vivas compai | no | +1968/-393, **24 archivos** — el más grande del batch |
| #2968 | `fable/oso-baston-capas-rig` | Capas de rig 2.5D del oso del bastón | sí | +87/-0, 16 archivos |
| #2978 | `feat/compai-life-gate-7` | Extiende el gate de vida compai a 7 | no | +333/-0, 6 archivos |
| #3037 | `glm/compai-posicion-20260825` | FAB arrastrable con persistencia de posición (hoy) | sí | +464/-5, 4 archivos |

**9 PRs en esta categoría.**

---

## Resumen

- **45 PRs candidatos** (en alcance, excluyendo robo-PRs/cla-clean/#3001), **los 45 mergean limpio hoy** contra `dev`.
- Categoría A (mergear ya, riesgo casi nulo): **16**
- Categoría B (revisión rápida — tests/CI, ojo con el cluster #2906/#2907/#2909): **20** (18 decisiones netas por el cluster)
- Categoría C (revisión profunda — feature/visual/runtime): **9**
- Todos siguen `OPEN` y todos son `DRAFT` salvo: #2072, #2259, #2961, #2962, #2978, #2979, #3005 (7 ready-for-review). Los `DRAFT` necesitan `gh pr ready <n>` antes de `gh pr merge`.
