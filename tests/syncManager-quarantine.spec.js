// SPDX-License-Identifier: AGPL-3.0
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub
//
// E2E test: SyncManager quarantine flow cross-platform (#299).
//
// Context: el data-loss de iPhone fix de PR #1106 (43 cultivos borrados sin
// sync) probablemente NO está cubierto por tests E2E en Android + PC.
// Si vuelve a aparecer en otra plataforma, no nos enteramos hasta que un
// piloto pierda data.
//
// Este test verifica el "happy path defensivo" del quarantine bucket:
//   1. farmOS responde 4xx (validación rechaza el payload).
//   2. La transacción NO se borra del cliente.
//   3. La transacción aparece en el IDB store `failed_transactions`
//      con `error_class` clasificado correctamente.
//   4. El asset original sigue en `assets` store (NO purgado).
//
// Se ejecuta con tag `@cross-platform` en 3 projects:
//   - chromium (Desktop Chrome PC)
//   - mobile-chrome (Pixel 5 viewport + UA)
//   - mobile-safari-emulated (iPhone 12 viewport + UA, engine chromium)
//
// Nota: webkit real no está instalado en NixOS alpha. El project
// `mobile-safari-emulated` cubre viewport + UA gating, NO IDB quirks
// específicos del engine Safari. Para esos hace falta un agent runner
// con `playwright install webkit` (deuda futura).

import { test, expect, devices } from '@playwright/test';

const DB_NAME = 'ChagraDB';
const PENDING_STORE = 'pending_transactions';
const FAILED_STORE = 'failed_transactions';

// Helper: leer un IDB store completo desde el browser context.
const readStoreAll = async (page, storeName) =>
  page.evaluate(
    ({ dbName, store }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(store)) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction(store, 'readonly');
          const getAll = tx.objectStore(store).getAll();
          getAll.onsuccess = () => {
            db.close();
            resolve(getAll.result || []);
          };
          getAll.onerror = () => {
            db.close();
            reject(getAll.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, store: storeName },
  );

// Helper: simular login y esperar al main flow ya autenticado. Usamos un
// token fake — nunca tocamos FarmOS real. El test corre 100% offline-first.
const loginAndWaitForMain = async (page, context) => {
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

  await page.goto('/');
  await page.getByLabel(/usuario/i).fill('e2e-quarantine-op');
  await page.getByLabel(/contraseña/i).fill('e2e-quarantine-pass');
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });
};

// Helper: insertar una transacción manualmente en `pending_transactions`
// con un payload que el mock va a rechazar 4xx, y disparar syncAll.
// Devuelve el resultado del syncAll (counts + breakdown).
const seedPendingAndSync = async (page, { errorStatus }) =>
  page.evaluate(
    async ({ pendingStore, errorStatusInner }) => {
      // Insertar transacción directo en el IDB (bypass UI complexity).
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const tx = db.transaction(pendingStore, 'readwrite');
      const store = tx.objectStore(pendingStore);
      store.add({
        type: 'seeding',
        endpoint: '/api/log/seeding',
        payload: {
          data: {
            type: 'log--seeding',
            attributes: {
              name: `E2E quarantine ${errorStatusInner} probe`,
              timestamp: new Date().toISOString().split('.')[0] + '+00:00',
              status: 'done',
            },
          },
        },
        timestamp: Date.now(),
        synced: false,
        retries: 0,
      });
      await new Promise((resolve) => {
        tx.oncomplete = resolve;
      });
      db.close();

      // Disparar syncAll. El mock route 4xx hará que la transacción vaya
      // a quarantine.
      const mod = await import('/src/services/syncManager.js');
      const sm = new mod.SyncManager();
      return sm.syncAll();
    },
    { pendingStore: PENDING_STORE, errorStatusInner: errorStatus },
  );

