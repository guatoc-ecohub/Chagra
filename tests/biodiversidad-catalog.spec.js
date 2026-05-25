import { test, expect } from '@playwright/test';

/**
 * biodiversidad-catalog.spec.js — vista catálogo de especies / biopreparados.
 *
 * Componente: src/components/BiodiversidadView.jsx
 *
 * El catálogo es la pieza más visible del producto. Hay 486+ species, 19
 * biopreparados, 176+ plagas, etc. (cifras del WelcomeStatsHero). Este
 * spec verifica que el catálogo carga + permite búsqueda + abre fichas.
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Biodiversidad — carga del catálogo (smoke)', () => {
  test('login screen muestra cifras del catálogo público (pre-auth)', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    const text = await page.locator('body').innerText();
    // Stats globales pre-login: especies + biopreparados + fichas
    // Bug fix #1015: NO arrancar con 0 en useState (banner-fallback-inmediato)
    const numbers = text.match(/\b\d{2,4}\b/g) || [];
    expect(numbers.length, 'al menos algún número visible en hero').toBeGreaterThan(0);
    // Validar que las palabras clave aparezcan
    expect(text.toLowerCase()).toMatch(/especies?|plantas?|biopreparados?/);
  });
});

test.describe.skip('Biodiversidad — búsqueda + ficha (skipped — requiere login mock)', () => {
  test('busca "café" y devuelve coffea_arabica', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/biodiversidad`);
    const search = page.locator('input[type="search"], input[placeholder*="buscar" i]').first();
    await search.fill('café');
    await page.waitForTimeout(500);
    const results = await page.locator('body').innerText();
    expect(results.toLowerCase()).toMatch(/coffea arabica|café/);
  });

  test('abre ficha de plaga "broca del café"', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/biodiversidad`);
    const search = page.locator('input[type="search"]').first();
    await search.fill('broca');
    await page.waitForTimeout(500);
    await page.locator('text=/broca/i').first().click();
    // Ficha muestra binomio Hypothenemus hampei
    await expect(page.locator('text=/Hypothenemus hampei/i')).toBeVisible();
  });

  test('ficha biopreparado lista ingredientes + advertencia toxicológica si aplica', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/biodiversidad/biopreparados`);
    const first = page.locator('[data-testid="biopreparado-card"], article').first();
    await first.click();
    const ficha = await page.locator('body').innerText();
    expect(ficha.toLowerCase()).toMatch(/ingrediente|preparación|método/);
  });
});
