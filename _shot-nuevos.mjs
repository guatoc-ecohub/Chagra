import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
const BASE = 'https://chagra-dev.guatoc.co';
const OUT = '/tmp/claude-1000/-home-kortux-Workspace-chagra/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';
const T = [
  ['abejas', '/#/mockups/mundo-abejas-3d'],
  ['gallinero', '/#/mockups/mundo-gallinero-3d'],
  ['mercado', '/#/mockups/mundo-mercado-3d'],
  ['catalogo-infra', '/#/mockups/catalogo-infra'],
];
const b = await chromium.launch({ executablePath: '/run/current-system/sw/bin/chromium', headless: true,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PERR', String(e).slice(0,120)));
for (const [n, path] of T) {
  try {
    await p.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
    await sleep(9000);
    await p.screenshot({ path: `${OUT}/nuevo-${n}.png`, timeout: 45000 });
    console.log('OK', n);
  } catch (e) { console.log('FAIL', n, String(e).slice(0, 80)); }
}
await b.close(); console.log('DONE');
