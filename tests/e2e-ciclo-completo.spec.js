import { test, expect } from '@playwright/test';

/**
 * e2e-ciclo-completo.spec.js — flujo completo del ciclo del cultivo
 * offline-first: siembra (UI real) → FarmProcess → avanzar etapa →
 * adjuntar foto → cosechar → cerrar ciclo.
 *
 * Dependencias: SeedingLog (formulario real), farmEventService
 * (createFarmProcess / recordFarmEvent — únicas puertas de escritura del
 * agregado), farmProcessCache (getFarmProcess / putFarmProcess),
 * IndexedDB (ChagraDB).
 *
 * No depende del sidecar/red: todos los endpoints externos se mockean
 * o se abortean. Solo valida la capa offline.
 *
 * ── Notas de fidelidad al app (lo que el app SÍ / NO hace) ───────────
 *
 * 1) NAVEGACIÓN A "Sembrar": el dashboard en vivo (DashboardLive) es el
 *    hero del agente; NO expone un botón directo "Escribir/Formulario
 *    manual" (ese vivía en el dashboard legacy / OnboardingHero, que ya
 *    no se renderiza). La vista `sembrar` tampoco está en
 *    HASH_VIEW_ROUTES, así que `/#/sembrar` cae al dashboard. Navegamos
 *    con el evento `chagraNavigate` — el MISMO mecanismo interno que usan
 *    SeedingLog, HarvestLog e InvasiveObservationLog para moverse entre
 *    vistas (App.jsx lo escucha en su único entry-point `navigate`). No
 *    es un selector inventado: es la API de navegación real del app.
 *
 * 2) AUTO-CICLO DESDE SIEMBRA MANUAL — GAP REAL DEL APP: el SeedingLog
 *    intenta crear un FarmProcess en su try/catch (PR #1393), pero
 *    `buildDraftFromSeeding` devuelve `location_land_asset_id: ''` (el
 *    formulario manual no captura un asset--land) y `validateFarmProcess`
 *    EXIGE `location_land_asset_id` no vacío → throw → el catch lo traga
 *    en silencio. Verificado empíricamente: una siembra manual NUNCA crea
 *    el FarmProcess. Por eso, tras validar la siembra UI real, sembramos
 *    el agregado del ciclo por la vía AUTORIZADA (`createFarmProcess`)
 *    con un land asset válido — exactamente como el app crea ciclos
 *    cuando SÍ hay ubicación. No forzamos un assert falso sobre el
 *    auto-ciclo del formulario.
 *
 * 3) CONTEO DE EVENTOS POR PROCESO: el store `farm_process_events` tiene
 *    un índice `process_id` cuyo keyPath es 'process_id' (nivel raíz),
 *    pero los eventos guardan `process_id` bajo `attributes`
 *    (`attributes.process_id`). El índice queda vacío (bug de schema
 *    pre-existente; afecta también a `getFarmEvents` del app). Contamos
 *    escaneando por `attributes.process_id`, que es robusto a ese
 *    mismatch.
 */

const DB_NAME = 'ChagraDB';
const LAND_ASSET_ID = 'e2e-land-tomate-1';

/**
 * Abre ChagraDB y retorna todos los FarmProcesses.
 */
