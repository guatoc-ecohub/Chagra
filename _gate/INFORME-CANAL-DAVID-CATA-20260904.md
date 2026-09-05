# INFORME — Canal David/Cata: cierre del frente (2026-09-04/05)

> Carril: `canal-david-y-cata-cerrar-frente-20260904` (opencode/deepseek-v4-flash).
> cwd: `/home/kortux/Workspace/chagra` · Base verificada: `origin/dev` @ `736eca52e`.
> Límite de carril registrado: las rutas `~/.config/telegram-attach-bot-token` y
> `/home/kortux/Workspace/Chagra-strategy/ops/CIERRE-FRENTE-DAVID-Y-CATA-20260904.md`
> estaban **prohibidas** para este carril; por eso este informe queda local en
> `_gate/` (convención de carriles opencode) y NO se commiteó en el repo público.

## TL;DR

- El **PR #3134 se MERGEÓ a `dev` el 2026-09-04 a las 20:39** (squash `95237705e`),
  antes de que este carril arrancara. La Tarea 1 (rebasarlo y empujarlo) quedó
  **obsoleta**: otro carril (`desconflictar-3134…`) ya la hizo y el operador mergeó.
  Este carril **verificó el resultado por contenido**, no rehízo el rebase.
- **BUG-08 y BUG-09 YA están en `dev` por contenido** (ver tabla). Quedan rojos de CI
  solo los de la BASE (`audit-integraciones`) y el job informativo `E2E suite completa`.
- **BUG-08 (alcance):** el fix hace el `RecountDrawer` alcanzable **solo desde la ruta
  Auditoría de Inventario** (`InventoryPage`). La ruta principal `Bodega`
  (`App.jsx:3376`) renderiza `InventoryDashboard` **sin** `onRecount`/`onViewAudit`,
  así que ahí los botones "Conteo manual"/"Bitácora" **no aparecen**. Ver §BUG-08.
- **BUG-09:** verificado en runtime headed que el onboarding **aparece solo** en el
  primer ingreso (captura + aserción DOM). La mitad "no se repite al volver" se
  sostiene con los unit tests del PR + el E2E oficial del repo (`offline.spec.js`,
  que primiza el flag done y cae al dashboard). Ver §BUG-09.
- **HC2 y HC3** del test duro siguen **sin ejecutar/cubrir** como casos completos.
  Mapa con file:línea en §HC2/HC3.

---

## Estado bug por bug (verificado por contenido en `origin/dev`)

| Bug | Qué es | Evidencia en `dev` (content) | Estado |
|---|---|---|---|
| BUG-01 | modal decía haber registrado y guardaba cero | `src/components/AgentScreen/AgentScreen.jsx:4614` `key={actionModal.gateId}` | **EN dev** |
| BUG-03a | 502 por argumentos vacíos del calendario | `src/services/sidecarClient.js:983` `omitEmptyCalendarioArgs()` + test `src/services/__tests__/sidecarClient.coerce.test.js:81` | **EN dev** |
| BUG-07 | P1: la foto colgaba el turno | `skipRag: true` en `AgentScreen.jsx:3583,3595,3735,3752` + `aiService.test.js:135-165` | **EN dev** |
| BUG-08 | `RecountDrawer` escrito y nadie lo cableaba (código muerto → `inventory_events` en 0) | `InventoryPage.jsx:114` pasa `onRecount`/`onViewAudit`; `InventoryDashboard.jsx` los consume y renderiza "Conteo manual"/"Bitácora" por tarjeta; `RecountDrawer` montado en `InventoryPage.jsx:168-173` | **EN dev (alcance parcial: ver §BUG-08)** |
| BUG-09 | onboarding nunca se disparaba solo al entrar | `userProfileService.js:1006-1013` `resolveDestinoPostLogin()`; `App.jsx:1794` (login password) y `App.jsx:1805` (oauth) navegan a su resultado | **EN dev** |

