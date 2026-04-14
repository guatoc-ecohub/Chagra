# ARCHITECTURE_STATE.md — Chagra PWA

> Estado arquitectónico del proyecto. Actualizado: 2026-04-13 · v0.3.1

---

## 1. Pila Tecnológica

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + react-dom 19 |
| Build | Vite 8 (Rolldown), ES Modules, target es2022 |
| Estado | Zustand 5 (global), IndexedDB nativo (offline) |
| Tokens | localforage (OAuth2 Bearer) |
| UI | TailwindCSS 3, lucide-react |
| PWA | Service Worker manual, Background Sync |
| Lint | ESLint 9 (react-hooks, react-refresh) |
| CI/CD | GitHub Actions (self-hosted NixOS runner) |

---

## 2. Arquitectura

```
src/
├── main.jsx                    # Bootstrap: env validation → initDB → SW → React
├── App.jsx                     # Router hash-based (~200 LOC), lazy loading
├── components/
│   ├── DashboardView           # Inline en App.jsx, selectores Zustand reactivos
│   ├── AssetsDashboard.jsx     # Tabs structure/equipment/material/plant/land
│   ├── TelemetryAlerts.jsx     # Sensores HA + reglas + IA (Ollama)
│   ├── NetworkStatusBar.jsx    # Estado de red (aria-live)
│   ├── ErrorBoundary.jsx       # Captura errores con reinicio de vista
│   ├── LoginScreen.jsx         # OAuth2 login
│   ├── HarvestLog.jsx          # Formulario cosecha
│   ├── SeedingLog.jsx          # Formulario siembra
│   ├── InputLog.jsx            # Formulario aplicación insumos
│   ├── PlantAssetLog.jsx       # Registro de activos
│   ├── WorkerDashboard.jsx     # Vista de campo por proximidad
│   ├── FarmMap.jsx             # Mapa Leaflet con assets geolocalizados
│   └── ...
├── config/
│   ├── defaults.js             # FARM_CONFIG desde env vars
│   ├── env.js                  # Validación de env vars al startup
│   ├── taxonomy.js             # Taxonomía de cultivos
│   └── materials.js            # Presets de biopreparados
├── db/
│   ├── dbCore.js               # Singleton IndexedDB (ChagraDB v3)
│   ├── assetCache.js           # CRUD assets + sync_meta + cooldowns
│   ├── logCache.js             # Cache de logs por asset
│   └── mediaCache.js           # Cache de evidencia fotográfica
├── services/
│   ├── apiService.js           # fetchWithTimeout + JSON:API headers
│   ├── authService.js          # OAuth2 tokens via localforage
│   ├── syncManager.js          # Cola offline, backoff exponencial, 4xx/5xx
│   └── payloadService.js       # Resolución de entidades anidadas
├── store/
│   ├── useAssetStore.js        # Zustand: assets + sync + CRUD atómico
│   └── useLogStore.js          # Zustand: logs por asset + pull paralelo
└── hooks/
    └── useAssetPerformance.js  # Bio-eficiencia por cultivo
```

**Patrones clave:**
- Offline-First: Zustand ← IndexedDB ← FarmOS API
- Escritura optimista: UI actualiza → IDB commit → sync en background
- Code-splitting: React.lazy en 13 rutas, vendor splitting (react/state/icons)
- Selectores shallow en dashboard para evitar re-renders innecesarios

---

## 3. Flujo Offline-First

```
[UI] → [Zustand store] → [IndexedDB] → [syncManager queue]
                                              ↓
                                    [SW background sync]
                                              ↓
                                    [FarmOS JSON:API]
                                              ↓
                                    [syncFromServer → IndexedDB → Zustand]
```

- Sync diferencia HTTP 4xx (descartar) vs 5xx (reintentar con backoff)
- MAX_RETRIES=3, backoff: 1s × 2^(retries-1)
- Eventos: `syncCompleted`, `syncError`, `syncComplete` via CustomEvent

---

## 4. Telemetría

Sensores Zigbee → Home Assistant → Nginx proxy → TelemetryAlerts.jsx

**Flujo de análisis (no bloqueante):**
1. Fetch datos de HA (~1s)
2. Reglas deterministas ejecutan **inmediatamente** (umbrales de humedad/temperatura)
3. Ollama (Qwen3.5) enriquece en background (15s timeout, `/no_think`)
4. UI muestra reglas + badge de estado IA (thinking/done/empty/error)

---

## 5. Build Output (v0.3.1)

| Chunk | Tamaño | gzip |
|-------|--------|------|
| index (app core) | 40 kB | 12 kB |
| vendor-react | 182 kB | 57 kB |
| vendor-state | 30 kB | 9 kB |
| vendor-icons | 19 kB | 7 kB |
| AssetsDashboard | 79 kB | 20 kB |
| FarmMap (Leaflet) | 157 kB | 46 kB |
| 20+ route chunks | 2-15 kB | 1-5 kB |

---

## 6. CI/CD

Runner self-hosted en NixOS con:
- `nodejs_22`, `git`, `rsync` via `extraPackages`
- `ReadWritePaths` para directorio de deploy
- Secrets: `VITE_HA_ACCESS_TOKEN` inyectado en build-time
- SW cache version bumped con commit hash post-deploy
- rsync `--chmod=D755,F644` para permisos Nginx

---

## 7. Configuración requerida

Variables de entorno (ver `.env.example`):
```
VITE_FARMOS_URL=                  # Vacío para proxy relativo via Nginx
VITE_FARMOS_CLIENT_ID=            # OAuth client ID de FarmOS
VITE_HA_ACCESS_TOKEN=             # Long-lived token de Home Assistant
VITE_DEFAULT_LOCATION_ID=         # UUID de la ubicación principal
VITE_DEFAULT_FARM_NAME=           # Nombre visible de la finca
```
