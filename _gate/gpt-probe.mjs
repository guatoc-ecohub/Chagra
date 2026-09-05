/* Probe estructural del gate portal-tinta: verifica en DOM VIVO que cada
   URL monta los cuerpos del registro (data-creature), sus tamaños, errores de
   consola y peticiones fallidas. Complementa la captura PNG (el ojo del lane
   NO ve píxeles: el juez VL + medidas sharp hacen el juicio). */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5249';
const TIPOS = ['zariguya', 'luciernaga', 'chivito-punk', 'oso-baston'];
const OUT = [];

const NIX_CHROMIUM = '/nix/store/91whh0q5kgqi804ckhqmb4z1a1wx8x3j-chromium-151.0.7922.71/bin/chromium';
const browser = await chromium.launch({ headless: true, executablePath: NIX_CHROMIUM, args: ['--no-sandbox'] });
for (const tipo of TIPOS) {
  const page = await browser.newPage({ viewport: { width: 900, height: 720 } });
  const consoleErrs = [];
  const pageErrs = [];
  const reqFail = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleErrs.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => pageErrs.push(String(e)));
  page.on('requestfailed', (r) => reqFail.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`));

  const url = `${BASE}/tests/visual/portal-tinta-gate-harness.html?tipo=${tipo}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('[data-creature]', { timeout: 20000 });
  await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const roots = [...document.querySelectorAll('[data-creature]')];
    return {
      total: roots.length,
      criaturas: roots.map((r) => {
        const rect = r.getBoundingClientRect();
        const svg = r.querySelector('svg');
        return {
          creature: r.getAttribute('data-creature'),
          w: Math.round(rect.width), h: Math.round(rect.height),
          tieneSvg: !!svg,
          rotulo: r.getAttribute('data-rotulo'),
          quieto: r.hasAttribute('data-quieto'),
        };
      }),
      rotulos: [...document.querySelectorAll('[data-rotulo]')].map((r) => r.textContent.trim()),
      titulo: document.title,
    };
  });

  OUT.push({ tipo, url, consoleErrs, pageErrs, reqFail, ...info });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(OUT, null, 2));
