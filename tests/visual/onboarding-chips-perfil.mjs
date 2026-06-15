// onboarding-chips-perfil.mjs — VISUAL test del ONBOARDING POR PERFIL +
// CHIPS ADAPTATIVOS por persona. Para 3 perfiles distintos (campesino con
// animales, restaurador/Ana, guía glaciar) captura:
//   1. el onboarding de perfil (#onboarding-perfil) — la pregunta de rol, y
//   2. los CHIPS adaptativos: abre la hoja de capacidades (Ⓐ) del AgentScreen,
//      que ahora pinta SOLO los chips apropiados para ese perfil.
//
// Guarda /tmp/onboarding-chips-<perfil>.png y /tmp/onboarding-<perfil>.png.
// Imprime el set de chips visibles por perfil para verificación textual y
// falla (exit 1) si un perfil ve un chip prohibido o le falta uno esperado.
//
// NixOS: usa el chromium del nix-store (executablePath). El bundled de
// Playwright falla por libs faltantes (memoria reference-playwright-nixos-setup).
// NO usar chromium headless para render pesado de 3D — aquí no hace falta.
//
// Uso: node tests/visual/onboarding-chips-perfil.mjs <baseURL>
//   baseURL DEBE servir el build/dev DEL WORKTREE con estos cambios (no main).
//   Levantar con: npx vite preview --port 3009  (tras npm run build) o
//                 npx vite --port 3009           (dev del worktree).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3009';
const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch {} }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Los 3 perfiles del brief. `profile` = objeto que persistimos en
// localStorage[chagra:profile:v1]; `user` = username (whitelist glaciar).
const PROFILES = [
  {
    key: 'campesino-animales',
    user: 'carlos.rivera',
    profile: {
      nombre: 'Carlos', vocacion: 'campesino', rol: 'ganadero', finca_tipo: 'rural',
      finca_altitud: '1730', piso_termico: 'templado', cultivos_actuales: 'café, plátano, maíz',
      animales: ['gallinas', 'cerdos'], gallinas_manejo: 'libres',
      objetivo: ['producir_mas', 'reducir_quimicos'],
    },
    expectChips: ['silvopastoreo', 'siembro', 'plaga', 'clima'],
    forbidChips: ['paramo'],
  },
  {
    key: 'restaurador-ana',
    user: 'ana',
    profile: {
      nombre: 'Ana', vocacion: 'tecnico', rol: 'restaurador', finca_tipo: 'rural',
      finca_altitud: '2600', piso_termico: 'frio', objetivo: ['biodiversidad'],
      restauracion_objetivo: ['bosque', 'paramo', 'ribera'],
    },
    expectChips: ['restauracion', 'paramo', 'silvopastoreo'],
    forbidChips: ['biopreparado'],
  },
  {
    key: 'guia-glaciar',
    user: 'alex', // está en CORDADA_WHITELIST (glaciarAccess.js)
    profile: {
      nombre: 'Alex', vocacion: 'tecnico', rol: 'guia_glaciar', finca_tipo: 'rural',
      finca_altitud: '4200', piso_termico: 'paramo', restauracion_objetivo: ['paramo'],
    },
    expectChips: ['clima', 'paramo', 'restauracion'],
    forbidChips: ['biopreparado', 'calendario'],
  },
];

function setProfile(page, profile, user, done) {
  return page.evaluate(({ profile, user, done }) => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    localStorage.setItem('chagra:active_tenant_id', user);
    if (done) localStorage.setItem('chagra:profile:done:v1', '1');
    else { localStorage.removeItem('chagra:profile:done:v1'); localStorage.removeItem('chagra:profile:skipped:v1'); }
  }, { profile, user, done });
}

function stubAuthIDB(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
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
}

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  let anyFail = false;

  for (const prof of PROFILES) {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true,
    });
    await ctx.route('**/*', (route) => {
      const u = route.request().url().replace(BASE, '');
      if (/\/(jsonapi|api|sites|oauth|fincas)(\/|$|\?)/.test(u)) {
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
    page.setDefaultTimeout(45000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await stubAuthIDB(page);

      // ── (1) ONBOARDING POR PERFIL ───────────────────────────────────────
      // Precargamos hasta vocación para que la pregunta de ROL esté a la vista.
      await setProfile(page, { nombre: prof.profile.nombre, region: 'Choachí', vocacion: prof.profile.vocacion }, prof.user, false);
      await page.goto(BASE + '/#onboarding-perfil', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(1200);
      await page.evaluate(() => { window.location.hash = '#onboarding-perfil'; });
      await sleep(1500);
      const onbOut = `/tmp/onboarding-${prof.key}.png`;
      await page.screenshot({ path: onbOut, fullPage: false });
      const onbTitle = await page.evaluate(() => {
        const h = document.querySelector('h2');
        return h ? h.textContent.trim().slice(0, 60) : '(sin h2)';
      });
      console.log(`[${prof.key}] onboarding -> ${onbOut} | pregunta visible: "${onbTitle}"`);

      // ── (2) CHIPS ADAPTATIVOS (hoja de capacidades Ⓐ) ───────────────────
      await setProfile(page, prof.profile, prof.user, true);
      await page.goto(BASE + '/#agente', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(1500);
      await page.evaluate(() => { window.location.hash = '#agente'; });
      await page.waitForSelector('button[aria-label="Ver todo lo que puede hacer Chagra"]', { timeout: 30000 });
      await sleep(800);
      await page.click('button[aria-label="Ver todo lo que puede hacer Chagra"]');
      await page.waitForSelector('.as-cap', { timeout: 15000 });
      await sleep(700);

      const chips = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.as-cap .font-bold')).map((e) => e.textContent.trim()),
      );
      const chipsOut = `/tmp/onboarding-chips-${prof.key}.png`;
      await page.screenshot({ path: chipsOut, fullPage: false });
      console.log(`[${prof.key}] chips -> ${chipsOut} | visibles (${chips.length}): ${chips.join(' · ')}`);

      const labelText = chips.join(' | ').toLowerCase();
      const missing = prof.expectChips.filter((c) => !labelMatches(labelText, c));
      const leaked = prof.forbidChips.filter((c) => labelMatches(labelText, c));
      if (missing.length) { console.log(`  ✗ FALTAN: ${missing.join(',')}`); anyFail = true; }
      if (leaked.length) { console.log(`  ✗ FILTRAN chips prohibidos: ${leaked.join(',')}`); anyFail = true; }
      if (!missing.length && !leaked.length) console.log('  ✓ selección por perfil correcta');
      if (errs.length) console.log('  pageerrors:', errs.slice(0, 3));
    } catch (e) {
      console.error(`[${prof.key}] FAIL:`, e.message);
      try { await page.screenshot({ path: `/tmp/onboarding-chips-${prof.key}-FAIL.png` }); } catch {}
      anyFail = true;
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  process.exitCode = anyFail ? 1 : 0;
})();

// Mapea un intent al fragmento de texto del label visible (es-CO).
function labelMatches(haystack, intent) {
  const map = {
    siembro: 'siembro', calendario: 'calendario', plaga: 'plaga',
    biopreparado: 'biopreparado', clima: 'clima', restauracion: 'restaur',
    paramo: 'páramo', silvopastoreo: 'silvopast', precio: 'precio', deep: 'investigaci',
  };
  return haystack.includes(map[intent] || intent);
}
