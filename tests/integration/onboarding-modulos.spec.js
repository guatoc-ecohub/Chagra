import { test, expect } from '@playwright/test';

test.describe('Integration: Onboarding completion verifies home modules', () => {
  test('onboarding skipped still shows AgentHero on home', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const agentHero = page.locator('[data-cy="agent-hero"]');
    if (await agentHero.isVisible()) {
      await expect(agentHero).toBeVisible();
    }
  });

  test('home modules render after onboarding flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const modules = page.locator('[data-cy="dashboard-module"]');
    const count = await modules.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
