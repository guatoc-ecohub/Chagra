import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5183';
const OUT = '/tmp/pizarra-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/home/kortux/.local/bin/chromium' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console:error]', msg.text().slice(0, 200));
});
page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 300)));

// 1) LOGIN screen — no auth needed, it's the default landing for anon users.
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/login.png` });
console.log('captured login.png');

// 2) Inject a fake, non-expired farmOS token into the SAME IndexedDB
//    (db 'Chagra', store 'syncQueue' — see App.jsx localforage.config)
//    that authService's localforage.getItem/setItem reads, so isAuthenticated()
//    resolves true WITHOUT a real backend. Needs the DB to already exist
//    (created by localforage on first use during the boot above).
const injected = await page.evaluate(async () => {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open('Chagra');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('syncQueue')) {
        resolve({ ok: false, reason: 'no syncQueue store', stores: Array.from(db.objectStoreNames) });
        return;
      }
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      store.put('fake-token-for-screenshot-audit', 'farmos_access_token');
      store.put(Date.now() + 24 * 3600 * 1000, 'farmos_token_expiry');
      store.put('fake-refresh-for-screenshot-audit', 'farmos_refresh_token');
      tx.oncomplete = () => resolve({ ok: true });
      tx.onerror = () => reject(tx.error);
    };
  });
});
console.log('inject result', injected);

if (injected.ok) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/home.png` });
  console.log('captured home.png, url=', page.url());
} else {
  console.log('SKIP home.png — could not inject fake auth token:', JSON.stringify(injected));
}

await browser.close();
