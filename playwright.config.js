import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';

// El chromium bundled de Playwright falla en NixOS por libs faltantes
// (libglib-2.0.so.0). Usar el chromium del nix-store via executablePath.
// Si `PLAYWRIGHT_CHROMIUM_PATH` se setea, usar ese (CI puede pasar uno).
// Si no, buscar en el PATH (cualquier OS no-NixOS) o caer al bundled
// estándar de Playwright como último recurso.
function detectChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {
    // ignore
  }
  try {
    // NixOS sin chromium en PATH: usar nix-shell para resolverlo.
    const nixResult = execSync(
      "nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1",
      { encoding: 'utf8' },
    ).trim();
    if (nixResult && nixResult.startsWith('/nix/store')) return nixResult;
  } catch {
    // ignore
  }
  return undefined; // dejar que Playwright use su bundled
}

const CHROMIUM_PATH = detectChromiumPath();

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
      use: {
        ...devices['Desktop Chrome'],
        ...(CHROMIUM_PATH ? { launchOptions: { executablePath: CHROMIUM_PATH } } : {}),
      },
    },
  ],
  webServer: {
    command: 'npx vite --port=5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
