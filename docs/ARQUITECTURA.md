# docs/ARQUITECTURA.md — Arquitectura de Chagra PWA

## Data Flow

```
Campesino (mobile/tablet)
       │
       ▼
┌──────────────────┐
│   PWA (React)    │  Service Worker (offline-first)
│   IndexedDB      │  Cache: chagra-v<N>
│   localStorage   │  Sync: pending_transactions
└──────┬───────────┘
       │ /api/* (relativo, proxy via Nginx)
       ▼
┌──────────────────┐
│  Nginx (Alpha)   │  Reverse proxy + static files
│  TLS termination │  Routes: /api/ → sidecar, / → PWA
└──────┬───────────┘
       │
       ├──────────────┐
       ▼              ▼
┌──────────────┐  ┌──────────────┐
│ Agro-MCP     │  │  Ollama      │
│ Sidecar      │  │  (LLM local) │
│ FastAPI       │  │  granite-3.1 │
│ /api/chat    │  │  /api/ollama │
│ /api/extract │  └──────────────┘
│ /api/ingest  │
└──────┬───────┘
       │
       ├──────────────┐
       ▼              ▼
┌──────────────┐  ┌──────────────┐
│ Apache AGE   │  │  FarmOS      │
│ (PostgreSQL) │  │  (Drupal)    │
│ Knowledge    │  │  Assets/Logs │
│ Graph        │  │  JSON:API    │
└──────────────┘  └──────────────┘
```

## Component Tree (src/)

```
src/
├── App.jsx                     # Root: router + providers
├── main.jsx                    # Entry point (Vite)
├── components/
│   ├── AgentScreen/            # Agent chat interface
│   ├── common/                 # Shared UI primitives
│   ├── charts/                 # Data visualization
│   ├── dashboard/              # Dashboard widgets
│   ├── hoy/                    # "Hoy en la finca" module
│   ├── juego/                  # Ludificacion (Julieta)
│   ├── Settings/               # App configuration
│   ├── AgentFab.jsx            # Floating action button
│   ├── ErrorBoundary.jsx       # Error boundaries per route
│   ├── InformesScreen.jsx      # Reports/export screen
│   ├── LoginScreen.jsx         # OAuth2 PKCE login
│   ├── ProfileScreen.jsx       # User profile / onboarding
│   └── ...                     # 140+ components
├── services/                   # Business logic layer
│   ├── agentService.js         # Agent orchestration
│   ├── aiService.js            # AI (vision/chat)
│   ├── apiService.js           # FarmOS API client
│   ├── authService.js          # OAuth2 PKCE
│   ├── climaService.js         # Weather integration
│   ├── exportService.js        # CSV export
│   ├── llmTelemetryService.js  # LLM telemetry
│   ├── outputGuards.js         # Anti-hallucination guards
│   ├── sidecarClient.js        # Agro-MCP client
│   ├── syncManager.js          # Offline sync queue
│   └── ...                     # 150+ services
├── store/                      # Zustand state management
│   ├── useAgentNotificationStore.js
│   ├── useAgentOutboxStore.js
│   ├── useAgentQueueStore.js
│   ├── useAlertStore.js
│   ├── useAssetStore.js        # Assets + logs
│   ├── useCaseStudyStore.js
│   ├── useLogStore.js
│   ├── useOllamaWarmStore.js
│   ├── usePrefsStore.js
│   └── useThemeBackgroundStore.js
├── hooks/                      # React custom hooks
│   ├── useAgentAvatarType.js
│   ├── useAssetPerformance.js
│   ├── useBackgroundImage.js
│   ├── useCinemaMode.js
│   ├── useClimaAtmosphere.js
│   ├── useConsumptionMetrics.js
│   ├── useFarmProcessConfirm.js
│   ├── useGeolocation.js
│   ├── useGlobalKeyboardShortcuts.js
│   ├── useIdleDetection.js
│   ├── useIdleVisibility.js
│   ├── usePhotoUrl.js
│   ├── useScrollRestoration.js
│   ├── useTheme.js
│   └── useVoiceRecorder.js
├── db/                         # IndexedDB layer
│   ├── dbCore.js               # Schema (v14)
│   ├── assetCache.js           # Asset persistence
│   ├── logCache.js             # Log persistence
│   └── mediaCache.js           # Blob storage
├── data/                       # Static data bundles
│   ├── animal-diagnostics.json
│   ├── soil-diagnostics.json
│   ├── water-diagnostics.json
│   ├── restauracion.json
│   ├── campesino-synonyms.json
│   └── ...
├── config/                     # App configuration
├── constants/                  # Magic values / enums
├── core/                       # Module registry + runtime
├── styles/                     # CSS modules / themes
├── types/                      # Type definitions
├── utils/                      # Pure utility functions
└── pages/                      # Route-level pages
```

