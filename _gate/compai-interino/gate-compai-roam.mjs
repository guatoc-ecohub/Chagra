import { chromium } from 'playwright';
import fs from 'fs';

const CHROMIUM = '/nix/store/91whh0q5kgqi804ckhqmb4z1a1wx8x3j-chromium-151.0.7922.71/bin/chromium';
const URL = 'http://localhost:5199/';
const USER = 'admin';
const PASS = 'GuatocAdmin2026!';
const OUT = '/home/kortux/Workspace/chagra/_gate/compai-interino';

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  headless: false, // GPU-headed en DISPLAY=:0
  args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--window-size=1400,1000'],
});
const ctx = await browser.newContext({
  serviceWorkers: 'block',
  deviceScaleFactor: 2,
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();

const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
page.on('pageerror', (e) => pageErrors.push({ message: e.message, stack: e.stack }));
page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), failure: r.failure()?.errorText }));

log('=== goto', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => log('goto err:', e.message));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/00-landing.png` }).catch(() => {});

// ---- WEBGL RENDERER CHECK (real GPU vs swiftshader) ----
const glInfo = await page.evaluate(() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { error: 'no webgl context' };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
    };
  } catch (e) { return { error: String(e) }; }
});
log('WEBGL RENDERER INFO:', JSON.stringify(glInfo));

// ---- LOGIN ----
const userSel = 'input[type="text"], input[name*="user" i], input[placeholder*="suario" i], input[autocomplete="username"]';
const passSel = 'input[type="password"]';
try {
  await page.waitForSelector(passSel, { timeout: 8000 });
  await page.fill(userSel, USER, { timeout: 5000 });
  await page.fill(passSel, PASS, { timeout: 5000 });
  log('filled login');
  await page.screenshot({ path: `${OUT}/01-login-filled.png` }).catch(() => {});
  await page.click('button:has-text("Ingresar"), button:has-text("Entrar"), button[type="submit"]', { timeout: 5000 });
  log('clicked login');
} catch (e) {
  log('login step note (maybe already logged in):', e.message);
}
await page.waitForTimeout(5000);
await page.screenshot({ path: `${OUT}/02-postlogin.png` }).catch(() => {});

// ---- SET COMPAI = JAGUAR ----
await page.evaluate(() => {
  localStorage.setItem('chagra:agent-avatar-type', 'jaguar');
  localStorage.setItem('compai:companero', 'jaguar');
  localStorage.setItem('guatoc.guia', 'jaguar');
});
log('set localStorage jaguar; reloading');
await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => log('reload err:', e.message));
await page.waitForTimeout(4000);

const chosen = await page.evaluate(() => ({
  a: localStorage.getItem('chagra:agent-avatar-type'),
  b: localStorage.getItem('compai:companero'),
}));
log('localStorage now:', JSON.stringify(chosen));

// ---- LOCATE compai overlay/bubble ----
let bubble = page.locator('[data-testid="compai-bubble"]');
let count = await bubble.count();
log('compai-bubble count:', count);

let box0 = null;
try {
  await bubble.first().waitFor({ state: 'visible', timeout: 12000 });
  box0 = await bubble.first().boundingBox();
} catch (e) { log('bubble wait err:', e.message); }
log('initial bubble box:', JSON.stringify(box0));

await page.screenshot({ path: `${OUT}/03-jaguar-visible.png` }).catch(() => {});

// ---- CAPTURE ROAM: wide clip covering the ~30% width roam corridor ----
// El nodo ancla es bottom-4 right-4 (viewport 1280x900). Roam va hacia la
// izquierda hasta ~30% del ancho (max 460px cap). Recortamos una franja ancha
// que cubra la esquina inferior derecha completa.
const vp = { width: 1280, height: 900 };
const roamClip = {
  x: Math.max(0, vp.width - 700),
  y: Math.max(0, vp.height - 260),
  width: 700,
  height: 260,
};

const N = 16;
const GAP_MS = 1400; // 16 * 1.4s = ~22.4s de cobertura, suficiente para ida+vuelta+parada
const frameLog = [];
for (let i = 0; i < N; i++) {
  const f = `${OUT}/roam-f${String(i + 1).padStart(2, '0')}.png`;
  await page.screenshot({ path: f, clip: roamClip }).catch((e) => log('shot err', i, e.message));
  const state = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="compai-overlay-container"] > div');
    const bubbleEl = document.querySelector('[data-testid="compai-burbuja"]');
    return {
      transform: el ? el.style.transform : null,
      burbujaVisible: !!bubbleEl,
    };
  }).catch(() => ({}));
  frameLog.push({ i: i + 1, file: f, ...state, t: Date.now() });
  log(`frame ${i + 1}/${N}`, JSON.stringify(state));
  if (i < N - 1) await page.waitForTimeout(GAP_MS);
}

fs.writeFileSync(`${OUT}/frame-log.json`, JSON.stringify(frameLog, null, 2));

// full-page shot at the end, in case bubble is visible
await page.screenshot({ path: `${OUT}/04-final-fullpage.png` }).catch(() => {});

// dump console/errors
fs.writeFileSync(`${OUT}/console.json`, JSON.stringify({
  glInfo,
  pageErrors,
  failedRequests,
  warnings: consoleMessages.filter((m) => m.type === 'warning'),
  errors: consoleMessages.filter((m) => m.type === 'error'),
}, null, 2));
log('pageErrors:', pageErrors.length, 'consoleErrors:', consoleMessages.filter((m) => m.type === 'error').length, 'failedRequests:', failedRequests.length);

await browser.close();
log('DONE');
