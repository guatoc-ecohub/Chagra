import { test, expect } from '@playwright/test';
import { DESKTOP, MOBILE, installDeterminism } from './visualTestUtils.js';

const AVATAR_TYPES = ['colibri', 'colibri_svg', 'maiz'];
const VIEWPORTS = [
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
];

test.describe('visual regression de componentes compartidos', () => {
  test.beforeEach(async ({ context, page }) => {
    await installDeterminism(context, page, { profileKey: 'operador' });
  });

  for (const avatarType of AVATAR_TYPES) {
    test(`gallery componentes con avatar ${avatarType}`, async ({ page }) => {
      await page.goto(`/tests/visual/component-harness.html?type=${avatarType}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      await page.evaluate(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
      });

      for (const [viewportName, viewport] of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await expect(page).toHaveScreenshot(`component-gallery-${avatarType}-${viewportName}.png`, {
          fullPage: true,
          mask: [page.locator('canvas')],
        });
      }
    });
  }
});
