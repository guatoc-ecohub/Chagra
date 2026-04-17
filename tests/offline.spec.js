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

const triggerOfflineSeeding = (page, { crop, quantity }) =>
  page.evaluate(
    async ({ crop, quantity }) => {
      // Usa el servicio real — no duplica lógica de persistencia.
      const mod = await import('/src/services/payloadService.js');
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
      return mod.savePayload('seeding', payload);
    },
    { crop, quantity }
  );

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
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
  });

  test('guarda siembra de 10 fresas offline y reporta sincronización al reconectar', async ({
    context,
    page,
  }) => {
    await page.goto('/');

    // Login vía UI contra endpoint mockeado.
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Confirmamos Dashboard cargado.
    await expect(
      page.getByRole('button', { name: /tareas por proximidad|campo/i })
    ).toBeVisible({ timeout: 15_000 });

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

    // Reconexión → evento 'online' → NetworkStatusBar entra en SYNCING.
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect(page.getByText(/sincronizando/i)).toBeVisible({ timeout: 15_000 });
  });
});
