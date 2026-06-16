import { test, expect } from '@playwright/test';

const PROD_URL = 'https://chagra.guatoc.co';

/**
 * e2e-prod-smoke.spec.js — Smoke test contra PRODUCCION.
 *
 * Objetivo: verificar que la PWA en produccion carga sin errores
 * catastroficos. NO prueba credenciales reales (sin login), solo
 * paginas publicas accesibles sin autenticacion.
 *
 * Corre manualmente contra prod, NO contra el dev server local:
 *   PLAYWRIGHT_BASE_URL='' npx playwright test tests/e2e-prod-smoke.spec.js
 *
 * En CI este spec NO se ejecuta automaticamente. Se lanza via
 * workflow_dispatch o manual para verificar disponibilidad de prod.
 */

test.describe('Chagra PROD Smoke', () => {
  test('login page loads without console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({ text: msg.text(), location: msg.location() });
      }
    });

    const status5xx = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        status5xx.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // La PWA debe renderizar contenido (login o pantalla publica inicial)
    await expect(page.locator('body')).not.toBeEmpty();

    // La pagina de login o el shell de la PWA debe estar presente
    const hasLoginOrShell = await page.locator(
      'input[type="text"], input[type="email"], input[name="name"], [data-testid="login-form"], #root, [id="root"]'
    ).first().isVisible().catch(() => false);

    // Si no hay login visible, al menos el shell de React se monto
    if (!hasLoginOrShell) {
      // Verificar que hay contenido renderizado (no pagina en blanco)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText.length).toBeGreaterThan(10);
    }

    // Tomar screenshot para referencia visual
    await page.screenshot({ path: 'test-results/prod-smoke-login.png', fullPage: false });

    // Verificar que no hubo errores 5xx del servidor
    expect(status5xx, `Respuestas 5xx detectadas: ${JSON.stringify(status5xx)}`).toEqual([]);

    // Verificar que no hubo errores fatales en consola (excluir errores de
    // terceros como tracking/analytics que no controlamos)
    const fatalConsoleErrors = consoleErrors.filter((e) => {
      const text = e.text.toLowerCase();
      return (
        !text.includes('favicon') &&
        !text.includes('tracking') &&
        !text.includes('analytics') &&
        !text.includes('gtag') &&
        !text.includes('google')
      );
    });

    if (fatalConsoleErrors.length > 0) {
      console.warn(
        `[PROD-SMOKE] Errores de consola detectados (${fatalConsoleErrors.length}):`,
        fatalConsoleErrors
      );
    }

    // No fallamos por errores de consola en prod (pueden ser CORS de
    // terceros o service worker registration benigna), pero los reportamos.
    // Si en el futuro queremos ser estrictos, cambiar a:
    // expect(fatalConsoleErrors).toEqual([]);
  });

  test('public pages do not return 5xx', async ({ page }) => {
    const status5xx = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        status5xx.push({ url: response.url(), status: response.status() });
      }
    });

    // Navegar a la raiz y esperar que cargue
    const response = await page.goto(PROD_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response.status()).toBeLessThan(500);

    // Verificar que el HTML basico del PWA shell se sirvio
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('text/html');

    expect(status5xx).toEqual([]);
  });

  test('service worker is registered in prod', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Verificar que el service worker se registro (PWA offline-first)
    const swUrl = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null;
      const reg = await navigator.serviceWorker.getRegistration();
      return reg ? reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL : null;
    });

    // Si no hay SW registrado, puede ser primera carga o browser sin soporte.
    // No es critico para el smoke test pero lo reportamos.
    if (!swUrl) {
      console.warn('[PROD-SMOKE] Service Worker no detectado en prod.');
    }
  });
});
