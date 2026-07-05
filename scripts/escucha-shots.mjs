#!/usr/bin/env node
/**
 * escucha-shots.mjs — Capturas headless del widget "Chagra está escuchando".
 *
 * Reusa la infra de chagra-shot (visualTestUtils: determinismo + login + seed)
 * y el patrón NixOS (chromium del nix-store). El micrófono es el FAKE de
 * Chromium (--use-fake-device-for-media-capture): produce un tono real, así
 * que los anillos/brotes del iris se mueven con amplitud DE VERDAD.
 *
 * Whisper se stubbea con context.route (NO page.route: el SW lo sombrea,
 * gotcha documentado) para poder capturar la fase "rumbo" sin backend.
 *
 * Uso: node scripts/escucha-shots.mjs [--outdir <dir>]
 */
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { installDeterminism, loginAndSeed } from '../tests/visual/visualTestUtils.js';

const PORT = process.env.ESCUCHA_SHOT_PORT || '5187';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const VIEWPORT = { width: 390, height: 844 };

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
  for (const c of KNOWN_CHROMIUM_PATHS) if (existsSync(c)) return c;
  try {
    const nix = execSync("nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1", {
      encoding: 'utf8', timeout: 120_000,
    }).trim();
    if (nix.startsWith('/nix/store')) return nix;
  } catch { /* bundled */ }
  return undefined;
}

async function waitForServer(url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status >= 400) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Timeout esperando ${url}`);
}

async function ensureServer() {
  try {
    const r = await fetch(BASE_URL, { signal: AbortSignal.timeout(1500) });
    if (r.ok || r.status >= 400) return null;
  } catch { /* arrancar */ }
  const mode = process.env.ESCUCHA_SHOT_SERVER || 'dev';
  const child = spawn('npm', ['run', mode, '--', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    stdio: 'ignore',
    env: { ...process.env, VITE_FARMOS_URL: '', VITE_FARMOS_CLIENT_ID: 'farm', VITE_OPERATOR_USERNAME: 'op-test' },
  });
  await waitForServer(BASE_URL);
  return child;
}

const OUTDIR = (() => {
  const i = process.argv.indexOf('--outdir');
  return resolve(i > -1 ? process.argv[i + 1] : 'shots-escucha');
})();

async function abrirEscucha(page, fuente) {
  await page.evaluate((f) => {
    window.dispatchEvent(new CustomEvent('chagra:escucha', { detail: { fuente: f, ts: Date.now() } }));
  }, fuente);
  await page.waitForSelector('[data-testid="escucha-overlay"][data-fase="oyendo"]', { timeout: 15_000 });
  // Deja correr el tono fake ~1.2s para que los brotes tengan historia real.
  await page.waitForTimeout(1200);
}

async function main() {
  mkdirSync(OUTDIR, { recursive: true });
  const server = await ensureServer();
  const chromiumPath = resolveChromiumPath();
  const browser = await chromium.launch({
    ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-capture',
      '--use-fake-device-for-media-capture',
    ],
  });

  const temas = [
    { id: 'biopunk', dataTheme: null },
    { id: 'nature', dataTheme: 'nature' },
    { id: 'minimalista', dataTheme: 'minimalista' },
  ];

  const hechas = [];
  for (const tema of temas) {
    const context = await browser.newContext({
      baseURL: BASE_URL,
      viewport: VIEWPORT,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      locale: 'es-CO',
      permissions: ['microphone'],
    });
    // Whisper stub (context.route — el SW sombrea page.route).
    await context.route('**/api/whisper/asr*', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'Lléveme al mercado' }),
    }));

    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    await installDeterminism(context, page, { profileKey: 'operador' });
    if (tema.dataTheme) {
      await page.addInitScript((t) => {
        localStorage.setItem('chagra:theme', t);
        document.documentElement?.setAttribute('data-theme', t);
      }, tema.dataTheme);
    }
    // GOTCHA (dev server frío / caja cargada): loginAndSeed seedea el IDB con
    // networkidle-catch, y si el app aún NO montó, ChagraDB no existe → el
    // open del seed la crea VACÍA en v26 y poisonea el contexto ("object
    // stores was not found"). Esperar boot real + creación de la DB primero.
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForFunction(
      () => document.querySelector('#root')?.children.length > 0,
      undefined,
      { timeout: 180_000 },
    );
    // La app solo crea ChagraDB tras autenticar → sembrar el token (DB
    // 'Chagra'/syncQueue, mismo contrato de seedAuthToken) y recargar para
    // que el boot AUTENTICADO cree los object stores antes del seed.
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('Chagra');
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('syncQueue')) {
            req.result.createObjectStore('syncQueue');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        store.put('visual-token', 'farmos_access_token');
        store.put('visual-refresh', 'farmos_refresh_token');
        store.put(Date.now() + 3600_000, 'farmos_token_expiry');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelector('#root')?.children.length > 0,
      undefined,
      { timeout: 180_000 },
    );
    await page.waitForFunction(
      async () => (await indexedDB.databases()).some((d) => d.name === 'ChagraDB'),
      undefined,
      { timeout: 90_000 },
    );
    let seeded = false;
    for (let intento = 1; intento <= 3 && !seeded; intento++) {
      try {
        await loginAndSeed(page, 'with-data');
        seeded = true;
      } catch (err) {
        console.warn(`[escucha-shots] seed intento ${intento} falló: ${String(err.message).slice(0, 120)}`);
        await page.waitForTimeout(4000);
      }
    }
    if (!seeded) throw new Error('No se pudo seedear tras 3 intentos');
    await page.waitForTimeout(1500);

    // 1) FAB visible en el home
    const fabShot = `${OUTDIR}/escucha-01-fab-${tema.id}.png`;
    await page.waitForSelector('[data-testid="escucha-fab"]', { timeout: 20_000 });
    await page.screenshot({ path: fabShot });
    hechas.push(fabShot);

    // 2) Widget escuchando (tap)
    await abrirEscucha(page, 'tap');
    const oyendoShot = `${OUTDIR}/escucha-02-escuchando-${tema.id}.png`;
    await page.screenshot({ path: oyendoShot });
    hechas.push(oyendoShot);

    if (tema.id === 'biopunk') {
      // 3) Variante wake-word (encabezado «hola Chagra») — solo tema base
      await page.click('[data-testid="escucha-cancelar"]');
      await abrirEscucha(page, 'wakeword');
      const wwShot = `${OUTDIR}/escucha-03-wakeword-biopunk.png`;
      await page.screenshot({ path: wwShot });
      hechas.push(wwShot);

      // 4) Fase rumbo: "Lléveme al mercado" → "Abriendo Mercado…"
      await page.click('[data-testid="escucha-listo"]');
      await page.waitForSelector('[data-testid="escucha-rumbo"]', { timeout: 20_000 });
      const rumboShot = `${OUTDIR}/escucha-04-rumbo-biopunk.png`;
      await page.screenshot({ path: rumboShot });
      hechas.push(rumboShot);
    }

    await context.close();
  }

  await browser.close();
  if (server) server.kill('SIGTERM');
  console.log('Capturas listas:');
  for (const h of hechas) console.log('  ' + h);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
