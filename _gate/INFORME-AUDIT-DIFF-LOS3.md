# Auditoría de diff — lote lámina-viva (3 PRs sin auditar)

**Fecha**: 2026-08-18
**Base**: `origin/dev` (`e786a490e`)
**Carril**: opencode / big-pickle

---

## Veredicto por PR (una línea)

| PR | Rama | Veredicto |
|----|------|-----------|
| #2935 | `feat/jaguar-lamina-caminando` | **LIMPIO** |
| #2940 | `feat/luciernaga-lamina-viva` | **LIMPIO** |
| #2943 | `feat/chivito-punk-lamina-viva` | **LIMPIO** |

Los tres PRs están dentro del alcance. Ninguno trae archivo de más. Los archivos compartidos (adaptadores del elenco + test unificado + vidaEstados) son cambios correctos y necesarios para la migración svg→div, no regresiones.

---

## Control positivo — `feat/oso-lamina-viva` (compaiOverlay detectado)

**Commit analizado**: `82562598a` (antes del fix `4dce11e29`)

```
$ git diff --name-status origin/dev...82562598a
A  public/compai/laminas/oso.png
M  src/components/ChagraAgentAvatarOsoBaston.jsx
M  src/components/CompaiOverlay.jsx          ← FUERA DE ALCANCE
M  src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx
A  src/visual/creatures/OsoBastonLaminaViva.jsx
A  src/visual/creatures/__tests__/OsoBastonLaminaViva.test.jsx
A  src/visual/creatures/osoLamina/__tests__/capas.test.js
A  src/visual/creatures/osoLamina/anatomia.js
A  src/visual/creatures/osoLamina/capas.js
A  src/visual/creatures/osoLamina/osoLamina.css
```

**Resultado**: `CompaiOverlay.jsx` marcado como compartido/riesgoso — correcto, es exactamente el archivo que otro carril ya retiró en `4dce11e29`. Mi método lo detecta. ✅

## Control negativo — commit `e786a490e` (hooks test)

```
$ git diff --name-status e786a490e^..e786a490e
A  src/hooks/__tests__/useAgentAvatarType.contract.test.jsx
```

**Resultado**: 1 archivo, claramente dentro del alcance de "test de contrato". No inventa hallazgos. ✅

---

## PR #2935 — jaguar lámina-viva caminando

**Rama**: `feat/jaguar-lamina-caminando`
**Commits**: 1 encima de dev

### Clasificación de archivos

| Archivo | Clase | Nota |
|---------|-------|------|
| `public/compai/laminas/jaguar-rig/cuerpo-inpaint.png` | (a) Alcance | Asset de arte jaguar |
| `public/compai/laminas/jaguar-rig/pata-del-lejana.png` | (a) Alcance | Asset de arte jaguar |
| `public/compai/laminas/jaguar-rig/pata-tras-cercana.png` | (a) Alcance | Asset de arte jaguar |
| `public/compai/laminas/jaguar-rig/pata-tras-lejana.png` | (a) Alcance | Asset de arte jaguar |
| `src/visual/creatures/JaguarLaminaViva.jsx` | (a) Alcance | Componente jaguar lámina-viva |
| `src/visual/creatures/__tests__/JaguarLaminaViva.test.jsx` | (a) Alcance | Test jaguar |
| `src/visual/creatures/jaguarLamina/__tests__/capas.test.js` | (a) Alcance | Test capas jaguar |
| `src/visual/creatures/jaguarLamina/__tests__/marcha.test.js` | (a) Alcance | Test marcha jaguar (nuevo) |
| `src/visual/creatures/jaguarLamina/anatomia.js` | (a) Alcance | Módulo jaguar |
| `src/visual/creatures/jaguarLamina/capas.js` | (a) Alcance | Módulo jaguar |
| `src/visual/creatures/jaguarLamina/jaguarLamina.css` | (a) Alcance | CSS jaguar |
| `src/visual/creatures/jaguarLamina/marcha.js` | (a) Alcance | Módulo marcha (nuevo) |

**Archivos (b) compartidos**: 0
**Archivos (c) fuera de alcance**: 0

### Tests

```
$ npx vitest run src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx \
  src/visual/creatures/__tests__/JaguarLaminaViva.test.jsx \
  src/visual/creatures/jaguarLamina/__tests__/

 Test Files  4 passed (4)
      Tests  73 passed (73)
   Duration  2.35s
```

Todos verdes. SinCanvas warnings (esperado: no hay `canvas` npm package en test).

---

## PR #2940 — luciérnaga lámina-viva

**Rama**: `feat/luciernaga-lamina-viva`
**Commits**: 1 encima de dev

### Clasificación de archivos

| Archivo | Clase | Nota |
|---------|-------|------|
| `public/compai/laminas/luciernaga.png` | (a) Alcance | Asset de arte luciérnaga |
| `src/components/ChagraAgentAvatarLuciernaga.jsx` | **(b) Compartido** | Adaptador del elenco — cambia import |
| `src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx` | **(b) Compartido** | Test elenco unificado — cambia raíz |
| `src/visual/creatures/LuciernagaLaminaViva.jsx` | (a) Alcance | Componente luciérnaga |
| `src/visual/creatures/__tests__/LuciernagaLaminaViva.test.jsx` | (a) Alcance | Test luciérnaga |
| `src/visual/creatures/luciernagaLamina/__tests__/capas.test.js` | (a) Alcance | Test capas |
| `src/visual/creatures/luciernagaLamina/anatomia.js` | (a) Alcance | Módulo luciérnaga |
| `src/visual/creatures/luciernagaLamina/capas.js` | (a) Alcance | Módulo luciérnaga |
| `src/visual/creatures/luciernagaLamina/luciernagaLamina.css` | (a) Alcance | CSS luciérnaga |

