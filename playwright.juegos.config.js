import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';

/*
 * playwright.juegos.config.js — Config de Playwright SOLO para el gate E2E
 * de juegos (tests/juegos/juego-jugable.spec.js).
 *
 * Está separado de playwright.config.js porque:
 *   - Los juegos usan un servidor diferente (puerto 8800, no 5173/5174)
 *   - No levanta el dev server de Vite (los juegos corren en su propio server)
 *   - Tiene timeouts y configuración específica para juegos
 *   - NO rompe el CI existente (test:e2e) si algo falla
 *
 * Uso:
 *   npx playwright test --config=playwright.juegos.config.js
 *   # o con el script npm run test:juego
 */

// Reutilizamos la detección de chromium del config principal (soporte NixOS)
function detectChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  if (process.env.CI) {
    return undefined; // Usar chromium bundled en CI
  }
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {
    // ignore
  }
  try {
    const nixResult = execSync(
      "nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1",
      { encoding: 'utf8' },
    ).trim();
    if (nixResult && nixResult.startsWith('/nix/store')) return nixResult;
  } catch {
    // ignore
  }
  return undefined;
}

const CHROMIUM_PATH = detectChromiumPath();

const LOCAL_SINGLE_PROCESS = process.env.PLAYWRIGHT_SINGLE_PROCESS === '1' && !process.env.CI;
const CHROMIUM_LAUNCH = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    ...(LOCAL_SINGLE_PROCESS ? ['--disable-gpu', '--disable-dev-shm-usage', '--single-process'] : []),
  ],
  ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
};

export default defineConfig({
  testDir: './tests/juegos',
  testMatch: ['**/*.spec.js'],
  // SOLO correr tests del gate de juegos
  fullyParallel: false, // Un juego a la vez para evitar colisiones de puerto
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Un worker para evitar colisiones con el servidor de juegos
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: {
    timeout: 15000, // Timeout más largo para operaciones de canvas
  },
  use: {
    // NO usar baseURL de Vite — los juegos tienen su propio servidor
    baseURL: process.env.JUEGO_BASE_URL || 'http://127.0.0.1:8800',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // NO congelar animaciones — queremos ver el juego en movimiento
    reducedMotion: 'no-preference',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium-juegos',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: CHROMIUM_LAUNCH,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // NO levantar web server — asumimos que el servidor de juegos ya está corriendo
  // El usuario debe arrancar el servidor de juegos antes de correr los tests
});
