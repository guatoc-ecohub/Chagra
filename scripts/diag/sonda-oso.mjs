#!/usr/bin/env node
/* sonda-oso — poll del idle-cerebro del oso del bosque: data-momento y
   posición proyectada del billboard, cada 700 ms durante N s. Evidencia
   dura de que el reloj dispara gestos y el paseo MUEVE el billboard. */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const base = process.argv[2] || 'http://127.0.0.1:5174';
const seg = Number(process.argv[3] || 35);
const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();
const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  const sembrar = (db, store) => new Promise((res) => {
    const req = indexedDB.open(db, 2);
    req.onupgradeneeded = () => { try { req.result.createObjectStore(store); } catch { /* ya */ } };
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction(store, 'readwrite');
        const st = tx.objectStore(store);
        st.put('shot3d-token-diagnostico', 'farmos_access_token');
        st.put(Date.now() + 86400000, 'farmos_token_expiry');
        tx.oncomplete = () => res(); tx.onerror = () => res();
      } catch { res(); }
    };
    req.onerror = () => res();
  });
  sembrar('localforage', 'keyvaluepairs');
  sembrar('Chagra', 'syncQueue');
});
await page.goto(`${base}/index-prod.html#bosque_vivo`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-vecino="oso-andino"]', { timeout: 30000, state: 'attached' });
console.log('[sonda] oso montado; sondeando…');
const t0 = Date.now();
while (Date.now() - t0 < seg * 1000) {
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-vecino="oso-andino"]');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { momento: el.dataset.momento || '-', x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), flip: el.style.transform || '-' };
  });
  console.log(`[sonda] t=${((Date.now() - t0) / 1000).toFixed(1)}s ${JSON.stringify(r)}`);
  await page.waitForTimeout(700);
}
await browser.close();
