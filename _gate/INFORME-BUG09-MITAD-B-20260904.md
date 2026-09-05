# Informe BUG-09 Mitad B: el onboarding NO se repite al volver a entrar

Carril: dc-A-onboarding-no-se-repite-20260904 · 2026-09-05 · repo: `chagra` (público).
Rama: `fix/bug09-onboarding-no-repite-20260904` desde `origin/dev`.
Veredicto: **Mitad B VERIFICADA en runtime**. En la segunda entrada (reabrir la app y
re-login), el onboarding NO reaparece. Evidencia abajo.

## Qué se probó

Un pase de entradas seguidas en la MISMA sesión de navegador, con el usuario nuevo
`e2e-operator` (contexto de navegador fresco, sin flags previos):

| Entrada | Qué se hace | Onboarding | Destino decidido por `resolveDestinoPostLogin()` |
| --- | --- | --- | --- |
| 1 | Login de usuario nuevo | APARECE (captura) | `onboarding-perfil` (flags vacíos, `seen=false`) |
| 1b | Clic en "Saltar todo" | desaparece | `dashboard` (escribe `chagra:profile:skipped:v1:e2e-operator=1`) |
| 2a | Cerrar y reabrir la app (arranque nuevo con sesión viva) | NO aparece | `dashboard` |
| 2b | Cerrar sesión y volver a entrar por el login | NO aparece | `dashboard` |

El estado que decide cada entrada se registró en crudo (ver
`capturas-canal-dc/bug09-mitadB-evidencia.txt`):

- Entrada 1 antes de entrar: `flags:{}`, `seen:false`, `decision:"onboarding-perfil"`.
- Entrada 1 con onboarding visible: `active_tenant_id=e2e-operator` (la sesión NO se cayó).
- Tras "Saltar todo": `chagra:profile:skipped:v1:e2e-operator:"1"`, `seen:true`,
  `decision:"dashboard"`.
- Entrada 2a (reabrir): mismos flags, `decision:"dashboard"`, testid `onb2-saltar-todo`
  con `count()=0`.
- Entrada 2b (logout + re-login): mismos flags, `seen:true`, `decision:"dashboard"`,
  `onb2-saltar-todo` con `count()=0`.

En 2a y 2b el dashboard real se renderiza ("Tareas pendientes" visible), o sea la
segunda pregunta del gate visual ("¿se lee como lo que debe ser?") también pasa a
nivel de DOM: no es que falte el onboarding por un error, es que cae en el dashboard.

## Cómo se resolvió la sesión (el bloqueo del intento anterior)

Se eligió el camino 1 del encargo (mock del lado de la sesión), porque no había
credenciales válidas y el encargo prohíbe fabricar tokens. Verificado hoy:
`https://farmos.guatoc.co/` y sus endpoints responden `302` (Cloudflare Access) desde
este host, así que no hay camino de sesión real viable sin credenciales.

El mock consiste en dos interceptaciones de red, el MISMO patrón que ya usa
`tests/offline.spec.js` (verde en CI):

1. `**/oauth/token` responde 200 con un token fake (`expires_in: 3600`), igual que CI.
2. `**/api/**` (todo el tráfico a farmOS JSON:API, o al proxy local de farmOS en dev)
   se BLOQUEA con `route.abort('blockedbyclient')`.

Por qué esto sostiene la sesión: `apiService` solo dispara `expireSession()` ante una
respuesta `401`/`403` (el 401 del farmOS real de dev con token fake era lo que
expulsaba al harness ~1-2 s después del login). Un bloqueo de red NO es un 401: la
petición falla como error de red, la sesión queda intacta y el dashboard offline-first
renderiza igual (contrato del producto, misma base que el gate offline de CI). En la
evidencia quedan las peticiones que el mock abortó (operador photo, logs, assets,
ollama/kokoro warm-up), sin ningún 401.

Canario por contenido antes de medir: se pidió el árbol servido por `:5173` y se
verificó que `/src/App.jsx` y `/src/services/userProfileService.js` contienen
`resolveDestinoPostLogin` (el fix BUG-09). El harness mide la rama correcta, no un
server ajeno. `reuseExistingServer:false` + `--strictPort` hacen que un puerto ocupado
falle alto.

## El harness

- `_gate/bug09-mitad-b.spec.js`: el spec. Partió de `_gate/canal-dc-bugs08-09.spec.js`
  (mismos selectores de login y de `onb2-saltar-todo`), no desde cero.
- `_gate/playwright.bug09.config.js`: config dedicada (el spec vive en `_gate/`, fuera
  del `testDir` de `playwright.config.js`). Levanta su propio vite en `:5173` con la
  raíz del repo como cwd (sin eso, vite servía 404 desde `_gate/`).

Detalle de implementación que costó una corrida: "volver a entrar" es un arranque
NUEVO de la app, y `page.goto` que solo cambia el hash hace navegación same-document
(sin reboot de la SPA). El spec fuerza `page.reload()` después del `goto` para que corra
el boot real en cada entrada (así 2a y 2b son arranques genuinos, no la misma página
viva).

## Evidencia

Capturas headed (chromium de la máquina sobre X vivo) en
`_gate/capturas-canal-dc/`:

- `bug09-mitadB-entrada1-onboarding.png` (onboarding oscuro, página completa 1265x2385).
- `bug09-mitadB-entrada1-dashboard-tras-saltar.png`
- `bug09-mitadB-entrada2a-reabrir-dashboard.png`
- `bug09-mitadB-entrada2b-relogin-dashboard.png`
- `bug09-mitadB-evidencia.txt` (estado que decide en cada entrada + peticiones mockeadas
  + errores de consola)

Verificación de las capturas por este carril: el modelo de este carril no recibe
imágenes (sin visión), así que NO certifico el contenido visual de los PNG a ojo. Hice
dos verificaciones sustitutas honestas: (a) assertions de DOM en cada entrada (aparición
y desaparición del testid `onb2-saltar-todo`, dashboard con "Tareas pendientes" visible)
y (b) saneo programático de píxeles (onboarding: 96.8% oscuro, mean RGB 8/13/30; los
tres dashboards: claros/medios, sin dominancia oscura, archivos distintos entre sí).
El operador debe mirar los PNG antes de cerrar.

## Errores de consola observados

Solo ruido esperado del bloqueo offline-first (`Failed to load resource` y los
"Error obteniendo tareas / sincronizando activos" de `useAssetStore`/`PendingTasksWidget`
cuando farmOS no responde, mismos que tolera el gate offline de CI) y dos warnings
React preexistentes ajenos a BUG-09 (botón anidado en el selector de avatar del
onboarding, casing de un data-attribute). Ningún error de auth ni `expireSession`
durante las tres entradas.

## Alcance y límites

- Solo Mitad B de BUG-09. No se tocó código de producto (el fix ya vive en `origin/dev`
  desde el PR #3134); el entregable es el harness de verificación.
- No se probó con sesión real contra farmOS (sin credenciales, no se fabricaron).
- No se corre en CI: es un gate de carril en `_gate/`, a correr con
  `npx playwright test --config _gate/playwright.bug09.config.js` (y `--headed` para las
  capturas).
