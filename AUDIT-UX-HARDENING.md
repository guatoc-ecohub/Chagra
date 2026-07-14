# Auditoría UX Hardening — prod.chagra.app

> Rama `fix/ux-hardening-prod`. Fecha: 2026-07-14.

## FASE 1 — Auth gate

### Bug encontrado
`ProdChagraApp.jsx` usaba `isAuthenticated()` (función ASYNC que lee de localforage/IndexedDB) de forma SÍNCRONA:
- `useState(() => isAuthenticated())` → retorna un Promise (siempre truthy)
- `if (isAuthenticated())` → mismo bug
- Consecuencia: el auth gate NUNCA bloqueaba. La app entraba directo sin login.

### Fix
- `auth` ahora arranca como `null` (indeterminado)
- `isAuthenticated()` se llama con `.then()` en los `useEffect`
- Mientras `auth === null`, se muestra `ChagraGrowLoader`
- Una vez resuelto, `auth` es `true` o `false` real
- Si no está autenticado, redirige a `login`

**Archivo:** `src/prodApp/ProdChagraApp.jsx`

## FASE 2 — Service Worker / Offline

### Bug encontrado
- El SW de prod usaba el mismo `CACHE_NAME = chagra-<sha>` que el build principal
- Un usuario que visitaba ambos sitios veía conflictos de caché
- La solución era prefijar con `chagra-prodapp-` para prod

### Fix
- `scripts/build-prod.mjs` ahora tiene un paso post-build que reescribe `CACHE_NAME` en `dist-prod/sw.js`
- `chagra-${SHA}` → `chagra-prodapp-${SHA}`
- `chagra-dev` → `chagra-prodapp-dev`
- El SW original (`public/sw.js`) NO se modifica

**Archivo:** `scripts/build-prod.mjs`

### Verificación
```
$ grep CACHE_NAME dist-prod/sw.js
const CACHE_NAME = `chagra-prodapp-${SW_BUILD_SHA}`;
```

## FASE 3 — Ciclo de vida del audio

### Revisión
- `EntradaValle3D.jsx` ya tiene `stopSpeak()` en cleanup de `useEffect` (línea 296)
- El `decir` tiene guard `saludado.current` que evita re-hablar
- `ttsService.js` tiene `stop()` que pausa audio + revoca URLs
- No se encontró bug de loop — la infraestructura ya es correcta

**Sin cambios necesarios.**

## FASE 4 — Mundos que no abren

### Revisión
- Smoke test confirmó 127/127 rutas OK, sin crashes
- Verificación de wiring 3D→2D: 47 mapeos, todos OK
- Los 2 "huérfanos" detectados (`mercado→mercados`, `vender→mercados`) NO son huérfanos reales — `mercados` se registra vía PENDIENTE_DECISION en el RUTAS map de ProdChagraApp
- `getMapaNucleo()` (helper del manifiesto) no incluye PENDIENTE, por eso daba falso — pero el router SÍ incluye PENDIENTE

**Sin mundos rotos.**

## Resumen de cambios

| Archivo | Cambio | Fase |
|---|---|---|
| `src/prodApp/ProdChagraApp.jsx` | Auth gate: isAuthenticated async real | 1 |
| `scripts/build-prod.mjs` | SW CACHE_NAME → chagra-prodapp- prefijo | 2 |
| (sin cambios) | Audio cleanup verificado correcto | 3 |
| (sin cambios) | Wiring verificado, 0 huérfanos reales | 4 |
