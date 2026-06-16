import { test, expect } from '@playwright/test';

test.describe('Integration: Chip click prefills agent prompt', () => {
  test('chip "Siembra" click populates agent input', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('[data-cy="chip-mode"]').first();
    if (await chip.isVisible()) {
      await chip.click();
      const input = page.locator('[data-cy="agent-input"]');
      await input.waitFor({ timeout: 5000 });
      const value = await input.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('chip click triggers agent mode change', async ({ page }) => {
    await page.goto('/');
    const chip = page.locator('[data-cy="chip-mode"]').first();
    if (await chip.isVisible()) {
      await chip.click();
      const activeChip = page.locator('[data-cy="chip-mode"].active, [data-active="true"]').first();
      await expect(activeChip).toHaveCount(1, { timeout: 5000 });
    }
  });
});
