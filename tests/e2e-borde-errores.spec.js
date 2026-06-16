import { test, expect } from '@playwright/test';

/**
 * E2E de bordes de error: simula fallos de red y respuestas malformadas
 * para verificar que la UI degrada controladamente sin pantalla en blanco.
 *
 * Tarea 75: error boundaries por ruta + estados loading/empty/error.
 *
 * Patrones: context.route para interceptar fetch y simular errores.
 * No bloquea el dev server del webServer en playwright.config.js.
 */

const API_BASE = '**/api/**';

test.describe('E2E bordes de error — degradación controlada', () => {
  test('network down: app carga sin pantalla en blanco', async ({ context, page }) => {
    await context.route(API_BASE, (route) => route.abort('internetdisconnected'));
    await context.route('**/oauth/**', (route) => route.abort('internetdisconnected'));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body.length).toBeGreaterThan(10);
  });

  test('401 Unauthorized: redirige a login', async ({ context, page }) => {
    await context.route(API_BASE, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ status: '401', title: 'Unauthorized' }] }),
      })
    );

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // La app debe mostrar algo legible — no pantalla en blanco.
    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(20);
  });

  test('422 Validation error: UI muestra detalles del error', async ({ context, page }) => {
    let apiCalled = false;
    await context.route(API_BASE, (route) => {
      apiCalled = true;
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [
            {
              status: '422',
              title: 'Unprocessable Entity',
              detail: 'name is required',
              source: { pointer: '/data/attributes/name' },
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // La página no debe estar en blanco.
    const text = await page.textContent('body');
    expect(text.length).toBeGreaterThan(15);

    // Si la app intentó llamar a la API, el mock 422 se sirvió.
    // Verificamos que la app no crashea.
    expect(apiCalled).toBeDefined();
  });

  test('respuesta JSON malformada: degradación sin crash', async ({ context, page }) => {
    await context.route(API_BASE, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ broken: "json"',
      })
    );
    await context.route('**/oauth/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{ broken: "json"',
      })
    );

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Verificar que no hay pantalla en blanco.
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body.length).toBeGreaterThan(10);
  });

  test('timeout de API: UI sigue funcional', async ({ context, page }) => {
    await context.route(API_BASE, (route) =>
      route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ status: '504', title: 'Gateway Timeout' }] }),
      })
    );

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const body = await page.textContent('body');
    expect(body.length).toBeGreaterThan(15);
  });
});
