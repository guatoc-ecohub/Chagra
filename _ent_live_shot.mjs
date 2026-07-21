import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/run/current-system/sw/bin/chromium',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0,120)));
for (const [name, url] of [['visual-lib','https://chagra-dev.guatoc.co/#/mockups/visual-lib'],['vitrina','https://chagra-dev.guatoc.co/#/mockups/vitrina-maestra']]) {
  try { await p.goto(url, { waitUntil: 'load', timeout: 40000 }); await new Promise(r=>setTimeout(r,9000));
    await p.screenshot({ path: `/tmp/ent-${name}.png` }); console.log('OK', name); }
  catch(e){ console.log('FAIL', name, String(e).slice(0,80)); }
}
await b.close();
