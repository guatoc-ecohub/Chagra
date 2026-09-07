// barrido-clima.mjs — recorre las 16 combinaciones condicion x luz de la escena
// atmosferica 2D y vuelca, por cada una, que capas estan encendidas de verdad
// (opacidad efectiva = opacidad de la capa x opacidad propia) y cuantas
// particulas tienen su animacion CORRIENDO. Una capa a opacidad 1 con la
// animacion en `paused` esta viva a medias: se cuenta aparte.
//
// Uso: ./con-x.sh node barrido-clima.mjs --port 5391 --out ./antes [--shots] [--fps]
import { chromium } from '/home/kortux/Workspace/chagra/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/home/kortux/Workspace/chagra/node_modules/sharp/dist/index.cjs');
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PORT = opt('--port', '5391');
const OUT = path.resolve(opt('--out', './antes'));
const DPR = Number(opt('--dpr', '2'));
const SHOTS = args.includes('--shots');
const MEDIR_FPS = args.includes('--fps');
const HEADED = !args.includes('--headless');
const SOLO = opt('--solo', null); // "nublado:dia" para una sola
fs.mkdirSync(OUT, { recursive: true });

const CONDICIONES = ['despejado', 'nublado', 'lluvia', 'niebla'];
const LUCES = ['amanecer', 'dia', 'atardecer', 'noche'];

const CHROMIUM = path.join(os.homedir(), '.local', 'bin', 'chromium');
const gpuArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  '--window-position=0,0'];

const PERFIL = { nombre: 'Finca de prueba', municipio: 'Guatavita, Cundinamarca', departamento: 'Cundinamarca',
  vereda: 'Paramo alto', ubicacion_lat: 4.935, ubicacion_lng: -73.833, finca_altitud: 2900,
  piso_termico: 'paramo', cultivos_actuales: 'papa, mora' };

const log = (...m) => console.log('[barrido]', ...m);
const browser = await chromium.launch({ executablePath: CHROMIUM, headless: !HEADED, args: gpuArgs });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR });
await ctx.route('**/oauth/token', (route) => route.fulfill({ status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify({ access_token: 'e2e-fake-access', refresh_token: 'e2e-fake-refresh', expires_in: 3600, token_type: 'Bearer' }) }));
await ctx.route('**/api/**', (route) => {
  const u = route.request().url();
  if (/\/api\/(mcp|whisper|kokoro|ollama|ha)\//.test(u)) return route.continue();
  return route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) });
});
await ctx.addInitScript((perfil) => {
  const ls = window.localStorage;
  ls.setItem('chagra:profile:done:v1:e2e-operator', '1');
  ls.setItem('chagra:profile:done:v1', '1');
  ls.setItem('chagra:profile:v1:e2e-operator', JSON.stringify(perfil));
  ls.setItem('chagra:profile:v1', JSON.stringify(perfil));
}, PERFIL);

const page = await ctx.newPage();
const pageErrors = []; const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

