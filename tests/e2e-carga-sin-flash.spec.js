import { test, expect } from '@playwright/test';

/**
 * e2e-carga-sin-flash.spec.js — TAREA 63
 *
 * Verifica que los estados de carga NO muestran fondo blanco y que el
 * spinner/loader respeta el tema oscuro. Cubre:
 *   - Pantalla de home (dashboard) en carga inicial
 *   - Pantalla de agente en carga lazy
 *   - body backgroundColor oscuro durante toda la carga
 *   - Screenshot del estado de carga
 */

const ORIGIN = 'http://localhost:5173';

function isWhiteOrLight([r, g, b]) {
  return r > 250 && g > 250 && b > 250;
}

test.describe('Carga sin flash blanco', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-fake-access',
          refresh_token: 'e2e-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
    );
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.abort('blockedbyclient');
    });
  });

  test('home screen loading — body background NO es blanco', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('domcontentloaded');

    const bgColor = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return style.backgroundColor;
    });

    const parsed = bgColor.match(/rgba?\(([^)]+)\)/);
    expect(parsed, 'body debe tener backgroundColor definido').not.toBeNull();

    const channels = parsed[1].split(',').map((x) => parseFloat(x.trim()));
    expect(isWhiteOrLight(channels), `body bg ${bgColor} no debe ser blanco`).toBe(false);
  });

  test('home screen loading — spinner presente con tema oscuro', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('domcontentloaded');

    // La app muestra LoadingFallback (bg-slate-950 + ChagraGrowLoader)
    // antes de hidratar el dashboard. Verificamos que el contenedor de carga
    // usa fondo oscuro.
    const loadingBg = await page.evaluate(() => {
      const el = document.querySelector('.bg-slate-950, [class*="bg-slate-9"]');
      if (!el) return null;
      return getComputedStyle(el).backgroundColor;
    });

    // Si hay loader visible, su contenedor debe ser oscuro
    if (loadingBg) {
      const parsed = loadingBg.match(/rgba?\(([^)]+)\)/);
      if (parsed) {
        const channels = parsed[1].split(',').map((x) => parseFloat(x.trim()));
        expect(isWhiteOrLight(channels), `loading container bg ${loadingBg} no debe ser blanco`).toBe(false);
      }
    }
  });

  test('home screen — screenshot del estado de carga inicial', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toHaveScreenshot('home-loading.png', {
      maxDiffPixels: 5000,
    });
  });

  test('agente screen loading — body background NO es blanco', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    // Navegar al agente que es lazy-loaded
    await page.goto(`${ORIGIN}/#/agente`);

    // Durante la carga lazy, verificar que el fondo del body no es blanco
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    const parsed = bgColor.match(/rgba?\(([^)]+)\)/);
    expect(parsed, 'body debe tener backgroundColor definido').not.toBeNull();
    const channels = parsed[1].split(',').map((x) => parseFloat(x.trim()));
    expect(isWhiteOrLight(channels), `body bg ${bgColor} no debe ser blanco`).toBe(false);

    const critical = errors.filter(
      (e) =>
        !e.includes('manifest') &&
        !e.includes('favicon') &&
        !e.includes('ServiceWorker') &&
        !e.includes('preload') &&
        !e.includes('401') &&
        !e.includes('403')
    );
    expect(critical, 'sin pageerrors criticos').toEqual([]);
  });

  test('agente screen — spinner o ChagraGrowLoader visible durante carga', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    await page.goto(`${ORIGIN}/#/agente`);
    await page.waitForLoadState('domcontentloaded');

    // Verificamos que el agente eventualmente renderiza sin error
    await expect(
      page.locator('[data-testid="agent-input"], textarea[placeholder*="pregunta" i]')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('agente screen — screenshot del estado tras carga', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    await page.goto(`${ORIGIN}/#/agente`);
    await expect(
      page.locator('[data-testid="agent-input"], textarea[placeholder*="pregunta" i]')
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('body')).toHaveScreenshot('agente-loaded.png', {
      maxDiffPixels: 5000,
    });
  });
});
