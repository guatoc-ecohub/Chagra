# Bitácora — cerrar la fuga de acceso sin sesión en `chagra.app`

**Rama:** `fix/cerrar-fuga-login-2026-07-26`
**Worktree:** `/home/kortux/Workspace/wt-cerrar-fuga` (host `stg`)
**Commit base:** `origin/dev` = `3ef4954d` *(fijo — `dev` se está moviendo: hay otro agente
mergeando el compAI y la rama `integra/dev-a-main-2026-07-26` esperando remate)*

**Límites del encargo (no negociables):**
- ❌ NO mergear a `main` · ❌ NO desplegar a `chagra.app` · ❌ `git add -A`
- ❌ eslint no se corre (`--no-verify`, `LEFTHOOK_EXCLUDE=eslint`); se verifica con `npx vite build`
- ✅ Rama propia, pusheada, entregada para revisión del operador

**Alcance:** cerrar la fuga. **No** reconstruir los dos productos (app vs. valle público).

---

## Bitácora cronológica

### Paso 0 — contexto (no se re-descubre lo ya medido)

Host verificado: `hostnamectl` → **`stg`** (no `alpha`). Sin `sudo` fuera de whitelist.
Versión leída de `package.json`: **1.0.55**.

La fuga **ya venía medida** por otro agente en `ops/bitacora/merge-dev-main.md`
(worktree `/home/kortux/Workspace/wt-integra-dev-main`). No se re-mide. Lo que dice:

- **104 rutas públicas, 62 de ellas 3D**, resueltas **antes** de `isAuthenticated()`.
- **La raíz sin sesión NO va a login: va al valle.**
- **El valle público entrega el router real** (`onNavigate={navigate}`) sin gate de `sinSesion`.
- **`navigate` nunca re-chequea auth.**

La decisión de producto que ordena el arreglo está en
`Chagra-strategy/ops/PLAN-NOCHE-3D-2026-07-25.md` §"la dirección de entrada se INVIERTE":

| | `chagra.app` — la app | el valle navegable — público |
|---|---|---|
| Quién entra | el campesino, **login desde la entrada** | cualquiera, **sin login** |
| Qué es primero | **el 2D** | **el valle 3D** |
| Qué valle muestra | **el PRIVADO** — la finca real | el público, para mostrar |

Worktree creado aparte para **no pisar** al agente del compAI, que tiene WIP sin commitear en
`/home/kortux/Workspace/chagra` (rama `feat/compai-cableado-vision`).

### Paso 1 — el hallazgo que decide el alcance: son DOS bundles, no uno

Antes de tocar nada había que saber **a qué host le pega cada archivo**, porque cerrar de más
rompe el producto público. Verificado en el árbol:

| Entry HTML | Monta | Build | Destino |
|---|---|---|---|
| `index.html` → `src/main.jsx` | **`src/App.jsx`** | `vite build` → `dist/` | `deploy.yml` rsync a `/mnt/fast/appdata/farmos-pwa/` = **`chagra.app`, la app** |
| `index-prod.html` → `src/main-prod.jsx` | `src/prodApp/ProdChagraApp.jsx` | `scripts/build-prod.mjs` → `dist-prod/` | `prod.chagra.app` / `3d.guatoc.co` = **el 3D público** |
| `mercado.html` → `src/entries/mercado.jsx` | mockup del mercado | mismo `vite build` (input `mercado`) | `mercado.chagra.bio` |

**Consecuencia:** la fuga descrita vive en `App.jsx`, que es **exactamente `chagra.app`**.
Tocar `App.jsx` **no** toca el 3D público (`ProdChagraApp`, otro bundle, con su propio gate) ni
el mercado (`mercado.html`, entry aparte que ni siquiera importa `App.jsx`).
**El arreglo puede ser duro sin romper lo público, porque lo público no pasa por acá.**

`isThreeDWorldHost('3d.guatoc.co')` (`src/services/canonicalHostRedirect.js`) **no se toca**:
es coincidencia EXACTA de host a propósito — `chagra.guatoc.co`, el dominio legado, debe seguir
rebotando al canónico. Convertirlo en comodín rompería ese rebote.

