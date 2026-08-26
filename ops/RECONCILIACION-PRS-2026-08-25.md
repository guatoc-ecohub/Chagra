# Reconciliación de PRs no-seguros contra `dev` — 2026-08-25

**Ejecutor:** Claude (Sonnet) — LANE Claude, reconciliación de conflictivos + revisión profunda
**Modo:** Reconciliación real en worktrees aislados (`git worktree` + cherry-pick + `vitest run`), SIN mergear a `dev`. Cada rama `recon/*` está empujada a `origin` lista para que el operador (o `ae68fe87`/quien tenga el mandato de mergear) la revise y mergee.
**Alcance:** Categoría B (20 PRs) + Categoría C (9 PRs) de `ops/PLAN-MERGE-DEV-2026-08-25.md`, más el cluster CONFLICTING derivado de #3006. Excluidos: categoría A (la mergea `ae68fe87`), robo-PRs, `*-cla-clean`, #3001.
**Base usada:** `origin/dev` @ `0056e2e4e` (post-batch de categoría A, 13 PRs ya integrados por el otro carril).

## Corrección al conteo de #3006

El diagnóstico de #3006 dice "8 PRs CONFLICTING" pero sus propias tablas (Grupo A + Grupo B) suman 13 números, y 2 de esos (#3002, #3003) ya están `CLOSED` (robo-PRs). Verificado hoy con `gh pr view` uno por uno: quedan **12 PRs `OPEN` + `CONFLICTING` reales** contra `dev`. Se reconciliaron los 12, no 8.

## Hallazgo transversal — la arquitectura "LaminaViva" está SUPERADA en `dev`

Antes de tocar el cluster de compai, se verificó el contenido real (no solo el diff) de cada creature. Resultado: **`dev` ya usa una arquitectura distinta y más madura para las 5 criaturas** (zariguya, oso, chivito, luciérnaga, jaguar) que la que traen estos PRs:

| Criatura | Componente activo en `dev` hoy | Componente que traen los PRs |
|---|---|---|
| Zariguya | `ZariguyaGeminiLaminaViva` | `ZariguyaLaminaViva` |
| Oso | `OsoBaston` ("lámina musculosa") | `OsoBastonLaminaViva` |
| Chivito | `ChivitoPunk` | `ChivitoPunkLaminaViva` |
| Luciérnaga | `Luciernaga` | `LuciernagaLaminaViva` |
| Jaguar | `JaguarTrazado` | `JaguarLaminaViva` |

El propio código de `dev` (`src/components/ChagraAgentAvatarJaguar.jsx`) lo dice explícito:

> "`JaguarLaminaViva`, la PNG recortada en capas — **RECHAZADA POR EL OPERADOR**: el pecho raster no aguanta el corte [...] reemplazada por `JaguarTrazado`."

Confirmado con diff de contenido: `ZariguyaLaminaViva.jsx`, `OsoBastonLaminaViva.jsx` y `LuciernagaLaminaViva.jsx` están **0 líneas de diferencia** entre `dev` y las ramas de los PRs — el archivo YA existe en `dev`, solo que archivado/sin usar (la UI activa apunta a otro componente). Los `worktree` vivos en disco (`chagra-fable-jaguar-trazado`, `chagra-fable-zari-gemini`, `chagra-fable-oso`, etc.) confirman que hay un carril Fable activo y posterior que reemplazó esta dirección.

**Consecuencia:** todo el cluster LaminaViva (8 PRs del conflicting + 2 de categoría C) se clasifica SUPERADO, no por sospecha sino por evidencia de contenido + comentario explícito del operador en el código.

---

## Tabla completa

Leyenda de estado: 🟢 RECONCILIADO-listo · 🟡 NECESITA-DECISIÓN-OPERADOR · ⚪ SUPERADO-cerrar · 🔴 DESCARTAR

### Cluster CONFLICTING (12, no 8)

