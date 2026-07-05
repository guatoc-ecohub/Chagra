#!/usr/bin/env node
/**
 * conoce-shots.mjs — capturas headless del recorrido "Conoce Chagra".
 *
 * Recorre las 7 escenas del tour en el tema base (biopunk) y las escenas
 * clave (mano / mundos / cierre) en los demás temas, más la auto-oferta de
 * primera vez en el dashboard. Mismo harness que chagra-shot.mjs (chromium
 * del nix-store, determinism, reducedMotion 'reduce' — que además VALIDA que
 * el tour funciona completo sin animación).
 *
 * Uso: node scripts/conoce-shots.mjs --out-dir /ruta/capturas
 *      (levanta `npm run dev` en :5173 si no hay servidor escuchando)
 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { installDeterminism, loginAndSeed } from '../tests/visual/visualTestUtils.js';

const BASE_URL = 'http://127.0.0.1:5173';
const VIEWPORT = { width: 390, height: 844 };
const ESCENA_IDS = ['mano', 'agente', 'confianza', 'mundos', 'voz', 'offgrid', 'cierre'];
const TEMAS_EXTRA = ['nature', 'minimalista', 'verde-vivo'];
const ESCENAS_POR_TEMA = ['mano', 'mundos', 'cierre'];

const KNOWN_CHROMIUM_PATHS = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];

function resolveChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch { /* sigue */ }
  for (const candidate of KNOWN_CHROMIUM_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) {
      throw new Error(`El servidor terminó antes de estar listo, code=${child.exitCode}`);
    }
    try {
      const r = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2_000) });
      if (r.ok || r.status >= 400) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timeout esperando servidor en ${url}`);
}

async function ensureServer() {
  try {
    const r = await fetch(BASE_URL, { method: 'GET', signal: AbortSignal.timeout(1_500) });
    if (r.ok || r.status >= 400) return { started: false, child: null };
  } catch { /* levantar */ }
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, VITE_FARMOS_URL: '', VITE_FARMOS_CLIENT_ID: 'farm', VITE_OPERATOR_USERNAME: 'op-test' },
  });
  await waitForServer(BASE_URL, child);
  return { started: true, child };
}

function parseArgs(argv) {
  let outDir = null;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--out-dir') outDir = argv[++i];
    else if (argv[i].startsWith('--out-dir=')) outDir = argv[i].slice('--out-dir='.length);
  }
  if (!outDir) throw new Error('Uso: node scripts/conoce-shots.mjs --out-dir <dir>');
  return { outDir: resolve(outDir) };
}

async function newTourPage(browser, theme) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIEWPORT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'es-CO',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installDeterminism(context, page, { profileKey: 'operador' });
  if (theme) {
    await page.addInitScript((t) => {
      localStorage.setItem('chagra:theme', t);
      if (document.documentElement) {
        if (t === 'biopunk' || t === 'biopunk2') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', t);
      }
    }, theme);
  }
  await loginAndSeed(page, 'empty');
  return { context, page };
}

async function abrirTour(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'conoce' } }));
  });
  await page.waitForSelector('[data-testid="conoce-chagra"]', { timeout: 30_000 });
  await page.waitForTimeout(400);
}

async function capturarEscenas(page, outDir, tema, escenas) {
  for (const id of ESCENA_IDS) {
    const actual = await page.getAttribute('[data-testid="conoce-chagra"]', 'data-escena');
    if (actual !== id) throw new Error(`Escena esperada ${id}, actual ${actual}`);
    if (escenas.includes(id)) {
      const out = resolve(outDir, `conoce-${tema}-${ESCENA_IDS.indexOf(id) + 1}-${id}.png`);
      await page.screenshot({ path: out });
      console.log(`[conoce-shots] ${out}`);
    }
    if (id !== 'cierre') {
      await page.click('[data-testid="cnc-siguiente"]');
      await page.waitForTimeout(250);
    }
  }
}

async function run() {
  const { outDir } = parseArgs(process.argv);
  mkdirSync(outDir, { recursive: true });
  const server = await ensureServer();
  const chromiumPath = resolveChromiumPath();
  const browser = await chromium.launch({
    ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // 1. Tema base (biopunk): las 7 escenas completas.
    {
      const { context, page } = await newTourPage(browser, 'biopunk');
      await abrirTour(page);
      await capturarEscenas(page, outDir, 'biopunk', ESCENA_IDS);
      await context.close();
    }

    // 2. Temas restantes: escenas clave (mano / mundos / cierre).
    for (const tema of TEMAS_EXTRA) {
      const { context, page } = await newTourPage(browser, tema);
      await abrirTour(page);
      await capturarEscenas(page, outDir, tema, ESCENAS_POR_TEMA);
      await context.close();
    }

    // 3. La auto-oferta de primera vez en el dashboard (sin huella previa).
    {
      const { context, page } = await newTourPage(browser, 'biopunk');
      await page.evaluate(() => localStorage.removeItem('chagra:conoce-visto'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="conoce-invite"]', { timeout: 30_000 });
      await page.waitForTimeout(300);
      const out = resolve(outDir, 'conoce-invite-dashboard.png');
      await page.screenshot({ path: out });
      console.log(`[conoce-shots] ${out}`);
      await context.close();
    }
  } finally {
    await browser.close().catch(() => {});
    if (server.started && server.child) server.child.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