### Paso 2 — la evidencia ANTES, con el navegador y sin sesión

Sonda nueva y reproducible: `scripts/diag/sonda-fuga-login.mjs`. Abre `dist/` servido por
`vite preview`, en un contexto de navegador **limpio** (sin token, sin storage), y por cada parada
anota **qué pantalla quedó montada** + captura. Corrida contra el build de `3ef4954d` **sin tocar**:

`ops/capturas/fuga-login-2026-07-26/antes/`

- **`01-raiz.png`** — la raíz sin sesión: **"El valle de mi finca" / "SU FINCA, HOY"**, minimapa con
  hotspots, *"Toque un lugar para entrar"* y la barra de voz *"Pregúntele a su finca…"*.
  **Ni rastro de login.**
- **`04-inventario.png`** — `#inventario` sin sesión: **el mismo valle**. Todas las rutas reales
  caían ahí, porque el boot mandaba al valle todo lo que no fuera vitrina.

**Y la puerta, que es lo que de verdad importa.** El valle recibía `onNavigate={navigate}`; ese
mismo `navigate` está publicado en el bus de eventos de la app (`chagraNavigate`), que es lo que
dispara un hotspot al tocarlo. La sonda lo empuja desde afuera —sin depender de acertarle a un
canvas 3D— y **sin sesión**:

| Caso | Qué se ve, sin cuenta |
|---|---|
| **`12-puerta-evento-inventario.png`** | **La pantalla REAL de Activos.** Chip de finca, pestañas *Siembras / Zonas / Infraestructura / Insumos*, buscador, botón **"Registrar Siembra"** y el indicador **"Sincronizando"** corriendo. |
| **`13-puerta-evento-dashboard.png`** | El onboarding real: *"BIENVENIDO A CHAGRA — **Esta chagra es suya**"*, **PASO 1 DE 5**, con "Sincronizando" activo. |

Los 13 casos: **12 de 13 sin login**. El único que mostraba login era `#login` explícito.

La fuga está fotografiada, no deducida: **un anónimo escribía en la app.**

### Paso 3 — el arreglo

Tres cambios, uno por cada cosa que el encargo nombra. El primero es la raíz de las otras dos.

**1. `navigate` re-chequea autenticación — la puerta.**
`navigate` era el único sitio que llama `setCurrentView` (verificado: `grep setCurrentView` da 1 sola
asignación), así que es un **chokepoint real**: gatearlo cierra TODAS las entradas a la vez —puertas
del valle, eventos `chagraNavigate`/`chagra:nav`, deep-links, botones internos— sin perseguirlas una
por una.

Se partió en dos: `aplicarVista` (monta, no pregunta) y `navigate` (pregunta, después monta).
La decisión vive aparte y es **pura**, en `src/config/vistasPublicas.js` → `decidirNavegacion()`.

El problema a resolver: `navigate` es **síncrono** (lo llaman handlers de click) y `isAuthenticated()`
es **async** (lee IndexedDB). Se resolvió con un **espejo síncrono tri-estado** (`sesionRef`):

| `sesionRef` | qué hace `navigate` |
|---|---|
| `true` | pasa, **síncrono** — el campesino no paga ni un tick de más |
| `false` | desvía a `login` |
| `null` (todavía no sabemos) | **no adivina**: confirma con `isAuthenticated()` y recién ahí decide |

El tri-estado es el punto fino: adivinar "sí" deja la fuga abierta; adivinar "no" botaría al campesino
al login en cada arranque en frío. Si el almacenamiento ni siquiera se puede leer, **fail-closed**.
El espejo se actualiza en los 5 puntos donde la sesión cambia de verdad: chequeo de boot, login OK,
callback OAuth (OK y error), logout, y `chagra:session-expired`.

**2. La raíz sin sesión va a login.** `navigate(hash === 'login' ? 'login' : 'valle3d')` → `navigate('login')`.

**3. El valle ya no entrega el router crudo.** `valle3d` **no** está en `VISTAS_PUBLICAS`, así que un
anónimo no llega; y el `onNavigate` que recibe es el `navigate` **gateado**, así que aunque se montara
por otro camino, sus puertas no abren nada real sin sesión.