| PR | Rama | Estado | Evidencia | Acción |
|---|---|---|---|---|
| #3000 | `feat/graphics-valle-techniques` | 🟢 | Único commit real (`edb17cadb`, pasto-vivo); resto son 936 commits ya en `dev` (ruido de rama vieja). 1 conflicto trivial en `Valle3D.jsx` (variable renombrada `altura`↔`alturaTerreno`) resuelto. Test propio 3/3 verde. | `git fetch && git merge recon/3000-valle-pasto-vivo` (rama en origin) |
| #2958 | `feat/juego-micelio-mejoras` | 🟢 | Único commit real (`aa8a455d6`), cherry-pick limpio sin conflicto. Nota: el juego vive como bundle pre-construido en `_gate/dist-rive-dev/...main.js` (código-olor: dist committeado, no fuente) — funciona pero no sigue el patrón `src/`. | `git merge recon/2958-micelio-mejoras` |
| #2959 | `feat/invernadero-parametrizable-codex` | 🟢 | 2 commits reales; **superset de #2952** (mismo `invernadero.geom.js` byte-idéntico + además extiende a pimentón/lechuga con `laminaMasa.js` compartido y limpia archivos muertos que #2952 deja). Cherry-pick limpio, 17/17 tests verdes. | `git merge recon/2959-invernadero-multiespecie` — **cierra #2952** |
| #2952 | `feat/invernadero-escalable` | ⚪ | Subconjunto estricto de #2959 (mismo motor de instancing, versión anterior sin el paso multiespecie). | Cerrar, referenciar #2959 |
| #2938 | `feat/zariguya-lamina-viva` | ⚪ | `ZariguyaLaminaViva.jsx` 0 diff contra `dev` — ya está, archivado. Activo en `dev`: `ZariguyaGeminiLaminaViva`. | Cerrar |
| #2937 | `feat/oso-lamina-viva` | ⚪ | `OsoBastonLaminaViva.jsx` 0 diff contra `dev`. Activo en `dev`: `OsoBaston`. | Cerrar |
| #2940 | `feat/luciernaga-lamina-viva` | ⚪ | `LuciernagaLaminaViva.jsx` 0 diff contra `dev` (incluye sus 2 fixes de costuras/tarsi — ya replicados en `dev` con otros hashes). Activo: `Luciernaga`. | Cerrar |
| #2943 | `feat/chivito-punk-lamina-viva` | ⚪ | Base 32 líneas de diff (menor) ya casi igual a `dev`; el único contenido nuevo real es un commit WIP ("rescate C5 chivito-punk") que el propio autor marca `RESIDUAL HONESTO: ... WIP a completar/gate` — no está wireado al render. Bajo valor de rescate. | Cerrar (rescatar el fragmento C5 aparte si algún día se retoma) |
| #2935 | `feat/jaguar-lamina-caminando` | 🔴 | Trae `marcha.js` (gait real por-pata) que NO existe en `dev` — es contenido genuinamente único. Pero la base sobre la que corre (`JaguarLaminaViva`) está **explícitamente rechazada por el operador** en el código de `dev` (ver hallazgo arriba). Portar el gait tendría que rehacerse sobre `JaguarTrazado`. | Descartar tal cual; si el gait por-pata importa, pedir a Fable portarlo sobre `JaguarTrazado` |
| #2953 | `glm/reemplazar-chivito-oso-viejos` | ⚪ | Integra chivito+oso ya superados. | Cerrar |
| #2955 | `feat/compai-rubberhose-life` | ⚪ | Integra chivito+oso+zariguya+luciérnaga ya superados + cableado a portal sobre esa base vieja. | Cerrar |
| #2951 | `feat/integrar-3-compais-pr` | ⚪ | Integra jaguar(rechazado)+zariguya+luciérnaga ya superados. | Cerrar |

### Categoría B (20 PRs, trío cuenta como 1 decisión)

