import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/demos/3d/_gate/herramientas/gate-pantalla.mjs';
import { chromium } from '/home/kortux/Workspace/chagra/node_modules/playwright-core/index.mjs';

const [url, output] = process.argv.slice(2);
if (!url || !output) throw new Error('uso: capturar-cima-300.mjs <url> <png>');

await exigirPantallaViva({ medirFps: false });
await esperarMaquinaSola({ maxEspera: 120000, umbral: 0 });

const errores = [];
const fallos = [];
const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (error) => errores.push(error.message));
  page.on('requestfailed', (request) => fallos.push(`${request.failure()?.errorText || 'sin detalle'} ${request.url()}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => Boolean(document.querySelector('canvas')));
  await page.waitForTimeout(5000);
  await page.evaluate(() => { document.body.style.zoom = '300%'; });
  await page.waitForTimeout(1000);
  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: output });
  console.log(JSON.stringify({ webgl: await page.evaluate(() => Boolean(document.querySelector('canvas')?.getContext('webgl2') || document.querySelector('canvas')?.getContext('webgl'))), errores, fallos }));
  if (errores.length || fallos.length) process.exitCode = 2;
} finally {
  await browser.close();
}
