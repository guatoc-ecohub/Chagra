# ARCHITECTURE_STATE.md — Chagra PWA

> Auditoría read-only para preparación de liberación open source.
> Fecha: 2026-04-08 · Repo: `/home/kortux/Chagra` · Branch: `master`

---

## 1. Pila Tecnológica y Dependencias

**Runtime / Build**
- React **19.2.4** + react-dom 19.2.4
- Vite **8.0.0** (`@vitejs/plugin-react` 6.0.0), ES Modules (`"type": "module"`)
- Node / npm. Sin TypeScript.

**Estado y datos**
- **Zustand** 5.0.12 (estado global)
- **localforage** 1.10.0 (tokens OAuth)
- IndexedDB nativo (`ChagraDB` v3) vía `src/db/assetCache.js` y `src/services/syncManager.js`

**PWA**
- `workbox-build` 7.4.0 + `workbox-window` 7.4.0 (instalados; `public/sw.js` actualmente es manual, no generado por Workbox)

**UI**
- TailwindCSS 3.4.19, PostCSS 8.5.8, Autoprefixer 10.4.27
- `lucide-react` 0.577.0

**Tooling**
- ESLint 9.39.4 (`react-hooks`, `react-refresh`)

**Scripts npm** (`package.json`)
- `dev` → vite · `build` → vite build · `preview` → vite preview · `lint` → eslint

---

## 2. Árbol de Directorios Core

```
Chagra/
├── public/
│   ├── sw.js                  # Service Worker manual (cache "chagra-v2")
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.jsx               # Bootstrap: initDB → SW register → React render
│   ├── App.jsx                # Router hash-based (>1000 LOC) + screens
│   ├── index.css
│   ├── assets/                # hero.png, vite.svg
│   ├── components/
│   │   ├── AssetsDashboard.jsx      # Tabs structure/equipment/material/plant
│   │   ├── NetworkStatusBar.jsx     # Online/Syncing/Synced/Error (z-100)
│   │   ├── TelemetryAlerts.jsx      # Inyección automática de tareas
│   │   ├── WorkerHistory.jsx        # Trazabilidad pendientes / done
│   │   ├── PendingTasksWidget.jsx
│   │   ├── SyncIndicator.jsx
│   │   ├── MaintenanceScreen.jsx
│   │   ├── ObservationScreen.jsx
│   │   └── TaskLogScreen.jsx
│   ├── db/
│   │   └── assetCache.js      # CRUD IndexedDB (assets, taxonomy_terms, sync_meta)
│   ├── services/
│   │   ├── apiService.js      # fetch/sendToFarmOS (JSON:API)
│   │   ├── assetService.js
│   │   ├── authService.js     # OAuth2 tokens (localforage)
│   │   └── syncManager.js     # Cola pending_transactions, retry, eventos
│   └── store/
│       └── useAssetStore.js   # Zustand: plants/structures/equipment/materials
├── scripts/
│   └── seed-tasks.sh          # Seeder de tareas demo
├── index.html · manifest.json · vite.config.js
├── tailwind.config.js · postcss.config.js · eslint.config.js
├── .env · .env.local          # ⚠ contienen secretos (ver §5)
└── package.json · package-lock.json
```

Entry points: `index.html` → `src/main.jsx` → `src/App.jsx`. SW: `public/sw.js`.

---

## 3. Flujo Offline-First Actual

**Viaje del dato (escritura optimista):**

```
[Componente UI]
    │  user submit (formulario, telemetría, etc.)
    ▼
[useAssetStore (Zustand)]                  src/store/useAssetStore.js
    │  addAsset / updateAsset / removeAsset
    ▼
[assetCache (IndexedDB · ChagraDB v3)]     src/db/assetCache.js
    │  put() / bulkPut() en store "assets"
    │
    │  En paralelo:
    ▼
[syncManager.saveTransaction()]            src/services/syncManager.js
    │  Inserta en store "pending_transactions"
    │  { type, payload, endpoint, timestamp, synced:false, retries:0 }
    ▼
[Service Worker · public/sw.js]
    │  cache "chagra-v2" (Network-First en /api/, Cache-First en estáticos)
    │  evento "sync" (sync-pending-transactions)
    │  postMessage({ type:'SYNC_REQUESTED' }) → clients
    ▼
[main.jsx listener]                        src/main.jsx:34
    │  syncManager.syncAll()
    ▼
[syncManager.syncAll()]
    │  for tx in getPendingTransactions():
    │     syncTransaction(tx) → sendToFarmOS(endpoint, payload)
    │     ok → deleteTransaction(id)
    │     err → markRetry(id) (MAX_RETRIES=3 → CustomEvent 'syncError')
    ▼
[FarmOS JSON:API]                          ${VITE_FARMOS_URL}/api/...
    │
    ▼
[syncFromServer()] refresca Zustand ← assetCache ← FarmOS
    │
    ▼
[NetworkStatusBar] consume eventos syncComplete / syncError
```