| PR | Estado | Evidencia | Acción |
|---|---|---|---|
| #2909 | 🟢 (gana el trío) | Único de los 3 con el orden de `git diff` YA correcto (`baseRef...HEAD`) desde el inicio — no arrastra el bug de #2906. Validado con CI real en #2911 (run 31754793806, no bloquea PRs legítimos). | Incluido en `recon/batch-b-vitest-ci-fixes` |
| #2906 | ⚪ | Tiene el bug de orden (`HEAD...origin/dev`) que #2907 corrige después — versión intermedia superada. | Cerrar, referenciar #2909 |
| #2907 | ⚪ | Corrige el bug de #2906 pero #2909 es una reescritura independiente ya sin ese bug y con "fail loudly". | Cerrar, referenciar #2909 |
| #2925 | 🟢 | Cherry-pick limpio, test verde. | `recon/batch-b-vitest-ci-fixes` |
| #2928 | 🟢 | ídem | `recon/batch-b-vitest-ci-fixes` |
| #2929 | 🟢 | ídem | `recon/batch-b-vitest-ci-fixes` |
| #2930 | 🟢 | ídem | `recon/batch-b-vitest-ci-fixes` |
| #2933 | ⚪ | Cherry-pick da commit VACÍO — `dev` ya tiene exactamente este contenido (test de `ef_dora` ya reescrito). | Cerrar (no-op) |
| #2934 | 🟢 (fusionado con #2945) | Ambos tocan `bench-audit-dura.test.mjs` con el MISMO caso de test, distinta redacción de assert — se resolvió manteniendo la de #2934 y aplicando el resto de #2945 encima. 35/39 pasan (4 skip esperados). | `recon/2934-2945-bench-vitest-fixes` |
| #2939 | 🟢 | Cherry-pick limpio, test verde. | `recon/batch-b-vitest-ci-fixes` |
| #2944 | 🟢 | ídem | `recon/batch-b-vitest-ci-fixes` |
| #2945 | 🟢 (fusionado con #2934) | Ver #2934. | Cerrar como PR individual, contenido va en `recon/2934-2945-bench-vitest-fixes` |
| #2904 | 🟢 | Cherry-pick limpio, test verde. | `recon/batch-b-vitest-ci-fixes` |
| #2977 | 🟢 | ídem | `recon/batch-b-vitest-ci-fixes` |
| #2967 | 🟢 | Fix de tipo de 1 línea, independiente de #2953 (que está cerrado/superado) — sigue aplicando igual. Único rojo en el archivo de tests es baseline preexistente en `dev` limpio (idéntico antes/después). | `recon/2967-usemiradausted-tsc-fix` |
| #3005 | 🟢 | 2 commits, cherry-pick limpio. | `recon/batch-b-vitest-ci-fixes` |
| #2832 | 🟢 | Dato nuevo aislado, cherry-pick limpio. | `recon/batch-b-vitest-ci-fixes` |
| #2259 | 🟢 | Script de carga a AGE, aislado, cherry-pick limpio. Nota: carga datos científicos al grafo — confirmar con el operador antes de EJECUTAR el script contra AGE de prod (el PR en sí, el código, es seguro de mergear). | `recon/batch-b-vitest-ci-fixes` |
| #2981 | 🟢 (con fix) | El test fallaba (4/25) contra `dev` de hoy porque `dev` agregó `ZariguyaGeminiLaminaViva` después de que este PR se abrió, y el derivador de carpeta del test no conocía ese patrón de nombre. Se agregó el mapeo explícito (mismo patrón que sus 5 hermanos) — 25/25 verde. Ya NO depende de #2979 (ver abajo). | `recon/2981-laminas-assets-regression` |
| #2979 | ⚪ | Los 4 PNG que porta ya están BYTE-IDÉNTICOS en `dev` — no-op real. | Cerrar (no-op) |

### Categoría C (9 PRs, revisión profunda)

