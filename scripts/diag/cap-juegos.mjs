// Capturas de los JUEGOS en el ProdChagraApp (dist-prod servido por vite preview).
// Navega por hash (#juego, #defensores, …) + siembra datos en IDB para el estado
// próspero del hub. Uso: node cap-juegos.mjs <baseURL> <outPrefix>
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:4178';
const PREFIX = process.argv[3] || 'antes';
const OUT_DIR = '/tmp/caps';
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROMIUM = process.env.CHROMIUM_PATH
  || '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function seedData() {
  const slugs = ['coffea_arabica', 'theobroma_cacao', 'musa_paradisiaca', 'persea_americana',
    'phaseolus_vulgaris', 'zea_mays', 'inga_edulis', 'citrus_limon'];
  const now = Date.now();
  const processes = slugs.map((slug, i) => ({
    process_id: `seed-p${i}`,
    type: 'farm_process',
    attributes: {
      process_type: i % 2 === 0 ? 'sowing' : 'agroforestry',
      subject_kind: 'aggregate', subject_slug: slug, subject_label: slug,
      quantity: 10, unit: 'plantas', location_land_asset_id: 'land-1',
      status: 'active', current_stage: ['vegetative', 'flowering', 'fruiting', 'mature'][i % 4],
      created_at: now, updated_at: now, companions: i < 3 ? ['inga_edulis'] : [],
    },
  }));
  const events = [];
  processes.forEach((p, i) => {
    events.push({ event_id: `seed-e-h-${i}`, type: 'farm_process_event',
      attributes: { process_id: p.process_id, event_type: 'harvest_confirmed', occurred_at: now, payload: { quantity: 10 + i } } });
    events.push({ event_id: `seed-e-p-${i}`, type: 'farm_process_event',
      attributes: { process_id: p.process_id, event_type: 'pest_management_confirmed', occurred_at: now, payload: { method: 'biopreparado bio' } } });
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

async function nav(page, view) {
  await page.evaluate((v) => { window.location.hash = '#' + v; }, view);
  await sleep(300);
  await page.evaluate((v) => window.dispatchEvent(new CustomEvent('chagra:nav', { detail: v })), view);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROMIUM, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true });
  await ctx.route('**/*', (route) => {
    const u = route.request().url().replace(BASE, '');
    if (/\/(jsonapi|api|sites|oauth|fincas)(\/|$|\?)/.test(u)) {
      const isJsonApi = /jsonapi/.test(u);
      return route.fulfill({ status: 200, contentType: isJsonApi ? 'application/vnd.api+json' : 'application/json',
        body: JSON.stringify(isJsonApi ? { data: [], meta: {}, links: {} } : {}) });
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`[console] ${m.text().slice(0, 200)}`); });

  const shot = async (name) => {
    const p = `${OUT_DIR}/${PREFIX}-${name}.png`;
    await page.screenshot({ path: p, fullPage: true });
    console.log(`  saved ${p}`);
  };

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await stubAuth(page);
    await seedFarm(page, seedData());
    await page.evaluate(() => { try { localStorage.setItem('chagra:juego-finca:default', JSON.stringify({ lastLevel: 4, misionesHechas: [] })); } catch { /* */ } });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(1500);

    // HUB próspero (mi-finca-viva) — el objetivo principal
    console.log('[hub] mi finca viva (próspera)');
    await nav(page, 'juego');
    try { await page.waitForSelector('[data-testid="mi-finca-viva-screen"]', { timeout: 30000 }); } catch { console.log('  (hub no montó)'); }
    await sleep(1800);
    await shot('hub-prospera');

    // Colección de criaturas — scroll hasta ella para primer plano
    try {
      await page.evaluate(() => document.querySelector('[data-testid="criatura-collection"]')?.scrollIntoView({ block: 'center' }));
      await sleep(700);
      const col = await page.$('[data-testid="criatura-collection"]');
      if (col) { await col.screenshot({ path: `${OUT_DIR}/${PREFIX}-coleccion.png` }); console.log('  saved coleccion'); }
      const scene = await page.$('[data-testid="finca-world-scene"]');
      if (scene) { await scene.screenshot({ path: `${OUT_DIR}/${PREFIX}-mundo.png` }); console.log('  saved mundo'); }
    } catch (e) { console.log('  colección/mundo shot fail:', e.message); }

    // Otros juegos (vista de entrada)
    for (const [view, sel, name] of [
      ['defensores', '[data-testid="defensores-finca-screen"]', 'defensores'],
      ['milpa', '[data-testid="milpa-simulator"]', 'milpa'],
      ['subsuelo', '[data-testid="mundo-subsuelo"]', 'subsuelo'],
    ]) {
      try {
        console.log(`[juego] ${name}`);
        await nav(page, view);
        try { await page.waitForSelector(sel, { timeout: 8000 }); } catch { /* captura igual */ }
        await sleep(1400);
        await shot(name);
      } catch (e) { console.log(`  ${name} fail:`, e.message); }
    }

    console.log('\n=== page errors ===');
    console.log(errs.length ? [...new Set(errs)].slice(0, 15).join('\n') : '(ninguno)');
  } catch (e) {
    console.error('FALLO:', e.message);
    try { await shot('ERROR'); } catch { /* */ }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
