import { test, expect } from '@playwright/test';

/**
 * multifinca.spec.js — ADR-036 MVP multi-finca client-side scoping.
 *
 * Verifica el contrato mínimo de aislación entre dos tenants compartiendo
 * el mismo backend farmOS + mismo device (peor caso pre-DB-per-finca):
 *
 *   1. Tenant A activo → assetCache.put('plant', alicePlant)
 *      assetCache.getByType('plant') incluye alicePlant.
 *   2. Cambiar a tenant B → tenantChanged se emite.
 *   3. Con B activo, getByType('plant') NO devuelve alicePlant.
 *   4. B inserta su propio bobPlant; queda visible para B.
 *   5. Volver a A → A ve alicePlant pero NO bobPlant.
 *
 * Bonus: apiService.fetchFromFarmOS inyecta filter[uid.name]=<tenant> en GET
 * a /api/asset/<bundle>. Validado via context.route interceptando la URL.
 *
 * Estrategia: ataca el contrato a nivel de módulo (no UI), igual que
 * offline.spec.js. Carga la app, importa dinámicamente los módulos
 * relevantes y opera localStorage + IDB directamente.
 */

test.describe('multifinca client-side scoping (ADR-036 MVP)', () => {
  test.beforeEach(async ({ context, page }) => {
    // Fake token OAuth (mismo patrón offline.spec.js).
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-multifinca-token',
          refresh_token: 'e2e-multifinca-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
    );

    await page.goto('/');
    // Esperar a que Vite resuelva los módulos. La página real no necesita
    // hidratarse para que `import()` funcione; basta con tener el SW server up.
    await page.waitForLoadState('domcontentloaded');
  });

  test('IDB asset cache is partitioned by active tenantId', async ({ page }) => {
    // Preload de los módulos que vamos a tocar — mismo truco que offline.spec.
    await page.evaluate(async () => {
      const tenantMod = await import('/src/services/tenantContext.js');
      const cacheMod = await import('/src/db/assetCache.js');
      window.__multifincaE2E = {
        tenant: tenantMod,
        cache: cacheMod,
      };
    });

    // 1. Tenant A inserta su asset.
    await page.evaluate(async () => {
      const { tenant, cache } = window.__multifincaE2E;
      tenant.setActiveTenantId('alice');
      await cache.assetCache.put('plant', {
        id: 'alice-plant-uuid',
        type: 'asset--plant',
        attributes: { name: 'Tomate de Alice' },
      });
    });

    const aliceSeesAlice = await page.evaluate(async () => {
      const { cache } = window.__multifincaE2E;
      const list = await cache.assetCache.getByType('plant');
      return list.map((a) => a.id);
    });
    expect(aliceSeesAlice).toContain('alice-plant-uuid');

    // 2. Cambiar al tenant B.
    const tenantChangedFired = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const handler = () => {
            window.removeEventListener('tenantChanged', handler);
            resolve(true);
          };
          window.addEventListener('tenantChanged', handler);
          window.__multifincaE2E.tenant.setActiveTenantId('bob');
          // safety net: si nunca se emite, resolver false a los 200ms.
          setTimeout(() => resolve(false), 200);
        })
    );
    expect(tenantChangedFired).toBe(true);

    // 3. Bob NO ve la planta de Alice.
    const bobSeesAlice = await page.evaluate(async () => {
      const { cache } = window.__multifincaE2E;
      const list = await cache.assetCache.getByType('plant');
      return list.map((a) => a.id);
    });
    expect(bobSeesAlice).not.toContain('alice-plant-uuid');

    // 4. Bob inserta su propia planta.
    await page.evaluate(async () => {
      const { cache } = window.__multifincaE2E;
      await cache.assetCache.put('plant', {
        id: 'bob-plant-uuid',
        type: 'asset--plant',
        attributes: { name: 'Mora de Bob' },
      });
    });

    const bobSeesBob = await page.evaluate(async () => {
      const { cache } = window.__multifincaE2E;
      const list = await cache.assetCache.getByType('plant');
      return list.map((a) => a.id);
    });
    expect(bobSeesBob).toContain('bob-plant-uuid');
    expect(bobSeesBob).not.toContain('alice-plant-uuid');

    // 5. Volver a Alice: ve la suya, no la de Bob.
    await page.evaluate(() => {
      window.__multifincaE2E.tenant.setActiveTenantId('alice');
    });

    const aliceSeesOnlyAlice = await page.evaluate(async () => {
      const { cache } = window.__multifincaE2E;
      const list = await cache.assetCache.getByType('plant');
      return list.map((a) => a.id);
    });
    expect(aliceSeesOnlyAlice).toContain('alice-plant-uuid');
    expect(aliceSeesOnlyAlice).not.toContain('bob-plant-uuid');
  });

  test('apiService.fetchFromFarmOS appends filter[uid.name] to /api/asset GETs', async ({ page, context }) => {
    // Interceptar TODA llamada al backend farmOS y capturar las URLs que
    // tocan /api/asset/ — esperamos ver el filtro.
    const seenUrls = [];
    await context.route('**/api/asset/**', (route) => {
      seenUrls.push(route.request().url());
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      });
    });

    await page.evaluate(async () => {
      // Login real vía authService (OAuth mockeado en beforeEach con
      // context.route('**/oauth/token')). authenticateUser persiste el token
      // en localforage internamente, evitando que el test tenga que importar
      // 'localforage' como bare specifier (no resuelve en page.evaluate sin
      // bundler context).
      const authMod = await import('/src/services/authService.js');
      const result = await authMod.authenticateUser('alice', 'e2e-pwd');
      if (!result.success) {
        throw new Error('OAuth mock no respondió OK: ' + result.error);
      }
      const tenantMod = await import('/src/services/tenantContext.js');
      tenantMod.setActiveTenantId('alice');
      const apiMod = await import('/src/services/apiService.js');
      window.__apiE2E = apiMod;
    });

    await page.evaluate(async () => {
      // GET de lista (debe inyectar filter)
      await window.__apiE2E
        .fetchFromFarmOS('/api/asset/plant?sort=-created&page[limit]=10')
        .catch(() => {}); // 200 con [] no debe lanzar, pero igual atajamos.
      // GET por id (NO debe inyectar filter)
      await window.__apiE2E
        .fetchFromFarmOS('/api/asset/plant/some-uuid')
        .catch(() => {});
    });

    expect(seenUrls.length).toBeGreaterThanOrEqual(2);
    const listUrl = seenUrls.find((u) =>
      u.includes('/api/asset/plant?sort=-created')
    );
    expect(listUrl).toBeDefined();
    expect(listUrl).toContain('filter%5Buid.name%5D=alice');
    // [..uid.name..]=alice URL-encoded como filter%5Buid.name%5D=alice

    const byIdUrl = seenUrls.find((u) =>
      u.includes('/api/asset/plant/some-uuid')
    );
    expect(byIdUrl).toBeDefined();
    expect(byIdUrl).not.toContain('filter%5Buid');
  });
});
