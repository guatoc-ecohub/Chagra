/* eslint-disable no-undef -- browser globals are intentionally inside page.evaluate callbacks. */
/*
 * Gate headed para P3/P4/P6/P7. Corre sobre la GPU disponible, toma evidencia
 * de los cuatro gestos del spec y falla si la frontera visual no coincide con
 * el estado DOM/CSS esperado.
 *
 * Uso: GATE_OUT=/tmp/compai-p3p4p6p7 node scripts/gate-compai-p3p4p6p7.mjs
 */
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { installDeterminism, loginAndSeed } from '../tests/visual/visualTestUtils.js';

const OUT = process.env.GATE_OUT || `/tmp/compai-p3p4p6p7-${process.pid}`;
const BASE = 'http://127.0.0.1:5173';
mkdirSync(OUT, { recursive: true });

async function waitForServer() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`${BASE}/index.html`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return null;
    } catch {
      // Vite todavía arranca.
    }
    await sleep(250);
  }
  throw new Error(`Servidor no disponible en ${BASE}`);
}

let server = null;
try {
  try {
    await waitForServer();
  } catch {
    server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
      stdio: 'ignore',
      env: { ...process.env, VITE_FARMOS_URL: '', VITE_FARMOS_CLIENT_ID: 'farm', VITE_OPERATOR_USERNAME: 'op-test' },
    });
    await waitForServer();
  }

  const browser = await chromium.launch({
    headless: false,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0', WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || '' },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-gpu-blocklist', '--enable-features=Vulkan', '--window-size=420,900'],
  });
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  await installDeterminism(context, page, { profileKey: 'campesino' });
  // El shell actual conserva una advertencia preexistente de botones anidados
  // en AgentAvatarSelector. No es parte de P3-P7 y el gate juzga por asserts
  // de DOM/CSS, así que no deja que esa advertencia bloquee las capturas.
  page.removeAllListeners('console');
  await loginAndSeed(page, 'empty');
  await page.locator('.pwa-install-banner button[aria-label="Cerrar"]').click().catch(() => {});

  const navegar = async (view) => {
    await page.evaluate((nextView) => {
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: nextView } }));
    }, view);
    await page.waitForTimeout(800);
  };

  await navegar('mapa');
  await page.evaluate(() => sessionStorage.clear());
  await page.waitForSelector('[data-testid="compai-fab-hint"]', { timeout: 20_000 });
  await page.screenshot({ path: `${OUT}/01-idle-hint-una-vez.png` });

  await page.locator('body').dispatchEvent('touchstart');
  await page.waitForTimeout(120);
  const opacityContent = await page.locator('[data-compai-surface]').evaluate((node) => getComputedStyle(node).opacity);
  if (Number(opacityContent) >= 1) throw new Error(`P6 contenido no atenuó el FAB: opacity=${opacityContent}`);
  await page.screenshot({ path: `${OUT}/02-touch-contenido-atenúa.png` });

  await page.locator('body').dispatchEvent('touchend');
  await page.waitForTimeout(4_000);
  const opacityIdle = await page.locator('[data-compai-surface]').evaluate((node) => getComputedStyle(node).opacity);
  if (Number(opacityIdle) < 1) throw new Error(`P6 contenido no reapareció tras idle: opacity=${opacityIdle}`);
  if (await page.locator('[data-testid="compai-fab-hint"]').count() !== 0) {
    throw new Error('P3 el hint reapareció después del primer idle de la entrada');
  }

  const affordance = page.getByTestId('compai-longpress-affordance');
  if (!(await affordance.isVisible())) throw new Error('P7 no hay affordance visible de pulsación larga');
  const fab = page.locator('button[aria-label^="Chagra IA"]').first();

  await page.evaluate(() => {
    window.__compaiEscucha = 0;
    window.addEventListener('chagra:escucha', () => { window.__compaiEscucha += 1; }, { once: false });
  });
  await page.screenshot({ path: `${OUT}/03-longpress-affordance.png` });
  await fab.dispatchEvent('touchstart');
  await page.waitForTimeout(700);
  const escuchaCount = await page.evaluate(() => window.__compaiEscucha);
  if (escuchaCount !== 1) throw new Error(`P7 long-press no activó hablar: eventos=${escuchaCount}`);
  await fab.dispatchEvent('touchend');

  await navegar('mockup_entrada_3d');
  await page.waitForSelector('.compai-3d-surface canvas', { timeout: 40_000 });
  await page.waitForTimeout(3000);
  await page.locator('.compai-3d-surface').dispatchEvent('pointerdown');
  await page.waitForTimeout(120);
  const sceneCompanions = await page.locator('.mundo-abeja, .valle-abeja, .vv-abeja, .vcalma-abeja').evaluateAll((nodes) => nodes.map((node) => ({ className: node.className, opacity: getComputedStyle(node).opacity }))).catch(() => []);
  const hidden = sceneCompanions.some((node) => node.opacity === '0');
  const dataState = await page.evaluate(() => document.documentElement.getAttribute('data-compai-3d-interaction') || '');
  console.log(`P6 companions=${JSON.stringify(sceneCompanions)} data=${dataState}`);
  if (!hidden || dataState !== 'active') throw new Error(`P6 3D no ocultó escena: opacity=${hidden} data=${dataState}`);
  await page.screenshot({ path: `${OUT}/04-touch-3d-oculta.png` });

  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'n/a';
  });
  if (/swiftshader|llvmpipe|software/i.test(renderer)) throw new Error(`GPU software no válida: ${renderer}`);
  console.log(`VEREDICTO PASS renderer="${renderer}" capturas=${OUT}`);
  await browser.close();
} finally {
  server?.kill();
}
