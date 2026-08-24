/*
 * Línea base del comparador VIVO: por tarjeta, activar estado «caminando» y
 * medir si el panel ANTES (rubber-hose) y el DESPUÉS mueven píxeles entre dos
 * fotogramas separados 420ms. Regla de la casa: contar canal-a-canal con
 * sharp, d>20 (magick AE fraccional subestima — memoria).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const out = new URL('./baseline/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const URL_VIVA = process.env.GATE_URL || 'http://127.0.0.1:8800/compai-antes-despues.html';

const browser = await chromium.launch({ headless: false, executablePath: '/home/kortux/.local/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
await page.goto(URL_VIVA, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const tarjetas = await page.$$('section.par');
console.log(`tarjetas: ${tarjetas.length}`);
const resumen = [];
for (const tarjeta of tarjetas) {
  const titulo = (await tarjeta.$eval('h3', (n) => n.textContent)).trim();
  const boton = await tarjeta.$$('.ctrl .grupo button');
  let btnCaminando = null;
  for (const b of boton) if ((await b.textContent()).trim() === 'caminando') btnCaminando = b;
  if (!btnCaminando) { resumen.push({ titulo, caminando: 'SIN BOTÓN' }); continue; }
  await btnCaminando.click();
  await page.waitForTimeout(900);
  await tarjeta.scrollIntoViewIfNeeded();
  const paneles = await tarjeta.$$('.panel');
  const medidas = [];
  for (let i = 0; i < paneles.length; i++) {
    const a = join(out, `${titulo.replace(/\W+/g, '_')}-p${i}-a.png`);
    const b = join(out, `${titulo.replace(/\W+/g, '_')}-p${i}-b.png`);
    await paneles[i].screenshot({ path: a });
    await page.waitForTimeout(420);
    await paneles[i].screenshot({ path: b });
    const [ia, ib] = await Promise.all([
      sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
      sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    ]);
    let px = 0;
    const A = ia.data; const B = ib.data;
    const n = Math.min(A.length, B.length);
    for (let j = 0; j < n; j += 4) {
      if (Math.abs(A[j] - B[j]) > 20 || Math.abs(A[j + 1] - B[j + 1]) > 20 || Math.abs(A[j + 2] - B[j + 2]) > 20) px++;
    }
    medidas.push(px);
  }
  resumen.push({ titulo, antesPx: medidas[0], despuesPx: medidas[1] });
}
console.log(JSON.stringify({ errores, resumen }, null, 2));
await browser.close();
