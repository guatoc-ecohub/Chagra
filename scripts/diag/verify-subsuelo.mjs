#!/usr/bin/env node
/*
 * verify-subsuelo — captura la escena del Mundo Subsuelo enriquecida en 3
 * estados de vida del suelo (base, suelo vivo, suelo cansado) para revisar la
 * red micorrízica, la Lombricita protagonista, raíces con nódulos, agua y
 * minerales. Sin negro, con animación real (no virtual-time-budget).
 *
 * Auto-contenido: stubbea la red y siembra el token de auth (el juego no
 * necesita datos de finca), así la vista con auth `#subsuelo` monta directo.
 */
import { mkdirSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = process.env.PORT || '5178';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.OUT_DIR || '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad/subsuelo-shots';
const FIXED_MS = new Date('2026-06-17T10:30:00-05:00').getTime();

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* fall back to bundled */ }
  return undefined;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child?.exitCode != null) throw new Error(`server died code=${child.exitCode}`);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status >= 400) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('timeout waiting server');
}

async function ensureServer() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok || r.status >= 400) return null;
  } catch { /* start one */ }
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, VITE_FARMOS_URL: '', VITE_FARMOS_CLIENT_ID: 'farm', VITE_OPERATOR_USERNAME: 'op-test' },
  });
  await waitForServer(BASE, child);
  return child;
}

async function stubRed(context) {
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.endsWith('/oauth/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'tk', refresh_token: 'rf', expires_in: 3600, token_type: 'Bearer' }),
      });
    }
    if (url.origin === BASE) return route.continue();
    if (url.pathname.includes('/api/') || url.pathname.includes('/jsonapi/') || url.pathname.includes('/oauth/')
      || url.hostname.includes('open-meteo') || url.hostname.includes('ollama')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
}

async function seedProfileAndAuth(page) {
  await page.addInitScript((fixedMs) => {
    window.localStorage.setItem('chagra:profile:done:v1', '1');
    window.localStorage.setItem('chagra:onboarding:done', '1');
    window.localStorage.setItem('chagra:active_tenant_id', 'op-test');
  }, FIXED_MS);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  // token de auth en la DB 'Chagra' (syncQueue), igual que isAuthenticated() espera
  await page.evaluate(async (fixedMs) => {
    function open(version) {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open('Chagra', version);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('syncQueue')) req.result.createObjectStore('syncQueue');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    let db = await open();
    if (!db.objectStoreNames.contains('syncQueue')) {
      const v = db.version + 1; db.close(); db = await open(v);
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const s = tx.objectStore('syncQueue');
      s.put('tk', 'farmos_access_token');
      s.put('rf', 'farmos_refresh_token');
      s.put(fixedMs + 3600_000, 'farmos_token_expiry');
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, FIXED_MS);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}

async function clickCarta(page, nombre, veces = 1) {
  for (let i = 0; i < veces; i++) {
    await page.getByRole('button', { name: new RegExp(nombre, 'i') }).first().click();
    await page.waitForTimeout(450);
  }
}

async function run() {
  mkdirSync(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({
    executablePath: resolveChromium(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 900, height: 1200 },
    deviceScaleFactor: 2,
    locale: 'es-CO',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  try {
    await stubRed(context);
    await seedProfileAndAuth(page);

    // Navegar al Mundo Subsuelo (vista con auth) por el evento de navegación.
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'subsuelo' } })));
    await page.getByTestId('mundo-subsuelo-escena').waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(11_000); // dejar correr la red micorrízica y la Lombricita

    const escena = page.getByTestId('mundo-subsuelo-escena');
    const box0 = await escena.boundingBox();
    if (!box0 || box0.width < 60 || box0.height < 60) throw new Error('escena vacía/negra en base');
    const life0 = await escena.getAttribute('data-soil-life');
    await page.screenshot({ path: `${OUT}/01-base-${life0}.png`, fullPage: true });

    // Suelo VIVO: compost + micorriza suben la vida por encima de 75.
    await clickCarta(page, 'Compost y bocashi', 2);
    await clickCarta(page, 'Inocular micorriza', 1);
    await page.waitForTimeout(3_000);
    const life1 = await escena.getAttribute('data-soil-life');
    const stage1 = await escena.getAttribute('data-stage');
    await page.screenshot({ path: `${OUT}/02-vivo-${life1}-${stage1}.png`, fullPage: true });

    // Suelo CANSADO: labranza intensa + exceso químico rompen la red.
    await clickCarta(page, 'Labranza intensa', 2);
    await clickCarta(page, 'Exceso quimico', 2);
    await page.waitForTimeout(2_500);
    const life2 = await escena.getAttribute('data-soil-life');
    const stage2 = await escena.getAttribute('data-stage');
    await page.screenshot({ path: `${OUT}/03-cansado-${life2}-${stage2}.png`, fullPage: true });

    const sparks = await page.getByTestId('nutrient-spark').count();
    console.log(`[verify-subsuelo] OK base=${life0} vivo=${life1}(${stage1}) cansado=${life2}(${stage2}) sparks(cansado)=${sparks}`);
    if (errors.length) throw new Error(`errores de página: ${errors[0]}`);
    console.log(`[verify-subsuelo] capturas → ${OUT}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (server) server.kill('SIGTERM');
  }
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
