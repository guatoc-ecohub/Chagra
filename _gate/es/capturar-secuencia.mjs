/*
 * capturar-secuencia.mjs — SECUENCIA de cuadros de la ENTRADA (y SALIDA) del
 * compai en el harness canónico tests/visual/compai-gate-harness.html.
 *
 * Instrumento v2 (la v1 medía su propia lentitud: ~0,8 s por cuadro y el reloj
 * arrancaba después del montaje → las entradas cortas salían ya en `lista`):
 *   · el RELOJ vive dentro de la página (performance.now desde el disparo);
 *   · la entrada se DISPARA a voluntad: se carga con la especie `--desde`
 *     (por defecto Angelita), se deja asentar, y se cambia a `--hacia` con el
 *     mismo evento que usa el selector real (`chagra:agent-avatar-changed`).
 *     Si `--desde` tiene salida (jaguar → chivito), se ve primero su salida;
 *   · captura solo un RECORTE alrededor del FAB (rápido) y sharp corre al final.
 *   · CANARIO POR CONTENIDO: el nodo de la especie existe en el DOM y el último
 *     cuadro (`lista`) tiene píxeles que no son fondo. Un HTTP 200 no prueba nada.
 *
 * Uso:
 *   node capturar-secuencia.mjs --url <harness> --hacia jaguar --t 60,200,400,... --out /tmp/es/jaguar
 *   node capturar-secuencia.mjs --url <harness> --desde angelita --t 100,600 --congelar 0.4   (control, sin cambio)
 */
/* global process, console, window, document, performance, CustomEvent, localStorage */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('url');
const DESDE = arg('desde', 'angelita');
const HACIA = arg('hacia', null);
const OUT = arg('out', `/tmp/es/${HACIA || DESDE}`);
const T = arg('t', '60,200,400,700,1000,1300,1700,2100,2600').split(',').map(Number);
const ESPERA = Number(arg('espera', '3200')); // ms de asentamiento antes de disparar
const CONGELAR = arg('congelar', null);       // s: congela keyframes CSS (control determinista)
const VW = 430; const VH = 932; const CAJA = 300; const ZOOM = 3;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/home/kortux/.local/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const consola = []; const errores = []; const fallidas = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consola.push(`[${m.type()}] ${m.text().slice(0, 240)}`); });
page.on('pageerror', (e) => errores.push(String(e).slice(0, 400)));
page.on('requestfailed', (r) => fallidas.push(`${r.url()} :: ${r.failure()?.errorText}`));

const fijar = (especie) => {
  try {
    localStorage.setItem('compai:companero', especie);
    localStorage.setItem('chagra:agent-avatar-type', especie);
    localStorage.setItem('guatoc.guia', especie);
  } catch { /* nada */ }
};
await page.addInitScript(fijar, DESDE);

const t0 = Date.now();
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('[data-compai-draggable] [data-creature], [data-compai-draggable] svg.agt-angelita', { timeout: 60000 });
const tCarga = Date.now() - t0;
await page.waitForTimeout(ESPERA);
if (CONGELAR) {
  await page.addStyleTag({ content: `*{animation-play-state:paused!important;animation-delay:-${CONGELAR}s!important;transition:none!important}` });
}

// disparo: reloj en la página + cambio de especie por el evento del selector real
await page.evaluate(({ hacia, fijarSrc }) => {
  window.__t0 = performance.now();
  if (hacia) {
    (new Function('especie', `(${fijarSrc})(especie)`))(hacia);
    window.dispatchEvent(new CustomEvent('chagra:agent-avatar-changed', { detail: hacia }));
  }
}, { hacia: HACIA, fijarSrc: fijar.toString() });

async function estado() {
  return page.evaluate(() => {
    const env = document.querySelector('.compai-es');
    const fab = document.querySelector('[data-compai-draggable]');
    const bicho = fab?.querySelector('[data-creature], svg.agt-angelita');
    const r = fab?.getBoundingClientRect();
    return {
      tPaginaMs: Math.round(performance.now() - window.__t0),
      modo: env?.getAttribute('data-ce-modo') ?? null,
      fase: env?.getAttribute('data-ce-fase') ?? null,
      tipo: env?.getAttribute('data-ce-tipo') ?? null,
      envoltorio: env?.getAttribute('data-ce-especie') ?? null,
      ceMs: env?.style.getPropertyValue('--ce-ms') || null,
      creature: bicho?.getAttribute('data-creature') ?? (bicho ? 'svg.agt-angelita' : null),
      fab: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
    };
  });
}

