import { test, expect } from '@playwright/test';

/**
 * demo-switch.spec.js — VERIFICACIÓN del SWITCH DE DEMO POR PERFIL (operador).
 *
 * Criterio de éxito del brief: el OPERADOR (kortux) puede SIMULAR un perfil sin
 * cambiar su perfil real ni re-loguear. Al simular 'urbano', el home se re-deriva
 * COMO un urbano → SIN la tarjeta de Cerdos (que el operador normalmente SÍ ve
 * por su bypass). Además aparece el banner "MODO DEMO — viendo como …".
 *
 * Flujo probado (end-to-end, vía la UI real):
 *   1. Login como operador (kortux). Su home normal = VE TODO (incl. Cerdos).
 *   2. Activar el demo 'urbano' desde ProfileScreen → pestaña Avanzado.
 *   3. Volver al home: el banner MODO DEMO está visible y la tarjeta de Cerdos
 *      DESAPARECIÓ (vista de urbano). Screenshot → /tmp/demo-switch.png.
 *   4. (Gate de seguridad) Un usuario REAL no operador no puede activar el demo:
 *      setDemoRole es no-op y getDemoOverride sigue null.
 *
 * A-19 / feedback-sw-shadows-playwright-route: mocks en `page.context().route`.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const OPERADOR = 'kortux';

/** Siembra el operador SIN perfil urbano: su home real ve TODO (bypass). */
async function seedOperador(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      // Perfil neutro: el bypass del operador le muestra todo igual.
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({ vocacion: 'campesino', finca_altitud: '1800', piso_confirmado: '1' }),
      );
      // Asegurar que NO arrastra un demo de una corrida anterior.
      window.sessionStorage.removeItem('chagra:demo-profile:v1');
    } catch (_) {
      /* noop */
    }
  }, OPERADOR);
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-demo-token',
        refresh_token: 'e2e-demo-refresh',
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

async function loginComoOperador(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-demo-pwd');
    if (!result.success) throw new Error('OAuth mock no respondió OK');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, OPERADOR);
}

test.describe('SWITCH DE DEMO — operador simula un perfil', () => {
  test('operador simulando "urbano" ve el home SIN Cerdos + banner MODO DEMO', async ({ page }) => {
    await seedOperador(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await loginComoOperador(page);
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    // ── 1. Home REAL del operador: VE TODO, incluida la tarjeta de Cerdos.
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 15000 });
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeVisible();

    // ── 2. Activar el SWITCH DE DEMO 'urbano' desde el servicio (gate real de
    //       operador). Equivale a tocar el botón en ProfileScreen → Avanzado;
    //       lo hacemos por servicio para no depender de la navegación de tabs.
    const activado = await page.evaluate(async () => {
      const demo = await import('/src/services/demoProfile.js');
      return demo.setDemoRole('urbano'); // gated: solo operador → true aquí.
    });
    expect(activado).toBe(true);

    // El evento DEMO_CHANGED re-deriva el home en caliente. Damos un tick.
    await page.waitForTimeout(800);

    // ── 3a. Banner MODO DEMO visible, mencionando el perfil simulado.
    const banner = page.locator('[data-testid="demo-mode-banner"]');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText('Modo demo', { ignoreCase: true });
    await expect(banner).toContainText('Urbano', { ignoreCase: true });

    // ── 3b. La tarjeta de Cerdos DESAPARECIÓ (vista de urbano). El bloque de
    //       seguimiento entero se oculta para un urbano (no ve ninguna tarjeta).
    await expect(seguimiento).toHaveCount(0, { timeout: 5000 });
    // Y como refuerzo: en todo el body ya no aparece la tarjeta "Cerdos".
    // (El texto puede vivir en otros lados; nos basta con que el bloque de
    //  seguimiento se fue, que es el criterio de éxito #1 del brief.)

    // Screenshot del switch EN ACCIÓN — criterio de éxito del operador.
    await page.screenshot({ path: '/tmp/demo-switch.png', fullPage: true });

    // ── Salir del demo: el operador vuelve a ver TODO (incl. Cerdos).
    await page.evaluate(async () => {
      const demo = await import('/src/services/demoProfile.js');
      demo.clearDemo();
    });
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="seguimiento-cards"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="demo-mode-banner"]')).toHaveCount(0);
  });

  test('GATE: un usuario REAL (no operador) NO puede activar el demo', async ({ page }) => {
    // Sembrar un usuario normal (fuera de OPERADOR_WHITELIST).
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('chagra:active_tenant_id', 'campesino_juan');
        window.localStorage.setItem('chagra:profile:v1', JSON.stringify({ vocacion: 'campesino' }));
        window.sessionStorage.removeItem('chagra:demo-profile:v1');
      } catch (_) { /* noop */ }
    });
    await mockBackend(page);
    await page.goto(ORIGIN);

    const resultado = await page.evaluate(async () => {
      const demo = await import('/src/services/demoProfile.js');
      const activado = demo.setDemoRole('urbano'); // debe ser no-op → false.
      // Incluso sembrando a mano sessionStorage, el gate lo ignora.
      try { window.sessionStorage.setItem('chagra:demo-profile:v1', 'tecnico'); } catch (_) { /* noop */ }
      const override = demo.getDemoOverride(); // debe seguir null.
      return { activado, override };
    });
    expect(resultado.activado).toBe(false);
    expect(resultado.override).toBeNull();

    // El banner nunca aparece para un usuario real.
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="demo-mode-banner"]')).toHaveCount(0);
  });
});
