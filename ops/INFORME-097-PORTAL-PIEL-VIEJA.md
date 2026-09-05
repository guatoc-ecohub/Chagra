# INFORME 097 · El portal 2D→3D monta la piel VIEJA de 3 compai

**Fecha:** 2026-09-04 · **Rama:** `glm/097-portal-piel-vieja` · **Base:** `origin/dev` @ `054ca5d78`
**Alcance:** `src/visual/mundo3d/escenas/compaiRegistry.js` (campo `PortalComponent`) + test de registro.

## 1. Qué cambió — los diffs de una línea

Tres imports y tres asignaciones en `compaiRegistry.js`. Patrón imitado: el jaguar
(`PortalComponent: JaguarTrazado`, ya en tinta), import **default** de la fachada
`*Trazado.jsx` (la misma que usa el selector `CREATURES` en
`src/visual/creatures/index.js` y los `ChagraAgentAvatar*` de la PWA).

| compai | antes (piel vieja) | después (tinta) |
|---|---|---|
| `zariguya` | `import { Zariguya } from '../../creatures/Zariguya.jsx'` → `PortalComponent: Zariguya` | `import ZariguyaTrazado from '../../creatures/ZariguyaTrazado.jsx'` → `PortalComponent: ZariguyaTrazado` |
| `luciernaga` | `import { Luciernaga } from '../../creatures/Luciernaga.jsx'` → `PortalComponent: Luciernaga` | `import LuciernagaTrazado from '../../creatures/LuciernagaTrazado.jsx'` → `PortalComponent: LuciernagaTrazado` |
| `chivito-punk` | `import ChivitoPunk from '../../creatures/ChivitoPunk.jsx'` → `PortalComponent: ChivitoPunk` | `import ChivitoTrazado from '../../creatures/ChivitoTrazado.jsx'` → `PortalComponent: ChivitoTrazado` |

**`oso-baston` NO se tocó** (queda `PortalComponent: OsoBaston`): el registro lleva el
comentario "SKIN CONSERVADA = OsoBaston, la lámina musculosa aprobada" y **no existe
`OsoTrazado.jsx`**. Cambiarlo habría inventado una decisión de arte que nadie tomó.
El test nuevo lo fija como expectativa explícita para que ninguna migración futura lo
arrastre por accidente.

**No se tocó:** `EscenaComponent` (las `*CompaiEscena.jsx` conservan su coreografía y
sus cuerpos, incluido el uso interno de `Luciernaga.jsx`/`ChivitoPunk.jsx` en las
escenas 3D), `presencia`, `especie`, wrappers de `src/components/`, y nada con
`LaminaViva` en el nombre.

## 2. Props: qué hubo que adaptar

**Nada — cero wrappers, cero cambios de API.** `AbejaTransicion` monta el `Cuerpo`
del portal con `{ size: 76, animo, energia, animated: true, tier }`:

- `size`, `animated`, `tier` son props declaradas en los tres `*Trazado.jsx`.
- `animo` y `energia` no existen en su firma y caen al `...rest`:
  - `ZariguyaTrazado` (fachada `CompaiAgente` con `chrome:false`, idéntica al jaguar)
    los propaga hasta el atributo DOM custom del nodo raíz;
  - `LuciernagaTrazado` / `ChivitoTrazado` (`TrazadoBase`) los esparce dentro del
    objeto `data` → atributos DOM custom.
  Inofensivo y **exactamente el comportamiento que ya tiene `JaguarTrazado` hoy**:
  el test pre-existente "entrada y vuelta conservan el slug del cuerpo elegido"
  monta `AbejaTransicion` con `Cuerpo: PortalComponent` para los 7 tipos y pasa,
  validando el contrato runtime real (incluye el nuevo cableado de los 3).
- Defaults correctos sin intervención: linterna `'normal'`, chivito modo `'normal'`
  (punk solo en actuación), zarigüeya estado `'idle'`.