**Lectura:** `useAssetStore.hydrate()` rellena el estado desde IndexedDB al montar; `syncFromServer()` refresca cuando hay red. Tokens OAuth viven en `localforage` (`farmos_access_token`, `farmos_refresh_token`, `farmos_token_expiry`).

**IndexedDB · ChagraDB v3** stores:
- `assets` (keyPath `id`, índices `asset_type`, `cached_at`)
- `taxonomy_terms` (keyPath `id`, índice `type`)
- `sync_meta` (keyPath `key`)
- `pending_transactions` (keyPath `id`, índices `timestamp`, `type`)
- `pending_tasks` (keyPath `id`, índices `timestamp`, `status`)

**Service Worker (`public/sw.js`)**
- Cache estáticos: `/`, `/index.html`, `/manifest.json`, `/icons.svg`, `/favicon.svg`
- API GET → Network-First, cachea respuesta OK
- API POST/PUT/DELETE → Network only, fallback cache lectura
- `sync` tag `sync-pending-transactions` → postMessage al cliente

---

## 4. Inventario de Deuda Técnica (WIP)

### 4.1 Manejo de cola — falla bloqueante de IndexedDB
| # | Archivo | Línea | Riesgo | Detalle |
|---|---------|-------|--------|---------|
| 1 | `src/services/syncManager.js` | 156–171 | **ALTO** | `syncAll()` no diferencia HTTP 4xx vs 5xx. Un 400/401 se reintenta hasta `MAX_RETRIES=3` y queda marcado pero **no se purga** de la cola, manteniéndose en `pending_transactions` indefinidamente. |
| 2 | `src/services/apiService.js` | 33–36 / 58–61 | ALTO | `sendToFarmOS` / `fetchFromFarmOS` lanzan `Error` genérico sin exponer `response.status`; el caller no puede decidir reintentar vs descartar. |
| 3 | `src/services/syncManager.js` | 161 | MEDIO | No hay backoff exponencial entre reintentos: ráfagas pueden saturar el backend tras una caída. |
| 4 | `src/services/syncManager.js` | 181–183 | MEDIO | Refresh post-sync de `useAssetStore` envuelto en `console.warn`; un fallo silencia el estado real. |

### 4.2 Try/catch y robustez
| # | Archivo | Línea | Detalle |
|---|---------|-------|---------|
| 5 | `src/services/apiService.js` | 27, 53 | `fetch()` sin `AbortController` ni timeout → requests pueden colgarse indefinidamente en redes intermitentes. |
| 6 | `src/App.jsx` | (root) | Sin `ErrorBoundary` envolviendo el árbol de componentes; cualquier excepción render-time tumba toda la PWA. |
| 7 | `src/main.jsx` | 9 | `syncManager.startNetworkMonitoring()` puede invocarse antes de que el SW registre listeners → race condition al primer `online`. |
| 8 | `src/components/NetworkStatusBar.jsx` | ~45 | Polling de stats cada 1500 ms: aceptable, pero acoplado a `setInterval` sin cleanup robusto en unmount múltiple. |

### 4.3 Acoplamiento de identificadores
- `DEFAULT_LOCATION_ID` está hardcoded en **5 lugares** distintos (ver §5). Cualquier despliegue requiere editar código fuente, no configuración.

### 4.4 Marcadores explícitos
- Grep de `// TODO`, `// FIXME`, `// WIP` sobre `src/`: **0 coincidencias.** La deuda no está anotada en código.

---

## 5. Open-Source Blockers (URGENTE)

> Listado exhaustivo. **Bloquean publicación pública.** Cada item indica archivo y línea para parametrización.