const BASE = `http://localhost:${PORT}`;
await page.goto(`${BASE}/#login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByLabel(/usuario/i).waitFor({ state: 'visible', timeout: 120000 });
await page.getByLabel(/usuario/i).fill('e2e-operator');
await page.getByRole('textbox', { name: /contrase/i }).fill('e2e-pass');
await page.getByRole('button', { name: /ingresar/i }).click();
try { await page.getByText(/Saltar al contenido|Tareas pendientes|HOY EN SU FINCA/i).first().waitFor({ state: 'visible', timeout: 40000 }); log('login OK'); }
catch { log('login NO llego al home:', (await page.evaluate(() => document.body.innerText.slice(0, 200)))); }
await page.waitForTimeout(1000);

await page.goto(`${BASE}/?clima=despejado&luz=dia#/clima-boletin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.locator('[data-testid="clima-boletin-screen"]').waitFor({ state: 'visible', timeout: 60000 });
await page.evaluate(() => {
  const cont = document.querySelector('.clima-atmosfera-contenido');
  const mk = (id, fg, bg) => { const d = document.createElement('div'); d.id = id;
    d.style.cssText = `background:${bg};color:${fg};font:900 20px sans-serif;padding:6px 10px;position:relative;z-index:99`;
    d.textContent = 'CONTROL'; cont.prepend(d); };
  mk('ctl-21', '#ffffff', '#000000');   // 21,00:1 exacto
  mk('ctl-454', '#767676', '#ffffff');  // 4,54:1 exacto
});
await page.waitForTimeout(4000);
try { await page.bringToFront(); } catch { /* headless */ }

const SONDA = `(() => {
  const root = document.querySelector('.ca-atmosfera');
  if (!root) return { error: 'sin .ca-atmosfera' };
  const cs = (el) => getComputedStyle(el);
  const opOf = (sel) => { const e = document.querySelector(sel); return e ? +(+cs(e).opacity).toFixed(3) : null; };
  const CAPAS = {
    'cielo:soleado': '.ca-cielo--soleado', 'cielo:lluvia': '.ca-cielo--lluvia', 'cielo:niebla': '.ca-cielo--niebla',
    'cielo:dorada': '.ca-cielo--dorada', 'cielo:noche': '.ca-cielo--noche', 'cielo:nublado': '.ca-cielo--nublado',
    'grade:soleado': '.ca-grade--soleado', 'grade:lluvia': '.ca-grade--lluvia', 'grade:niebla': '.ca-grade--niebla',
    'grade:dorada': '.ca-grade--dorada', 'grade:noche': '.ca-grade--noche', 'grade:nublado': '.ca-grade--nublado',
    astro: '.ca-astro', rayos: '.ca-rayos', bruma: '.ca-bruma', laderaLuz: '.ca-ladera-luz',
    vineta: '.ca-vineta', scrimAlto: '.ca-scrim--alto', scrimBajo: '.ca-scrim--bajo', jironUI: '.ca-jiron-ui',
    'capa:estrellas': '.ca-capa--estrellas', 'capa:lluvia': '.ca-capa--lluvia', 'capa:niebla': '.ca-capa--niebla',
    'capa:polvo': '.ca-capa--polvo', 'capa:luci': '.ca-capa--luci',
  };
  const capas = {}; for (const [k, s] of Object.entries(CAPAS)) capas[k] = opOf(s);
  // Particulas: opacidad efectiva y estado de animacion
  const GRUPOS = {
    estrellas: ['.ca-capa--estrellas', '.ca-estrella'],
    gotas: ['.ca-capa--lluvia', '.ca-gota'],
    bancos: ['.ca-capa--niebla', '.ca-banco'],
    jirones: ['.ca-capa--niebla', '.ca-jiron'],
    motas: ['.ca-capa--polvo', '.ca-mota'],
    luciernagas: ['.ca-capa--luci', '.ca-luci'],
    rayos: ['.ca-rayos', '.ca-rayos-giro path'],
  };
  const particulas = {};
  for (const [nombre, [capaSel, itemSel]] of Object.entries(GRUPOS)) {
    const capa = document.querySelector(capaSel);
    const opCapa = capa ? +cs(capa).opacity : 0;
    const items = [...document.querySelectorAll(itemSel)];
    let visibles = 0, animando = 0;
    for (const it of items) {
      const efec = opCapa * (+cs(it).opacity || 0);
      if (efec > 0.02) visibles++;
    }
    // animaciones corriendo asociadas a esos nodos (o a su padre animado)
    const nodos = new Set(items);
    const padres = new Set(items.map((i) => i.parentElement));
    for (const a of document.getAnimations()) {
      const t = a.effect && a.effect.target;
      if (!t) continue;
      if ((nodos.has(t) || padres.has(t) || (t.parentElement && nodos.has(t.parentElement))) && a.playState === 'running') animando++;
    }
    particulas[nombre] = { total: items.length, visibles, animando, opCapa: +opCapa.toFixed(3) };
  }
  const corriendo = document.getAnimations().filter((a) => a.playState === 'running');
  // Solo cuentan las animaciones cuyo nodo esta en una capa visible
  const vivasVisibles = corriendo.filter((a) => {
    const t = a.effect && a.effect.target; if (!t || !t.getBoundingClientRect) return false;
    let el = t, op = 1;
    while (el && el !== document.documentElement) { op *= (+cs(el).opacity || 0); if (op <= 0.02) return false; el = el.parentElement; }
    return true;
  }).length;
  return { clima: root.dataset.clima || null, luz: root.dataset.luz || null, enso: root.dataset.enso || null,
    capas, particulas, animCorriendo: corriendo.length, animVivasVisibles: vivasVisibles,
    nodosEscena: document.querySelectorAll('.ca-escena *').length };
})()`;


// ── Contraste real: color del texto vs pixeles que tiene detras ──
const OBJETIVOS = [
  ['cabecera-lugar', '[data-testid="clima-cabecera"] > p:nth-of-type(1)'],
  ['cabecera-altura', '[data-testid="clima-cabecera"] > p:nth-of-type(2)'],
  ['cabecera-saludo', '[data-testid="clima-cabecera"] h2'],
  ['cabecera-condicion', '[data-testid="clima-cabecera"] > p:last-of-type'],
  ['cifra-grande', '[data-testid="clima-ahora"] p.text-4xl'],
  ['tab-hoy', '[data-testid="horizonte-tab-hoy"] span'],
  ['tab-semana', '[data-testid="horizonte-tab-semana"] span'],
  ['tab-estacional', '[data-testid="horizonte-tab-estacional"] span'],
  // Controles con valor ANALITICO conocido: si el harness no los devuelve
  // 21,00 y 4,54 el instrumento esta mintiendo y la tabla no vale nada.
  ['CONTROL-21', '#ctl-21'],
  ['CONTROL-4.54', '#ctl-454'],
];
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const parseColor = (s) => { const m = s.match(/[\d.]+/g) || []; return { r: +m[0], g: +m[1], b: +m[2] }; };
const contraste = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
// Gate ancho: TODO nodo de texto hoja visible dentro del boletin, no una
// lista curada de ocho. El minimo global es el numero que vale.

// El compai flotante (z 40, 84x84, sin clase) pasa POR ENCIMA del boletin y
// puede tumbar cualquier texto a 1,17:1. Es un elemento de la app, ajeno a la
// escena de clima: se aparta para medir la escena, y se reporta aparte.
async function apartarFlotantes(page) {
  if (args.includes('--con-flotantes')) return 0; // medir CON el compai encima
  return page.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
      const z = +cs.zIndex; if (!Number.isFinite(z) || z < 20) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.width > 380 || r.height < 20) continue;
      el.setAttribute('data-flotante-apartado', '1');
      el.style.visibility = 'hidden'; n++;
    }
    return n;
  });
}
async function devolverFlotantes(page) {
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-flotante-apartado]')) { el.style.visibility = ''; el.removeAttribute('data-flotante-apartado'); } });
}

