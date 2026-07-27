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

*(el resto de la bitácora se completa en el mismo commit que el arreglo)*
