// Captura playwright autocontrolada (equivalente in-cwd de dom-shot).
// Uso: node _gate/ot-shot.mjs <url> <out.png> [waitMs] [--clip x,y,w,h] [--dsf N]
// Canario anti-SPA-fallback: cuenta nodos .osoTrazado svg y aborta si es 0.
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
const waitMs = Number(args[2] && !args[2].startsWith('--') ? args[2] : 6000);
let clip = null;
let dsf = 1;
let elem = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--clip') clip = args[i + 1].split(',').map(Number);
  if (args[i] === '--dsf') dsf = Number(args[i + 1]);
  if (args[i] === '--elem') elem = args[i + 1]; // "selector;índice"
}
if (!url || !out) { console.error('USO: ot-shot <url> <out.png> [waitMs] [--clip x,y,w,h] [--dsf N]'); process.exit(2); }

const b = await chromium.launch({
  executablePath: '/home/kortux/.local/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
try {
  const p = await b.newPage({ viewport: { width: 1560, height: 1240 }, deviceScaleFactor: dsf });
  const errores = [];
  p.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // canario: contenido real renderizado (svg del trazado O canvas/img de la
  // lámina viva). HTTP 200 no prueba nada; el conteo sí.
  const canario = await p.evaluate(() => {
    const svgs = document.querySelectorAll('.osoTrazado svg, svg.osoHuesos');
    let paths = 0;
    svgs.forEach((s) => { paths += s.querySelectorAll('path').length; });
    const lienzos = document.querySelectorAll('canvas');
    const imgs = document.querySelectorAll('img');
    return { svgs: svgs.length, paths, canvases: lienzos.length, imagenes: imgs.length };
  });
  await new Promise((r) => setTimeout(r, waitMs));
  if (elem) {
    const [sel, idx] = elem.split(';');
    const loc = p.locator(sel).nth(Number(idx || 0));
    await loc.screenshot({ path: out });
  } else {
    await p.screenshot({ path: out, ...(clip ? { clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : { fullPage: true }) });
  }
  console.log(JSON.stringify({ ok: true, out, canario, errores }));
  if (canario.svgs === 0 && canario.canvases === 0 && canario.imagenes === 0) { console.error('CANARIO FALLO: cero svg/canvas/img (¿SPA fallback?)'); process.exit(3); }
} finally {
  await b.close();
}