const cuadros = [];
for (const t of T) {
  await page.waitForFunction((obj) => performance.now() - window.__t0 >= obj, t, { polling: 8, timeout: 60000 });
  const e = await estado();
  const cx = e.fab ? e.fab.x + e.fab.w / 2 : VW - 60; const cy = e.fab ? e.fab.y + e.fab.h / 2 : VH - 60;
  const x = Math.max(0, Math.min(VW - CAJA, Math.round(cx - CAJA / 2)));
  const y = Math.max(0, Math.min(VH - CAJA, Math.round(cy - CAJA / 2)));
  const nombre = `${String(t).padStart(5, '0')}`;
  const png = join(OUT, `${nombre}.png`);
  await page.screenshot({ path: png, clip: { x, y, width: CAJA, height: CAJA }, animations: 'allow', caret: 'initial' });
  const eDespues = await estado();
  cuadros.push({ tObjetivoMs: t, ...e, tDespuesMs: eDespues.tPaginaMs, faseDespues: eDespues.fase, clip: { x, y }, png });
}
const domAvatar = await page.evaluate(() => {
  const span = document.querySelector('[data-compai-draggable] span[aria-hidden="true"]');
  if (!span) return null;
  return span.innerHTML
    .replace(/ style="[^"]*"/g, '')
    .replace(/ data-(visema|agt-visema|agt-estado|pose|vida|mira|linterna|flota|agt-pose)="[^"]*"/g, '')
    .replace(/ class="([^"]*)"/g, (m, c) => ` class="${c.split(' ').filter((k) => !/^(ang-|agt-vuelo|is-)/.test(k)).sort().join(' ')}"`);
});
await browser.close();

// sharp al final: recorte ampliado + canario de contenido (fondo slate-950 ≈ 2,6,23)
for (const c of cuadros) {
  const { data, info } = await sharp(c.png).raw().toBuffer({ resolveWithObject: true });
  let contenido = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const d = Math.max(Math.abs(data[i] - 2), Math.abs(data[i + 1] - 6), Math.abs(data[i + 2] - 23));
    if (d > 28) contenido += 1;
  }
  c.pxContenido = contenido;
  c.zoom = c.png.replace(/\.png$/, `-x${ZOOM}.png`);
  await sharp(c.png).resize(CAJA * ZOOM, CAJA * ZOOM, { kernel: 'nearest' }).png().toFile(c.zoom);
  console.log(JSON.stringify({ t: c.tObjetivoMs, tPag: c.tPaginaMs, tDesp: c.tDespuesMs, modo: c.modo, fase: c.fase, faseDesp: c.faseDespues, ceMs: c.ceMs, env: c.envoltorio, creature: c.creature, px: c.pxContenido }));
}
writeFileSync(join(OUT, 'dom-avatar.html'), domAvatar ?? '');
const ultimo = cuadros[cuadros.length - 1];
const resumen = {
  url: URL_, desde: DESDE, hacia: HACIA, congelar: CONGELAR, esperaMs: ESPERA, tCargaMs: tCarga,
  canarioDom: cuadros.every((c) => c.creature !== null),
  canarioUltimoCuadro: { fase: ultimo.fase, pxContenido: ultimo.pxContenido, ok: ultimo.pxContenido > 800 },
  fases: [...new Set(cuadros.map((c) => `${c.modo ?? '-'}/${c.fase ?? '-'}`))],
  consola, errores, fallidas, cuadros,
};
writeFileSync(join(OUT, 'resumen.json'), JSON.stringify(resumen, null, 2));
console.log('RESUMEN', JSON.stringify({ desde: DESDE, hacia: HACIA, tCargaMs: tCarga, canarioDom: resumen.canarioDom, ultimo: resumen.canarioUltimoCuadro, fases: resumen.fases, errores: errores.length, consola: consola.length }));
