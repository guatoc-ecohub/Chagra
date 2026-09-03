#!/usr/bin/env node
/*
 * shot-pisos-termicos — capturas de los TRES mundos de cultivo (café, cacao,
 * papa) en varias horas del ciclo (?ciclo=), para el ANTES/DESPUÉS de la
 * migración al kit por piso térmico. Calca el patrón de shot3d-ruta.mjs
 * (chromium del sistema + swiftshader) y además siembra la bienvenida vista
 * (localStorage) para que el onboarding no intercepte la ruta del mockup.
 *
 * Uso: node scripts/diag/shot-pisos-termicos.mjs <outdir> [--base URL] [--pre prefijo]
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const outdir = args[0];
const getFlag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const base = getFlag('base', 'http://127.0.0.1:5273');
const pre = getFlag('pre', 'despues');
const wait = Number(getFlag('wait', 15000));
mkdirSync(outdir, { recursive: true });

/* Las tomas: cada mundo en la mañana, el atardecer (el vendedor de la toma B)
   y la noche (la prueba de que el ciclo vive). */
const MUNDOS = [
  ['cafetal', '/mockups/cafetal-vivo-3d'],
  ['cacao', '/mockups/cacao-vivo-3d'],
  ['papa', '/mockups/papa-viva-3d'],
];
const HORAS = [
  ['manana', '10'],
  ['atardecer', '17.6'],
  ['noche', '21'],
];

const chromiumPath = execSync('which chromium', { encoding: 'utf8' }).trim();
const browser = await chromium.launch({
  executablePath: chromiumPath,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

for (const [mundo, ruta] of MUNDOS) {
  for (const [hora, ciclo] of HORAS) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      locale: 'es-CO',
    });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', (e) => errores.push(`[pageerror] ${e.message}`));
    await page.addInitScript(() => {
      // la bienvenida ya se vio: que el onboarding no intercepte el mockup
      window.localStorage.setItem('chagra:bienvenida-vista:v1', '1');
      // sesión falsa (mismo sembrado que shot3d-ruta.mjs)
      const sembrar = (db, store) =>
        new Promise((res) => {
          const req = indexedDB.open(db, 2);
          req.onupgradeneeded = () => {
            try { req.result.createObjectStore(store); } catch { /* ya existe */ }
          };
          req.onsuccess = () => {
            try {
              const tx = req.result.transaction(store, 'readwrite');
              const st = tx.objectStore(store);
              st.put('shot-diag-token', 'farmos_access_token');
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
    // `ciclo` va en el SEARCH (antes del #): el router de App matchea el hash
    // EXACTO contra MOCKUP_HASH_ROUTES, y useCicloDia lee hash O search.
    const url = `${base}/index.html?ciclo=${ciclo}#${ruta}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(wait);
    const out = `${outdir}/${pre}-${mundo}-${hora}.png`;
    await page.screenshot({ path: out, timeout: 120000, animations: 'disabled' });
    const canvas = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log(`[shot] ${pre} ${mundo} ${hora} canvas=${canvas} → ${out}`);
    if (errores.length) console.log(`  ERRORES: ${errores.slice(0, 4).join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();
