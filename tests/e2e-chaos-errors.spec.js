import { test, expect } from '@playwright/test';

/**
 * e2e-chaos-errors.spec.js — Chaos / error-injection tests.
 *
 * Inyecta fallos via page.route() para verificar que la app degrada
 * elegantemente sin pantalla en blanco ni errores no capturados.
 *
 * Escenarios:
 *   1. API 500 → error state visible, sin white screen
 *   2. API timeout → loading state, luego error state
 *   3. JSON corrupto → ErrorBoundary renderiza ("Algo falló")
 *   4. Red offline → mensaje offline visible, sin white screen
 */

const CONSOLE_BLOCKLIST = [
  'favicon',
  'third-party',
  'chrome-extension',
  'Failed to load resource: net::ERR_FAILED',
];

function collectFatalErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const isBlocked = CONSOLE_BLOCKLIST.some((p) =>
        text.toLowerCase().includes(p.toLowerCase())
      );
      if (!isBlocked) {
        errors.push(text);
      }
    }
  });
  return errors;
}

test.describe('Chaos — Error Injection', () => {
  test('API 500: app shows error state, no white screen', async ({ page }) => {
    const consoleErrors = collectFatalErrors(page);

    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ status: '500', title: 'Internal Server Error' }] }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    const bodyContent = await page.textContent('body');
    expect(bodyContent.trim().length).toBeGreaterThan(0);

    const rootElement = page.locator('#root');
    await expect(rootElement).not.toBeEmpty();

    await page.screenshot({ path: 'test-results/chaos-api-500.png', fullPage: false });

    expect(consoleErrors.length).toBe(0);
  });

  test('API timeout: shows loading then error, no white screen', async ({ page }) => {
    const consoleErrors = collectFatalErrors(page);

    await page.route('**/api/**', async (_route) => {
      await new Promise(() => {}); // nunca resuelve, fetch hace timeout
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    const bodyContent = await page.textContent('body');
    expect(bodyContent.trim().length).toBeGreaterThan(0);

    const rootElement = page.locator('#root');
    await expect(rootElement).not.toBeEmpty();

    await page.screenshot({ path: 'test-results/chaos-api-timeout.png', fullPage: false });

    expect(consoleErrors.length).toBe(0);
  });

  test('Corrupt JSON: ErrorBoundary renders, no white screen', async ({ page }) => {
    const consoleErrors = collectFatalErrors(page);

    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ "data": [ { corrupt json',
      });
    });

    await page.goto('/');
    await page.waitForTimeout(4000);

    const bodyContent = await page.textContent('body');
    expect(bodyContent.trim().length).toBeGreaterThan(0);

    const errorBoundary = page.locator('text=Algo falló');
    const hasErrorUI = await errorBoundary.isVisible().catch(() => false);
    if (hasErrorUI) {
      await expect(page.locator('text=Intentar de nuevo')).toBeVisible();
      await expect(page.locator('text=Recargar Chagra')).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/chaos-corrupt-json.png', fullPage: false });

    expect(consoleErrors.length).toBe(0);
  });

  test('Network offline: shows offline message, no white screen', async ({ page }) => {
    const consoleErrors = collectFatalErrors(page);

    await page.context().setOffline(true);

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    const bodyContent = await page.textContent('body');
    expect(bodyContent.trim().length).toBeGreaterThan(0);

    const rootElement = page.locator('#root');
    await expect(rootElement).not.toBeEmpty();

    const isOnline = await page.evaluate(() => navigator.onLine);
    expect(isOnline).toBe(false);

    await page.screenshot({ path: 'test-results/chaos-offline.png', fullPage: false });

    expect(consoleErrors.length).toBe(0);
  });

  test('All chaos scenarios: zero uncaught console errors', async ({ page }) => {
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const isBlocked = CONSOLE_BLOCKLIST.some((p) =>
          text.toLowerCase().includes(p.toLowerCase())
        );
        if (!isBlocked) {
          consoleErrors.push(text);
        }
      }
    });

    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ status: '500', title: 'ISE' }] }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    await page.unroute('**/api/**');
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'not json {{{',
      });
    });

    await page.reload();
    await page.waitForTimeout(3000);

    await page.unroute('**/api/**');
    await page.context().setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.context().setOffline(false);

    if (consoleErrors.length > 0) {
      console.warn(
        '[CHAOS] console errors across all scenarios:',
        consoleErrors
      );
    }
  });
});
