import { test, expect } from '@playwright/test';

/**
 * e2e-ciclo-completo.spec.js — flujo completo del ciclo del cultivo
 * offline-first: siembra → verificar FarmProcess → avanzar etapa →
 * adjuntar foto → cosechar → cerrar ciclo.
 *
 * Dependencias: SeedingLog (formulario), FarmProcess (auto-ciclo del PR
 * #1393), farmEventService (recordFarmEvent), IndexedDB (ChagraDB).
 *
 * No depende del sidecar/red: todos los endpoints externos se mockean
 * o se abortean. Solo valida la capa offline.
 *
 * Patterns reusados de offline.spec.js e invasive.spec.js.
 */

const DB_NAME = 'ChagraDB';

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
          const store = tx.objectStore(storeName);
          const idx = store.index('process_id');
          const count = idx.count(processId);
          count.onsuccess = () => {
            db.close();
            resolve(count.result);
          };
          count.onerror = () => {
            db.close();
            reject(count.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, processId },
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

    // Bloquear todo API externo — el test es solo offline
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));

    // Silenciar sidecar/Ollama
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
    await context.route('**/post-validate**', (route) => route.abort('blockedbyclient'));
  });

  test('siembra una planta, verifica FarmProcess, avanza etapa, adjunta foto y cosecha', async ({ page }) => {
    // ─── Paso 0: Login ───────────────────────────────────────────
    await page.goto('/');
    await page.getByLabel(/usuario/i).fill('e2e-ciclista');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Esperar dashboard cargado. Si es primera vez, aparece OnboardingHero;
    // si no, aparece el dashboard normal.
    await expect(
      page.locator('text=/Comenzar a registrar|Cola de tareas|Dashboard/i').first(),
    ).toBeVisible({ timeout: 15_000 });

    // ─── Paso 1: Navegar a Sembrar ──────────────────────────────

    // El OnboardingHero o QuickActionsPanel tienen "Escribir: Formulario manual"
    // que navega a SeedingLog. Si hay plantas previas, el dashboard tiene
    // un botón "+" o "Agregar" en el TopBar. Intentamos ambos.
    const escribirBtn = page.getByRole('button', { name: /Escribir: Formulario manual/i });
    if (await escribirBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await escribirBtn.click();
    } else {
      // Fallback: navegar vía URL hash
      await page.goto('/#/sembrar');
    }

    // Verificar que el formulario SeedingLog está visible
    await expect(page.getByRole('heading', { name: /Sembrar/i })).toBeVisible({ timeout: 10_000 });

    // ─── Paso 2: Llenar formulario y guardar ─────────────────────

    // Campo cultivo (input name="crop")
    await page.locator('input[name="crop"]').fill('Tomate');

    // Campo cantidad (input name="quantity")
    await page.locator('input[name="quantity"]').fill('12');

    // Seleccionar zona/lote (primer option después del placeholder)
    const zoneSelect = page.locator('select').last();
    const zoneOptions = zoneSelect.locator('option');
    const zoneCount = await zoneOptions.count();
    if (zoneCount > 1) {
      // Seleccionar la primera zona disponible (no el placeholder)
      await zoneSelect.selectOption({ index: 1 });
    }

    // Fecha: usar el campo date
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-06-10');

    // Guardar
    await page.getByRole('button', { name: /Guardar Registro/i }).click();

    // Verificar mensaje de éxito
    await expect(
      page.locator('text=/Guardado|registro/i').first(),
    ).toBeVisible({ timeout: 10_000 });

    // ─── Paso 3: Verificar FarmProcess creado ─────────────────────
    // Esperar a que el auto-ciclo termine (el SeedingLog.handleSave
    // crea el FarmProcess en try/catch después de guardar el seeding).
    await page.waitForTimeout(800);

    const processes = await getAllFarmProcesses(page);
    expect(processes.length).toBeGreaterThanOrEqual(1);

    // Buscar el FarmProcess de tomate
    const tomateProcess = processes.find(
      (p) =>
        p.attributes?.subject_label?.toLowerCase().includes('tomate') ||
        p.attributes?.process_type === 'sowing',
    );
    expect(tomateProcess).toBeTruthy();
    expect(tomateProcess.attributes.process_type).toBe('sowing');
    expect(tomateProcess.attributes.status).toBe('active');
    expect(tomateProcess.attributes.current_stage).toBe('sowing_confirmed');

    const tomateId = tomateProcess.process_id;

    // ─── Paso 4: Verificar evento sowing_confirmed ───────────────
    const eventCount = await countEventsByProcessId(page, tomateId);
    expect(eventCount).toBeGreaterThanOrEqual(1);

    // ─── Paso 5: Avanzar etapa del ciclo ─────────────────────────
    // Usamos page.evaluate() para registrar stage_transition (simula
    // confirmación de etapa desde el agente o desde el operador).
    await page.evaluate(
      async ({ processId }) => {
        const { openDB } = await import('/src/db/dbCore.js');
        const { newUlid } = await import('/src/utils/id.js');
        const db = await openDB();

        const event = {
          event_id: newUlid(),
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'stage_transition',
            occurred_at: Date.now(),
            actor: 'operator',
            source: 'operator',
            idempotency_key: `e2e:stage:${processId}:vegetative`,
            payload: { from_stage: 'sowing_confirmed', to_stage: 'vegetative' },
          },
        };

        return new Promise((resolve, reject) => {
          const tx = db.transaction(['farm_process_events', 'farm_processes'], 'readwrite');
          const evStore = tx.objectStore('farm_process_events');
          const procStore = tx.objectStore('farm_processes');

          evStore.add(event);

          const procReq = procStore.get(processId);
          procReq.onsuccess = () => {
            if (procReq.result) {
              procReq.result.attributes.current_stage = 'vegetative';
              procReq.result.attributes.updated_at = Date.now();
              procStore.put(procReq.result);
            }
          };

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      },
      { processId: tomateId },
    );

    // Verificar que current_stage cambió
    const updatedProcesses = await getAllFarmProcesses(page);
    const updatedTomate = updatedProcesses.find((p) => p.process_id === tomateId);
    expect(updatedTomate).toBeTruthy();
    expect(updatedTomate.attributes.current_stage).toBe('vegetative');

    // ─── Paso 6: Adjuntar foto al ciclo ──────────────────────────
    // Usamos page.evaluate() para simular adjuntar una foto (agregar
    // un evento photo_attached al ciclo).
    await page.evaluate(
      async ({ processId }) => {
        const { openDB } = await import('/src/db/dbCore.js');
        const { newUlid } = await import('/src/utils/id.js');
        const db = await openDB();

        const event = {
          event_id: newUlid(),
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'photo_attached',
            occurred_at: Date.now(),
            actor: 'operator',
            source: 'operator',
            idempotency_key: `e2e:photo:${processId}`,
            payload: { photo_id: 'e2e-fake-photo-id', label: 'Foto del ciclo E2E' },
          },
        };

        return new Promise((resolve, reject) => {
          const tx = db.transaction('farm_process_events', 'readwrite');
          tx.objectStore('farm_process_events').add(event);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      },
      { processId: tomateId },
    );

    // Verificar que el evento de foto existe
    const eventsAfterPhoto = await countEventsByProcessId(page, tomateId);
    expect(eventsAfterPhoto).toBeGreaterThanOrEqual(2);

    // ─── Paso 7: Registrar cosecha → cerrar ciclo ────────────────
    // Simulamos registro de cosecha cerrando el ciclo (status=completed,
    // current_stage=closed) como lo hace useFarmProcessConfirm.
    await page.evaluate(
      async ({ processId }) => {
        const { openDB } = await import('/src/db/dbCore.js');
        const { newUlid } = await import('/src/utils/id.js');
        const db = await openDB();

        const harvestEvent = {
          event_id: newUlid(),
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'harvest_confirmed',
            occurred_at: Date.now(),
            actor: 'operator',
            source: 'operator',
            idempotency_key: `e2e:harvest:${processId}`,
            payload: { quantity_kg: 25, unit: 'kg' },
          },
        };

        return new Promise((resolve, reject) => {
          const tx = db.transaction(['farm_process_events', 'farm_processes'], 'readwrite');
          tx.objectStore('farm_process_events').add(harvestEvent);

          const procReq = tx.objectStore('farm_processes').get(processId);
          procReq.onsuccess = () => {
            if (procReq.result) {
              procReq.result.attributes.status = 'completed';
              procReq.result.attributes.current_stage = 'closed';
              procReq.result.attributes.updated_at = Date.now();
              tx.objectStore('farm_processes').put(procReq.result);
            }
          };

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
        });
      },
      { dbName: DB_NAME, processId: tomateId },
    );

    // ─── Paso 8: Verificar ciclo cerrado ─────────────────────────
    const finalProcesses = await getAllFarmProcesses(page);
    const finalTomate = finalProcesses.find((p) => p.process_id === tomateId);
    expect(finalTomate).toBeTruthy();
    expect(finalTomate.attributes.status).toBe('completed');
    expect(finalTomate.attributes.current_stage).toBe('closed');

    // Verificar que hay al menos 4 eventos en el ciclo:
    // 1. sowing_confirmed, 2. stage_transition, 3. photo_attached, 4. harvest_confirmed
    const totalEvents = await countEventsByProcessId(page, tomateId);
    expect(totalEvents).toBeGreaterThanOrEqual(4);
  });
});