El commit del merge es `95237705e` ("fix(ui): rescata ValleHoverConfirm con tests en
verde, cablea RecountDrawer (BUG-08) y dispara onboarding al login (BUG-09) (#3134)").

### Checks del #3134 tras el merge (fuente: `gh pr checks 3134`)

- `tsc:check vs baseline` → **PASS** (era uno de los 4 rojos del brief; el rebase lo evaporó)
- `Offline-first E2E` → **PASS** (era el otro rojo "propio")
- `CLAAssistant` → PASS (patrón que el brief daba como rojo "del operador"; quedó verde)
- `audit-integraciones` → **FAIL** 🔴 rojo de BASE para todos (señala `mundo3d/`; no es del PR)
- `E2E suite completa (informativo)` → FAIL (job informativo de 30 min; no es un gate)
- `vitest`, `Check bundle sizes`, `Offline-first corpus` → PASS

### §BUG-08 — alcance real tras el fix

El cableo correcto vive en **`InventoryPage`** (ruta `auditoria_inventario`, alias
`auditoria-inventario`): `InventoryPage.jsx:114` entrega los callbacks al dashboard y
`InventoryPage.jsx:168` monta `RecountDrawer` cuando `recountTarget != null`. Los botones
por tarjeta se renderizan en `InventoryDashboard.jsx` **solo si los callbacks existen**:

- `InventoryDashboard.jsx` — bloque `{(onRecount || onViewAudit) && (…)}` con los botones
  "Conteo manual" (`data-testid=inventory-recount-<id>`) y "Bitácora".

La ruta que el usuario abre en el día a día, **`case 'bodega'` (`App.jsx:3356-3380`),
renderiza `<InventoryDashboard />` SIN callbacks** → en la Bodega principal los botones
NO se pintan y el `RecountDrawer` no es alcanzable desde ahí. El único camino es entrar a
"Auditoría" (botón `data-testid=bodega-open-auditoria`) y usar el dashboard de esa vista.

Esto está codificado además en los unit tests del PR:
`InventoryDashboard.recount.test.jsx` "sin callbacks cableados la tarjeta no muestra las
acciones (retrocompatible)". **Veredicto conservador:** BUG-08 quedó cableado pero la
puerta natural (Bodega) no lo expone; hay que decidir si el conteo manual debe vivir en la
Bodega principal o si Auditoría es la puerta intencional.

### §BUG-09 — evidencia de las dos mitades

Mitad A ("se dispara solo al entrar sin haberlo visto antes"), **verificada en runtime
headed** (chromium con X, `origin/dev`, vite local):
- contexto nuevo sin flags → login (`e2e-operator`, oauth stub) → **el onboarding aparece
  solo**: `getByTestId('onb2-saltar-todo')` visible, sin tocar ninguna tarjeta opt-in.
- Evidencia: `_gate/capturas-canal-dc/bug09-primer-ingreso-onboarding.png` (102 KB) +
  aserción DOM. Semántica: `resolveDestinoPostLogin()` (`userProfileService.js:1006`) =
  `'onboarding-perfil'` si `hasSeenProfileOnboarding()` es falso.

Mitad B ("no se repite al volver a entrar"):
- Unit tests del PR (verdes, corridos en este carril): `userProfileService.test.js`
  describe `resolveDestinoPostLogin (BUG-09)` — sin flags → onboarding; con done →
  dashboard; con skipped → dashboard (respeta #283). Además "per-user keying": los flags
  llevan sufijo por usuario, así que el onboarding es por persona.
- E2E oficial del repo `tests/offline.spec.js` (corrido en este carril sobre dev HEAD,
  2/2 verde): primiza el flag done del usuario y **cae al dashboard post-login**, que es
  exactamente el contrato "usuario recurrente no vuelve a ver onboarding".

Pruebas ejecutadas en este carril:
```
vitest (3 archivos del PR):  86 passed   # InventoryPage.recount, InventoryDashboard.recount, userProfileService
playwright offline.spec.js:  2 passed    # gate offline-first sobre dev
```

---

## §HC2 y HC3 — mapa (lo que piden, lo que hay, lo que falta)

Fuente de los casos: `Chagra-strategy/ops/specs/2026-08-28-hard-test-entrega-david-cata/spec.md`
y `…/specs/2026-08-31-CIERRE-SESION-2/CHECKPOINT.md` (HC2 y HC3 "NO ejecutados"; solo HC1 +
catálogo + adversarial). Este carril NO los implementa: es el mapa.

### HC2 — Onboarding + multi-usuario por roles
Pide (spec): (1) desde el login, la usuaria entra y ve el onboarding configurable; (2) la
admin de la finca **crea los usuarios de su finca**: adulto, niña (11) con acceso **solo
lectura** en lo general + Valle 3D completo + educativo/juegos primario, trabajadores, y
adultos mayores con perfil básico; (3) revisar lo ya codeado de perfiles por usuario.

Qué de eso está en `dev`:
- Onboarding que se dispara solo → **BUG-09 cerrado** (`App.jsx:1794/1805` +
  `OnboardingCondensado`, 6 pasos, captura vocación/rol/finca/animales →
  `userProfileService` `PROFILE_QUESTIONS`). El onboarding configura el **perfil del
  propio usuario**, no una finca multi-usuario.
- Perfiles/rol **por usuario** → existe el perfil per-user (keys con sufijo por tenant,
  `userProfileService.test.js` "per-user keying") y un gate de acceso por whitelist de
  username (`src/config/glaciarAccess.js` `CORDADA_WHITELIST`, `tieneAccesoGlaciar`,
  `esOperadorActual`) para el módulo glaciar. No es un modelo de roles hijo de finca.

Qué **falta** (no encontré en `src` fuera de `mockups/`):
- UI de la admin para **crear usuarios de la finca** (búsqueda de `createUser|addUser|
  entity/user|registerUser` en `src` → 0 resultados en código vivo).
- Modelo de **roles por miembro de finca** (niño solo-lectura, trabajador, adulto mayor
  básico) con gating de UI/permisos según rol; hoy el tenant es multi-**finca**
  (`useFincaActiveStore`, `MultiFincaModal`), no multi-usuario-con-roles.
- Perfil "mucho más básico" para tercera edad (tipografía/UX simplificada) — no hay evidencia.

### HC3 — Captura + infraestructura + auditoría IA + catálogo @2200msnm + E2E add→vende
Pide (spec): (1) revisión completa de audio/habla, foto, adjuntar foto e infraestructura;
(2) **auditoría dura de la IA**: grafo (AGE) · RAG · MCP · embeddings · LLMs; (3) catálogo
de especies para 2200 msnm con MIP, biopreparados, rendimiento; (4) E2E agregar planta →
vender en el mercado.

Qué hay en `dev` (parcial, para el mapa):
- Foto que colgaba el turno → **BUG-07 cerrado** (`skipRag`, `AgentScreen.jsx:1543,3583…`).
- Audio/habla → `src/components/VoiceCapture.jsx` (pipeline hablar → Whisper → extraer) y
  rutas `voz`/`voz_planta` (`App.jsx`).
- Mercado (rama "Vender") → `case 'mercado'` (`App.jsx:4099`) con `MercadosScreen`
  (offline-first; precio citado solo con fuente).
- Catálogo → bundle local (se valida con `scripts/validate-catalog-consistency.mjs`);
  el lado de MIP/biopreparados/rendimiento vive en el **grafo/sidecar**, no en este repo
  público (mismo límite ya documentado en `_gate/INFORME-DC-BUGS-20260904.md`).

Qué **falta / no se puede cerrar desde este repo**:
- La auditoría AGE · RAG · MCP · embeddings · LLM corre sobre el **sidecar y el grafo**
  (`chagra_kg`), que no están en este repositorio público. Desde el cliente solo se puede
  auditar el adaptador (`src/services/sidecarClient.js`) y los tests de contract del tool.
- El E2E completo "agrega planta → vende en mercado" no está como un solo flujo
  automatizado (existen piezas: alta de asset + ruta mercado).

---

## Tarea 1 — comentario dejado en el PR #3134

Sí (comentario de verificación, no merge). Ver el PR. Resumen del comentario: el PR ya
estaba mergeado al arrancar el carril; verificación por contenido en `dev`; checks verdes
de `tsc` y `Offline-first E2E`; rojos restantes son de base (`audit-integraciones`) y el
job informativo `E2E suite completa`; hallazgo de alcance de BUG-08 (Bodega principal no
cablea los callbacks).

## Lo que NO verifiqué (honesto)

1. **Capturas a Telegram**: prohibidas para este carril (ruta del token fuera de cwd).
   Las capturas quedan en `_gate/capturas-canal-dc/` y el operador juzga.
2. **No pude ver las capturas yo mismo**: este modelo no recibe imágenes; la evidencia
   funcional está en las aserciones DOM/unit/E2E (textuales) y las imágenes quedan como
   artefacto crudo para juicio humano.
3. **Flujo headed continuo BUG-08/09 completo** (login → dashboard → drawer / re-login):
   en este sandbox el fake-token choca con el farmOS real de `dev` (401 → `expireSession`
   → vuelve a login ~1-2 s tras montar el onboarding), así que no pude mantener una sesión
   estable para clickear "Saltar todo" y recorrer la Bodega/Auditoría en el mismo pase.
   Interceptar farmOS con 200 rompe el login (el whoami espera otra forma) y abortar toda
   la red tampoco completa el login. El harness necesita el backend real de
   `chagra-dev.guatoc.co` con credenciales reales, o un mock de farmOS fiel (shape del
   whoami + JSON:API), para un pase end-to-end estable. Lo que sí quedó demostrado en
   runtime: el onboarding aparece solo en el primer ingreso (mitad A de BUG-09).
4. **`audit-integraciones` rojo**: no lo perseguí (rojo de base, otro carril lo arregla).
5. **El drawes/Bodega en el pase headed**: no pude abrir el `RecountDrawer` en runtime;
   la apertura prellenada + persistencia `inventory_counted` la prueban los unit tests
   `InventoryPage.recount.test.jsx` (verdes).
6. **HC2/HC3**: solo mapa de código en el repo público; la auditoría de IA y el estado del
   grafo requieren acceso al sidecar/`Chagra-strategy` (el mapa de fuentes está arriba).
