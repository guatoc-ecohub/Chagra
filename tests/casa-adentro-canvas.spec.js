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

test.describe('Casa por dentro, ventana de los mundos', () => {
  test('la ventana de los mundos navega a #/mockups/vitrina-maestra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?ciclo=12#/mockups/casa-adentro', { waitUntil: 'domcontentloaded' });

    const mundo = page.locator('.mcasa');
    await expect(mundo).toBeVisible({ timeout: 20_000 });

    const botonVentana = mundo.locator('button', { hasText: 'La ventana de los mundos' });
    await expect(botonVentana).toBeVisible({ timeout: 10_000 });
    await botonVentana.click();

    await page.waitForURL(/#\/mockups\/vitrina-maestra/, { timeout: 10_000 });
    expect(page.url()).toContain('#/mockups/vitrina-maestra');
  });
});
