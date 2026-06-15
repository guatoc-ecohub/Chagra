// Screenshots de "Mi Finca Viva" (juego para Julieta) en 3 estados:
//   1) finca vacía (invitación a sembrar)
//   2) finca próspera (mundo crecido + criaturas + misiones)
//   3) celebración de subida de nivel
//
// Patrón NixOS: chromium del nix-store (bundled falla por libnspr4/libglib),
// auth stub en IDB, intercept de backend para no rebotar a login, y seed de
// farm_processes/farm_process_events vía la propia DB del app (ya migrada).
//
// Uso: node scripts/juego-julieta-shots.mjs <baseURL>
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:4178';
const OUT_DIR = '/tmp';

const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch { /* */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 180000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Procesos + eventos en el shape REAL (anidado en attributes).
function seedData() {
  const slugs = ['coffea_arabica', 'theobroma_cacao', 'musa_paradisiaca', 'persea_americana',
    'phaseolus_vulgaris', 'zea_mays', 'inga_edulis', 'citrus_limon'];
  const now = Date.now();
  const processes = slugs.map((slug, i) => ({
    process_id: `seed-p${i}`,
    type: 'farm_process',
    attributes: {
      process_type: i % 2 === 0 ? 'sowing' : 'agroforestry',
      subject_kind: 'aggregate',
      subject_slug: slug,
      subject_label: slug,
      quantity: 10,
      unit: 'plantas',
      location_land_asset_id: 'land-1',
      status: 'active',
      current_stage: ['vegetative', 'flowering', 'fruiting', 'mature'][i % 4],
      created_at: now,
      updated_at: now,
      companions: i < 3 ? ['inga_edulis'] : [],
    },
  }));
  const events = [];
  processes.forEach((p, i) => {
    events.push({
      event_id: `seed-e-h-${i}`,
      type: 'farm_process_event',
      attributes: { process_id: p.process_id, event_type: 'harvest_confirmed', occurred_at: now, payload: { quantity: 10 + i } },
    });
    events.push({
      event_id: `seed-e-p-${i}`,
      type: 'farm_process_event',
      attributes: { process_id: p.process_id, event_type: 'pest_management_confirmed', occurred_at: now, payload: { method: 'biopreparado bio' } },
    });
  });
  return { processes, events };
}

async function stubAuth(page) {
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
    o.onupgradeneeded = () => { try { o.result.createObjectStore('syncQueue'); } catch { /* */ } };
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

// Inserta procesos/eventos en la DB del app (ya creada/migrada por el app).
async function seedFarm(page, data) {
  await page.evaluate(({ processes, events }) => new Promise((resolve, reject) => {
    const o = indexedDB.open('ChagraDB');
    o.onerror = () => reject(o.error);
    o.onsuccess = () => {
      const db = o.result;
      if (!db.objectStoreNames.contains('farm_processes')) { db.close(); return resolve('no-store'); }
      const tx = db.transaction(['farm_processes', 'farm_process_events'], 'readwrite');
      const ps = tx.objectStore('farm_processes');
      const es = tx.objectStore('farm_process_events');
      processes.forEach((p) => ps.put(p));
      events.forEach((e) => es.put(e));
      tx.oncomplete = () => { db.close(); resolve('ok'); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), data);
}

async function gotoJuego(page) {
  await page.evaluate(() => { window.location.hash = '#dashboard'; });
  await sleep(400);
  // Navega por evento global (mismo canal que ScreenShell) → vista 'juego'.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: 'juego' })));
  await page.waitForSelector('[data-testid="mi-finca-viva-screen"]', { timeout: 30000 });
  await sleep(1200); // dejar correr animaciones de crecimiento
}

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
  page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`[console] ${m.text()}`); });

  const shot = async (name) => {
    const path = `${OUT_DIR}/${name}`;
    await page.screenshot({ path, fullPage: true });
    console.log(`  saved ${path}`);
  };

  try {
    // Boot + auth
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await stubAuth(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(1500);

    // 1) FINCA VACÍA — sin seed
    console.log('[1/3] finca vacía');
    await gotoJuego(page);
    await shot('juego-julieta-1-vacia.png');

    // 2) FINCA PRÓSPERA — seed + recargar para que el juego lea los datos.
    //    Pre-sella lastLevel alto para NO disparar la celebración acá.
    console.log('[2/3] finca próspera');
    await seedFarm(page, seedData());
    await page.evaluate(() => {
      try { localStorage.setItem('chagra:juego-finca:default', JSON.stringify({ lastLevel: 4, misionesHechas: [] })); } catch { /* */ }
    });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(1200);
    await gotoJuego(page);
    await shot('juego-julieta-2-prospera.png');

    // 3) CELEBRACIÓN — bajar lastLevel a 0 para que detecte subida.
    console.log('[3/3] celebración subida de nivel');
    await page.evaluate(() => {
      try { localStorage.setItem('chagra:juego-finca:default', JSON.stringify({ lastLevel: 0, misionesHechas: [] })); } catch { /* */ }
    });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(1200);
    await gotoJuego(page);
    // La celebración es overlay; esperar a que aparezca.
    try {
      await page.waitForSelector('[data-testid="level-up-celebration"]', { timeout: 8000 });
    } catch {
      console.log('  (celebración no apareció — el seed quizá no subió de nivel)');
    }
    await sleep(800);
    await shot('juego-julieta-3-celebracion.png');

    console.log('\n=== page errors ===');
    console.log(errs.length ? errs.slice(0, 20).join('\n') : '(ninguno)');
  } catch (e) {
    console.error('FALLO:', e.message);
    try { await shot('juego-julieta-ERROR.png'); } catch { /* */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
