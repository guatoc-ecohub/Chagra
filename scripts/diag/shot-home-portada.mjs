#!/usr/bin/env node
/**
 * shot-home-portada.mjs — capturas de la PORTADA/HOME finca-viva + la
 * tranquera 3D-first (CaraProd3D), para el pulido visual de la entrada
 * (FABLE_50 #6, 2026-07-16).
 *
 * Corre contra un dev server YA levantado (con la flag F2 del home):
 *
 *   VITE_FARMOS_URL='' VITE_FARMOS_CLIENT_ID=farm VITE_OPERATOR_USERNAME=op-test \
 *   VITE_FINCA_VIVA_HOME_PERFIL=true npx vite --port 5173 --strictPort
 *
 * Uso:  node scripts/diag/shot-home-portada.mjs <prefijo> [outDir]
 *
 * Toma: home móvil (arriba + puertas, día pleno-sol y noche), home desktop,
 * y la tranquera 3D (#/mockups/cara-prod). OJO swiftshader: el GL tarda
 * ~60 s en levantar el chunk three en frío — las esperas largas son a
 * propósito, no un bug.
 */
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

process.on('uncaughtException', (e) => console.log('[uncaught]', String(e).split('\n')[0]));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(resolve(ROOT, 'node_modules/playwright/index.mjs'));
const { installDeterminism, loginAndSeed } = await import(
  resolve(ROOT, 'tests/visual/visualTestUtils.js')
);

const prefijo = process.argv[2] || 'portada';
const OUT = process.argv[3] || resolve(ROOT, 'shots-portada');
mkdirSync(OUT, { recursive: true });

const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/run/current-system/sw/bin/chromium';
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function pagina(viewport, dsf = 2) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: dsf,
    baseURL: 'http://127.0.0.1:5173',
  });
  const page = await context.newPage();
  await installDeterminism(context, page, { profileKey: 'campesino' });
  await loginAndSeed(page, 'seeded');
  // Si el perfil no prendió a tiempo y cayó al onboarding, saltarlo.
  await page.waitForTimeout(3500);
  const saltar = page.getByText('Saltar', { exact: true }).first();
  if (await saltar.count()) {
    await saltar.click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  return { context, page };
}

async function shot(page, nombre) {
  await page
    .screenshot({ path: `${OUT}/${prefijo}-${nombre}.png`, timeout: 45000 })
    .then(() => console.log('ok', nombre))
    .catch((e) => console.log('FALLO', nombre, String(e).split('\n')[0]));
}

// ── 1. HOME móvil: arriba (escena) + puertas, día y noche ──
{
  const { context, page } = await pagina({ width: 390, height: 844 });
  await shot(page, 'home-movil');
  await page.evaluate(() => document.querySelector('.fvh-puertas')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(900);
  await shot(page, 'home-puertas-dia');
  await page.click('[data-testid="fvh-pleno-sol"]').catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, 'home-puertas-noche');
  await context.close();
}

// ── 2. HOME desktop ──
{
  const { context, page } = await pagina({ width: 1280, height: 800 }, 1);
  await page.waitForTimeout(2500);
  await shot(page, 'home-desktop');
  await context.close();
}

// ── 3. LA TRANQUERA 3D (CaraProd3D) — espera larga por swiftshader ──
{
  const { context, page } = await pagina({ width: 390, height: 844 }, 1);
  await page.goto('/?ciclo=16.5#mockups/cara-prod', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(80000);
  await shot(page, 'tranquera');
  await context.close();
}

await browser.close();
console.log('LISTO →', OUT);
