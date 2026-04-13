# Casos de Verificación — v0.3.0

> Creados como parte de la auditoría de skills. Migrar a GitHub Issues cuando estén verificados.

## Caso 1 — Service Worker: API no cacheada en primera carga
- [ ] **Verificar:** C1 (SW routing bug fix)
1. DevTools > Application > Service Workers > Unregister
2. Recargar la app, iniciar sesion
3. Network tab, filtrar por `/api/`
4. Verificar que `/api/asset/plant` viene del servidor (no de SW cache)
- **Esperado:** Las requests a `/api/*` usan Network-First, no Cache-First

## Caso 2 — Sincronizacion paralela de activos
- [ ] **Verificar:** C2-C3 (Promise.all waterfalls)
1. DevTools > Network, throttle a "Slow 3G"
2. Navegar al Dashboard, observar requests `/api/asset/*`
- **Esperado:** Las 5 requests de assets salen simultaneamente (barras superpuestas en waterfall, no escalonadas)

## Caso 3 — Accesibilidad: lang, toast y tabs
- [ ] **Verificar:** C4, H4-H5, M7-M9
1. Inspeccionar HTML: `<html lang="es">` presente
2. Desconectar WiFi: NetworkStatusBar tiene `role="status"` y `aria-live="polite"`
3. Toast tiene `role="alert"` (error) o `role="status"` (success)
4. Activos: tabs tienen `role="tablist"` + `role="tab"` + `aria-selected`
5. Search input tiene `aria-label="Buscar activo"`

## Caso 4 — Responsive: dashboard en mobile estrecho
- [ ] **Verificar:** H6 (grid responsive) + H8 (safe-area)
1. DevTools responsive, iPhone SE (375x667)
2. Dashboard: contadores en 2 columnas (no 4), sin overflow
3. Header respeta `env(safe-area-inset-top)` en dispositivos con notch

## Caso 5 — Code-splitting: carga bajo demanda
- [ ] **Verificar:** Lazy loading + vendor splitting
1. DevTools > Network, filtrar JS
2. Login: solo `index-*.js`, `vendor-react-*.js`, `vendor-state-*.js`, `LoginScreen-*.js`
3. Navegar a Activos: se descarga `AssetsDashboard-*.js` bajo demanda
4. Navegar a Mapa: se descarga `FarmMap-*.js` (con Leaflet) solo al entrar

## Caso 6 — Focus visible y motion-reduce
- [ ] **Verificar:** M6 (focus rings) + H7 (prefers-reduced-motion)
1. Tab para navegar por el dashboard: anillo verde en cada elemento
2. DevTools > Rendering > Emulate `prefers-reduced-motion: reduce`
3. Recargar: spinner NO gira, animaciones detenidas
