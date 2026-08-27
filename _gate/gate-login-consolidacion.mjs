// Gate: LOGIN de la consolidación tras el fix dedup+círculo. Verifica 1 burbuja + 1 angelita + círculo-roto.
// El login renderiza ANTES del cuelgue del catalogDB (ese es el dashboard). No seedea.
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = process.env.GATE_PORT || '5190';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT = resolve(process.cwd(), '_gate/login-consolidacion');

function resolveChromium() {
  try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {}
  return undefined;
}
async function waitForServer(url) {
  for (let i = 0; i < 150; i++) { try { const r = await fetch(url); if (r.status >= 200) return; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  throw new Error('dev server no levantó');
}

const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { stdio: 'ignore', detached: true });
(async () => {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  await waitForServer(BASE_URL);
  const browser = await chromium.launch({ executablePath: resolveChromium(), headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=egl'] });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on('console', () => {}); // no abortar por warnings
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, undefined, { timeout: 120000 });
  await page.waitForTimeout(6000); // dejar montar login + compai + círculo
  for (let f = 0; f < 4; f++) { await page.screenshot({ path: `${OUT}/login-${String(f).padStart(2, '0')}.png`, fullPage: true }); await page.waitForTimeout(700); }
  const info = await page.evaluate(() => ({
    burbujasAvisoGlobal: document.querySelectorAll('.angelita-aviso-global').length,
    burbujasTotales: document.querySelectorAll('[class*="burbuja"],[class*="aviso"]').length,
    angelitas: document.querySelectorAll('[data-creature="abejita"],[data-creature="angelita"],[data-compai]').length,
    circuloRoto: !!document.querySelector('[class*="circulo-roto"],[class*="CirculoRoto"],[class*="milpa"]'),
    textoVisible: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 200),
  }));
  console.log('GATE-LOGIN ' + JSON.stringify(info));
  await browser.close();
})().then(() => { try { process.kill(-child.pid); } catch {} process.exit(0); })
  .catch((e) => { console.error('GATE-ERR', e && e.message); try { process.kill(-child.pid); } catch {} process.exit(1); });
