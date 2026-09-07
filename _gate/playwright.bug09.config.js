import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Config dedicada para correr el spec de gate de _gate/ (fuera de testDir de
// playwright.config.js, que apunta a ./tests). Mismo patrón de chromium y vite
// del config principal; reuseExistingServer:false + strictPort para que un
// puerto ocupado por otro carril FALLE alto en vez de medir un server ajeno
// (regla del canario por contenido).
function detectChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (process.env.CI) return undefined;
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch { /* seguir al bundled */ }
  return undefined;
}

const CHROMIUM_PATH = detectChromiumPath();
const CHROMIUM_LAUNCH = {
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
};

export default defineConfig({
  // Config vive en _gate/: rutas relativas a este archivo, no a la raíz del repo.
  testDir: '.',
  testMatch: 'bug09-mitad-b.spec.js',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 320_000,
  expect: { timeout: 90_000 },
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
    baseURL: 'http://localhost:5173',
    launchOptions: CHROMIUM_LAUNCH,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --port=5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120_000,
    // Sin `cwd`, Playwright arranca el server en el dir del config (_gate) y
    // vite sirve 404 para / (no hay index.html ahí). Raíz del repo.
    cwd: REPO_ROOT,
    env: {
      VITE_FARMOS_URL: process.env.VITE_FARMOS_URL || '',
      VITE_FARMOS_CLIENT_ID: process.env.VITE_FARMOS_CLIENT_ID || 'farm',
      VITE_OPERATOR_USERNAME: process.env.VITE_OPERATOR_USERNAME || 'op-test',
    },
  },
});
