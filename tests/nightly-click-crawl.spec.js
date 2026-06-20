/* global process */
import { test, expect } from '@playwright/test';

const RUN_NIGHTLY = process.env.RUN_NIGHTLY_CLICK_CRAWL === '1';
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

const ROUTES = [
  '/',
  '/#/agente',
  '/#/inventario',
  '/#/biodiversidad',
  '/#/ayuda',
  '/#/perfil',
  '/#/informes',
  '/#/case-studies',
  '/#/tareas',
];

const UNSAFE_CLICK = [
  /salir/i,
  /cerrar sesi[oó]n/i,
  /eliminar/i,
  /borrar/i,
  /descartar/i,
  /guardar/i,
  /programar/i,
  /confirmar/i,
  /enviar/i,
  /sincronizar/i,
  /completar/i,
  /marcar/i,
  /permitir/i,
  /capturar/i,
  /grabar/i,
  /detener/i,
];

async function installMocks(context) {
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'nightly-click-token',
        refresh_token: 'nightly-click-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    })
  );

  await context.route('**/api/ollama/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [], response: 'ready', done: true }),
    })
  );

  await context.route('**/api/kokoro/**', (route) => route.fulfill({ status: 503, body: '' }));
  await context.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
    })
  );
}

async function login(page) {
  await page.goto(ORIGIN);
  await page.getByLabel(/usuario/i).fill('nightly-click');
  await page.getByLabel(/contrase[nñ]a/i).fill('nightly-pass');
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByTestId('topbar-user-menu')).toBeVisible({ timeout: 15_000 });
}

async function targetName(locator) {
  const label = await locator.getAttribute('aria-label').catch(() => null);
  if (label?.trim()) return label.trim();
  return (await locator.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

function isUnsafeName(name) {
  return UNSAFE_CLICK.some((pattern) => pattern.test(name));
}

test.describe('Nightly click crawl — app-wide actionable controls', () => {
  test.skip(!RUN_NIGHTLY, 'Nightly-only. Set RUN_NIGHTLY_CLICK_CRAWL=1 to execute.');

  test.beforeEach(async ({ context }) => {
    await installMocks(context);
  });

  for (const route of ROUTES) {
    test(`click audit ${route}`, async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await login(page);
      await page.goto(`${ORIGIN}${route}`);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      const controls = page.locator(
        'button:visible, a[href]:visible, [role="button"]:visible, [role="menuitem"]:visible, [role="tab"]:visible'
      );
      const count = await controls.count();
      expect(count, `controles visibles en ${route}`).toBeGreaterThan(0);

      const sampled = [];
      const limit = Math.min(count, 30);
      for (let i = 0; i < limit; i += 1) {
        const control = controls.nth(i);
        const name = await targetName(control);
        if (!name || isUnsafeName(name)) {
          await control.click({ trial: true, timeout: 3_000 }).catch(() => {});
          continue;
        }

        sampled.push(name);
        await control.click({ timeout: 5_000 });
        await page.waitForTimeout(150);
        await page.goto(`${ORIGIN}${route}`);
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      }

      const criticalConsole = consoleErrors.filter(
        (err) =>
          !/favicon|manifest|ServiceWorker|preload|401|403|blockedbyclient/i.test(err)
      );
      expect.soft(pageErrors, `pageerrors en ${route}; clics: ${sampled.join(' | ')}`).toEqual([]);
      expect.soft(criticalConsole, `console errors en ${route}; clics: ${sampled.join(' | ')}`).toEqual([]);
    });
  }
});
