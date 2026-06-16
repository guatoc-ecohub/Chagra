# ARQUITECTURA.md — Chagra PWA

> Estado arquitectonico del proyecto. Actualizado: 2026-06-16 . v1.0.52

## 1. Pila Tecnologica

| Capa | Tecnologia |
|------|-----------|
| Framework | React 19 + react-dom 19 |
| Build | Vite 8 (Rolldown), ES Modules, target es2022 |
| Estado | Zustand 5 (global), IndexedDB nativo (offline) |
| Tokens | localforage (OAuth2 Bearer) |
| UI | TailwindCSS 3, lucide-react |
| PWA | Service Worker manual, Background Sync |
| Lint | ESLint 9 (react-hooks, react-refresh) |
| Tests | Vitest (unitarios), Playwright (E2E) |
| CI/CD | GitHub Actions (self-hosted NixOS runner) |

## 2. Arquitectura de Directorios

```
src/
+-- main.jsx
+-- App.jsx
+-- components/ (common/, dashboard/, hoy/, juego/, AgentScreen/, Settings/, charts/)
+-- config/ (defaults.js, glaciarAccess.js, extensionistaAccess.js, etc.)
+-- constants/ (assetStatuses, etc.)
+-- core/ (moduleRegistry.js, bootstrap-oss.js)
+-- db/ (dbCore.js, assetCache.js, logCache.js, mediaCache.js, catalogDB.js)
+-- services/ (150+ modulos de logica de negocio)
+-- store/ (useAssetStore.js, etc.)
+-- hooks/ (useTheme.js, useGeolocation.js, etc.)
+-- utils/ (dateFormatter.js, geo.js, etc.)
+-- styles/ (biopunk, nature, minimalist)
```

**Patrones clave:**
- Offline-First: Zustand <- IndexedDB <- FarmOS API
- Escritura optimista: UI actualiza -> IDB commit -> sync en background
- Code-splitting: React.lazy en 30+ rutas
- Selectores shallow en dashboard para evitar re-renders

## 3. Flujo Offline-First

```
[UI] -> [Zustand store] -> [IndexedDB] -> [syncManager queue]
                                                |
                                      [SW background sync]
                                                |
                                      [FarmOS JSON:API]
                                                |
                                      [syncFromServer -> IndexedDB -> Zustand]
```

- Sync diferencia HTTP 4xx (descartar) vs 5xx (reintentar con backoff)
- MAX_RETRIES=3, backoff: 1s x 2^(retries-1)

## 4. Modelo de Datos

Dos primitivas planas: **Asset** (mutable) y **Log** (append-only, inmutable).

Reglas inviolables:
1. IA jamas muta Asset directo (entra como log--observation)
2. Vistas derivadas NO se almacenan como campo
3. Zonas son Assets bundle:land, NUNCA padres estructurales

## 5. Agente Conversacional

RAG + sidecar agro-mcp opcional + streaming Ollama + guardas de output + memoria conversacional.

## 6. CI/CD

Merge gates: CodeQL SAST + Playwright E2E offline-first.
Deploy automatico via GitHub Actions con rsync y bump de SW cache.

## 7. Licencia

GNU AGPLv3. Ver LICENSE.
