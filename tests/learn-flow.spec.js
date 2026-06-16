import { test, expect } from '@playwright/test';

/**
 * learn-flow.spec.js — pantallas de aprendizaje / ayuda.
 *
 * Cubre:
 *   - Navegar a la sección de ayuda (HelpManual)
 *   - HelpManual renderiza con sub-vistas (home, diccionario)
 *   - HelpDictionary (diccionario) renderiza términos
 *   - HelpVoiceRegionalDemo (demo de voz regional) renderiza
 *   - Tips de ayuda / selector de región visibles
 *   - Selector de regionalismos funciona
 *   - Edge case: navegar entre pantallas de ayuda sin crash
 *
 * HelpManual tiene router interno: home → voz | uso | ciclo | diccionario |
 * agente | datos | voz-regional-demo.
 *
 * Mock de OAuth + farmOS para evitar depender de token real.
 * Usa login programático (patrón home-operador-ve-todo.spec.js).
 */

const ORIGIN = 'http://localhost:5173';

/** Siembra tenant y perfil en localStorage antes del boot. */
async function seedTenant(page, tenant = 'e2e-learn') {
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

/** Mock OAuth (200 con tokens fake) + GETs vacíos. */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-learn-token',
        refresh_token: 'e2e-learn-refresh',
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

/** Login programático vía authService + tenantContext. */
async function login(page, username = 'e2e-learn') {
  await page.evaluate(async (u) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(u, 'e2e-test-pwd');
    if (!result.success) throw new Error('OAuth mock falló: ' + (result.error || '??'));
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(u);
  }, username);
}

test.describe('Learn — HelpManual (ayuda)', () => {
  test('HelpManual renderiza la pantalla home con cards de temas', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'help' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // El header del manual debe ser visible.
    const body = page.locator('body');
    await expect(body).toContainText('Manual de uso', { timeout: 10000 });

    // La home lista cards de temas.
    await expect(body).toContainText('Cómo usar la voz');
    await expect(body).toContainText('Cómo usar Chagra');
    await expect(body).toContainText('Diccionario');
  });

  test('HelpDictionary renderiza con términos y categorías', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'help' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // Navegar a Diccionario desde la home.
    const dictBtn = page.getByRole('button', { name: /Diccionario/i }).first();
    await dictBtn.click();
    await page.waitForTimeout(800);

    // El diccionario debe tener el buscador y las chips de categoría.
    const body = page.locator('body');
    await expect(body).toContainText('Diccionario', { timeout: 5000 });

    // Chips de categoría visibles (identidad, microorganismos, etc.).
    await expect(body).toContainText('identidad', { timeout: 5000 });
    await expect(body).toContainText('microorganismos');
  });

  test('selector de regionalismos (HelpRegionSelector) funciona', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'help' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // El HelpRegionSelector tiene el texto "Tono regional IA".
    const body = page.locator('body');
    await expect(body).toContainText('Tono regional IA', { timeout: 10000 });

    // Expandir el selector.
    const regionToggle = page.getByRole('button', { name: /Selector de tono regional/i });
    await regionToggle.click();
    await page.waitForTimeout(300);

    // Debe aparecer el select de región y los botones de intensidad.
    await expect(body).toContainText('Región');
    await expect(body).toContainText('Intensidad');

    // Los botones de intensidad (Off, Sutil, Full) deben estar visibles.
    await expect(page.getByRole('button', { name: /Off/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sutil/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Full/i })).toBeVisible();
  });

  test('navegar entre sub-vistas de ayuda sin crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'help' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // Recorrer las cards de la home y navegar a cada sub-vista.
    const subViews = [
      { name: /Cómo usar la voz/i, expect: /voz|micrófono|habla/i },
      { name: /Cómo usar Chagra/i, expect: /uso|inicio|rápido/i },
      { name: /Aprende sembrando/i, expect: /semilla|lec?huga|fresa|tomate|ciclo/i },
      { name: /Diccionario/i, expect: /Diccionario|término|busca/i },
      { name: /Sobre el agente Chagra/i, expect: /agente|asistente|puede/i },
      { name: /Dónde se guardan mis datos/i, expect: /datos|guardan|aparato/i },
    ];

    for (const sub of subViews) {
      // Volver a home entre cada visita.
      const backBtn = page.getByRole('button', { name: /Volver al Manual|Cerrar manual/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(300);
      }

      const btn = page.getByRole('button', { name: sub.name }).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);

        // Verificar que la sub-vista tiene contenido esperado.
        const bodyText = await page.locator('body').innerText();
        expect.soft(bodyText).toMatch(sub.expect);
      }
    }

    // No deben registrarse errores JS críticos.
    const critical = errors.filter(
      (e) =>
        !e.includes('manifest') &&
        !e.includes('favicon') &&
        !e.includes('ServiceWorker') &&
        !e.toLowerCase().includes('preload') &&
        !e.includes('401') &&
        !e.includes('403'),
    );
    expect(critical).toEqual([]);
  });

  test('HelpVoiceRegionalDemo renderiza con selector de región e intensidad', async ({ page }) => {
    await seedTenant(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'help' })));
    await page.waitForLoadState('networkidle').catch(() => {});

    // Expandir el selector regional.
    const regionToggle = page.getByRole('button', { name: /Selector de tono regional/i });
    await regionToggle.click();
    await page.waitForTimeout(300);

    // Seleccionar intensidad "Sutil" para desbloquear el CTA de demo.
    const sutilBtn = page.getByRole('button', { name: /Sutil/i });
    await sutilBtn.click();
    await page.waitForTimeout(300);

    // El botón "Probar la voz con este tono" debe aparecer.
    const demoBtn = page.getByRole('button', { name: /Probar la voz con este tono|pregunta libre IA/i });
    if (await demoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await demoBtn.click();
      await page.waitForTimeout(800);

      // HelpVoiceRegionalDemo tiene el breadcrumb "Probar voz regional".
      const body = page.locator('body');
      await expect(body).toContainText('Probar voz regional', { timeout: 5000 });

      // Selector de región e intensidad visibles.
      await expect(body).toContainText('Región');
      await expect(body).toContainText('Intensidad');

      // Debe tener un <select> con opciones de región.
      const regionSelect = page.locator('select').first();
      await expect(regionSelect).toBeVisible();

      // Volver al manual.
      const backBtn = page.getByRole('button', { name: /Volver al Manual/i }).first();
      if (await backBtn.isVisible().catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(300);
        await expect(page.locator('body')).toContainText('Manual de uso');
      }
    }
  });
});