**Lo que quedó público, a propósito** — `VISTAS_PUBLICAS` se construye **desde `MOCKUP_HASH_ROUTES`**
(`construirVistasPublicas(Object.values(...))`), no con una lista nueva a mano ni con un
`startsWith('mockup_')`:
- se abre **exactamente lo que el router ya abría** antes del check de auth → no se cierra de más;
- una vitrina nueva entra sola, sin acordarse de tocar dos listas;
- el prefijo habría dejado afuera `mundo_casa_adentro` (mapeada desde `casa_adentro`), que **sí** es
  pública. Hay un test que lo fija.

Más las 3 de la entrada: `loading`, `login` y **`oauth-callback`** — esta última va abierta a
propósito: cuando vuelve del proveedor todavía **no hay token**, gatearla mataría el login que está
justo por completarse.

**Lo que NO se tocó:** `isThreeDWorldHost` sigue siendo coincidencia exacta de host (convertirlo en
comodín rompería el rebote del dominio legado `chagra.guatoc.co`), y el bundle público del 3D
(`ProdChagraApp`) no se tocó en absoluto.

### Paso 4 — verificación

**Tests del gate** (`src/config/__tests__/vistasPublicas.test.js`, nuevos): **14/14 verdes.**
Cubren las tres ramas del tri-estado, que el campesino con sesión **entra a todo**, que las vitrinas
siguen abiertas, que `oauth-callback` no se gatea, y los bordes (`''`/`null`/vista inventada → login).

**Composición del set público** (medido sobre el árbol, no estimado):

| | |
|---|---|
| rutas hash de vitrina (`MOCKUP_HASH_ROUTES`) | **98** |
| vistas públicas distintas que producen | **96** |
| \+ vistas de entrada (`loading`, `login`, `oauth-callback`) | **99 en total** |
| vistas sin el prefijo `mockup_` | **1: `mundo_casa_adentro`** |
| ¿`valle3d` público? | **no** |
| ¿`dashboard` público? | **no** |

Esa única fila sin prefijo es la razón de peso para construir el set **desde la tabla** y no con un
`startsWith('mockup_')`: el prefijo habría cerrado `casa_adentro`, que sí es pública. Hay test.

**Chokepoint verificado, no supuesto:** `grep -n setCurrentView src/App.jsx` → **una sola
asignación**, dentro de `aplicarVista`. Por eso gatear `navigate` cierra todas las entradas.
Y los despachadores del bus (`chagraNavigate` / `chagra:nav`) que viven fuera de `App.jsx`
—`FarmMap`, `AgentScreen`, `ProfileScreen`, `NetworkStatusBar`, `ClimaStrip`,
`InvasiveObservationLog`, `useGlobalKeyboardShortcuts`— entran todos por esos listeners, así que
también quedan gateados sin tocarlos.

**El gate REQUERIDO de CI no se rompe:** `playwright.yml` exige solo `offline.spec.js` (el resto de
la suite E2E es informativa y no bloquea merge). Ese spec va a `/#login` y espera el campo de
usuario — camino público, intacto.

**Build con el arreglo:** `npx vite build` → **EXIT=0**, 3m22s.

#### La prueba de afuera, DESPUÉS — `ops/capturas/fuga-login-2026-07-26/despues/`

Mismo navegador limpio, misma sonda, build con el arreglo. **13 de 13 paradas:**

| Parada | `vista` montada | ¿login? |
|---|---|---|
| `01-raiz` · `02-dashboard` · `03-agente` · `04-inventario` · `05-perfil` · `06-informes` | **`login`** | **SÍ** |
| `07-valle3d` — el valle privado de la app | **`login`** | **SÍ** |
| **`12-puerta-evento-inventario`** — la puerta que abría Activos | **`login`** | **SÍ** |
| **`13-puerta-evento-dashboard`** | **`login`** | **SÍ** |
| `08-vitrina-entrada-3d` | `mockup_entrada_3d` | no — **sigue abierta** ✅ |
| `09-vitrina-mercado` | `mockup_mercado` | no — **sigue abierta** ✅ |
| `10-vitrina-paramo` | `mockup_paramo_definitivo` | no — **sigue abierta** ✅ |

