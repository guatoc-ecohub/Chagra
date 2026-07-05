// semaphore-shot.mjs — VERIFICACIÓN VISUAL del #2074 Semáforo de confianza
// científica del ChatBubble. Sirve el harness AISLADO (sin login gate) y
// captura los 3 estados (verde/ámbar/rojo), primero colapsado y luego con el
// panel de motivo+procedencia desplegado (click en el chip).
//
// NixOS: chromium del nix-store (executablePath). El bundled de Playwright
// falla por libs faltantes (memoria reference-playwright-nixos-setup).
//
// Uso: node tests/visual/semaphore-shot.mjs [outDir]
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = process.argv[2] || '/tmp/semaforo-shots';
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const URL = `${BASE}/tests/visual/semaphore-harness.html`;

const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (w) return w;
  } catch { /* fall through */ }
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch { /* noop */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, child, deadlineMs = 120000) {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (child?.exitCode != null && child.exitCode !== 0) {
      throw new Error(`El servidor terminó antes de estar listo (code=${child.exitCode})`);
    }
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok || r.status >= 400) return;
    } catch { /* retry */ }
    await sleep(300);
  }
  throw new Error(`Timeout esperando servidor en ${url}`);
}

async function ensureServer(cwd) {
  // Reúsa un dev server ya escuchando en el puerto (evita cold-start doble).
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok || r.status >= 400) return null;
  } catch { /* nada escuchando: lo arrancamos */ }

  // `npx vite` directo (probado): `npm run dev` bajo spawn cuelga en este setup.
  const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  await waitForServer(BASE, child);
  return child;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cwd = process.cwd();

  const child = await ensureServer(cwd);

  // Warm-up: fuerza a vite a transformar el harness (dep pre-bundle en frío)
  // ANTES de navegar, para que el goto no compita con la optimización.
  for (let i = 0; i < 3; i++) {
    try { await fetch(URL, { signal: AbortSignal.timeout(50000) }); break; }
    catch { await sleep(500); }
  }

  const results = [];
  let browser;
  try {

    const chromiumPath = resolveChromium();
    browser = await chromium.launch({
      executablePath: chromiumPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({
      viewport: { width: 460, height: 900 },
      deviceScaleFactor: 2,
      locale: 'es-CO',
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!/favicon|manifest|sqlite|wasm|Failed to load resource|WebGL|content security policy/i.test(t)) {
          pageErrors.push(t);
        }
      }
    });

    // 'domcontentloaded' (no 'networkidle'): el HMR websocket de vite mantiene
    // la red "activa" y networkidle nunca asienta con un dev server recién
    // arrancado. El waitForSelector de abajo confirma el montaje real.
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Espera a que los 3 semáforos monten (cubre el pre-bundle en frío).
    await page.waitForSelector('[data-testid="semaphore-badge"]', { timeout: 45000 });
    await sleep(600);

    // Captura general (los 3 estados colapsados).
    const overview = path.join(OUT_DIR, 'semaforo-overview.png');
    await page.screenshot({ path: overview, fullPage: true });
    results.push(overview);

    // Por estado: captura la tarjeta colapsada y luego expandida (click en chip).
    for (const state of ['verde', 'ambar', 'rojo']) {
      const card = page.locator(`#card-${state}`);
      await card.scrollIntoViewIfNeeded();
      await sleep(150);
      const collapsed = path.join(OUT_DIR, `semaforo-${state}-colapsado.png`);
      await card.screenshot({ path: collapsed });
      results.push(collapsed);

      // Expandir el panel de motivo + procedencia.
      await card.locator('[data-testid="semaphore-badge"]').click();
      await sleep(250);
      const expanded = path.join(OUT_DIR, `semaforo-${state}-expandido.png`);
      await card.screenshot({ path: expanded });
      results.push(expanded);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Errores en la página: ${pageErrors.slice(0, 3).join(' | ')}`);
    }

    console.log('[semaforo-shot] capturas OK:');
    for (const r of results) console.log('  ' + r);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child) child.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error('[semaforo-shot] FALLO:', e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
