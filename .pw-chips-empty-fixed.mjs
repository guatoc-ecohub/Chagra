// Fire #1 verification — capability chips MUST be visible on the EMPTY/idle
// AgentScreen, FILTERED BY PROFILE. Stubs auth in IDB (so the 401->login bounce
// never fires), injects a specific user PROFILE in localStorage (chagra:profile:v1)
// so we can SEE the per-profile chip selection, deep-links to #agente (operator's
// worst case: direct access), and screenshots the idle screen over the
// biodiversity photo. Reads the live chip testids to assert the fix.
//
// Usage: node .pw-chips-empty-fixed.mjs <baseURL> <outPng> <profileRole>
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8211';
const OUT = process.argv[3] || '/tmp/chips-empty-fixed.png';
const ROLE = process.argv[4] || 'guia_glaciar';
const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch {} }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 }).trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROFILES = {
  guia_glaciar: { rol: 'guia_glaciar', vocacion: 'tecnico', objetivo: ['biodiversidad'] },
  campesino: { rol: 'campesino', vocacion: 'campesino', cultivos_actuales: 'café, mora' },
  restaurador: { rol: 'restaurador', vocacion: 'curioso', objetivo: ['biodiversidad'] },
  ganadero: { rol: 'ganadero', animales: ['ganado', 'gallinas'] },
};

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true });

  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (/\/(jsonapi|api|sites|oauth|fincas)(\/|$|\?)/.test(u.replace(BASE, ''))) {
      const isJsonApi = /jsonapi/.test(u);
      return route.fulfill({
        status: 200,
        contentType: isJsonApi ? 'application/vnd.api+json' : 'application/json',
        body: JSON.stringify(isJsonApi ? { data: [], meta: {}, links: {} } : {}),
      });
    }
    return route.continue();
  });

  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });

    await page.evaluate(({ profile }) => {
      localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
      localStorage.setItem('chagra:profile:done', '1');
    }, { profile: PROFILES[ROLE] || PROFILES.guia_glaciar });

    await page.evaluate(() => new Promise((resolve, reject) => {
      const put = (db) => {
        const tx = db.transaction('syncQueue', 'readwrite');
        const s = tx.objectStore('syncQueue');
        s.put('stub-token-for-ui-screenshot', 'farmos_access_token');
        s.put(Date.now() + 3600e3, 'farmos_token_expiry');
        tx.oncomplete = () => { db.close(); resolve('ok'); };
        tx.onerror = () => reject(tx.error);
      };
      const o = indexedDB.open('Chagra');
      o.onupgradeneeded = () => { try { o.result.createObjectStore('syncQueue'); } catch {} };
      o.onerror = () => reject(o.error);
      o.onsuccess = () => {
        const db = o.result;
        if (db.objectStoreNames.contains('syncQueue')) return put(db);
        const v = db.version + 1; db.close();
        const up = indexedDB.open('Chagra', v);
        up.onupgradeneeded = () => up.result.createObjectStore('syncQueue');
        up.onsuccess = () => put(up.result);
        up.onerror = () => reject(up.error);
      };
    }));
    console.log(`[chips] auth stubbed + profile=${ROLE} injected`);

    await page.goto(BASE + '/#agente', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(1500);
    await page.evaluate(() => { window.location.hash = '#agente'; });
    await page.waitForSelector('textarea[placeholder*="pregunta"]', { timeout: 30000 });
    console.log('[chips] agent screen mounted (direct #agente), EMPTY/idle');
    await sleep(2500);

    const info = await page.evaluate(() => {
      const modeChips = Array.from(document.querySelectorAll('[data-testid="mode-chip"]'));
      return {
        hasClass: document.body.classList.contains('app-bg-biodiversidad'),
        quickChips: document.querySelectorAll('[data-testid="quick-chip"]').length,
        modeChipCount: modeChips.length,
        modeChipIntents: modeChips.map((c) => c.getAttribute('data-intent')),
        modeChipLabels: modeChips.map((c) => c.textContent.trim()),
        hasChipsToolbar: !!document.querySelector('[data-testid="chips-toolbar"]'),
        hasQuickChipsBar: !!document.querySelector('[data-testid="quick-chips-bar"]'),
        url: location.href,
      };
    });
    console.log('[chips] LIVE STATE:', JSON.stringify(info, null, 2));

    await page.screenshot({ path: OUT, fullPage: false });
    console.log(`[chips] screenshot -> ${OUT}`);
    if (errs.length) console.log('[chips] pageerrors:', errs.slice(0, 6));

    if (info.modeChipCount === 0) {
      throw new Error('FAIL: no capability chips (mode-chip) on the EMPTY screen — fire #1 NOT fixed');
    }
    console.log(`[chips] PASS: ${info.modeChipCount} capability chips visible on empty screen, intents=[${info.modeChipIntents.join(', ')}]`);
  } catch (e) {
    console.error('[chips] FAIL:', e.message);
    try { await page.screenshot({ path: OUT.replace('.png', '-FAIL.png'), fullPage: false }); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
