import { test, expect } from '@playwright/test';

test.describe('Vitrina maestra, botón vivo del juego', () => {
  test('el botón de Metal Slug del campo apunta a una ruta que existe', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/mockups/vitrina-maestra', { waitUntil: 'domcontentloaded' });

    const raiz = page.locator('.vmx-raiz');
    await expect(raiz).toBeVisible({ timeout: 20_000 });

    const botonJuego = page.locator('[data-testid="boton-metal-slug-campo"]');
    await expect(botonJuego).toBeVisible({ timeout: 10_000 });
    await expect(botonJuego).toContainText('Metal Slug del campo');

    await botonJuego.click();

    await page.waitForURL(/#\/mockups\/metal-slug-campo/, { timeout: 10_000 });
    expect(page.url()).toContain('#/mockups/metal-slug-campo');

    /* La ruta existe si el mockup del juego se monta y no cae en el fallback de error. */
    const canvas = page.locator('canvas');
    const svg = page.locator('svg');
    await expect(canvas.or(svg).first()).toBeVisible({ timeout: 15_000 });
  });
});
