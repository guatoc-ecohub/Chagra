import { chromium } from 'playwright';

const OUT = '/tmp/claude-1000/-home-kortux/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';
const URL = 'http://localhost:4183/?ciclo=11#/valle3d';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/run/current-system/sw/bin/chromium',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1350, height: 900 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

  console.log('goto...');
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForTimeout(11000);

  await page.screenshot({ path: `${OUT}/valle-fino-panoramica.png` });
  console.log('shot 1 done');

  await page.waitForTimeout(6000); // dar tiempo a que el primer husmeo (5.2s) muestre burbuja
  await page.screenshot({ path: `${OUT}/valle-fino-husmeo.png` });
  console.log('shot 2 done');

  await page.setViewportSize({ width: 480, height: 900 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/valle-fino-retrato.png` });
  console.log('shot 3 done');

  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors.slice(0, 20), null, 2));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
