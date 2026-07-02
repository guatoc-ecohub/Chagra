# src/hooks — Catálogo de hooks React

## Hooks principales

| Hook | Descripción |
|------|-------------|
| `useTheme.js` | Tema claro/oscuro con persistencia en localStorage |
| `useGeolocation.js` | Geolocalización del dispositivo (GPS) |
| `useVoiceRecorder.js` | Grabación de voz con MediaRecorder API |
| `useAgentAvatarType.js` | Tipo de avatar del agente (colibrí, maíz, foto) |
| `useAssetPerformance.js` | Métricas de rendimiento de assets (cosechas, insumos) |
| `useBackgroundImage.js` | Imagen de fondo dinámica por clima/hora |
| `useCinemaMode.js` | Modo cine (pantalla completa, sin distracciones) |
| `useChagraStats.js` | Fetch de `/chagra-stats.json` (fuente única de verdad: especies/MIP/biopreparados/grafo) |
| `useClimaAtmosphere.js` | Datos atmosféricos en tiempo real |
| `useConsumptionMetrics.js` | Métricas de consumo de insumos |
| `useFarmProcessConfirm.js` | Confirmación de procesos de finca |
| `useGlobalKeyboardShortcuts.js` | Atajos de teclado globales |
| `useIdleDetection.js` | Detección de inactividad del usuario |
| `useIdleVisibility.js` | Visibilidad de la pestaña (Page Visibility API) |
| `usePhotoUrl.js` | URL de fotos con cache-busting |
| `useScrollRestoration.js` | Restauración de posición de scroll |

## Patrones

- Todos los hooks usan `useEffect` / `useState` / `useCallback` de React
- Persistencia via `localStorage` o stores Zustand
- Cleanup en `useEffect` return para evitar memory leaks
- Nombres con prefijo `use` (convención React hooks)
