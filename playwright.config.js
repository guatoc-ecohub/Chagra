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
  // En CI (ubuntu-latest) usar el chromium BUNDLED de Playwright — instalado por
  // `npx playwright install chromium` y que es el build parcheado correcto. El
  // `/usr/bin/chromium` que trae el runner NO es compatible con el protocolo de
  // Playwright y cierra con "Target page, context or browser has been closed".
  // La deteccion por `which`/nix-shell de abajo solo hace falta en NixOS local.
  if (process.env.CI) {
    return undefined;
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

// launchOptions compartido para los 3 projects (todos engine chromium).
// `--no-sandbox`: en CI (ubuntu-latest) el chromium del sistema (/usr/bin/
// chromium) NO tiene el SUID sandbox helper instalado y Ubuntu 23.10+
// deshabilita los unprivileged user namespaces vía AppArmor → el zygote
// host aborta con "No usable sandbox!" (SIGABRT) al lanzar. Es el fix
// canónico de Playwright en GitHub Actions; inofensivo en local (corremos
// como usuario normal). Sin esto los projects mobile-* crashean al launch.
// `PLAYWRIGHT_SINGLE_PROCESS=1`: opt-in SOLO para correr local en hosts NixOS
// donde el chromium del nix-store cuelga el handshake CDP en modo multi-proceso
// (zygote/sandbox helper). NO se setea en CI (allí el chromium bundled
// multi-proceso funciona y --single-process degradaría el render).
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
    // Congela las animaciones que ya respetan `prefers-reduced-motion: reduce`
    // (colibrí 3D del agente, BiopunkBackground, Confetti, GrowLoader, Sparkline).
    // Reduce el flake de los E2E actuales y es prerequisito de las capturas de
    // regresión visual (toHaveScreenshot) — usa el mecanismo CSS ya existente,
    // sin flags nuevos. Ver feedback-tdd-test-first-dentro-estructura.
    reducedMotion: 'reduce',
  },
  // QUARANTINE-MULTIPLATFORM #299 (2026-05-28): el data-loss de iPhone
  // (PR #1106) NO está cubierto por tests cross-browser. Agregamos 3
  // projects para validar que el quarantine flow funciona en viewports
  // PC + Android + iOS. Todos usan chromium engine (webkit no instalado
  // en NixOS alpha) — el iPhone project es viewport + user-agent only,
  // suficiente para reproducir bugs de capacity/storage IDB iOS-specific
  // que se pasaban por alto en chromium PC.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: CHROMIUM_LAUNCH,
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: CHROMIUM_LAUNCH,
      },
      // Solo correr tests con tag @cross-platform — la suite completa
      // (login + cycle + observation + offline + multifinca) ya pasa en
      // chromium desktop. Agregar todos a mobile-chrome triplica la
      // duración del CI sin pillar bugs nuevos del UX flow normal.
      grep: /@cross-platform/,
    },
    {
      name: 'mobile-safari-emulated',
      use: {
        // iPhone 12 viewport + user agent. Engine sigue siendo chromium
        // (webkit real no instalado en NixOS alpha). Útil para pillar bugs
        // de viewport / safe-area / user agent gating; NO sirve para bugs
        // de webkit engine puro (IDB quirks específicos de Safari).
        ...devices['iPhone 12'],
        // `devices['iPhone 12']` trae defaultBrowserType:'webkit', pero webkit
        // NO está instalado (el workflow solo hace `playwright install chromium`,
        // y NixOS alpha tampoco lo tiene). Forzamos engine chromium manteniendo
        // viewport + user-agent de iPhone — el project es viewport/UA-gating, no
        // engine-quirks de Safari. Sin esto: "Executable doesn't exist .../webkit".
        defaultBrowserType: 'chromium',
        launchOptions: CHROMIUM_LAUNCH,
      },
      grep: /@cross-platform/,
    },
  ],
  webServer: {
    command: 'npx vite --port=5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