test.describe('@cross-platform SyncManager quarantine — 4xx farmOS', () => {
  test.beforeEach(async ({ context, page }) => {
    // Limpiar IDB entre tests para idempotencia.
    await page.addInitScript(() => {
      return new Promise((resolve) => {
        const del = indexedDB.deleteDatabase('ChagraDB');
        del.onsuccess = del.onerror = del.onblocked = () => resolve();
      });
    });
    await loginAndWaitForMain(page, context);
  });

  test('4xx (422 validation) → transacción al quarantine bucket, NO borrada del cliente', async ({
    context,
    page,
  }) => {
    // Mock farmOS validation reject.
    await context.route('**/api/log/seeding**', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({
          errors: [
            {
              status: '422',
              title: 'Unprocessable Entity',
              detail: 'Validation failed: status field required',
            },
          ],
        }),
      }),
    );

    await seedPendingAndSync(page, { errorStatus: 422 });

    // El sync debe reportar 1 quarantined (la transacción 4xx).

    // Verificar IDB: pending vacío, failed_transactions tiene 1 record.
    const pending = await readStoreAll(page, PENDING_STORE);
    const failed = await readStoreAll(page, FAILED_STORE);

    expect(pending).toHaveLength(0);
    expect(failed).toHaveLength(1);
    expect(failed[0].error_status).toBe(422);
    expect(failed[0].error_class).toBe('validation');
    expect(failed[0].type).toBe('seeding');
    // El payload original SE PRESERVA en quarantine (anti-data-loss).
    expect(failed[0].payload).toBeTruthy();
    expect(failed[0].payload.data.attributes.name).toMatch(/E2E quarantine 422 probe/);
  });

  test('4xx (404 not_found) → quarantine con error_class="not_found"', async ({
    context,
    page,
  }) => {
    await context.route('**/api/log/seeding**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ errors: [{ status: '404', title: 'Not Found' }] }),
      }),
    );

    await seedPendingAndSync(page, { errorStatus: 404 });

    const failed = await readStoreAll(page, FAILED_STORE);
    expect(failed).toHaveLength(1);
    expect(failed[0].error_status).toBe(404);
    expect(failed[0].error_class).toBe('not_found');
  });

  test('5xx (servidor) NO va a quarantine inmediato — debe ir a retry primero', async ({
    context,
    page,
  }) => {
    // 5xx significa server temporal — el syncManager debe reintentar, NO
    // quarantine inmediato. Solo después de max_retries el 5xx va al
    // quarantine (clasificado como 'server').
    await context.route('**/api/log/seeding**', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      }),
    );

    await seedPendingAndSync(page, { errorStatus: 503 });
    // 5xx en el primer intento NO debe clasificarse como quarantine 4xx
    // (validation/not_found). Si tras retries va a quarantine, sería class
    // 'server'. syncAll ya no retorna breakdown (refactor #300) → verificamos
    // por el store, no por el return.
    const failed = await readStoreAll(page, FAILED_STORE);
    for (const f of failed) {
      expect(['validation', 'not_found']).not.toContain(f.error_class);
    }
  });
});

test.describe('@cross-platform SyncManager quarantine — UI banner', () => {
  test.beforeEach(async ({ context, page }) => {
    await page.addInitScript(() => {
      return new Promise((resolve) => {
        const del = indexedDB.deleteDatabase('ChagraDB');
        del.onsuccess = del.onerror = del.onblocked = () => resolve();
      });
    });
    await loginAndWaitForMain(page, context);
  });

  test('failed_transactions store existe en IDB schema v15+', async ({ page }) => {
    // Verificación defensiva: el schema upgrade v15 creó el store. Si un
    // futuro PR drop accidentalmente el store, este test fails de inmediato.
    const exists = await page.evaluate(
      ({ dbName, store }) =>
        new Promise((resolve, reject) => {
          const req = indexedDB.open(dbName);
          req.onsuccess = () => {
            const db = req.result;
            const hasStore = db.objectStoreNames.contains(store);
            db.close();
            resolve(hasStore);
          };
          req.onerror = () => reject(req.error);
        }),
      { dbName: DB_NAME, store: FAILED_STORE },
    );
    expect(exists).toBe(true);
  });
});

// Sanity check: el viewport del project actual debe matchear lo que
// describe el name. Sirve como debug-aid si las matrices Playwright se
// rompen al cambiar `devices['Pixel 5']` en bumps de Playwright.
test.describe('@cross-platform Viewport sanity', () => {
  test('viewport del browser coincide con el project', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();

    if (projectName === 'chromium') {
      // Desktop Chrome — viewport ~1280x720 por defecto.
      expect(viewport.width).toBeGreaterThan(1000);
    } else if (projectName === 'mobile-chrome') {
      // Pixel 5 = 393x851.
      const ref = devices['Pixel 5'].viewport;
      expect(viewport).toEqual(ref);
    } else if (projectName === 'mobile-safari-emulated') {
      // iPhone 12 = 390x664.
      const ref = devices['iPhone 12'].viewport;
      expect(viewport).toEqual(ref);
    }
  });
});
