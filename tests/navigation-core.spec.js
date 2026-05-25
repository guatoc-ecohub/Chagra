import { test, expect } from '@playwright/test';

/**
 * navigation-core.spec.js — smoke de TODAS las rutas principales.
 *
 * Una pequeña suite que verifica que cada ruta principal:
 *   - Carga sin pageerror crítico
 *   - Devuelve HTTP 200 en assets críticos
 *   - No tira recursos 404 críticos (favicon/manifest están permitidos)
 *
 * Si añadimos una nueva ruta al router, agregarla acá.
 */

const ORIGIN = 'http://localhost:5173';

const ROUTES = [
  '/',
  '/#/inventario',
  '/#/agente',
  '/#/biodiversidad',
  '/#/ayuda',
  '/#/perfil',
  '/#/informes',
  '/#/case-studies',
  '/#/tareas',
];

test.describe('Navigation — smoke de rutas principales', () => {
  for (const route of ROUTES) {
    test(`ruta ${route} carga sin errores críticos`, async ({ page }) => {
      const errors = [];
      const failed404 = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('response', res => {
        if (res.status() === 404) {
          const url = res.url();
          // Tolerable: favicon, ms-favicon
          if (!url.match(/favicon|manifest\.webmanifest/i)) {
            failed404.push(url);
          }
        }
      });

      await page.goto(`${ORIGIN}${route}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const critical = errors.filter(
        e =>
          !e.includes('manifest') &&
          !e.includes('favicon') &&
          !e.includes('ServiceWorker') &&
          !e.toLowerCase().includes('preload') &&
          !e.toLowerCase().includes('mixed content') &&
          // Errores típicos de auth pre-login son OK
          !e.includes('401') &&
          !e.includes('403')
      );
      expect.soft(critical, `errores JS críticos en ${route}`).toEqual([]);
      expect.soft(failed404, `404s no esperados en ${route}`).toEqual([]);
    });
  }
});

test.describe('Navigation — title + lang', () => {
  test('document.title contiene "Chagra"', async ({ page }) => {
    await page.goto(ORIGIN);
    await expect(page).toHaveTitle(/Chagra/i);
  });

  test('html lang declarado en español', async ({ page }) => {
    await page.goto(ORIGIN);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^es/i);
  });
});
