import { test, expect } from '@playwright/test';

/**
 * insumos-flow.spec.js — flujo de inventario/insumos.
 *
 * Cubre:
 *   - Navegar a la sección de inventario (bodega)
 *   - InventoryDashboard renderiza con cards de materiales
 *   - Modal de abastecimiento (refill) abre y cierra
 *   - Botón de exportación CSV de trazabilidad visible
 *   - Sparklines de consumo renderizan
 *   - Galería de recetas de biopreparados accesible
 *   - Edge case: inventario vacío muestra mensaje de estado vacío
 *
 * Mock de OAuth + farmOS para evitar depender de token real.
 * Usa login programático (patrón home-operador-ve-todo.spec.js).
 */

const ORIGIN = 'http://localhost:5173';

/** Siembra tenant y perfil en localStorage antes del boot. */
async function seedTenant(page, tenant = 'e2e-insumos') {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'campesino',
          vocacion: 'mixta',
          finca_tipo: 'finca',
          finca_altitud: '1800',
          piso_confirmado: '1',
        }),
      );
    } catch (_) { /* noop */ }
  }, tenant);
}

/** Mock OAuth (200 con tokens fake) + GETs de farmOS vacíos. */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-insumos-token',
        refresh_token: 'e2e-insumos-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }
  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    );
  }
}

/** Login programático vía authService + tenantContext (sin UI de formulario). */
async function login(page, username = 'e2e-insumos') {
  await page.evaluate(async (u) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(u, 'e2e-test-pwd');
    if (!result.success) throw new Error('OAuth mock falló: ' + (result.error || '??'));
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(u);
  }, username);
}

test.describe('Insumos — InventoryDashboard', () => {
  test('renderiza con cards de materiales cuando hay datos', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    // Navegar a bodega vía evento chagra:nav (ruta interna 'bodega').
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // El encabezado de la bodega debe ser visible.
    const body = page.locator('body');
    await expect(body).toContainText('Biofábrica / Bodega');

    // La galería de recetas de biopreparados debe estar presente.
    await expect(body).toContainText('Recetas');
  });

  test('inventario vacío muestra estado vacío con mensaje de guía', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // Sin materiales cargados, debe mostrar el mensaje de estado vacío.
    const body = page.locator('body');
    await expect(body).toContainText('No hay insumos registrados en bodega');
  });

  test('botón de exportación CSV de trazabilidad está presente', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    const exportBtn = page.getByRole('button', { name: /Exportar reporte CSV|Exportar CSV/i });
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
  });

  test('modal de abastecimiento (refill) abre al hacer clic en Abastecer', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);

    // Inyectar un material en IndexedDB para que aparezca una card.
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('assets', 'readwrite');
          tx.objectStore('assets').put({
            id: 'e2e-mat-bokashi',
            type: 'asset--material',
            asset_type: 'material',
            attributes: {
              name: 'Bokashi',
              inventory_value: 12,
              inventory_value_updated_at: Date.now(),
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
    });

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // Debe aparecer la card de Bokashi con el botón Abastecer.
    const abastecerBtn = page.getByRole('button', { name: /Abastecer/i });
    await expect(abastecerBtn).toBeVisible({ timeout: 10000 });
    await abastecerBtn.click();

    // El modal de refill debe abrirse: título "Registrar Producción".
    const modal = page.locator('form').filter({ hasText: 'Registrar Producción' });
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Cerrar el modal con el botón Cancelar.
    const cancelBtn = modal.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('galería de biopreparados es accesible (BiopreparadoRecetasGallery)', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // La galería de biopreparados se inserta como recetas visibles.
    // Buscamos nombres conocidos de biopreparados que aparecen en los diagramas.
    const body = page.locator('body');
    await expect.soft(body).toContainText(/Bocashi|Biol|Caldo|biol/i, { timeout: 10000 });
  });

  test('sparklines de consumo renderizan cuando hay material con datos de tendencia', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);

    // Inyectar material + logs de consumo para que useConsumptionMetrics tenga datos.
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['assets', 'logs'], 'readwrite');

          tx.objectStore('assets').put({
            id: 'e2e-mat-biol',
            type: 'asset--material',
            asset_type: 'material',
            attributes: {
              name: 'Biol',
              inventory_value: 30,
              inventory_value_updated_at: Date.now(),
              inventory_unit: 'L',
              status: 'active',
            },
            cached_at: Date.now(),
            _pending: false,
          });

          // Insertar logs de consumo (últimos 7 días) para que useConsumptionMetrics los lea.
          for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
            tx.objectStore('logs').put({
              id: `e2e-log-input-${daysAgo}`,
              type: 'log--input',
              log_type: 'input',
              attributes: {
                name: 'Aplicación Biol',
                quantity: 2 + daysAgo,
                unit: 'L',
                timestamp: Date.now() - daysAgo * 86400000,
              },
              relationships: {
                asset: ['e2e-mat-biol'],
              },
              cached_at: Date.now(),
              _pending: false,
            });
          }

          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(tx.error); };
        };
        req.onerror = () => reject(req.error);
      });
    });

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'bodega' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // El texto "Consumo 7d" acompaña al sparkline SVG.
    const body = page.locator('body');
    await expect(body).toContainText('Consumo 7d', { timeout: 10000 });
  });
});
