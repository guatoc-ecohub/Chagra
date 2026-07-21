import { test, expect } from '@playwright/test';

test.describe('Casa por dentro, altura del canvas', () => {
  test('el canvas 3D ocupa el alto disponible del viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 820 });
    await page.goto('/?ciclo=12#/mockups/casa-adentro', { waitUntil: 'domcontentloaded' });

    const mundo = page.locator('.mcasa');
    const canvas = mundo.locator('canvas');

    await expect(mundo).toBeVisible({ timeout: 20_000 });
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    const alturas = await page.evaluate(() => ({
      viewport: window.innerHeight,
      mundo: document.querySelector('.mcasa')?.getBoundingClientRect().height ?? 0,
      canvas: document.querySelector('.mcasa canvas')?.getBoundingClientRect().height ?? 0,
    }));

    expect(alturas.mundo).toBeGreaterThan(150);
    expect(alturas.canvas).toBe(alturas.mundo);
    expect(alturas.canvas).toBe(alturas.viewport);
  });
});