**Archivos (c) fuera de alcance**: 0

### Análisis de archivos compartidos

**`src/components/ChagraAgentAvatarLuciernaga.jsx`** — Cambia import de `Luciernaga` (SVG rubber-hose) → `LuciernagaLaminaViva` (div con capas). Elimina `POSE_DE_STATE` (ya no aplica: el rig CSS maneja estados por `data-agt-estado`). Pasa `estado={state}` en vez de `pose={pose}`. **Riesgo**: el adaptador es laPUERTA pública del elenco. Pero `Luciernaga.jsx` NO se borra — otros consumidores (catálogo, valle) lo siguen usando. **No rompe nada.**

**`src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx`** — Cambia `raiz: raizSvg → raizDiv` para luciérnaga. **No es aflojamiento**: el componente ahora renderiza `<div>` en vez de `<svg>`, y el test usa `raizDiv` para encontrar `div[data-creature="luciernaga"]`. Las mismas aserciones (`role="img"`, `data-creature`) se mantienen intactas. **Endurece implícitamente** porque valida el nuevo contrato div correctamente.

### Tests

```
$ npx vitest run src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx \
  src/visual/creatures/__tests__/LuciernagaLaminaViva.test.jsx \
  src/visual/creatures/luciernagaLamina/__tests__/

 Test Files  3 passed (3)
      Tests  58 passed (58)
   Duration  2.09s
```

Todos verdes.

---

## PR #2943 — chivito punk lámina-viva

**Rama**: `feat/chivito-punk-lamina-viva`
**Commits**: 1 encima de dev (incluye fix de boca `011a218fe`)

### Clasificación de archivos

| Archivo | Clase | Nota |
|---------|-------|------|
| `public/compai/laminas/chivito-punk.png` | (a) Alcance | Asset de arte chivito |
| `src/components/ChagraAgentAvatarChivitoPunk.jsx` | **(b) Compartido** | Adaptador del elenco — cambia import |
| `src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx` | **(b) Compartido** | Test elenco unificado — cambia raíz |
| `src/visual/creatures/ChivitoPunkLaminaViva.jsx` | (a) Alcance | Componente chivito |
| `src/visual/creatures/__tests__/ChivitoPunkLaminaViva.test.jsx` | (a) Alcance | Test chivito |
| `src/visual/creatures/chivitoLamina/__tests__/capas.test.js` | (a) Alcance | Test capas |
| `src/visual/creatures/chivitoLamina/anatomia.js` | (a) Alcance | Módulo chivito |
| `src/visual/creatures/chivitoLamina/capas.js` | (a) Alcance | Módulo chivito |
| `src/visual/creatures/chivitoLamina/chivitoLamina.css` | (a) Alcance | CSS chivito |
| `src/visual/creatures/vidaEstados.js` | **(b) Compartido** | Repertorio de vida — agrega entrada |

**Archivos (c) fuera de alcance**: 0

### Análisis de archivos compartidos

**`src/components/ChagraAgentAvatarChivitoPunk.jsx`** — Mismo patrón que luciérnaga: import `ChivitoPunk` → `ChivitoPunkLaminaViva`, agrega `VISEMA_DE_STATE`, pasa `estado={state}`. `ChivitoPunk.jsx` no se borra. **No rompe nada.**

**`src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx`** — Cambia `raiz: raizSvg → raizDiv` para chivito. **No es aflojamiento**: mismo razonamiento que luciérnaga — el componente ahora es `<div>`, el test valida el nuevo contrato correctamente.

**`src/visual/creatures/vidaEstados.js`** — AGREGA una entrada nueva `'chivito-punk'` al `VIDA_REPERTORIO`. **Es 100% aditivo**: no modifica ninguna entrada existente (jaguar, oso, luciérnaga, dalmata, etc. quedan intactos). La nueva entrada define `descanso`, `momentos.rockea`, `momentos.apunta`, `momentos.reposo` — parámetros de ritmo que solo consume `ChivitoPunkLaminaViva`. **Riesgo mínimo**: una key nueva en un objeto no rompe lecturas existentes. Solo se rompería si otro código itera `Object.keys(VIDA_REPERTORIO)` y asume un set cerrado, pero el código de creatures es tolerante a keys nuevas (el default fallback maneja cualquier key no reconocida).

### Tests

```
$ npx vitest run src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx \
  src/visual/creatures/__tests__/ChivitoPunkLaminaViva.test.jsx \
  src/visual/creatures/chivitoLamina/__tests__/

 Test Files  3 passed (3)
      Tests  57 passed (57)
   Duration  2.09s
```

Todos verdes.

---

## Resumen de hallazgos

| PR | (a) Alcance | (b) Compartido | (c) Fuera | Tests | Veredicto |
|----|------------|----------------|-----------|-------|-----------|
| #2935 jaguar | 12 | 0 | 0 | 73/73 ✅ | LIMPIO |
| #2940 luciérnaga | 7 | 2 | 0 | 58/58 ✅ | LIMPIO |
| #2943 chivito | 8 | 3 | 0 | 57/57 ✅ | LIMPIO |

**Patrón detectado**: los 3 PRs comparten el mismo molde — el adaptador del elenco migra de SVG→div, el test de elenco cambia `raizSvg→raizDiv`, y el componente nuevo sigue el patrón de `JaguarLaminaViva.jsx`. Chivito es el único que toca `vidaEstados.js` (aditivo). Ninguno toca archivos de OTRO compai.

**Lo que no pude verificar**: rendimiento visual (capturas de pantalla). Esta auditoría es de diff/alcanze, no estética.
