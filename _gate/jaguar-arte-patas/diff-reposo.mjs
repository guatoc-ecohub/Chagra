// Diff de REPOSO: ensamble quieto (anim=0, idle) vs lámina plana (?plano=1),
// misma geometría. Métrica canal-a-canal d>20 (la métrica de la casa: el AE
// fraccional de magick subestima) + mapa de diferencias para el ojo.
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
const { chromium } = await import('/home/kortux/Workspace/chagra/node_modules/playwright-core/index.mjs');
const CHROMIUM = path.join(os.homedir(), '.local', 'bin', 'chromium');
const [base, outDir] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: CHROMIUM, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();

async function captura(url, file, esperarCanvas) {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (esperarCanvas) {
    await p.waitForFunction(() => {
      const r = document.querySelector('[data-creature="jaguar"]');
      return r && r.querySelectorAll('canvas').length > 5;
    }, { timeout: 30000 });
  } else {
    await p.waitForFunction(() => document.querySelector('[data-plano]') && document.querySelector('img').complete, { timeout: 30000 });
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: file });
}

await captura(`${base}?estado=idle&anim=0&size=640`, `${outDir}/reposo-ensamble.png`, true);
await captura(`${base}?plano=1&size=640`, `${outDir}/reposo-lamina.png`, false);
await b.close();

const A = await sharp(`${outDir}/reposo-ensamble.png`).raw().toBuffer({ resolveWithObject: true });
const L = await sharp(`${outDir}/reposo-lamina.png`).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = A.info;
const mapa = Buffer.alloc(W * H * 3);
let dif20 = 0, dif50 = 0, total = 0;
// región patas delanteras en px de pantalla (stage 640@x40,y181.2; escala 640/705; dsf 2)
const esc = 640 / 705, offX = 40, offY = 181.2, dsf = 2;
const reg = { x0: (offX + 80 * esc) * dsf, x1: (offX + 320 * esc) * dsf, y0: (offY + 200 * esc) * dsf, y1: (offY + 394 * esc) * dsf };
let regDif20 = 0, regTotal = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C, j = (y * W + x) * 3;
    const d = Math.max(
      Math.abs(A.data[i] - L.data[i]),
      Math.abs(A.data[i + 1] - L.data[i + 1]),
      Math.abs(A.data[i + 2] - L.data[i + 2]),
    );
    total++;
    const enReg = x >= reg.x0 && x <= reg.x1 && y >= reg.y0 && y <= reg.y1;
    if (enReg) regTotal++;
    if (d > 20) {
      dif20++;
      if (enReg) regDif20++;
      mapa[j] = 255; mapa[j + 1] = Math.max(0, 255 - d * 2); mapa[j + 2] = 0;
    } else {
      const g = Math.round(A.data[i] * 0.35);
      mapa[j] = g; mapa[j + 1] = g; mapa[j + 2] = g;
    }
    if (d > 50) dif50++;
  }
}
await sharp(mapa, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${outDir}/reposo-diff.png`);
console.log(JSON.stringify({
  totalPx: total,
  dif20, dif20pct: +(100 * dif20 / total).toFixed(3),
  dif50, dif50pct: +(100 * dif50 / total).toFixed(3),
  regionDelanteras: { px: regTotal, dif20: regDif20, pct: +(100 * regDif20 / regTotal).toFixed(3) },
}, null, 1));