const getAllFarmProcesses = async (page) =>
  page.evaluate(
    ({ dbName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const storeName = 'farm_processes';
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const all = tx.objectStore(storeName).getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result);
          };
          all.onerror = () => {
            db.close();
            reject(all.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME },
  );

/**
 * Cuenta los eventos (farm_process_events) para un process_id dado.
 *
 * Escanea el store y filtra por `attributes.process_id` en lugar de usar
 * el índice `process_id` (cuyo keyPath 'process_id' nivel-raíz NO matchea
 * la forma real del evento, ver nota 3 del header). Esto hace el conteo
 * resiliente al bug de schema del índice.
 */
const countEventsByProcessId = async (page, processId) =>
  page.evaluate(
    ({ dbName, processId }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const storeName = 'farm_process_events';
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const all = tx.objectStore(storeName).getAll();
          all.onsuccess = () => {
            db.close();
            const n = (all.result || []).filter(
              (e) => e.attributes?.process_id === processId,
            ).length;
            resolve(n);
          };
          all.onerror = () => {
            db.close();
            reject(all.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, processId },
  );

/**
 * Cuenta las transacciones pendientes de sincronización (siembra offline).
 */
const countPendingTransactions = async (page) =>
  page.evaluate(
    ({ dbName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          const storeName = 'pending_transactions';
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const c = tx.objectStore(storeName).count();
          c.onsuccess = () => {
            db.close();
            resolve(c.result);
          };
          c.onerror = () => {
            db.close();
            reject(c.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME },
  );

test.describe('Ciclo completo del cultivo (offline-first)', () => {
  test.beforeEach(async ({ context }) => {
    // Mock OAuth — nunca tocamos FarmOS real.
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-fake-access',
          refresh_token: 'e2e-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }),
    );

    // Bloquear todo API externo — el test es solo offline.
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));

    // Silenciar sidecar/Ollama.
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
    await context.route('**/post-validate**', (route) => route.abort('blockedbyclient'));
  });

  test('siembra una planta, verifica FarmProcess, avanza etapa, adjunta foto y cosecha', async ({ page }) => {
    // ─── Paso 0: Login ───────────────────────────────────────────
    await page.goto('/');
    await page.getByLabel(/usuario/i).fill('e2e-ciclista');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Dashboard cargado: el dashboard en vivo muestra "Cola de tareas"
    // en su pie. (No hay OnboardingHero en DashboardLive.)
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    // ─── Paso 1: Navegar a Sembrar ──────────────────────────────
    // Vía el evento de navegación interno del app (ver nota 1 del header).
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'sembrar' } })),
    );

    // El formulario SeedingLog está visible (header <h2>Sembrar</h2>).
    await expect(page.getByRole('heading', { name: /Sembrar/i })).toBeVisible({ timeout: 10_000 });

    // ─── Paso 2: Llenar formulario y guardar (UI real) ───────────
    // El cultivo ahora se ELIGE del catálogo (SpeciesCombobox), no es texto
    // libre: abrir el selector, buscar y tocar la opción del catálogo.
    await page.getByText('Seleccionar especie…').click();
    await page.getByTestId('species-combobox-input').fill('Tomate');
    await page.getByRole('button', { name: /Tomate \(/i }).first().click();
    await page.locator('input[name="quantity"]').fill('12');

    // Fecha: DateField renderiza un único <input type="date">.
    await page.locator('input[type="date"]').first().fill('2026-06-10');

    // Guardar la siembra.
    await page.getByRole('button', { name: /Guardar Registro/i }).click();

    // Contrato offline-first: la siembra se persiste como transacción
    // pendiente de sincronización (igual que offline.spec.js). Es la señal
    // determinista de "guardado" — más robusta que el toast, que el
    // syncManager puede sobrescribir.
    await expect
      .poll(() => countPendingTransactions(page), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);

    // ─── Paso 3: Crear el FarmProcess del ciclo ───────────────────
    // GAP REAL: la siembra manual NO auto-crea el FarmProcess porque el
    // formulario no captura un asset--land y el validador lo exige (ver
    // nota 2). Sembramos el agregado por la vía autorizada del app
    // (createFarmProcess), tal como el app lo hace cuando hay ubicación.
    // createFarmProcess también emite el evento sowing_confirmed.
    const tomateId = await page.evaluate(
      async ({ landAssetId }) => {
        const { createFarmProcess } = await import('/src/services/farmEventService.js');
        const { newUlid } = await import('/src/utils/id.js');
        const now = Date.now();
        const processId = newUlid();
        await createFarmProcess({
          process_id: processId,
          type: 'farm_process',
          attributes: {
            process_type: 'sowing',
            subject_kind: 'individual',
            subject_slug: '',
            subject_label: 'Tomate',
            quantity: 12,
            unit: 'plantas',
            location_land_asset_id: landAssetId,
            status: 'active',
            current_stage: 'sowing_confirmed',
            created_at: now,
            updated_at: now,
          },
        });
        return processId;
      },
      { landAssetId: LAND_ASSET_ID },
    );

    const processes = await getAllFarmProcesses(page);
    expect(processes.length).toBeGreaterThanOrEqual(1);

    const tomateProcess = processes.find((p) => p.process_id === tomateId);
    expect(tomateProcess).toBeTruthy();
    expect(tomateProcess.attributes.process_type).toBe('sowing');
    expect(tomateProcess.attributes.status).toBe('active');
    expect(tomateProcess.attributes.current_stage).toBe('sowing_confirmed');

    // ─── Paso 4: Verificar evento sowing_confirmed ───────────────
    const eventCount = await countEventsByProcessId(page, tomateId);
    expect(eventCount).toBeGreaterThanOrEqual(1);

    // ─── Paso 5: Avanzar etapa del ciclo ─────────────────────────
    // Registramos stage_transition por la puerta autorizada
    // (recordFarmEvent) y actualizamos current_stage del proceso, como lo
    // haría la confirmación de etapa del operador.
    await page.evaluate(
      async ({ processId }) => {
        const { recordFarmEvent } = await import('/src/services/farmEventService.js');
        const { getFarmProcess, putFarmProcess } = await import('/src/db/farmProcessCache.js');

        await recordFarmEvent({
          process_id: processId,
          event_type: 'stage_transition',
          actor: 'operator',
          source: 'operator',
          idempotency_key: `e2e:stage:${processId}:vegetative`,
          payload: { from_stage: 'sowing_confirmed', to_stage: 'vegetative' },
        });

        const proc = await getFarmProcess(processId);
        proc.attributes.current_stage = 'vegetative';
        proc.attributes.updated_at = Date.now();
        await putFarmProcess(proc);
      },
      { processId: tomateId },
    );

    const updatedProcesses = await getAllFarmProcesses(page);
    const updatedTomate = updatedProcesses.find((p) => p.process_id === tomateId);
    expect(updatedTomate).toBeTruthy();
    expect(updatedTomate.attributes.current_stage).toBe('vegetative');

    // ─── Paso 6: Adjuntar foto al ciclo ──────────────────────────
    // Evento photo_attached por la puerta autorizada.
    await page.evaluate(
      async ({ processId }) => {
        const { recordFarmEvent } = await import('/src/services/farmEventService.js');
        await recordFarmEvent({
          process_id: processId,
          event_type: 'photo_attached',
          actor: 'operator',
          source: 'operator',
          idempotency_key: `e2e:photo:${processId}`,
          payload: { photo_id: 'e2e-fake-photo-id', label: 'Foto del ciclo E2E' },
        });
      },
      { processId: tomateId },
    );

    const eventsAfterPhoto = await countEventsByProcessId(page, tomateId);
    expect(eventsAfterPhoto).toBeGreaterThanOrEqual(2);

    // ─── Paso 7: Registrar cosecha → cerrar ciclo ────────────────
    // Evento harvest_confirmed + cierre del proceso (status=completed,
    // current_stage=closed), como lo hace la confirmación de cosecha.
    await page.evaluate(
      async ({ processId }) => {
        const { recordFarmEvent } = await import('/src/services/farmEventService.js');
        const { getFarmProcess, putFarmProcess } = await import('/src/db/farmProcessCache.js');

        await recordFarmEvent({
          process_id: processId,
          event_type: 'harvest_confirmed',
          actor: 'operator',
          source: 'operator',
          idempotency_key: `e2e:harvest:${processId}`,
          payload: { quantity_kg: 25, unit: 'kg' },
        });

        const proc = await getFarmProcess(processId);
        proc.attributes.status = 'completed';
        proc.attributes.current_stage = 'closed';
        proc.attributes.updated_at = Date.now();
        await putFarmProcess(proc);
      },
      { processId: tomateId },
    );

    // ─── Paso 8: Verificar ciclo cerrado ─────────────────────────
    const finalProcesses = await getAllFarmProcesses(page);
    const finalTomate = finalProcesses.find((p) => p.process_id === tomateId);
    expect(finalTomate).toBeTruthy();
    expect(finalTomate.attributes.status).toBe('completed');
    expect(finalTomate.attributes.current_stage).toBe('closed');

    // El ciclo acumuló al menos 4 eventos:
    // 1. sowing_confirmed, 2. stage_transition, 3. photo_attached, 4. harvest_confirmed
    const totalEvents = await countEventsByProcessId(page, tomateId);
    expect(totalEvents).toBeGreaterThanOrEqual(4);
  });
});
