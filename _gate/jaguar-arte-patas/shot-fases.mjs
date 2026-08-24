// Captura fotogramas deterministas de marcha (una URL con ?fase=) — playwright.
// Uso: node shot-fases.mjs <baseUrl> <outDir> <etiqueta> [fases...]
import path from 'node:path';
import os from 'node:os';
const { chromium } = await import('/home/kortux/Workspace/chagra/node_modules/playwright-core/index.mjs');
const CHROMIUM = path.join(os.homedir(), '.local', 'bin', 'chromium');
const [base, dir, etiqueta, ...fasesArg] = process.argv.slice(2);
const FASES = fasesArg.length ? fasesArg : ['0', '0.06', '0.25', '0.37', '0.56', '0.62', '0.75', '0.9'];
const b = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
for (const fase of FASES) {
  await p.goto(`${base}?fase=${fase}&size=640`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // listo = capas montadas (el <img> plano desaparece) + fase aplicada
  await p.waitForFunction(() => {
    const r = document.querySelector('[data-creature="jaguar"]');
    return r && r.getAttribute('data-fase-aplicada') !== null && r.querySelectorAll('canvas').length > 5;
  }, { timeout: 30000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${dir}/${etiqueta}-fase${fase.replace('.', '')}.png` });
}
console.log(JSON.stringify({ etiqueta, fases: FASES.length, pageErrors: errs }, null, 1));
await b.close();