**El antes y el después, lado a lado:** antes **12 de 13 sin login** (incluida la pantalla real de
Activos y el onboarding); ahora **login en todo lo real y en las dos puertas**, y **exactamente las
3 vitrinas** siguen públicas. Ni una de más, ni una de menos.

`09-vitrina-mercado.png` se ve entero —*"Sepa a qué altura crece su comida"*, fincas por altitud,
productos— o sea que **lo público no se rompió**, no solo "no da login".

> Nota honesta sobre las capturas: en la parada `08` el `page.screenshot()` **venció el timeout**
> (las escenas 3D bajo swiftshader en `stg` tardan minutos) y esa PNG no se escribió en esta corrida.
> El **veredicto sí quedó registrado** (`vista: mockup_entrada_3d`), y la escena está fotografiada en
> `antes/08-*.png`, que es el mismo componente público. Lo mismo pasó con `antes/07`.

**Que el bundle servido es el NUEVO** (el otro agente ya se quemó hoy con un build verde y la app
muerta por caché de `node_modules`): se borró `node_modules/.vite` antes de construir, `node_modules`
es un **symlink** al del repo principal, y se comprobó que el marcador nuevo **está dentro del
bundle**: `grep __CHAGRA_VIEW__ dist/assets/*.js` → `main-COd84QdM.js`. Además la sonda lee ese mismo
marcador: en `antes/` el campo `vista` sale **`null`** (no existía) y en `despues/` sale con nombre —
o sea que las dos corridas son de bundles distintos, y eso queda probado por los datos, no por la fe.

#### La regresión que más fácil se cuela: dejar afuera al campesino

`ops/capturas/fuga-login-2026-07-26/con-sesion/` — misma sonda, misma build, pero **con token
sembrado** (`--sesion`). **9 paradas, 0 lo botaron a login:**

| Parada | vista montada |
|---|---|
| `01-raiz` · `02-dashboard` | `dashboard` |
| `03-agente` | `agente` (Angelita saludando) |
| `04-inventario` | `activos` |
| `05-perfil` | `perfil` |
| `06-informes` | `informes` |
| **`12-puerta-evento-inventario`** | **`activos`** — la puerta sigue abriendo para él |
| **`13-puerta-evento-dashboard`** | `dashboard` |

**La misma puerta, en tres estados** — es la prueba más limpia que salió de todo esto:

| | quién | qué se abre |
|---|---|---|
| `antes/12-*.png` | anónimo | **Activos** 🔴 la fuga |
| `despues/12-*.png` | anónimo | **login** ✅ cerrada |
| `con-sesion/12-*.png` | con sesión | **Activos** ✅ el campesino intacto |

> `07-valle3d` con sesión monta `dashboard`, no `valle3d`. **No es del arreglo:** `valle3d` **no tiene
> ruta hash** (`grep -c "'valle3d':" src/App.jsx` → **0**); se llega por la banda de MundosDeMiFinca
> con `navigate('valle3d')`, y `#valle3d` siempre cayó al `|| 'dashboard'`. Deuda previa.
>
> El banner *"El servidor tuvo un problema"* en esas capturas es que en `stg` no hay farmOS detrás
> del token sembrado. No toca el gate: la pantalla real **montó**, que es lo que se estaba probando.

#### Tests

`npx vitest run src/__tests__/ src/mockups/__tests__/mockupRoutes.reachability.test.jsx
src/config/__tests__/vistasPublicas.test.js --no-file-parallelism`
→ **12 archivos, 52 tests, 0 fallos.**

