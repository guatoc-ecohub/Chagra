import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Excluir vitest unit tests (#100): viven en tests/unit/ y usan
  // @testing-library/jest-dom que entra en conflict con Playwright
  // expect global ("Cannot redefine property: Symbol($$jest-matchers-object)").
  testIgnore: ['**/unit/**', '**/*.test.{js,jsx}'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx vite --port=5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