async function medirTodoElTexto(page) {
  const cajas = await page.evaluate(() => {
    const out = [];
    const walk = document.querySelectorAll('.clima-atmosfera-contenido *');
    let i = 0;
    for (const el of walk) {
      if (el.id === 'ctl-21' || el.id === 'ctl-454') continue;
      if (el.children.length > 0) continue;
      const txt = (el.textContent || '').trim();
      if (txt.length < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.6) continue;
      const rango = document.createRange(); rango.selectNodeContents(el);
      const r = rango.getBoundingClientRect();
      if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight) continue;
      const marca = `ctxt${i++}`;
      el.setAttribute('data-ctxt', marca);
      out.push({ marca, x: r.left, y: Math.max(0, r.top), w: r.width, h: Math.min(r.height, innerHeight - r.top), color: cs.color, texto: txt.slice(0, 34) });
    }
    return out;
  });
  const flotantes = await apartarFlotantes(page);
  const oc = await page.addStyleTag({ content: '[data-ctxt] { color: transparent !important; text-shadow: none !important; }' });
  await page.waitForTimeout(260);
  const png = await page.screenshot();
  await oc.evaluate((el) => el.remove());
  await devolverFlotantes(page);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (const c of cajas) {
    const tc = parseColor(c.color); if (!Number.isFinite(tc.r)) continue;
    const lt = lum(tc.r, tc.g, tc.b);
    const x0 = Math.max(0, Math.floor(c.x * DPR)), y0 = Math.max(0, Math.floor(c.y * DPR));
    const x1 = Math.min(info.width, Math.ceil((c.x + c.w) * DPR)), y1 = Math.min(info.height, Math.ceil((c.y + c.h) * DPR));
    if (x1 <= x0 || y1 <= y0) continue;
    const vals = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      vals.push(contraste(lt, lum(data[i], data[i + 1], data[i + 2])));
    }
    vals.sort((a, b) => a - b);
    out.push({ texto: c.texto, p05: +vals[Math.floor(vals.length * 0.05)].toFixed(2) });
  }
  out.sort((a, b) => a.p05 - b.p05);
  return { flotantesApartados: flotantes, n: out.length, textos: out };
}

