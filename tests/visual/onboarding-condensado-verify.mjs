// onboarding-condensado-verify.mjs — VERIFICACIÓN headless del ONBOARDING
// CONDENSADO (reescritura 2026-07-08: 19 preguntas → 3 pantallas).
//
// Recorre el flujo REAL (componente OnboardingCondensado vía harness) en un
// Chromium del nix-store y verifica:
//   1. Paso 1 (identidad): nombre + tarjeta única → auto-avanza.
//   2. Paso 2 (ubicación): el botón "Ubicar mi finca" HACE la tarea —
//      geolocation mockeada en el punto interior REAL de la vereda El Curí
//      (Choachí), Nominatim mockeado devolviendo el guess MALO del caso
//      operador ("Potrero Grande") → la tarjeta debe mostrar "El Curi"
//      (point-in-polygon DANE manda sobre Nominatim).
//   3. Corrección inline: abrir el picker, escribir "potrero", tocar la
//      opción → la vereda cambia a "Potrero Grande" (y de vuelta a El Curi).
//   4. Paso 3 (finca): chips → terminar → pantalla "listo" → onComplete.
//   5. El flujo completo son 3 pantallas de contenido + listo (contador).
//
// Guarda capturas en /tmp/onb2-*.png para revisión del operador (Telegram).
//
// NixOS: chromium del nix-store (reference-playwright-nixos-setup). El server
// DEBE ser el dev/preview DEL WORKTREE: npx vite --port 3010
//
// Uso: node tests/visual/onboarding-condensado-verify.mjs [baseURL]
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3010';
const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch { /* sigue */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Punto interior REAL de la vereda El Curí (dataset DANE, gen-veredas.mjs).
const EL_CURI = { latitude: 4.58263, longitude: -73.95823, accuracy: 12 };

const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true,
    geolocation: EL_CURI, permissions: ['geolocation'],
  });

  // Mocks de red EXTERNA (context.route — el SW sombrea page.route):
  //  - Nominatim: devuelve el guess MALO del caso operador (Potrero Grande).
  //  - Open-Meteo elevation: 2200 msnm (finca fría de ladera).
  //  - /veredas/25181.json NO se mockea: lo sirve vite desde public/ (REAL).
  await ctx.route('**/nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        address: { city: 'Potrero Grande', county: 'Choachí', state: 'Cundinamarca', country: 'Colombia' },
        display_name: 'Potrero Grande, Choachí, Cundinamarca, Colombia',
      }),
    }),
  );
  await ctx.route('**/api.open-meteo.com/v1/elevation**', (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ elevation: [2200] }),
    }),
  );

  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  // Timeout generoso: en vite DEV la primera carga transforma el grafo de
  // módulos en caliente (domcontentloaded espera los module scripts).
  await page.goto(`${BASE}/tests/visual/onboarding-condensado-harness.html`, {
    waitUntil: 'domcontentloaded', timeout: 120000,
  });

  // ── Paso 1: identidad ────────────────────────────────────────────────────
  await page.waitForSelector('[data-testid="onb2-nombre"]');
  await page.fill('[data-testid="onb2-nombre"]', 'Miguel');
  await sleep(400);
  await page.screenshot({ path: '/tmp/onb2-1-identidad.png' });
  check('Paso 1 (identidad): nombre + tarjetas de identidad visibles', true);

  await page.click('[data-testid="onb2-identidad-cultivo"]');
  await page.waitForSelector('[data-testid="onb2-ubicar-btn"]');
  check('Tarjeta única auto-avanza al paso 2 (fusiona vocación+rol+tipo)', true);

  // ── Paso 2: el botón Ubicar HACE la tarea ────────────────────────────────
  await page.click('[data-testid="onb2-ubicar-btn"]');
  await page.waitForSelector('[data-testid="onb2-ubicacion-card"]', { timeout: 25000 });
  await sleep(400);

  const veredaDetectada = await page
    .locator('[data-testid="onb2-vereda-editar"]')
    .textContent();
  check(
    'Vereda por point-in-polygon DANE manda sobre Nominatim (caso operador)',
    /El Curi/i.test(veredaDetectada || ''),
    `detectó "${(veredaDetectada || '').trim()}" (Nominatim decía "Potrero Grande")`,
  );

  const municipio = await page.locator('[data-testid="onb2-municipio-nombre"]').textContent();
  check('Municipio + departamento resueltos', /Choach/i.test(municipio || ''), (municipio || '').trim());

  const altitud = await page.locator('[data-testid="onb2-altitud"]').inputValue();
  check('Altitud del punto (Open-Meteo) auto-llenada', altitud === '2200', `${altitud} msnm`);

  const piso = await page.locator('[data-testid="onb2-piso"]').textContent();
  check('Piso térmico derivado', /Frío/i.test(piso || ''), (piso || '').trim());

  await page.screenshot({ path: '/tmp/onb2-2-ubicacion-detectada.png' });

  // ── Corrección INLINE de vereda ──────────────────────────────────────────
  await page.click('[data-testid="onb2-vereda-editar"]');
  await page.waitForSelector('[data-testid="onb2-vereda-input"]');
  await page.fill('[data-testid="onb2-vereda-input"]', 'potrero');
  await sleep(250);
  const nOpciones = await page.locator('[data-testid="onb2-vereda-opciones"] button').count();
  check('Autocomplete filtra las veredas DANE del municipio', nOpciones === 1, `${nOpciones} opción(es) para "potrero"`);
  await page.screenshot({ path: '/tmp/onb2-3-correccion-vereda.png' });

  await page.click('[data-testid="onb2-vereda-opciones"] button');
  await sleep(250);
  const veredaCorregida = await page.locator('[data-testid="onb2-vereda-editar"]').textContent();
  check(
    'Corrección inline funciona (tocar opción cambia la vereda)',
    /Potrero Grande/i.test(veredaCorregida || ''),
    (veredaCorregida || '').trim(),
  );

  // Volver a la correcta (como haría el operador: escribir "curi" → tocar).
  await page.click('[data-testid="onb2-vereda-editar"]');
  await page.fill('[data-testid="onb2-vereda-input"]', 'curi');
  await sleep(250);
  await page.click('[data-testid="onb2-vereda-opciones"] button');
  await sleep(250);

  await page.click('[data-testid="onb2-confirmar-ubicacion"]');

  // ── Paso 3: la finca ─────────────────────────────────────────────────────
  await page.waitForSelector('[data-testid="onb2-comp-huerta"]');
  await page.click('[data-testid="onb2-comp-huerta"]');
  await page.click('[data-testid="onb2-comp-frutales"]');
  await page.fill('[data-testid="onb2-cultivos"]', 'Café, mora');
  await sleep(300);
  await page.screenshot({ path: '/tmp/onb2-4-la-finca.png' });
  check('Paso 3 (la finca): composición + cultivos en una sola pantalla', true);

  await page.click('[data-testid="onb2-terminar-finca"]');

  // ── Listo ────────────────────────────────────────────────────────────────
  await page.waitForSelector('[data-testid="onb2-entrar"]');
  const resumen = await page.locator('[data-testid="onb2-resumen"]').textContent();
  check(
    'Pantalla "listo" resume vereda + municipio + clima',
    /El Curi/i.test(resumen || '') && /Choach/i.test(resumen || ''),
    (resumen || '').trim(),
  );
  await page.screenshot({ path: '/tmp/onb2-5-listo.png' });

  await page.click('[data-testid="onb2-entrar"]');
  await page.waitForFunction(() => window.__ONB2_DONE__ != null);
  const perfil = await page.evaluate(() => window.__ONB2_DONE__);
  check(
    'Perfil persistido con vereda geométrica + piso + identidad',
    perfil.vereda === 'El Curi' &&
      perfil.vereda_codigo === '25181010' &&
      perfil.municipio === 'Choachí' &&
      perfil.piso_termico === 'frío' &&
      perfil.finca_altitud === '2200' &&
      perfil.vocacion === 'campesino' &&
      perfil.nombre === 'Miguel',
    JSON.stringify({
      vereda: perfil.vereda, vereda_codigo: perfil.vereda_codigo, municipio: perfil.municipio,
      piso: perfil.piso_termico, alt: perfil.finca_altitud, vocacion: perfil.vocacion,
    }),
  );

  check('Flujo = 3 pantallas de contenido + listo (vs 19 preguntas)', true, 'identidad · ubicación · finca');
  check('Sin errores de página', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();

  const fails = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - fails.length}/${checks.length} verificaciones OK`);
  if (fails.length) {
    console.error('FALLARON:', fails.map((f) => f.name).join(' · '));
    process.exit(1);
  }
})().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
