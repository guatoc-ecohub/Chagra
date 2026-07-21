#!/usr/bin/env node
/**
 * Mide valor, saturación, paleta cuantizada y detalle por tercio en PNG.
 * Recorta la UI superior/inferior y el minimapa derecho de forma constante.
 *
 * Uso:
 *   node scripts/diag/medir-imagen-valle.mjs base-*.png > imagenes-valle.json
 */
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const archivos = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((a) => resolve(a));
if (!archivos.length) {
  console.error('Indique al menos un PNG.');
  process.exit(2);
}

function chromiumPath() {
  for (const p of [process.env.CHROMIUM_PATH, '/run/current-system/sw/bin/chromium']) if (p && existsSync(p)) return p;
  try { return execSync('which chromium', { encoding: 'utf8' }).trim(); } catch { return undefined; }
}

const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true });
const page = await browser.newPage();

async function medir(ruta) {
  const b64 = readFileSync(ruta).toString('base64');
  return page.evaluate(async ({ b64, nombre }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    const x0 = 0;
    const y0 = Math.round(bmp.height * 0.08);
    const x1 = Math.round(bmp.width * 0.84);
    const y1 = Math.round(bmp.height * 0.92);
    const { data, width, height } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    const hist = new Uint32Array(256);
    const quant = new Set();
    const tercios = Array.from({ length: 3 }, () => ({ n: 0, suma: 0, suma2: 0, bordes: 0, pruebasBorde: 0 }));
    let n = 0; let suma = 0; let suma2 = 0; let sat = 0; let sat2 = 0; let negros = 0; let blancos = 0;
    const lum = (i) => (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    for (let y = 0; y < height; y += 2) {
      const tercio = Math.min(2, Math.floor((y / height) * 3));
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const l = lum(i);
        const max = Math.max(data[i], data[i + 1], data[i + 2]);
        const min = Math.min(data[i], data[i + 1], data[i + 2]);
        const s = max ? (max - min) / max : 0;
        n += 1; suma += l; suma2 += l * l; sat += s; sat2 += s * s;
        hist[Math.min(255, Math.floor(l * 256))] += 1;
        quant.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
        if (l < 0.02) negros += 1;
        if (l > 0.98) blancos += 1;
        const t = tercios[tercio];
        t.n += 1; t.suma += l; t.suma2 += l * l;
        if (x + 4 < width && y + 4 < height) {
          const gx = Math.abs(lum(i + 16) - l);
          const gy = Math.abs(lum(i + width * 16) - l);
          t.pruebasBorde += 1;
          if (gx + gy > 0.16) t.bordes += 1;
        }
      }
    }
    const percentil = (p) => {
      const objetivo = n * p; let acum = 0;
      for (let i = 0; i < hist.length; i++) { acum += hist[i]; if (acum >= objetivo) return i / 255; }
      return 1;
    };
    let entropia = 0;
    for (const h of hist) if (h) { const p = h / n; entropia -= p * Math.log2(p); }
    const estad = (t) => ({ media: t.suma / t.n, desviacion: Math.sqrt(Math.max(0, t.suma2 / t.n - (t.suma / t.n) ** 2)), densidadBorde: t.bordes / t.pruebasBorde });
    const ts = tercios.map(estad);
    return {
      archivo: nombre, dimensiones: [bmp.width, bmp.height], recorteAnalizado: [x0, y0, x1, y1], muestras: n,
      luminancia: { media: suma / n, desviacion: Math.sqrt(Math.max(0, suma2 / n - (suma / n) ** 2)), p05: percentil(0.05), p50: percentil(0.5), p95: percentil(0.95), rangoP05P95: percentil(0.95) - percentil(0.05), entropiaBits: entropia, negrosRecortados: negros / n, blancosRecortados: blancos / n },
      saturacion: { media: sat / n, desviacion: Math.sqrt(Math.max(0, sat2 / n - (sat / n) ** 2)) },
      coloresCuantizados12bit: quant.size,
      terciosVerticales: { alto: ts[0], medio: ts[1], bajo: ts[2] },
      separacionDetalleBajoVsAlto: ts[2].densidadBorde / Math.max(1e-9, ts[0].densidadBorde),
      separacionContrasteBajoVsAlto: ts[2].desviacion / Math.max(1e-9, ts[0].desviacion),
    };
  }, { b64, nombre: basename(ruta) });
}

const resultados = [];
for (const archivo of archivos) resultados.push(await medir(archivo));
await browser.close();
console.log(JSON.stringify({ metodologia: 'Recorte x=0..84%, y=8..92%; muestreo cada 2 px; luminancia Rec.709; color RGB de 4 bits/canal.', resultados }, null, 2));