| PR | Estado | Evidencia | Acción |
|---|---|---|---|
| #2072 | 🟢 | Cherry-pick limpio, 11/11 tests verdes. Visual (overhaul FermentosView) — falta verificación GPU-headed final antes de certificar (regla dura de la sesión), pero a nivel git/test está listo. | `recon/2072-fermentos-visual` |
| #2423 | 🟡 **CRÍTICO** | `useFincaViva` de `dev` (`src/visual/mundo3d/useFincaViva.js`, 260 líneas) es un hook maduro con "CONTRATO ANTI-FABRICACIÓN" ya wireado a `vitalidadEspirituService`/`fincaEvolutionService` (auditoría §5b). Este PR **reemplaza ese archivo por un re-export de 1 línea** hacia un hook nuevo e independiente (306 líneas, servicios distintos: `assetCache`, `farmProcessCache`, `fincaSceneService`...) que NO menciona el contrato anti-fabricación. Mergear esto a ciegas **borra** la lógica anti-fabricación ya en producción. Git lo reporta "clean" porque es reemplazo total de archivo, no conflicto textual. | **NO mergear sin decisión del operador** — ¿cuál de los dos hooks es el que se quiere? Si es el nuevo, hay que migrarle el contrato anti-fabricación primero. |
| #2859 | 🟡 | CRM aislado, sin colisión de nombres, ADR-019 compliant — pero **9 de 22 tests fallan**, y se confirmó que fallan IGUAL en la rama original del PR (no es deriva de merge, es un bug del propio PR: `RedView` no renderiza el texto "Contactos por Tipo" que su propio test espera). El PR dice "tests unitarios pasan" — es falso, verificado con salida cruda. | No mergear hasta que el autor arregle los 9 tests; no es apto para "clean merge = listo" |
| #2923 | 🟡 | Spike aislado (ruta `#/dev/rive-spike`, vendorea `rive.wasm`), cherry-pick limpio, no toca runtime de producción. Decisión de producto pendiente (adoptar Rive self-host o no) antes de dejarlo vivir en `dev` — el propio autor lo marca "Spike Fase 0". | Merge técnicamente seguro; requiere go/no-go de producto antes |
| #2961 | 🟢 | Cherry-pick limpio, 23/23 tests verdes (coincide con lo reportado en el PR). Evidencia GPU headed propia (antes/después, mismo FPS, capturas). | `recon/2961-micorrizas-arte-suelo` |
| #2962 | 🟡 | "Cierra costuras" de las 5 láminas vivas — pero es la MISMA arquitectura superada (ver hallazgo transversal). Invertir en pulir costuras de un rig que la UI activa ya no usa. Técnicamente mergeable sin romper nada (toca archivos no referenciados por la UI activa), pero de valor cuestionable. | Confirmar con operador/Fable si se revive esta dirección; si no, cerrar |
| #2968 | 🟡 | Set de 16 PNG (capas de rig 2.5D del oso, corte Fable) — misma familia LaminaViva/rig-layers. Puramente assets, no toca código de wiring, cero riesgo técnico de mergear. Pendiente de si Fable retoma esta dirección para el oso. | Confirmar con Fable; assets no estorban si se guardan igual |
| #2978 | 🟢 | Herramientas `_gate/` puras (harness de captura GPU-headed), cero riesgo de runtime. | `recon/2978-compai-life-gate-7` |
| #3037 | 🟢 | Cherry-pick limpio, 16/16 tests verdes. Implementa exactamente la política ya documentada ("posición=donde-lo-dejó") que `dev` aún no tenía (el `AgentFab` actual está anclado por construcción, sin drag). | `recon/3037-compai-fab-draggable` |

---

## Ramas `recon/*` publicadas en origin (listas para revisar/mergear)

- `recon/3000-valle-pasto-vivo`
- `recon/2958-micelio-mejoras`
- `recon/2959-invernadero-multiespecie`
- `recon/batch-b-vitest-ci-fixes` (contiene #2909, #2925, #2928, #2929, #2930, #2939, #2944, #2904, #2977, #3005, #2832, #2259 — 12 PRs en una sola rama, cherry-pick secuencial verificado con 251 tests verdes)
- `recon/2934-2945-bench-vitest-fixes`
- `recon/2967-usemiradausted-tsc-fix`
- `recon/2981-laminas-assets-regression`
- `recon/2072-fermentos-visual`
- `recon/2961-micorrizas-arte-suelo`
- `recon/2978-compai-life-gate-7`
- `recon/3037-compai-fab-draggable`

Todas parten de `origin/dev` @ `0056e2e4e`. Si `dev` avanzó desde entonces, re-verificar con `git merge-tree` antes de mergear (mismo aviso que el plan original).

## Resumen numérico

- **23 PR-números reconciliados y listos** (git+test verificado, no solo "clean merge"): #3000, #2958, #2959, #2909, #2925, #2928, #2929, #2930, #2934, #2939, #2944, #2945, #2904, #2977, #2967, #3005, #2832, #2259, #2981, #2072, #2961, #2978, #3037.
- **13 SUPERADO-cerrar** (contenido ya en `dev` por otra vía, o subconjunto de otro reconciliado): #2952, #2938, #2937, #2940, #2943, #2953, #2955, #2951, #2906, #2907, #2933, #2979 (11) + #2935 cuenta aparte abajo.
- **1 DESCARTAR** con evidencia dura de rechazo del operador en el propio código: #2935.
- **5 NECESITAN DECISIÓN DEL OPERADOR**: #2423 (crítico — riesgo de regresión real, no mergear), #2859 (tests propios rotos, no es apto pese a "clean merge"), #2923 (decisión de producto sobre Rive), #2962 y #2968 (arquitectura de rig posiblemente abandonada, confirmar con Fable).

**Hallazgo más importante para el operador:** dos PRs categoría C reportaban "tests pasan" / "clean merge" pero NO son seguros de mergear a ciegas — #2423 borraría lógica anti-fabricación de producción, #2859 tiene 9 tests rotos en su propia rama. "Mergea limpio" (git) ≠ "seguro de mergear" (contenido). Verificado con evidencia cruda en ambos casos.