> ⚠️ **Casi reporto una regresión que no existía.** En una corrida ANTERIOR, con la sonda de
> chromium y el `vite preview` peleando por la CPU de `stg`, **6 tests de ruta de `App` fallaron**, y
> todos eran del tipo *"con sesión autenticada monta X"* — exactamente la regresión que este encargo
> advierte. Antes de tocar nada los corrí **en el worktree baseline `3ef4954d` sin mis cambios**
> (`/home/kortux/Workspace/wt-baseline-dev`): **pasaban**. Eso apuntaba a que eran míos. Pero
> aislados también pasaban, y con la máquina libre y `--no-file-parallelism` pasan los 52.
> Era **contención de CPU**, no el arreglo. Queda escrito porque el camino corto —"fallan 6, debe ser
> mi cambio" o "pasan solos, no pasa nada"— llevaba a la conclusión equivocada en las dos
> direcciones.

#### Cómo repetir la prueba

```bash
npx vite build
npx vite preview --port 4173 --host 127.0.0.1
# sin sesión (lo que ve alguien de afuera)
node scripts/diag/sonda-fuga-login.mjs --out ops/capturas/<dir>/despues
# con sesión (que el campesino no perdió acceso)
node scripts/diag/sonda-fuga-login.mjs --sesion --out ops/capturas/<dir>/con-sesion
```

---

## 🟡 La decisión que NO tomé yo — qué queda público

Las **96 vitrinas** siguen abiertas sin sesión. Es la lectura literal del encargo
(*"averiguá qué tiene que seguir accesible —landing, mercado, lo que se comparte por enlace— y no lo
cierres de más"*) y no contienen datos de finca: son las pantallas de discovery que se comparten por
enlace.

**Pero la tabla de producto dice, textual, que en `chagra.app` entra el campesino "login desde la
entrada, para todo".** Si "para todo" incluye las vitrinas, el cambio es **una línea**:

```js
// src/App.jsx — cerrar también las vitrinas en el dominio de la app
const VISTAS_PUBLICAS = construirVistasPublicas([]);
```

No lo hice porque cerrarlas rompería los enlaces compartidos y el descubrimiento, y el encargo pedía
explícitamente no cerrar de más. **La fuga —las pantallas con datos— queda cerrada en las dos
lecturas.** Es del operador decidir si las vitrinas se van también.

---

## Lo que NO pude verificar

| Qué | Por qué |
|---|---|
| **La app en `chagra.app` de verdad** | Probé `dist/` servido por `vite preview` en `stg`. **No desplegué** (prohibido) ni probé contra el host vivo. Si nginx sirve algo por fuera del bundle, no lo cubre esta prueba. |
| **El bundle público del 3D** (`dist-prod`) | Verifiqué **por código** que es otro entry (`index-prod.html` → `main-prod.jsx` → `ProdChagraApp`) y que `deploy.yml` solo rsyncea `dist/`. **No lo construí ni lo serví** para confirmar que su propio gate sigue igual — pero tampoco lo toqué. |
| **La suite E2E completa (40 specs)** | No corrida. Sí verifiqué que el **gate requerido** (`offline.spec.js`) usa un camino público y no se rompe. Los specs informativos que cargan la raíz sin sembrar sesión ahora verán login en vez del valle — antes tampoco llegaban a una pantalla real. |
| **La suite unitaria completa (913 archivos)** | No corrida. Corrí los tests del gate + los de ruta de `App`. |
| **eslint** | No corrido — instrucción explícita. Se verificó con `npx vite build`. |
| **Sesión real contra farmOS** | La sonda siembra un token válido en localforage (mismo patrón que `shot3d-ruta.mjs`). Es fiel **para el gate**, porque `isAuthenticated()` solo mira token + expiry; pero las pantallas no traen datos reales detrás. |
| **El deep-link se sigue perdiendo tras el login** | Un anónimo que abre `#agente` ahora ve login y, al entrar, aterriza en `dashboard`, no en el agente. **No es regresión** (antes se perdía igual, cayendo al valle), pero ahora se nota más. Guardar el destino y restaurarlo post-login es trabajo aparte. |
| **`isPreAuthView` usa `startsWith('mockup_')`** | Deuda **previa**, cosmética: `mundo_casa_adentro` no entra en ese guard, así que en esa vitrina se muestran banners/FAB globales. No es fuga de datos (sin sesión no hay datos). No lo toqué para no ampliar el alcance. |

