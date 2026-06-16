# src/store — Stores Zustand

Estado global de la aplicación usando [Zustand](https://github.com/pmndrs/zustand).

## Stores

| Store | Archivo | Responsabilidad |
|-------|---------|----------------|
| **Asset** | `useAssetStore.js` | Assets y logs: CRUD, hidratación desde IndexedDB, addAsset, addLog, refillMaterial |
| **Log** | `useLogStore.js` | Logs filtrados por asset, tenant, tipo |
| **Agent Notification** | `useAgentNotificationStore.js` | Notificaciones del agente (badge count, últimos mensajes) |
| **Agent Outbox** | `useAgentOutboxStore.js` | Outbox de mensajes pendientes de envío |
| **Agent Queue** | `useAgentQueueStore.js` | Cola de requests del agente |
| **Alert** | `useAlertStore.js` | Alertas globales (toast notifications) |
| **Case Study** | `useCaseStudyStore.js` | Casos de estudio (demo + reales) |
| **Ollama Warm** | `useOllamaWarmStore.js` | Estado de precalentamiento del modelo Ollama |
| **Prefs** | `usePrefsStore.js` | Preferencias del usuario (idioma, región, unidades) |
| **Theme Background** | `useThemeBackgroundStore.js` | Imagen de fondo dinámica por tema/clima |

## Patrones

- Cada store es un hook Zustand creado con `create()`
- Persistencia opcional via `persist` middleware (localStorage)
- Selectores atómicos para evitar re-renders innecesarios
- Acciones asíncronas para operaciones IndexedDB/FarmOS
- Tenant-aware: filtrado por `finca_id` activo

## Reglas del modelo de datos (inviolables)

1. **IA jamás muta Asset directo.** Toda inferencia entra como `log--observation` con `metadata.ai`
2. **Vistas derivadas NO se almacenan** como campo de Asset. Se computan en hooks/selectores
3. **Surcos, camas, zonas son Assets `bundle:land`**, nunca padres estructurales
