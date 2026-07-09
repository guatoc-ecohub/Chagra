/* global process */
import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';

/**
 * stress/playwright.stress.config.js — config AISLADA para specs de stress.
 *
 * A propósito NO extiende `testDir: './tests'` del playwright.config.js raíz:
 * las specs de este directorio son pruebas de CARGA/resiliencia (ciclos de
 * red intermitente, muchas acciones seguidas), no del gate funcional normal.
 * Si vivieran bajo `tests/`, `npm run test:e2e` y el workflow
 * `.github/workflows/playwright.yml` las correrían en cada push — no es lo
 * que queremos para specs de stress, más lentas y con parámetros de carga
 * configurables por env. Se corren EXPLÍCITAMENTE:
 *
 *   npx playwright test --config=stress/playwright.stress.config.js
 *
 * Reutiliza la misma detección de chromium NixOS que playwright.config.js
 * (comentarios completos ahí — acá solo el mínimo para no duplicar prosa).
 */
function detectChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (process.env.CI) return undefined;
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {
    // ignore
  }
  try {
    const nixResult = execSync("nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1", { encoding: 'utf8' }).trim();
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
  testDir: '.',
  testMatch: ['*.spec.js'],
  fullyParallel: false, // specs de stress mutan red/IDB del mismo contexto — corren una a la vez
  forbidOnly: !!process.env.CI,
  retries: 0, // un retry escondería flakiness real bajo carga — la queremos ver
  workers: 1,
  reporter: 'list',
  timeout: Number(process.env.STRESS_TEST_TIMEOUT_MS || 120_000),
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: CHROMIUM_LAUNCH },
    },
  ],
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npx vite --port=5173 --strictPort',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            VITE_FARMOS_URL: process.env.VITE_FARMOS_URL || '',
            VITE_FARMOS_CLIENT_ID: process.env.VITE_FARMOS_CLIENT_ID || 'farm',
            VITE_OPERATOR_USERNAME: process.env.VITE_OPERATOR_USERNAME || 'op-test',
          },
        },
      }),
});