`data-creature` queda correcto en los tres (`zariguya`, `luciernaga`, `chivito-punk`),
igual al campo `especie` del registro — el handoff ya no cambia de especie.

## 3. Control negativo (criterio 3) — el test ROJO real

Test nuevo en `compaiRegistry.test.js`: *"el portal 2D→3D de
zarigüeya/luciérnaga/chivito es la TINTA Trazado, NO la piel vieja"* — afirma por
IDENTIDAD de módulo los tres `PortalComponent` y el `OsoBaston` intacto.

Procedimiento ejecutado a mano:

1. Revertí `import ZariguyaTrazado ...` → `import { Zariguya } ...` (y su asignación)
   en el árbol de trabajo.
2. `npx vitest run .../compaiRegistry.test.js` → **ROJO**: `1 failed | 13 passed`,
   fallando exactamente el caso nuevo ("zariguya volvió a la piel vieja").
3. Restauré la tinta → **verde**: `14 passed (14)`.

## 4. Base vs rama (criterio 4) — mismos números, cero fallas nuevas

`npx vitest run src/visual/creatures src/visual/mundo3d` medido en las DOS versiones
(base = `origin/dev` @ `054ca5d78`, que era el HEAD de esta rama antes del cambio):

| | base (origin/dev) | rama |
|---|---|---|
| Test files | 3 failed \| 90 passed (93) | 3 failed \| 90 passed (93) |
| Tests | 5 failed \| 1237 passed \| 1 expected fail \| 4 skipped (1247) | 5 failed \| 1238 passed \| 1 expected fail \| 4 skipped (1248) |

Las **mismas 5 fallas pre-existentes** (comparadas por nombre, no por conteo):
3× `GuacamayaCompaiCompai.test.jsx` (data-pose), 1× `Luciernaga.render.test.jsx`
(`IDLE_PERFILES.luciernaga.noche.freq` undefined), 1× `LuciernagaCompaiEscena.test.jsx`
(freq 2.03 vs <2). La rama suma exactamente 1 test (el nuevo) y pasa. **0 fallas nuevas.**

## 5. Verificación

| chequeo | resultado |
|---|---|
| `npx vitest run src/visual/mundo3d/escenas/__tests__/compaiRegistry.test.js` | ✅ 14 passed (13 pre + 1 nuevo) |
| `npx vitest run src/visual/creatures src/visual/mundo3d` | ✅ sin fallas nuevas (ver §4) |
| `npx eslint <archivos del cambio> --max-warnings=0` | ✅ limpio |
| `npx eslint . --max-warnings=0` (repo completo) | ⚠️ se queda sin heap en este entorno (OOM de Node, pre-existente, independiente del cambio) |
| `npm run build` | ✅ built in ~15s (exit 0) |
| `npx tsc --noEmit -p jsconfig.json` | ✅ idéntico base vs rama: 755 errores pre-existentes (173 en `src/visual/mundo3d`), **0** mencionan los archivos del cambio |

Nota: `origin/dev` avanzó 3 commits durante la ejecución (`39b4e4cf4`, `764a96caf`,
`95237705e`); ninguno toca `compaiRegistry.js` ni los `*Trazado.jsx`/pieles viejas
(verificado con `git diff --name-only`), así que no hay riesgo de conflicto.

## 6. Decisiones conservadoras tomadas (cláusula anti-pregunta)

1. **Import default** de las fachadas `*Trazado` (no named exports), imitando
   exactamente la línea del jaguar ya cableada.
2. **`animo`/`energia` se dejan fluir como atributos DOM custom** en vez de
   interceptarlos con un wrapper local: es el comportamiento vigente del jaguar
   (superficie gemela, testeada por el handoff) y el brief prohíbe inventar props
   en los componentes de tinta.
3. **Sin rebase sobre los 3 commits nuevos de dev** (no tocan estos archivos);
   el PR contra `dev` resuelve el fast-forward naturalmente.
