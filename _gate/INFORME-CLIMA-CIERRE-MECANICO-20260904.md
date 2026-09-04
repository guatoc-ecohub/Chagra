# INFORME — clima cierre mecánico 2026-09-04 (carril opencode, cwd = PWA)

Carril: opencode/deepseek-v4-flash · cwd: `/home/kortux/Workspace/chagra`
Rama de entrega: `fix/clima-cierre-mecanico-20260904` (worktree en
`/home/kortux/Workspace/chagra/.worktrees/clima-cierre-20260904`, base `origin/dev`).

Resumen en una línea: cerré el **ítem 1** (copias de la tabla de pisos térmicos
→ SSOT) con su guard de regresión; el trabajo quedó commiteado. Los ítems 2 y 3
pertenecen al valle (`~/demos/3d`), fuera del cwd de este carril. El ítem 4 tiene
un carril paralelo vivo en la misma superficie y su blanco exacto se define en
documentos de diseño fuera del cwd; no lo toqué para no duplicar.

---

## 1. Qué cerré: ítem 1 — pisos térmicos de finca, todas las copias delegan al SSOT

El SSOT es `src/visual/mundo3d/pisosTermicos.js::pisoDeFinca()` (7 cotas de la
Sierra colapsadas a 4 pisos de finca: `calido|templado|frio|paramo`).
`skyConditionService.pisoFromMsnm` ya delegaba en dev (no se tocó).

El informe citaba líneas 136 / 456 / 1149. Verifiqué, no las copié; en dev se
corresponden con:

| Superficie | Copia independiente que se eliminó | Qué quedó |
|---|---|---|
| `src/services/alertEngine.js` | `resolvePisoTermico()`: fallback altitud `>=3000/>=2000/>=1000` (~136) | fallback delega en `pisoDeFinca(alt)`; piso del perfil sin cambio |
| `src/services/chipIntentRouter.js` | `calendarioPiso()`: cascada `>=2000` `>=1000` (~456) | deriva con `pisoDeFinca(alt)` y conserva su mapeo tool `paramo→frio` |
| `src/services/agentService.js` | `pisoTermicoFromAltitud()` (1149, vocabulario con tilde) | delega y traduce slug canónico → `cálido/templado/frío/páramo` (contrato histórico intacto) |

**Barrido completo con grep** (no solo las tres del informe) encontró y delegó
tres copias más numéricamente iguales:

| Superficie | Cambio |
|---|---|
| `src/data/cropSuggestions.js::pisoTermicoFromAltitud` | delega; conserva su guard anti-fabricación (`altitud <= 0 → null`, nunca piso inventado a 0 msnm) |
| `src/services/incendioRiskService.js::pisoDesdeAltitud` | delega (piso nulo sin dato) |
| `src/services/restauracionDiagnostic.js::pisoDesdeAltitud` | delega y conserva su vocabulario de bucket (`calido_0_1000`…`paramo_3000`, claves reales de `restauracion.json` verificadas) |

NO se tocó `externalAiPromptBuilder.deriveThermalZoneFromAltitud`: **no es una
copia numéricamente igual** (usa 5 zonas con `glacial >3600`, vocabulario
propio de prompts externos). Reemplazarla cambiaría comportamiento; se deja y se
declara. También quedan fuera los textos de data/prompt que solo mencionan la
cota en prosa (`guildService`, `aguacateFinca`, comentarios).

Guard de regresión nuevo: `src/services/__tests__/pisosTermicosSsotDelegacion.test.js`
(12 tests, dos mitades):
1. **Comportamiento**: grilla de cotas y bordes (0, 999, 1000, 1999, 2000,
   2999, 3000, 3999, 4000, 4800, 5775, 6500, negativos, strings, null/undefined)
   contra `pisoDeFinca` en los clasificadores exportados (agentService,
   cropSuggestions, incendioRiskService, skyConditionService). Si alguien
   introduce cortes distintos, diverge y cae.
2. **Estático**: escanea el código (comentarios quitados) de los 7 módulos que
   delegan y (a) exige que llamen a `pisoDeFinca`, (b) veta que reaparezca la
   cascada numérica independiente `[<>]=? 1000|2000|3000`. Prueba de control
   hecha: reintroducir la tabla dispara el regex; código normal no.

## 2. Gates — salida cruda

### 2.1 Tests relevantes (equivalente al gate de CI del repo, `unit-tests.yml` +
`scripts/detect-changed-tests.mjs`: el detector mapea archivos cambiados → tests)

