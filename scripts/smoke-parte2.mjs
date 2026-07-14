#!/usr/bin/env node
/** Smoke test parte 2: rutas 78-127. Reusa páginas para evitar crash de chromium. */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:4500';
const OUT = resolve(import.meta.dirname, '..', 'smoke-prod');
const CHROMIUM = '/run/current-system/sw/bin/chromium';
const FAKE_TOKEN = 'smoke-test-token';
const FAKE_EXPIRY = Date.now() + 86400_000;
const ERROR_TEXTS = ['Algo falló', 'error inesperado', 'Ocurrió un error'];

// Get all routes from the manifest
const mf = readFileSync(resolve(import.meta.dirname, '..', 'src/config/rutasProdChagraApp.js'), 'utf8');
function extractPaths(blockName) {
  const re = new RegExp(`${blockName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = mf.match(re);
  if (!m) return [];
  const paths = [];
  const entryRe = /path:\s*'([^']+)'/g;
  let em;
  while ((em = entryRe.exec(m[1])) !== null) {
    if (!em[1].startsWith('_')) paths.push(em[1]);
  }
  return paths;
}
const todas = [...extractPaths('NUCLEO_3D'), ...extractPaths('NUCLEO_APP'), ...extractPaths('PENDIENTE_DECISION')];

// Start from route index 77 (mantenimiento is 0-indexed 77)
const START = 77;

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Sembrar token
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.evaluate(({ token, expiry }) => {
    localStorage.setItem('farmos_access_token', token);
    localStorage.setItem('farmos_refresh_token', token);
    localStorage.setItem('farmos_token_expiry', String(expiry));
  }, { token: FAKE_TOKEN, expiry: FAKE_EXPIRY });

  const resultados = [];

  for (let i = START; i < todas.length; i++) {
    const path = todas[i];
    const errors = [];

    // Capture console errors before navigation to get route-specific ones
    const pageErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') pageErrors.push(msg.text()); });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    try {
      await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(8000); // Esperar hidratación

      const body = await page.content();
      const lower = body.toLowerCase();
      let status = 'OK';
      for (const t of ERROR_TEXTS) {
        if (lower.includes(t.toLowerCase())) { status = 'CRASH'; break; }
      }
      if (status === 'OK' && body.length < 2000) status = 'BLANCO';

      // Screenshot
      const slug = path.replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        await page.screenshot({ path: resolve(OUT, `${slug}-v3.png`), timeout: 20000 });
      } catch {}

      const actualErrors = pageErrors.filter(e =>
        !e.includes('VITE_FARMOS_CLIENT_ID') &&
        !e.includes('404') &&
        !e.includes('File not found') &&
        !e.includes('favicon') &&
        !e.includes('manifest')
      );
      const errSuffix = actualErrors.length ? ` (${actualErrors.length} real errors)` : '';

      process.stdout.write(`\r[${String(i+1).padStart(3)}/${todas.length}] ${path.padEnd(35)} ${status}${errSuffix}\n`);
      resultados.push({ path, status, errors: actualErrors });
    } catch (e) {
      process.stdout.write(`\r[${String(i+1).padStart(3)}/${todas.length}] ${path.padEnd(35)} TIMEOUT\n`);
      resultados.push({ path, status: 'TIMEOUT', errors: [e.message] });
    }

    // Clear the handler to avoid accumulating
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  }

  await browser.close();

  // Summary
  const ok = resultados.filter(r => r.status === 'OK').length;
  const crash = resultados.filter(r => r.status === 'CRASH').length;
  console.log(`\nOK: ${ok} | CRASH: ${crash} | TIMEOUT: ${resultados.filter(r => r.status === 'TIMEOUT').length}`);
  console.log(JSON.stringify(resultados, null, 2));
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
