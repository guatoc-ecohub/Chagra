/*
 * harness-gate.mjs — Gate GPU (headed) de la escena de micorrizas
 * (#/mockups/micorrizas-3d), para la pasada de arte «suelo vivo».
 *
 * Aplica el espíritu del contrato mundo3d de shot3d: 0 pageerrors, 0 console
 * errors, 0 request failures, canvas WebGL vivo, FPS medido por rAF, y PRUEBA
 * DE VIDA con control negativo (dos capturas del canvas difieren en normal y
 * NO difieren bajo prefers-reduced-motion — regla RULINGS 2026-08-18: «los
 * frames cambian» no prueba vida hasta que el control diga que no cambian).
 *
 * ÚNICA EXCEPCIÓN DOCUMENTADA: la firma 404 "GET /radial-gradient(120%…" es
 * PREEXISTENTE en origin/main (App.jsx envuelve el fondo-gradiente en url())
 * y ya está corregida en el commit 7de47a1b8 de la rama
 * fix/mercado-ronda2-enlaces-renders-codex, aún sin mergear. Se filtra con la
 * firma exacta y se cuenta aparte, idéntico para ANTES y DESPUÉS: no toca el
 * sujeto medido (la escena 3D) y traer ese commit mezclaría alcances.
 *
 * Uso: DISPLAY=:0 XAUTHORITY=<cookie> node harness-gate.mjs <url> <salida.png>
 */
const [url, salidaPng] = process.argv.slice(2);
if (!url || !salidaPng) {
  console.error('uso: node harness-gate.mjs <url> <salida.png>');
  process.exit(2);
}
const { chromium } = await import('/home/kortux/Workspace/chagra/node_modules/playwright-core/index.mjs');

const EXCEPCION = /radial-gradient\(120%/;
const errores = [];
const excepciones = [];
const fallosReq = [];

const browser = await chromium.launch({
  executablePath: '/home/kortux/.local/bin/chromium',
  headless: false,
  args: ['--no-sandbox', '--window-size=1300,900'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => errores.push(`pageerror: ${String(e.message).slice(0, 220)}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // la URL del recurso fallido no viene en text(): viene en location().url
  let loc = '';
  try { loc = decodeURIComponent(m.location()?.url || ''); } catch { loc = m.location()?.url || ''; }
  const t = `${m.text()} [${loc}]`;
  (EXCEPCION.test(t) ? excepciones : errores).push(`console: ${t.slice(0, 240)}`);
});
page.on('requestfailed', (rq) => {
  let u = rq.url();
  try { u = decodeURIComponent(u); } catch { /* se queda cruda */ }
  if (!EXCEPCION.test(u)) fallosReq.push(u.slice(0, 140));
});

await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('canvas', { timeout: 45000 });
await page.waitForTimeout(12000); // compilación dev + chunk vendor-three + fade-in

const webgl = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return false;
  return !!(c.getContext('webgl2') || c.getContext('webgl'));
});

const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0;
  const t0 = performance.now();
  const paso = () => {
    n += 1;
    const dt = performance.now() - t0;
    if (dt >= 4000) res(Math.round((n / (dt / 1000)) * 10) / 10);
    else requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}));

await page.screenshot({ path: salidaPng });

// prueba de vida: el lienzo cambia entre dos capturas separadas 700 ms
const canvasEl = await page.$('canvas');
const s1 = await canvasEl.screenshot();
await page.waitForTimeout(700);
const s2 = await canvasEl.screenshot();
const vive = !s1.equals(s2);

// control negativo: con reduced-motion el mundo monta QUIETO (frameloop demand)
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 45000 });
await page.waitForTimeout(9000);
const canvasQuieto = await page.$('canvas');
const q1 = await canvasQuieto.screenshot();
await page.waitForTimeout(700);
const q2 = await canvasQuieto.screenshot();
const controlQuieto = q1.equals(q2);

await browser.close();

const veredicto = {
  url,
  png: salidaPng,
  webgl,
  fps,
  errores,
  fallosReq,
  excepcionPreexistente: excepciones.length,
  vida: { vive, controlQuieto },
};
console.log(JSON.stringify(veredicto, null, 1));

const ok = webgl && !errores.length && !fallosReq.length && vive && controlQuieto;
console.log(ok ? 'GATE_OK' : 'GATE_FALLA');
process.exit(ok ? 0 : 1);