```
npx vitest run \
  agentService.test.js alertEngine.test.js chipIntentRouter.test.js \
  skyConditionService.test.js cropSuggestions.test.js \
  incendioRiskService.test.js restauracionDiagnostic.test.js \
  pisosTermicosSsotDelegacion.test.js

 Test Files  8 passed (8)
      Tests  299 passed (299)
```

Además corrí la vecindad de consumidores ENSO/clima/helada/velo:
`alertEngine.{forecast,guards,coverage}` · `proactiveGreeting{.usted}` ·
`atmosphereService` · `ensoContext` · `ensoService` · `sidecarClient.coerce` ·
`CicloVivo{Widget,FullView}` · `ClimaBoletinScreen` →

```
 Test Files  20 passed (20)
      Tests  476 passed (476)
```

### 2.2 Suite vitest completa
No completó en esta caja (compartida, varios carriles activos):
- Con workers por defecto: `FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory` (salida cruda en la traza del comando).
- Con `--maxWorkers=2`: superó los 480 s de timeout sin terminar.
El gate real del repo no corre la suite completa: selecciona tests por diff
(ver 2.1), que es lo que quedó verde.

### 2.3 TypeScript
`npx tsc --noEmit -p jsconfig.json`:
- Errores totales en dev (baseline): **755, preexistentes**.
- Errores en archivos tocados o el test nuevo: **0** (`grep` por
  agentService/alertEngine/chipIntentRouter/cropSuggestions/incendioRisk/
  restauracionDiagnostic/skyConditionService/pisosTermicos/enso*/atmosphere no
  devuelve ninguna línea).

### 2.4 ESLint
`npx eslint <7 archivos> --max-warnings=0`: **0 errores, 0 warnings nuevos**.
Los únicos 3 warnings salen de `alertEngine.js` (console.debug de i18n, líneas
117/150/166) y **ya existen en origin/dev** (verificado contra el blob de dev:
el archivo baseline también falla `--max-warnings=0`). No los introduje.

### 2.5 Catálogo (segunda mitad de `npm run test`)
`node scripts/validate-catalog-consistency.mjs --report-only`: exit **0**.
Imprime FAILs preexistentes `missing_base_species` (catálogo de especies); no
toco catálogo y no los introduje.

## 3. Rescate del trabajo (nota de transparencia)

Mientras corría la suite completa, el carril ejecutó por error un flag de
vitest inexistente (`--minWorkers` → `CACError`) y el supervisor del turno
interpretó el carril como muerto y **rescató el árbol sin commitear en un
commit a mi nombre** antes de que terminara mi verificación. Por eso la rama ya
tiene el commit del ítem 1 (autor: cuenta del operador, Co-Authored-By: Claude
Opus). Verifiqué que el commit commitea exactamente mi trabajo (árbol de trabajo
limpio, idéntico a HEAD) y corrí los gates sobre ese estado commiteado.

## 4. Entregable y verificación (regla 6 del repo)

```
$ git log --oneline origin/dev..HEAD
17a257c32 fix(clima): las copias de la tabla de pisos térmicos delegan al SSOT

$ git diff --stat origin/dev..HEAD
 src/data/cropSuggestions.js                        |  12 +-
 .../__tests__/pisosTermicosSsotDelegacion.test.js  | 133 +++++++++++++++++++++
 src/services/agentService.js                       |  25 ++--
 src/services/alertEngine.js                        |  10 +-
 src/services/chipIntentRouter.js                   |   9 +-
 src/services/incendioRiskService.js                |  11 +-
 src/services/restauracionDiagnostic.js             |  19 +-
 7 files changed, 185 insertions(+), 34 deletions(-)

$ git diff --diff-filter=D --name-only origin/dev..HEAD
(vacío — cero deletes)
```

No abrí PR ni mergeo: la integración la decide el operador.

## 5. Ítems 2 y 3 (valle) — NO ejecutables desde este carril

Este carril corre sobre opencode con cwd `/home/kortux/Workspace/chagra`; todo
path fuera del cwd se auto-rechaza en silencio. El valle canónico vive en
`~/demos/3d` (sin remoto, rama `feat/purga-lowpoly-valle-20260830`, árbol en
producción) y sus worktrees en `/tmp/...`: ambas rutas fuera del cwd.