async function medirContraste(page, tag) {
  const cajas = await page.evaluate((objetivos) => objetivos.map(([id, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return { id, ausente: true };
    const rango = document.createRange(); rango.selectNodeContents(el);
    const rr = rango.getBoundingClientRect(); const r = el.getBoundingClientRect();
    const box = rr.width > 0 ? rr : r;
    return { id, x: box.left, y: box.top, w: box.width, h: box.height, color: getComputedStyle(el).color, texto: (el.textContent || '').trim().slice(0, 40) };
  }), OBJETIVOS);
  await apartarFlotantes(page);
  const oc = await page.addStyleTag({ content: OBJETIVOS.flatMap(([, sel]) => [sel, sel + ' *']).join(', ') + ' { color: transparent !important; text-shadow: none !important; }' });
  await page.waitForTimeout(260);
  const png = await page.screenshot();
  if (SHOTS) fs.writeFileSync(path.join(OUT, `fondo-${tag}.png`), png);
  await oc.evaluate((el) => el.remove());
  await devolverFlotantes(page);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const out = [];
  for (const c of cajas) {
    if (c.ausente || !c.w || !c.h) { out.push({ id: c.id, ausente: true }); continue; }
    const tc = parseColor(c.color); const lt = lum(tc.r, tc.g, tc.b);
    const x0 = Math.max(0, Math.floor(c.x * DPR)), y0 = Math.max(0, Math.floor(c.y * DPR));
    const x1 = Math.min(info.width, Math.ceil((c.x + c.w) * DPR)), y1 = Math.min(info.height, Math.ceil((c.y + c.h) * DPR));
    let min = Infinity; const vals = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * info.width + x) * info.channels;
      const cr = contraste(lt, lum(data[i], data[i + 1], data[i + 2]));
      vals.push(cr); if (cr < min) min = cr;
    }
    vals.sort((a, b) => a - b);
    out.push({ id: c.id, texto: c.texto, min: +min.toFixed(2), p05: +vals[Math.floor(vals.length * 0.05)].toFixed(2) });
  }
  return out;
}

const combos = SOLO ? [SOLO.split(':')] : CONDICIONES.flatMap((c) => LUCES.map((l) => [c, l]));
const resultados = [];
for (const [clima, luz] of combos) {
  await page.evaluate(([c, l]) => {
    const r = document.querySelector('.ca-atmosfera');
    r.dataset.clima = c; r.dataset.luz = l;
  }, [clima, luz]);
  await page.waitForTimeout(2600); // las transiciones son de 1,8 s
  const estado = await page.evaluate(SONDA);
  let fps = null;
  if (MEDIR_FPS) {
    fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
      requestAnimationFrame(tick); }));
  }
  if (SHOTS) {
    // Los bloques de control del instrumento NO deben salir en la evidencia.
    await page.evaluate(() => { for (const id of ['ctl-21', 'ctl-454']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, `${clima}-${luz}.png`) });
    // Escena sola: sin el boletin encima, para juzgar el cielo por si mismo.
    const solo = await page.addStyleTag({ content: '.clima-atmosfera-contenido { opacity: 0 !important; }' });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `escena-${clima}-${luz}.png`) });
    await solo.evaluate((el) => el.remove());
    await page.evaluate(() => { for (const id of ['ctl-21', 'ctl-454']) { const e = document.getElementById(id); if (e) e.style.display = ''; } });
    await page.waitForTimeout(150);
  }
  const contrastes = args.includes('--sin-contraste') ? null : await medirContraste(page, `${clima}-${luz}`);
  const medida = args.includes('--sin-contraste') ? null : await medirTodoElTexto(page);
  const todoTexto = medida ? medida.textos : null;
  const peor = contrastes ? contrastes.filter((c) => !c.ausente).reduce((a, c) => (c.p05 < a.p05 ? c : a)) : null;
  resultados.push({ clima, luz, fps, contrastes,
    flotantesApartados: medida ? medida.flotantesApartados : null,
    nTextos: medida ? medida.n : null, todoTexto, ...estado });
  log(`${clima}/${luz}`, `animVivas=${estado.animVivasVisibles}`, `fps=${fps ?? '-'}`,
    peor ? `peorObjetivo=${peor.id}:${peor.p05}` : '',
    medida ? `PEOR-TEXTO=${medida.textos[0].p05} (${JSON.stringify(medida.textos[0].texto)}) n=${medida.n} flotantesApartados=${medida.flotantesApartados}` : '',
    Object.entries(estado.particulas).filter(([, v]) => v.visibles > 0).map(([k, v]) => `${k}:${v.visibles}/${v.animando}`).join(' ') || 'SIN PARTICULAS');
}
fs.writeFileSync(path.join(OUT, 'barrido.json'), JSON.stringify({ fecha: new Date().toISOString(), pageErrors, consoleErrors, resultados }, null, 2));
log('escrito', path.join(OUT, 'barrido.json'), `pageErrors=${pageErrors.length} consoleErrors=${consoleErrors.length}`);
await browser.close();
