// gate-real-gpu.mjs — captura de rutas 3D con la GPU REAL de stg (headed), NO swiftshader.
// Necesario porque swiftshader NO re-renderiza geometría instanciada nueva (el páramo salía byte-idéntico).
// Uso: node gate-real-gpu.mjs <dist-dir> <ruta1>=<nombre1> [<ruta2>=<nombre2> ...]
//   ej: node gate-real-gpu.mjs /path/dist '/#/mockups/mundo-paramo-3d=paramo'
import pw from '/home/kortux/Workspace/chagra/node_modules/playwright/index.js';
const { chromium } = pw;
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DIST = process.argv[2];
const SHOTS = process.argv.slice(3).map((a) => { const [ruta, name] = a.split('='); return [name, ruta]; });
const PORT = 8097;
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await sleep(1800);

// HEADED + GPU nativa: sin flags swiftshader, con display real de stg.
const browser = await chromium.launch({
  headless: false,
  executablePath: '/run/current-system/sw/bin/chromium',
  env: { ...process.env, DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-1' },
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=egl', '--ignore-gpu-blocklist',
    '--enable-features=Vulkan', '--window-size=420,900'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce',
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
for (const [name, route] of SHOTS) {
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    // poll: esperar a que el canvas WebGL tenga tamaño real (no 'load')
    await page.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, { timeout: 40000 }).catch(() => {});
    await sleep(11000); // asentar la escena en GPU real
    const gpu = await page.evaluate(() => {
      try { const c = document.querySelector('canvas'); const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a'; } catch { return 'err'; }
    });
    const f = `/tmp/gr-${name}.png`;
    await page.screenshot({ path: f, timeout: 60000 });
    console.log(`OK ${name} renderer="${gpu}" -> ${f}`);
  } catch (e) { console.log(`FAIL ${name}: ${String(e.message).slice(0, 90)}`); }
}
await browser.close(); srv.kill(); console.log('DONE');
