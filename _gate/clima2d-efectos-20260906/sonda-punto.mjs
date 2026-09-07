import { chromium } from '/home/kortux/Workspace/chagra/node_modules/playwright/index.mjs';
import os from 'node:os';
const PORT = '5391';
const browser = await chromium.launch({ executablePath: os.homedir() + '/.local/bin/chromium', headless: false,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-position=0,0'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route('**/oauth/token', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ access_token: 'a', refresh_token: 'b', expires_in: 3600, token_type: 'Bearer' }) }));
await ctx.route('**/api/**', (r) => (/\/api\/(mcp|whisper|kokoro|ollama|ha)\//.test(r.request().url()) ? r.continue()
  : r.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: '{"data":[]}' })));
await ctx.addInitScript(() => { const ls = window.localStorage;
  ls.setItem('chagra:profile:done:v1:e2e-operator', '1'); ls.setItem('chagra:profile:done:v1', '1');
  const p = JSON.stringify({ nombre: 'F', municipio: 'Guatavita', vereda: 'P', ubicacion_lat: 4.935, ubicacion_lng: -73.833, finca_altitud: 2900 });
  ls.setItem('chagra:profile:v1:e2e-operator', p); ls.setItem('chagra:profile:v1', p); });
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/#login`, { waitUntil: 'domcontentloaded' });
await page.getByLabel(/usuario/i).waitFor({ timeout: 120000 });
await page.getByLabel(/usuario/i).fill('e2e-operator');
await page.getByRole('textbox', { name: /contrase/i }).fill('e2e-pass');
await page.getByRole('button', { name: /ingresar/i }).click();
await page.waitForTimeout(6000);
await page.goto(`http://localhost:${PORT}/?clima=niebla&luz=dia#/clima-boletin`, { waitUntil: 'domcontentloaded' });
await page.locator('[data-testid="clima-boletin-screen"]').waitFor({ timeout: 60000 });
await page.waitForTimeout(4000);
// Experimento: apagar de a un sospechoso y recortar la region del astro.
import fs from 'node:fs';
await page.addStyleTag({ content: '.clima-atmosfera-contenido{opacity:0!important}' });
const recorte = { x: 200, y: 220, width: 190, height: 230 };
for (const [nombre, css] of [
  ['0-tal-cual', ''],
  ['1-sin-glow', '.ca-astro-disco{box-shadow:none!important}'],
  ['2-sin-crater', '.ca-astro-crater{display:none!important}'],
  ['3-sin-disco', '.ca-astro-disco{background:none!important}'],
  ['4-sin-astro', '.ca-astro{display:none!important}'],
]) {
  const tag = css ? await page.addStyleTag({ content: css }) : null;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `./exp-astro-${nombre}.png`, clip: recorte });
  if (tag) await tag.evaluate((el) => el.remove());
}
console.log('TABS =', JSON.stringify(await page.evaluate(() => {
  const out = [];
  for (const t of document.querySelectorAll('[role=\'tab\']')) {
    const cs = getComputedStyle(t); const r = t.getBoundingClientRect();
    out.push({ id: t.dataset.testid, bg: cs.backgroundColor, y: Math.round(r.y), h: Math.round(r.height), sel: t.getAttribute('aria-selected') });
  }
  const c = document.querySelector('.clima-atmosfera-contenido .ca-carta');
  out.push({ carta: c ? getComputedStyle(c).backgroundColor : 'ausente' });
  return out;
}), null, 1));
const info = await page.evaluate(() => {
  const out = { geometria: [], apilado: [] };
  const cs = getComputedStyle;
  for (const sel of ['.ca-astro', '.ca-astro-disco', '.ca-rayos']) {
    const e = document.querySelector(sel); if (!e) continue;
    const r = e.getBoundingClientRect();
    out.geometria.push({ sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), op: cs(e).opacity, bg: cs(e).backgroundImage.slice(0, 60), sh: cs(e).boxShadow.slice(0, 60) });
  }
  document.querySelectorAll('.ca-banco').forEach((e, i) => {
    const r = e.getBoundingClientRect();
    out.geometria.push({ sel: `banco[${i}]`, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2), op: cs(e).opacity });
  });
  // que hay debajo del punto sospechoso (CSS px)
  const prev = document.querySelector('.clima-atmosfera-contenido');
  const vis = prev.style.visibility; prev.style.visibility = 'hidden';
  out.apilado = document.elementsFromPoint(298, 330).map((e) => e.className && e.className.baseVal !== undefined ? e.className.baseVal : String(e.className)).slice(0, 8);
  prev.style.visibility = vis;
  return out;
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
