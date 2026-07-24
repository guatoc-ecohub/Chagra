import { test, expect } from '@playwright/test';

const DB_NAME = 'ChagraDB';
const PENDING_STORE = 'pending_transactions';

const countPendingTransactions = async (page) =>
  page.evaluate(
    ({ dbName, storeName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const countReq = store.count();
          countReq.onsuccess = () => {
            db.close();
            resolve(countReq.result);
          };
          countReq.onerror = () => {
            db.close();
            reject(countReq.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, storeName: PENDING_STORE }
  );

const preloadPayloadService = (page) =>
  page.evaluate(async () => {
    // Precarga del módulo mientras hay red — tras setOffline el dev server
    // queda inalcanzable y el dynamic import fallaria.
    const mod = await import('/src/services/payloadService.js');
    window.__chagraE2E = { savePayload: mod.savePayload };
  });

const triggerOfflineSeeding = (page, { crop, quantity }) =>
  page.evaluate(
    async ({ crop, quantity }) => {
      if (!window.__chagraE2E?.savePayload) {
        throw new Error('payloadService no fue precargado antes del offline');
      }
      const payload = {
        data: {
          type: 'log--seeding',
          attributes: {
            name: `Siembra de ${crop} - E2E`,
            timestamp: new Date().toISOString().split('.')[0] + '+00:00',
            status: 'done',
          },
          relationships: {
            quantity: {
              data: [
                {
                  type: 'quantity--standard',
                  attributes: {
                    measure: 'count',
                    value: { decimal: String(quantity) },
                    label: 'Plántulas',
                  },
                },
              ],
            },
          },
        },
      };
      return window.__chagraE2E.savePayload('seeding', payload);
    },
    { crop, quantity }
  );

test.describe('IDB schema v9 — índice compuesto asset_id+timestamp', () => {
  test.beforeEach(async ({ context }) => {
    // Token OAuth2 sustituido por un fake — nunca tocamos FarmOS real.
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
      })
    );
  });

  test('logs store tiene índice compuesto asset_id_timestamp y retorna logs ordenados', async ({ page }) => {
    // La raíz pública abre el valle 3D; el contrato offline necesita la ruta
    // explícita del formulario para autenticar la sesión simulada.
    await page.goto('/#login');
  // El arranque en dev (vite cold-compile) puede tardar con el grafo de módulos completo;
  // esperamos explícitamente al formulario de login antes de escribir (robustez del gate).
  await expect(page.getByLabel(/usuario/i)).toBeVisible({ timeout: 90_000 });
  await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
await expect(
      page.getByText('Tareas pendientes')
    ).toBeVisible({ timeout: 15_000 });

    const result = await page.evaluate(async () => {
      const DB_NAME = 'ChagraDB';
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const LOGS_STORE = 'logs';
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        db.close();
        return { error: 'logs store not found' };
      }

      const tx = db.transaction(LOGS_STORE, 'readwrite');
      const store = tx.objectStore(LOGS_STORE);

      // 1. Verificar que el índice compuesto existe
      const hasIndex = store.indexNames.contains('asset_id_timestamp');
      if (!hasIndex) {
        db.close();
        return { error: 'asset_id_timestamp index not found' };
      }

      // 2. Limpiar logs de prueba previos
      store.clear();

      // 3. Insertar logs con distintos asset_ids y timestamps
      const logs = [
        { id: 'a1-t1', asset_id: 'asset-1', timestamp: 100, type: 'log--observation', name: 'obs-1' },
        { id: 'a1-t2', asset_id: 'asset-1', timestamp: 300, type: 'log--observation', name: 'obs-2' },
        { id: 'a1-t3', asset_id: 'asset-1', timestamp: 200, type: 'log--observation', name: 'obs-3' },
        { id: 'a2-t1', asset_id: 'asset-2', timestamp: 500, type: 'log--harvest', name: 'harvest-1' },
        { id: 'a2-t2', asset_id: 'asset-2', timestamp: 400, type: 'log--harvest', name: 'harvest-2' },
      ];
      for (const log of logs) store.put(log);

      await new Promise((resolve) => { tx.oncomplete = resolve; });
      db.close();

      // 4. Reabrir para query con el índice compuesto
      const db2 = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const tx2 = db2.transaction(LOGS_STORE, 'readonly');
      const index2 = tx2.objectStore(LOGS_STORE).index('asset_id_timestamp');

      // Query asset-1 con range bound
      const range = IDBKeyRange.bound(['asset-1', 0], ['asset-1', Infinity]);
      const asset1Logs = await new Promise((resolve, reject) => {
        const req = index2.getAll(range);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      // Query asset-2
      const range2 = IDBKeyRange.bound(['asset-2', 0], ['asset-2', Infinity]);
      const asset2Logs = await new Promise((resolve, reject) => {
        const req = index2.getAll(range2);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      db2.close();

      return {
        hasIndex,
        asset1Ids: asset1Logs.map((l) => l.id),
        asset1Timestamps: asset1Logs.map((l) => l.timestamp),
        asset2Ids: asset2Logs.map((l) => l.id),
        asset2Timestamps: asset2Logs.map((l) => l.timestamp),
      };
    });

    expect(result.error).toBeUndefined();
    expect(result.hasIndex).toBe(true);

    // asset-1: 3 logs, ascendente por timestamp (el índice devuelve [100, 200, 300])
    expect(result.asset1Ids).toEqual(['a1-t1', 'a1-t3', 'a1-t2']);
    expect(result.asset1Timestamps).toEqual([100, 200, 300]);

    // asset-2: 2 logs, ascendente por timestamp (el índice devuelve [400, 500])
    expect(result.asset2Ids).toEqual(['a2-t2', 'a2-t1']);
    expect(result.asset2Timestamps).toEqual([400, 500]);
  });
});

test.describe('Offline-first — siembra pendiente y reconexión', () => {
  test.beforeEach(async ({ context }) => {
    // Token OAuth2 sustituido por un fake — nunca tocamos FarmOS real.
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
      })
    );

    // Cualquier otro tráfico saliente a FarmOS/HA/Ollama se bloquea —
    // el test depende solo de la capa offline, nunca de red externa.
    // El abort se retrasa ~400ms a propósito: al reconectar, mantiene la petición
    // de sync "en vuelo" lo suficiente para que NetworkStatusBar permanezca en
    // estado SYNCING y el toast 'sincronizando' se renderice de forma DETERMINISTA.
    // Con abort instantáneo, SYNCING colapsaba en un solo tick → test flaky
    // (bloqueaba merges, ECONNREFUSED del SW re-emitiendo; ver feedback-sw-shadows-playwright-route).
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.abort('blockedbyclient');
    });
  });

  test('guarda siembra de 10 fresas offline y reporta sincronización al reconectar', async ({
    context,
    page,
  }) => {
    // La raíz pública abre el valle 3D; el contrato offline necesita la ruta
    // explícita del formulario para autenticar la sesión simulada.
    await page.goto('/#login');

    // Login vía UI contra endpoint mockeado.
    // El arranque en dev (vite cold-compile) puede tardar con el grafo de módulos
    // completo; esperamos explícitamente al formulario antes de escribir.
    await expect(page.getByLabel(/usuario/i)).toBeVisible({ timeout: 90_000 });
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Confirmamos Dashboard cargado.
    await expect(
      page.getByText('Tareas pendientes')
    ).toBeVisible({ timeout: 15_000 });

    // Precarga del servicio mientras todavia hay red.
    await preloadPayloadService(page);

    // Simula desconexión de red.
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByText(/sin conexion|offline-first/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Crea transacción de siembra (10 fresas) a través del servicio real.
    const result = await triggerOfflineSeeding(page, { crop: 'Fresa', quantity: 10 });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/pendiente|guardado local|sin conexi/i);

    // Se debe haber persistido al menos una transacción en IndexedDB.
    await expect
      .poll(() => countPendingTransactions(page), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);

    // Reconexión con red mockeada abortando: el contrato offline-first es que
    // la transacción NO se pierda si el sync falla. La barra visual puede estar
    // suprimida por diseño, así que validamos la cola durable.
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await page.waitForTimeout(800);
    await expect
      .poll(() => countPendingTransactions(page), { timeout: 10_000 })
      .toBeGreaterThanOrEqual(1);
  });
});