## Service Architecture

| Capa | Responsabilidad | Ejemplos |
|------|---------------|----------|
| **API** | Comunicacion con backends | `apiService.js`, `sidecarClient.js` |
| **Auth** | OAuth2 PKCE + tokens | `authService.js` |
| **Agent** | Asistente conversacional | `agentService.js`, `agentIntentParser.js` |
| **AI** | Vision, LLM, RAG | `aiService.js`, `ragRetriever.js`, `ollamaStream.js` |
| **Guards** | Anti-alucinacion post-LLM | `outputGuards.js`, `streamGuards.js` |
| **Telemetry** | Metricas anonimas | `llmTelemetryService.js`, `voiceTelemetryService.js` |
| **Sync** | Cola offline-online | `syncManager.js`, `payloadService.js` |
| **Export** | Trazabilidad CSV | `exportService.js`, `cuadernoPDF.js` |
| **Climate** | Pronostico + fenologia | `climaService.js`, `phenologyCalculator.js` |
| **Soil/Water** | Diagnosticos agroecologicos | `soilDiagnostic.js`, `waterDiagnostic.js` |
| **Inventory** | Materiales + insumos | `inventoryService.js`, `inventoryReconcile.js` |
| **Game** | Ludificacion finca | `fincaGameService.js`, `fincaGameStateService.js` |

## IndexedDB Schema (v14)

| Store | Key | Descripcion |
|-------|-----|-------------|
| `assets` | `id` (UUIDv4) | Entidades FarmOS: plant, land, material, equipment, sensor |
| `logs` | `id` (UUIDv4/ULID) | Eventos append-only: harvest, seeding, input, observation, activity |
| `pending_transactions` | `id` | Cola de sync offline: create/update/delete pendientes |
| `llm_telemetry` | `id` (lm_*) | Metricas LLM (sin prompts): modelo, latencia, tokens, processor |
| `voice_telemetry` | `id` (vt_*) | Metricas voz (sin audio): event_type, duration_ms, accepted |
| `agent_requests` | `id` | Requests del agente: status, grounding, latency, tokens |
| `rag_telemetry` | `id` | Metricas RAG: passages, hits, latency |
| `farm_process` | `id` | Procesos de finca en curso |
| `glaciar_drafts` | `id` | Borradores de reportes glaciar |
| `media_cache` | `uri` | Blobs de fotos/audio cacheados |

## Route Map

| Ruta | Componente | Descripcion |
|------|-----------|-------------|
| `/` | `HomeScreen` | Dashboard principal "Hoy en la finca" |
| `/login` | `LoginScreen` | OAuth2 PKCE con FarmOS |
| `/oauth/callback` | `OAuthCallback` | Callback OAuth2 |
| `/agent` | `AgentScreen` | Asistente conversacional Chagra |
| `/profile` | `ProfileScreen` | Perfil + onboarding |
| `/informes` | `InformesScreen` | Reportes y exportacion |
| `/assets` | `AssetsDashboard` | Inventario de assets |
| `/asset/:id` | `AssetDetailView` | Detalle de un asset |
| `/tasks` | `TaskScreen` | Tareas pendientes |
| `/ciclo/:id` | `CicloCultivoScreen` | Ciclo de cultivo |
| `/observaciones` | `ObservationScreen` | Observaciones / bitacora |
| `/inventario` | `InventoryDashboard` | Inventario de insumos |
| `/suelo` | `SoilDiagnosticScreen` | Diagnostico de suelo |
| `/extensionista` | `ExtensionistaScreen` | Vista del extensionista |
| `/glaciar` | `GlaciarReporteScreen` | Reportes glaciar |
| `/restauracion` | `RestauracionPlanPDFButton` | Planes de restauracion |
| `/settings` | `Settings/*` | Configuracion de la app |

## Service Worker (offline-first)

- **Cache**: `chagra-v<N>` — assets estaticos cacheados en install
- **Sync**: `syncManager.js` — cola `pending_transactions` con backoff exponencial
- **Update**: `swUpdateAck.js` — notificacion de nueva version disponible
- **Network**: Estrategia cache-first con degradacion elegante a offline
