import { test, expect } from '@playwright/test';

test('mockup clima-atmosfera carga sin pageerrors y monta el mundo real', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto('/#/mockups/clima-atmosfera');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { level: 1, name: 'El mundo del clima' })).toBeVisible();
  await expect(page.locator('.m3dc__escena .mundo-root')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
