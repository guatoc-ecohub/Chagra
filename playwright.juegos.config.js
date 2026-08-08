import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

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

/*
 * detectXSession — Auto-detección de la sesión X para GPU real (headed)
 *
 * Siguiendo el patrón de /home/kortux/.local/bin/shot3d:
 *  - Si XAUTHORITY ya está seteado y es legible, usarlo
 *  - Si no, buscar procesos plasmashell/kwin_x11
 *  - Leer su environ para extraer XAUTHORITY y DISPLAY
 *  - GOTCHA: Verificar que la cookie X EXISTA en disco (no usar cookie muerta)
 *  - Si no hay sesión X accesible, lanzar error (NO degradar a swiftshader)
 *
 * Retorna: { DISPLAY, XAUTHORITY } o lanza error si no hay sesión X
 */
function detectXSession() {
  // Si XAUTHORITY ya está seteado y es legible, usarlo
  if (process.env.XAUTHORITY && existsSync(process.env.XAUTHORITY)) {
    console.warn(`[gate] XAUTHORITY ya seteado y legible: ${process.env.XAUTHORITY}`);
    return {
      DISPLAY: process.env.DISPLAY || ':0',
      XAUTHORITY: process.env.XAUTHORITY,
    };
  }

  // Buscar procesos del compositor X (plasmashell/kwin_x11)
  // GOTCHA: No usar el primer proceso que mencione "plasmashell"
  // porque puede ser un proceso zombie o el prompt de un timer
  // Regla: candidato válido = el que apunta a una cookie que EXISTE
  let pids = [];
  try {
    const plasmashellPids = execSync('pgrep -f plasmashell 2>/dev/null || true', {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    pids.push(...plasmashellPids);
  } catch {
    // ignore
  }
  try {
    const kwinPids = execSync('pgrep -f kwin_x11 2>/dev/null || true', {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    pids.push(...kwinPids);
  } catch {
    // ignore
  }

  if (pids.length === 0) {
    throw new Error(
      'No hay sesión X accesible: no se encontraron procesos plasmashell/kwin_x11. ' +
        'El gate de juegos GPU requiere una sesión gráfica corriendo. ' +
        'NO se degrada a swiftshader porque falsearía el test de WebGL.'
    );
  }

  // Para cada PID, intentar leer el environ y verificar que la cookie exista
  for (const pid of pids) {
    try {
      const environPath = `/proc/${pid}/environ`;
      if (!existsSync(environPath)) continue;

      // Leer el environ (null-separated)
      const environRaw = readFileSync(environPath, 'utf-8');
      const environVars = environRaw.split('\0').filter(Boolean);

      let xauthority = null;
      let display = null;

      for (const line of environVars) {
        if (line.startsWith('XAUTHORITY=')) {
          xauthority = line.split('=')[1];
        } else if (line.startsWith('DISPLAY=')) {
          display = line.split('=')[1];
        }
      }

      // GOTCHA CRÍTICO: Verificar que la cookie EXISTA en disco
      // No usar una cookie muerta (puede heredarse de un proceso zombie)
      if (!xauthority || !existsSync(xauthority)) {
        continue; // Cookie muerta, siguiente candidato
      }

      // Cookie válida encontrada
      if (!display) {
        display = ':0'; // Default si no está en environ
      }

      console.warn(`[gate] Sesión X detectada: DISPLAY=${display} XAUTHORITY=${xauthority} (pid ${pid})`);
      return { DISPLAY: display, XAUTHORITY: xauthority };
    } catch (err) {
      // Error leyendo este proceso, continuar con el siguiente
      console.warn(`[gate] Error leyendo PID ${pid}: ${err.message}`);
      continue;
    }
  }

  // Si llegamos aquí, no hay sesión X válida
  throw new Error(
    'No hay sesión X accesible: se encontraron procesos pero ninguna cookie X es válida. ' +
      'El gate de juegos GPU requiere una sesión gráfica corriendo. ' +
      'NO se degrada a swiftshader porque falsearía el test de WebGL.'
  );
}

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

// Detectar sesión X para GPU real (headed)
// Si no hay sesión X, esto lanza error y aborta el gate
let xSession = null;
try {
  xSession = detectXSession();
} catch (err) {
  console.error(`[gate] Error detectando sesión X: ${err.message}`);
  console.error('[gate] ABORTANDO: el gate de juegos GPU requiere una sesión gráfica corriendo.');
  process.exit(1); // Exit distinto de cero para fallar el gate
}

const LOCAL_SINGLE_PROCESS = process.env.PLAYWRIGHT_SINGLE_PROCESS === '1' && !process.env.CI;
const CHROMIUM_LAUNCH = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // NO deshabilitar GPU — queremos GPU real para WebGL
    ...(LOCAL_SINGLE_PROCESS ? ['--disable-dev-shm-usage', '--single-process'] : []),
  ],
  ...(CHROMIUM_PATH ? { executablePath: CHROMIUM_PATH } : {}),
  // Pasar DISPLAY y XAUTHORITY al proceso chromium
  env: {
    ...process.env,
    DISPLAY: xSession.DISPLAY,
    XAUTHORITY: xSession.XAUTHORITY,
  },
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
        // headless: false para GPU real (WebGL)
        // headless usa swiftshader y NO certifica WebGL real
        headless: false,
        launchOptions: CHROMIUM_LAUNCH,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // NO levantar web server — asumimos que el servidor de juegos ya está corriendo
  // El usuario debe arrancar el servidor de juegos antes de correr los tests
});