### 5.1 🔴 SECRETOS CHECK-IN — REVOCAR INMEDIATAMENTE
| Secreto | Archivo | Línea | Acción |
|--------|---------|-------|--------|
| `VITE_HA_ACCESS_TOKEN` (JWT Home Assistant, exp 2036) | `.env` | 6 | **Revocar token en HA, eliminar archivo del repo, purgar de git history.** |
| `VITE_HA_ACCESS_TOKEN` (mismo JWT, duplicado) | `.env.local` | 5 | Idem. |
| `VITE_FARMOS_CLIENT_ID` = `5zCVyS0X0tbdB7qimvstFCHkdoPA0EAn6zt16G4yCL4` | `.env.local` | 3 | Rotar client OAuth en FarmOS, eliminar del repo. |

> ⚠ Tanto `.env` como `.env.local` están presentes en el working tree. Validar `.gitignore` antes de cualquier `git add`. Si ya fueron commiteados en algún punto del histórico, requieren `git filter-repo` / `bfg`.

### 5.2 🔴 UUID de ubicación hardcoded (`72156273-6be8-4d20-9816-a370256dd22a`)
| Archivo | Línea | Contexto |
|---------|-------|----------|
| `src/App.jsx` | 645 | `{ id: '72156273-...', name: 'Guatoc (Principal)' }` |
| `src/App.jsx` | 655 | `locationId` por defecto en estado inicial |
| `src/components/AssetsDashboard.jsx` | 92 | `const DEFAULT_LOCATION_ID = '72156273-...'` |
| `src/components/TelemetryAlerts.jsx` | 60 | Payload tarea "riego de emergencia" |
| `src/components/TelemetryAlerts.jsx` | 170 | Payload tarea "aplicación de biol" |
| `src/components/TelemetryAlerts.jsx` | 313 | Payload tarea "monitoreo de arvenses" |
| `src/components/TelemetryAlerts.jsx` | 424 | Payload tarea "compostera" |

**Parametrización propuesta:** `VITE_DEFAULT_LOCATION_ID` consumido desde un único módulo `src/config/defaults.js`.

### 5.3 🔴 Nombre del proyecto / finca ("Guatoc")
| Archivo | Línea | Contexto |
|---------|-------|----------|
| `src/App.jsx` | 645 | `name: 'Guatoc (Principal)'` literal en seed UI |
| `CLAUDE.md` | 1 y siguientes | Manifiesto interno completo, no apto para repo público |
| `deployment_report_input_log.md` | 5, 16 | Logs internos con datos de despliegue |
| `manifest.json` | name | "Chagra" — neutro, OK; revisar branding final |

### 5.4 🔴 Identidades personales
| Identidad | Archivo | Línea |
|-----------|---------|-------|
| Usuario SSH `kortux` | `CLAUDE.md` | 6, 35, 37 |
| Usuario `kortux` | `deployment_report_input_log.md` | 5 |

> No se hallaron literales `Javier`, `javier`, `parrado` en `src/`. Quedan acotados a documentación interna fuera del repo (`/home/kortux/.claude/CLAUDE.md`).

### 5.5 🔴 IPs y hosts hardcoded
| Valor | Archivo | Línea |
|-------|---------|-------|
| `192.168.1.100` | `CLAUDE.md` | 6, 35, 37 |
| `127.0.0.1:8081` (default fallback) | `scripts/seed-tasks.sh` | 9 |

### 5.6 🔴 Dominios productivos
| Valor | Archivo | Línea |
|-------|---------|-------|
| `ha.guatoc.co` | `CLAUDE.md` | 14 |
| `ai.guatoc.co` | `CLAUDE.md` | 15 |
| Mención `cloudflared` (perímetro) | `CLAUDE.md` | 8 |

### 5.7 🟡 Puertos en literal
Todos en `CLAUDE.md` (no en código fuente):
- `:8081` FarmOS · `:8123` Home Assistant · `:11434` Ollama

En `src/` los puertos se consumen vía `VITE_FARMOS_URL`, lo cual es correcto. **No se hallaron literales de puerto en `src/`.**

### 5.8 🟡 Coordenadas GPS por defecto
- Búsqueda de `lat:`, `lng:`, literales decimales tipo coordenada en `src/`: **sin coincidencias.** ✅

