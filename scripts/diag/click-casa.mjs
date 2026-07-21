#!/usr/bin/env node
/* Click-through de un solo uso: tocar la casa del valle y ver a dónde navega. */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();
const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-CO' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const sembrar = (db, store) => new Promise((res) => {
    const req = indexedDB.open(db, 2);
    req.onupgradeneeded = () => { try { req.result.createObjectStore(store); } catch {} };
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction(store, 'readwrite');
        const st = tx.objectStore(store);
        st.put('shot3d-token-diagnostico', 'farmos_access_token');
        st.put(Date.now() + 86400000, 'farmos_token_expiry');
        tx.oncomplete = () => res(undefined);
        tx.onerror = () => res(undefined);
      } catch { res(undefined); }
    };
    req.onerror = () => res(undefined);
  });
  sembrar('localforage', 'keyvaluepairs');
  sembrar('Chagra', 'syncQueue');
});
await page.goto('http://localhost:5173/index-prod.html#/valle3d?ciclo=11', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(13000);
console.log('hash antes:', await page.evaluate(() => window.location.hash));
// Barrido de puntos candidatos alrededor de la casa (techo rojo, ventana con
// luz) — probamos varios porque el hitbox 3D exacto es sensible al ángulo.
const candidatos = [[700, 545], [700, 560], [690, 555], [712, 548], [705, 570], [695, 535]];
let cambio = false;
for (const [x, y] of candidatos) {
  await page.mouse.click(x, y);
  await page.waitForTimeout(1600);
  const hash = await page.evaluate(() => window.location.hash);
  console.log(`click (${x},${y}) → hash:`, hash);
  if (hash.includes('vitrina_maestra')) { cambio = true; break; }
}
await page.waitForTimeout(9000);
await page.screenshot({ path: '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad/valle-casa-click.png', animations: 'disabled' });
console.log('hash final:', await page.evaluate(() => window.location.hash));
console.log('cambio a vitrina_maestra:', cambio);
await ctx.close();
await browser.close();
