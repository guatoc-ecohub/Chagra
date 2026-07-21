#!/usr/bin/env node
/** Smoke test focalizado: 2 nuevas rutas 3D + 4 timeouts previos + sembrar fix */
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const BASE = 'http://127.0.0.1:4500';
const OUT = resolve(import.meta.dirname, '..', 'smoke-prod');
const CHROMIUM = '/run/current-system/sw/bin/chromium';
const FAKE_TOKEN = 'smoke-test-token';
const FAKE_EXPIRY = Date.now() + 86400_000;

const RUTAS = [
  { path: 'bosque_vivo', label: 'NUEVA 3D: bosque_vivo (MundoEntBosque)' },
  { path: 'sierra_global', label: 'ACTUALIZADA 3D: sierra_global (GaleriaSierraArboles)' },
  { path: 'sembrar', label: 'FIX: sembrar (SeedingLog fallback sin client_id)' },
  { path: 'aliados_finca', label: 'TIMEOUT previo: aliados_finca (45s)' },
  { path: 'plant_asset', label: 'TIMEOUT previo: plant_asset (45s)' },
  { path: 'mundo_cultivos', label: 'TIMEOUT previo: mundo_cultivos (45s)' },
  { path: 'mercado', label: 'TIMEOUT previo: mercado (45s)' },
];

const ERROR_TEXTS = ['Algo falló', 'error inesperado', 'Ocurrió un error'];

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu'],
  });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Sembrar token
  const sp = await ctx.newPage();
  await sp.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sp.waitForTimeout(2000);
  await sp.evaluate(({ token, expiry }) => {
    localStorage.setItem('farmos_access_token', token);
    localStorage.setItem('farmos_refresh_token', token);
    localStorage.setItem('farmos_token_expiry', String(expiry));
  }, { token: FAKE_TOKEN, expiry: FAKE_EXPIRY });
  await sp.close();

  await ctx.newPage().then(async (p) => {
    await p.goto(`${BASE}/#valle3d`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForTimeout(3000);
    const body = await p.content();
    console.log('[setup] Auth bypass:', !body.includes('Usuario'));
    await p.close();
  });

  console.log('');

  for (const { path, label } of RUTAS) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(err.message));

    try {
      await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(10000); // más margen para 3D pesado

      const body = await page.content();
      const lower = body.toLowerCase();

      let status = 'OK';
      for (const t of ERROR_TEXTS) {
        if (lower.includes(t.toLowerCase())) { status = 'CRASH'; break; }
      }
      if (status === 'OK' && body.length < 2000) status = 'BLANCO';

      const slug = path.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ss = resolve(OUT, `${slug}-v2.png`);
      await page.screenshot({ path: ss, timeout: 45000 });

      const errSuffix = errors.length ? ` (${errors.length} console errors)` : '';
      console.log(`[${status.padEnd(6)}] ${label}${errSuffix}`);

      if (status === 'CRASH') {
        for (const e of errors.slice(0, 3)) console.log(`         ${e.substring(0, 120)}`);
      }
    } catch (e) {
      console.log(`[TIMEOUT] ${label} — ${e.message.substring(0, 80)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nDone.');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
