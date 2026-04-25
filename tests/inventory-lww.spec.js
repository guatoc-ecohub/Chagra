import { test, expect } from '@playwright/test';

/**
 * inventory-lww.spec.js — verificación de Fase 4 ADR-019.
 *
 * Escenario: dos dispositivos editan inventory_value offline. Al sincronizar,
 * el timestamp más reciente (LWW field-level) gana y la PWA emite un evento
 * `farmosLog` notificando la reconciliación al operador.
 *
 * Mockeamos:
 *   - OAuth (mismo patrón que offline.spec.js).
 *   - GET /api/asset/material — devuelve un material con timestamp viejo
 *     simulando que otro dispositivo ya sincronizó valores antiguos.
 *   - El cliente local creó un descuento más reciente. El bulkPut debe
 *     preservar local y emitir el farmosLog.
 *
 * Marcado .skip por defecto: requiere setup de IndexedDB + sincronización
 * disparada manualmente. Activar cuando el harness E2E exponga helpers
 * para inyectar assets locales con timestamp.
 */

test.describe.skip('Inventory LWW — Fase 4 ADR-019', () => {
  test.beforeEach(async ({ context }) => {
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

  test('preserva inventory_value local cuando timestamp es más reciente que servidor', async ({ context, page }) => {
    // Mock del servidor: inventory_value=100 con timestamp viejo (1h atrás).
    const serverTs = Date.now() - 60 * 60 * 1000;
    await context.route('**/api/asset/material**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({
          data: [
            {
              type: 'asset--material',
              id: 'mat-bokashi-001',
              attributes: {
                name: 'Bokashi',
                inventory_value: 100,
                inventory_value_updated_at: serverTs,
                inventory_unit: 'kg',
                status: 'active',
              },
            },
          ],
        }),
      })
    );

    await page.goto('/');

    // Login (mismo patrón offline.spec.js).
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Inyectar localmente un asset--material con timestamp MÁS reciente
    // (10s atrás) y inventory_value distinto (50, simulando descuento offline).
    const localTs = Date.now() - 10 * 1000;
    await page.evaluate(({ localTs }) => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('assets', 'readwrite');
          tx.objectStore('assets').put({
            id: 'mat-bokashi-001',
            type: 'asset--material',
            asset_type: 'material',
            attributes: {
              name: 'Bokashi',
              inventory_value: 50,
              inventory_value_updated_at: localTs,
              inventory_unit: 'kg',
              status: 'active',
            },
            cached_at: Date.now(),
            _pending: false,
          });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    }, { localTs });

    // Disparar sync — el bulkPut debe detectar que local > server y preservar.
    const farmosLogPromise = page.evaluate(() =>
      new Promise((resolve) => {
        window.addEventListener('farmosLog', (ev) => resolve(ev.detail), { once: true });
        // Simular pull: la app llama a syncFromServer periódicamente o por evento.
        window.dispatchEvent(new Event('online'));
      })
    );

    const detail = await farmosLogPromise;
    expect(detail).toMatch(/Inventario reconciliado/i);
    expect(detail).toMatch(/Bokashi/i);

    // Verificar que el inventory_value en IndexedDB sigue siendo 50 (local).
    const localValue = await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('assets', 'readonly');
          const getReq = tx.objectStore('assets').get('mat-bokashi-001');
          getReq.onsuccess = () => {
            db.close();
            resolve(getReq.result?.attributes?.inventory_value);
          };
          getReq.onerror = () => { db.close(); reject(getReq.error); };
        };
        req.onerror = () => reject(req.error);
      });
    });

    expect(localValue).toBe(50);
  });
});
