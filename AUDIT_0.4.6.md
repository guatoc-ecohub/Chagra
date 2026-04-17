# AUDIT 0.4.6 — Auditoría Forense de Deuda Técnica

**Fecha:** 2026-04-16
**Alcance:** `src/` de Chagra PWA v0.4.6
**Metodología:** Escaneo estático read-only (Glob + Grep + Read). Sin ejecución de código.
**Resumen ejecutivo:** 14 hallazgos — 5 ALTA, 6 MEDIA, 3 BAJA. Dos vectores dominantes: (a) flags de sincronización sin `finally` que bloquean el pipeline offline, (b) ausencia de `AbortController`/timeout en llamadas a Ollama que puede colgar la UI indefinidamente.

---

## 1. Promesas Huérfanas

Promesas sin `try/catch` envolvente, sin `.catch()`, o sin timeout en operaciones de red/IndexedDB.

- **[ALTA] `src/services/aiService.js:41-80`** — `fetch()` a Ollama sin `AbortController` ni timeout. Una conexión colgada bloquea indefinidamente el análisis.
  ```js
  const response = await fetch(OLLAMA_URL, {
    method: 'POST', headers: { ... }, body: JSON.stringify({ ... })
  });
  ```
- **[ALTA] `src/services/authService.js:19-25`** — `response.json()` puede lanzar si el body no es JSON válido; no está cubierto por el `try` externo.
  ```js
  const response = await fetch(url, { method: 'POST', ... });
  if (!response.ok) throw new Error(...);
  const data = await response.json();
  ```
- **[ALTA] `src/components/EvidenceCapture.jsx:36-56`** — IIFE async dentro de `useEffect` sin `.catch()` raíz. Errores de `mediaCache.getByLogId()` escapan silenciosamente si el `try` interno no los atrapa.
  ```jsx
  useEffect(() => {
    if (!logId) return;
    (async () => {
      try { const existing = await mediaCache.getByLogId(logId); ... }
      catch (err) { console.error(err); }
    })();
  }, [logId, assetId]);
  ```
- **[MEDIA] `src/components/GuildSuggestions.jsx:50-63`** — `fetch('/api/ollama/api/chat')` sin timeout ni `AbortController`. Mismo riesgo que aiService.
- **[MEDIA] `src/services/payloadService.js:47`** — `sendToFarmOS()` retorna `result.data.id` sin validar que `result.data` exista; un 4xx con body alterno rompe.
- **[MEDIA] `src/components/EvidenceCapture.jsx:59-73`** — Segundo IIFE dentro del mismo `useEffect`; usa `console.warn` pero no propaga al estado.
- **[BAJA] `src/db/assetCache.js:47-50`** — Promesa IndexedDB envuelta correctamente, pero el consumidor (`bulkPut`) no aplica rollback si falla a mitad de batch.

---

## 2. Flujos de UI Incompletos

Componentes con I/O que no renderizan `isLoading`/`isError` al usuario, o permiten doble-submit.

- **[ALTA] `src/components/HarvestLog.jsx:54-97`** — `handleSave()` es `async` pero el botón no se deshabilita ni muestra spinner. Riesgo alto de doble-submit → registros duplicados en `pending_transactions`.
  ```jsx
  const handleSave = async () => {
    try { const result = await savePayload('harvest', payload); }
    catch (error) { console.error(error); onSave(...); }
  };
  ```
- **[ALTA] `src/components/SeedingLog.jsx:49-97`** — Mismo patrón que `HarvestLog`. Sin `setLoading`, sin `disabled`, sin feedback visual.
- **[MEDIA] `src/components/WorkerDashboard.jsx:97-120`** — `setCompleting(taskId)` sin `finally` correspondiente. Si `logCache.put()` falla, el botón queda "en progreso" indefinidamente.
- **[MEDIA] `src/components/PendingTasksWidget.jsx:12-39`** — `setError('Error...')` en el `catch` externo pero el fallback a IndexedDB no actualiza el estado de error si también falla.
- **[MEDIA] `src/components/LoginScreen.jsx:10-26`** — Gestiona `loading` correctamente, pero el error genérico (`'Error autenticando'`) oculta causas reales (red, credenciales, token expirado).
- **[BAJA] `src/components/InputLogForm.jsx:43-61`** — Spinner sí se muestra, pero el error solo llega como `CustomEvent('syncError')` sin render local de mensaje.

---

## 3. Fugas de Estado

Estado que no se limpia tras éxito/fallo — flags bloqueados, listeners sin cleanup, colas sin expurgar.

- **[ALTA] `src/db/syncManager.js:98-150`** — `this.isSyncing = true` sin bloque `finally` que garantice el reset. Si `getPendingTransactions()` tira, el flag queda `true` y **toda sincronización futura queda bloqueada** hasta recargar la PWA.
  ```js
  async syncAll() {
    if (this.isSyncing || !this.isOnline) return;
    this.isSyncing = true;
    try { const pendingTransactions = await this.getPendingTransactions(); ... }
    catch (error) { ... }
    // Falta: finally { this.isSyncing = false; }
  }
  ```
- **[ALTA] `src/components/WorkerDashboard.jsx:44,97-121`** — `completing` state set al inicio de `handleComplete`, sin `finally` para limpiarlo. Idéntico patrón al de `syncManager`.
- **[ALTA] `src/store/useLogStore.js:80-97`** — `window.addEventListener('syncCompleted', ...)` registrado a nivel de módulo, **sin `removeEventListener`**. Cada recarga de HMR acumula listeners → memory leak progresivo en dev y potencialmente en prod tras múltiples navegaciones.
  ```js
  if (typeof window !== 'undefined') {
    window.addEventListener('syncCompleted', async (event) => { ... });
  }
  ```
- **[ALTA] `src/components/EvidenceCapture.jsx:28-31,115-120`** — `setDiagnosing(true)` sin `finally`. Si `analyzeFoliage()` rechaza, el badge "diagnosticando" queda fijo.
- **[MEDIA] `src/store/useAssetStore.js:25-84`** — `selectedAssetId` no se resetea en la ruta de error. Puede quedar apuntando a un asset huérfano tras fallo de sync parcial.

---

## Plan de Remediación Sugerido (no incluido en este documento)

Priorización recomendada para el próximo patch (candidato `0.4.7`):

1. **P0** — Envolver `syncManager.syncAll()` en `try/finally` (1 línea, desbloquea todo el pipeline offline).
2. **P0** — Añadir `AbortController` con timeout de 30s a todos los `fetch` hacia Ollama (`aiService.js`, `GuildSuggestions.jsx`, `TelemetryAlerts.jsx`).
3. **P1** — Deshabilitar botones de submit durante `await savePayload(...)` en `HarvestLog`, `SeedingLog`, `PlantAssetLog`, `ObservationScreen`.
4. **P1** — Mover `addEventListener('syncCompleted')` de `useLogStore.js` a un `useEffect` en el provider raíz con cleanup.
5. **P2** — Normalizar UI de error: reemplazar `console.error` + `CustomEvent` por un toast global controlado por Zustand.

El detalle de implementación queda para el sprint correspondiente. Esta auditoría es **read-only** y no modifica código.