- **Ítem 2 (`?cam=tiempo` 37 % declarado vs 29,9 % medido)**: el `main.js` del
  valle y el gate GPU headed (`shot3d`, `gate-x-estado.sh`) están fuera del
  cwd. La medición correcta exige cámara fija/estado forzado en el valle (la
  trampa del encuadre no se puede resolver desde acá). Dentro del cwd solo
  existen copias servidas del valle (`public/valle/`, sincronizadas por
  `scripts/sync-valle.mjs` desde el otro repo): **no son la fuente canónica y
  no las edité**.
- **Ítem 3 (helada con dato vivo: cablear `clima-vivo.js` → `__helada.set`)**:
  `hayHelada()` vive en `lib3d/clima/climaPorPiso.js` del valle y su espejo
  vendorizado `src/visual/mundo3d/sierra/vendor/clima/climaPorPiso.js`; el
  cableado a montar es de `clima-vivo.js` del valle (fuera de cwd). No toqué
  los ítems de arte rojos (cima sin nieve, nube-masa, H0→H4, portada 6,5° vs
  9 h): ni de refilón.

## 6. Ítem 4 (CieloENSO / velo CSS por piso, 2D PWA) — determinación, no ejecuté

Motivos para NO tocar (los escribo para que la pasada siguiente no dependa de
un "no pude" vago):

1. **Carril paralelo vivo en la misma superficie**: existe la rama local
   `glm/clima-cieloenso-por-piso` (worktree `/tmp/glm-clima-pwa-cieloenso-por-piso`)
   apuntada exactamente a este ítem. Su diff contra `origin/dev` está vacío hoy
   (trabajo en vuelo, sin commit aún). Editar la misma superficie desde acá
   crea doble trabajo y riesgo de conflicto en la integración.
2. **El blanco exacto se define fuera del cwd**: "el velo CSS por piso" que
   menciona el brief vive en los documentos de diseño
   (`DISENO-TRANSICION-CLIMAS-20260902.md`, `INTEGRACION-CLIMA-CLASE-MUNDIAL-20260904.md`),
   ambos fuera del cwd. Sin ese contrato, implementar el velo es inventar arte.
3. **Estado real del código en dev** (verificado, no de memoria):
   - `ensoService`/`ensoContext` ya traen la fase viva y la lectura regional;
     la paradoja de piso frío (El Niño → MÁS heladas por cielo despejado, no
     sequía) ya está escrita en `ensoContext` (`REGION_IMPACTS.andina.nino`) y
     en `skyConditionService` (prior por piso frío/páramo → "variable", nunca
     "sol").
   - El velo global ya está cableado: `useClimaAtmosphere` →
     `atmosphereService.deriveAtmosphere/applyAtmosphere` → `<html data-enso
     data-clima data-luz>` → `src/styles/clima-atmosfera.css`. `CieloENSO.jsx`
     ya recibe la familia en vivo en `ClimaBoletinScreen`. `ClimaStrip` ya
     muestra piso (por altitud guardada, SSOT) + fase ENSO.
   - No identifiqué un hueco **mecánico** verificable con tests (no visual)
     cuyo arreglo no requiera inventar diseño; y el único cambio concebible (hacer
     el sesgo ENSO dependiente del piso) es justo la superficie del carril glm.
4. La única advertencia de ciencia del brief ("prohibido pintar ámbar/sequía
   en piso frío") se respeta en el código actual: el tinte ámbar de
   `html[data-clima="despejado"]` solo aparece si la condición real del cielo es
   despejado, y en piso frío/páramo el prior de `skyConditionService` es
   nublado/parcial; el sesgo ENSO del velo solo modula intensidad, no categoría.

Si el operador quiere el velo ENSO-por-piso en la PWA, lo correcto es
encargárselo al carril `glm/clima-cieloenso-por-piso` (ya tiene la rama) o darle
a este mismo carril el párrafo del documento de diseño que define el velo.

## 7. Qué rozó arte y paró

Nada. No toqué los ítems rojos de arte de la §9 (cima de la Sierra sin nieve,
legibilidad de la nube-masa, secuencia de helada H0→H4, decisión de portada
6,5° vs 9 h) ni ninguna copia servida del valle.

## 8. Lo que NO pude verificar

- Suite vitest completa en esta caja (OOM/timeout; el gate real del repo la
  selecciona por diff y esa selección quedó verde).
- Ítems 2 y 3 del valle (fuera del cwd de opencode; requieren gate GPU headed
  del valle en `~/demos/3d`).
- El blanco visual exacto del ítem 4 (definido en documentos fuera del cwd).