### 5.9 🟡 URLs absolutas a FarmOS sin envvar
- Todas las llamadas en `src/services/apiService.js`, `authService.js`, `syncManager.js` usan `import.meta.env.VITE_FARMOS_URL`. ✅
- Excepción: `scripts/seed-tasks.sh:9` usa `127.0.0.1:8081` como fallback. Reemplazar por `${FARMOS_URL:?must be set}`.

### 5.10 🟡 Gestión de entorno
- **No existe `.env.example`** en la raíz. ❌ Bloqueante para onboarding OSS.
- Variables que deberían documentarse en `.env.example`:
  ```
  VITE_FARMOS_URL=
  VITE_FARMOS_CLIENT_ID=
  VITE_HA_ACCESS_TOKEN=
  VITE_DEFAULT_LOCATION_ID=
  ```
- `.gitignore` debe incluir explícitamente `.env`, `.env.local`, `.env.*.local`.

### 5.11 🟡 Documentos internos en el repo
| Archivo | Acción recomendada |
|---------|--------------------|
| `CLAUDE.md` | Mover fuera del repo o reemplazar por `CONTRIBUTING.md` neutro. |
| `deployment_report_input_log.md` | Eliminar del repo (contiene IPs, usuarios, UUIDs). |

---

## Resumen ejecutivo

| Categoría | Severidad | Estado |
|-----------|-----------|--------|
| Secretos en repo (tokens, client IDs) | 🔴 Crítica | ✅ Mitigado — `.gitignore` cubre `.env`/`.env.local`, nunca commiteados |
| UUID de ubicación hardcoded | 🔴 Crítica | ✅ Resuelto — `FARM_CONFIG.LOCATION_ID` vía envvar (2026-04-08) |
| IPs / hosts internos en docs | 🔴 Crítica | ✅ Resuelto — `deployment_report_input_log.md` eliminado |
| Branding "Guatoc" filtrado a `src/` | 🔴 Crítica | ✅ Resuelto — 0 ocurrencias en `src/` (2026-04-13) |
| Falta `.env.example` | 🟡 Alta | ✅ Resuelto — incluye 5 variables (+ `VITE_HA_ACCESS_TOKEN`) |
| Manejo cola HTTP 4xx bloqueante | 🟡 Alta | ✅ Resuelto — 4xx descarta, 5xx reintenta con backoff exponencial |
| Sin `ErrorBoundary` ni timeout fetch | 🟡 Media | ✅ Resuelto — `ErrorBoundary.jsx` + `fetchWithTimeout` 10s |
| App.jsx monolítico (>1000 LOC) | 🟡 Media | ✅ Resuelto — componentes extraídos, lazy loading (2026-04-13) |
| Chunk bundle >500kB | 🟡 Media | ✅ Resuelto — vendor splitting, chunk principal 55kB (2026-04-13) |
| Sin backoff exponencial en sync | 🟡 Media | ✅ Resuelto — `BASE_BACKOFF_MS * 2^(retries-1)` (2026-04-13) |
| Marcadores TODO/FIXME explícitos | 🟢 Limpio | 0 |

**Prerequisitos mínimos para publicar — Estado:**
1. ~~Revocar y eliminar tokens~~ → `.gitignore` activo, nunca en history.
2. ~~Crear `.env.example` y `src/config/defaults.js`~~ → Implementados.
3. ~~Externalizar `DEFAULT_LOCATION_ID` y branding~~ → `FARM_CONFIG` centralizado.
4. ~~Mover/eliminar docs internos~~ → `deployment_report_input_log.md` eliminado.
5. ~~Endurecer `syncManager` ante 4xx~~ → Descarte + backoff exponencial.
6. ~~`ErrorBoundary` y `AbortController`~~ → Implementados y wired.

**Mejoras Fase 0 (2026-04-13):**
- Code-splitting: `LoginScreen`, `HarvestLog`, `SeedingLog`, `InputLog`, `PlantAssetLog` extraídos de `App.jsx`.
- `savePayload` extraído a `src/services/payloadService.js`.
- Lazy loading con `React.lazy` + `Suspense` en todas las rutas.
- Vendor splitting: `vendor-react` (182kB), `vendor-icons` (18kB), `vendor-state` (29kB).
- Chunk principal reducido de **602kB → 55kB** (gzip 171kB → 16kB).
