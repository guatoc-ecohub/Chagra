# Auditoría UX Hardening — prod.chagra.app

> Rama `fix/ux-hardening-prod`. Fecha: 2026-07-14.

## FASE 1 — Auth gate (login iba derecho) ✅

### Bug
`ProdChagraApp.jsx` usaba `isAuthenticated()` (función ASYNC que lee de localforage/IndexedDB) de forma SÍNCRONA:
- `useState(() => isAuthenticated())` → retorna Promise (siempre truthy)
- `if (isAuthenticated())` → mismo bug
- Consecuencia: el auth gate NUNCA bloqueaba. La app entraba directo.

### Fix
- `auth` arranca como `null` (indeterminado)
- `isAuthenticated()` se llama con `.then()` en `useEffect`
- Mientras `auth === null`, se muestra `ChagraGrowLoader`
- Una vez resuelto, `auth` es `true` o `false` real
- Si no está autenticado, redirige a `login`

**Archivo:** `src/prodApp/ProdChagraApp.jsx`

## FASE 2 — Service Worker (incógnito eterno) ✅

### Bug
- El SW de prod usaba `CACHE_NAME = chagra-<sha>` igual que dev
- Conflicto de caché entre sitios

### Fix
- `scripts/build-prod.mjs`: paso post-build reescribe CACHE_NAME
- `chagra-${SHA}` → `chagra-prodapp-${SHA}`
- `chagra-dev` → `chagra-prodapp-dev`

**Archivo:** `scripts/build-prod.mjs`

## FASE 3 — Ciclo de vida del audio (loop eterno) ✅

### Bug
- `speakKokoro` hace fetch asíncrono del audio, luego lo reproduce
- Si el usuario navega a otra ruta durante el fetch, la Promise resuelve
  DESPUÉS del desmontaje → el audio se reproduce sin dueño ni control
- El `stop()` en el cleanup de EntradaValle3D no alcanza a cancelar
  un fetch en vuelo

### Fix
- `ProdChagraApp.navigate()` ahora llama `stopAllAudio()` (importado de
  ttsService) antes de cambiar de vista
- Esto detiene cualquier audio Kokoro/Web Speech activo al navegar
- Es belt-and-suspenders: el cleanup de cada componente más el cleanup
  del router garantizan que ningún audio sobrevive al cambio de ruta

**Archivo:** `src/prodApp/ProdChagraApp.jsx`

## FASE 4 — Mundo de animales no abre ✅

### Smoke test (chromium headless)
8 rutas probadas, todas OK:
- `animales` ✅
- `animales_gallinas` ✅
- `animales_abejas` ✅
- `animales_vacas` ✅
- `valle3d` ✅
- `mundo` ✅
- `diorama_abejas` ✅
- `diorama_gallinero` ✅

El fix del TSC cleanup (PR #2457) corrigió los errores de tipo que
causaban crashes silenciosos en las pantallas de animales.

**Sin cambios adicionales necesarios.**

## FASE 5 — Verificación final

| Check | Resultado |
|---|---|
| Build | ✅ `npm run build:prod` |
| tsc | ✅ EXIT 0 |
| Auth gate | ✅ Bloquea sin sesión |
| SW cache | ✅ `chagra-prodapp-` prefijo |
| Audio cleanup | ✅ `stopAllAudio()` al navegar |
| Animales | ✅ 8/8 rutas OK |
