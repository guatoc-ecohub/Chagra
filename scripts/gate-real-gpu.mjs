// gate-real-gpu.mjs — captura de rutas 3D con la GPU REAL de stg (headed), NO swiftshader.
// Necesario porque swiftshader NO re-renderiza geometría instanciada nueva (el páramo salía byte-idéntico).
// Uso: node gate-real-gpu.mjs <dist-dir> <ruta1>=<nombre1> [<ruta2>=<nombre2> ...]
//   ej: node gate-real-gpu.mjs /path/dist '/#/mockups/mundo-paramo-3d=paramo'
import pw from '/home/kortux/Workspace/chagra/node_modules/playwright/index.js';
const { chromium } = pw;
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DIST = process.argv[2];
// <ruta>=<nombre>[=<texto del botón a tocar antes de capturar>]
// La ruta pasa por decodeURIComponent: si la ruta misma lleva '=' (p. ej. el
// override '?ciclo=12' del ciclo diurno), se pasa percent-encodeada
// ('...%3Fciclo%3D12') y aquí se restaura — sin eso el split de abajo la
// partía por el '=' del query y el gate iba a una ruta trunca (2026-07-23).
const SHOTS = process.argv.slice(3).map((a) => { const [ruta, name, click] = a.split('='); return [name, decodeURIComponent(ruta), click]; });
// PUERTO POR CORRIDA, NO FIJO. Estaba clavado en 8097 y con varios agentes
// gateando a la vez el segundo encontraba el puerto ocupado, su servidor moría
// callado, y terminaba fotografiando LA APP DEL OTRO. Lo detectó un agente el
// 2026-07-22 al ver que sus capturas "después" no eran de su escena.
// Una captura del mundo equivocado es peor que ninguna: se aprueba arte ajeno.
const OUT = process.env.GATE_OUT || `/tmp/gate-${process.pid}`;
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
console.log(`capturas -> ${OUT}`);
const PORT = 8100 + (process.pid % 800);
const BASE = `http://127.0.0.1:${PORT}`;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: DIST, stdio: 'ignore' });
await sleep(1800);

// Y comprobar que quien responde es NUESTRO servidor. Si el puerto ya estaba
// tomado, python muere en silencio y el fetch igual contesta — con otra app.
try {
  const r = await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
} catch (e) {
  console.error(`ABORTA: el servidor propio no responde en ${BASE} (${e.message}).`);
  console.error('  Sin esto se corre el riesgo de fotografiar la app de otra corrida.');
  srv.kill(); process.exit(1);
}

// HEADED + GPU nativa: sin flags swiftshader, con display real de stg.
const browser = await chromium.launch({
  headless: false,
  executablePath: '/run/current-system/sw/bin/chromium',
  env: { ...process.env, DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-1' },
  // 2026-07-22: SE QUITÓ --use-gl=egl. Medido en stg con chromium 148:
  //   con --use-gl=egl   -> ANGLE (Vulkan 1.3.0 (SwiftShader Device (Subzero)))
  //   sin --use-gl       -> ANGLE (AMD Radeon Vega 10 Graphics, radeonsi raven ACO)
  //   con --use-gl=angle -> ANGLE (AMD Radeon Vega 10 Graphics)
  // O sea: el flag que estaba puesto para "usar la GPU real" era justamente el que
  // forzaba SwiftShader. El encabezado de este archivo decía "sin flags swiftshader"
  // y llevaba forzándolo. Como SwiftShader NO re-renderiza geometría instanciada
  // nueva (por eso existe este script), toda captura de escenas con InstancedMesh
  // podía estar mostrando lo viejo y el gate aprobaba a ciegas.
  // Sin el flag, chromium elige solo y agarra la Vega. La verificación de renderer
  // de más abajo ahora sirve de verdad: si vuelve a decir SwiftShader, ALGO ESTÁ MAL.
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-gpu-blocklist',
    '--enable-features=Vulkan', '--window-size=420,900'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce',
  serviceWorkers: 'block',
});
const page = await ctx.newPage();

// TROIKA / drei <Text>: en chromium 148 los blob-workers de troika mueren async y
// dejan TODA la escena 3D suspendida — el canvas queda de un solo color y la captura
// pasa por buena. Verificado también contra chagra-dev.guatoc.co, así que es del
// navegador, no de la app.
// Fix: hacer que `new Worker(blob:)` truene SÍNCRONO. Troika detecta el fallo y cae a
// su ruta de main-thread, que sí dibuja. Solo afecta a la captura, nunca a producción.
await page.addInitScript(() => {
  const OriginalWorker = window.Worker;
  window.Worker = function (url, opts) {
    if (String(url).startsWith('blob:')) {
      throw new Error('[gate] worker de blob deshabilitado: troika cae a main-thread');
    }
    return new OriginalWorker(url, opts);
  };
  window.Worker.prototype = OriginalWorker.prototype;
});
for (const [name, route, click] of SHOTS) {
  try {
    await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
    // poll: esperar a que el canvas WebGL tenga tamaño real (no 'load')
    await page.waitForFunction(() => { const c = document.querySelector('canvas'); return c && c.width > 0; }, { timeout: 40000 }).catch(() => {});
    // Escenas que arrancan en un estado neutro y solo dibujan cuando el usuario
    // elige (el mercado del hato pide "de la venta"/"del nacimiento"/"de la partida").
    // Sin esto el gate capturaba la loma vacía y la daba por buena: el arte real
    // nunca entraba al encuadre. Se pasa como tercer campo: ruta=nombre=Texto del botón.
    if (click) {
      await sleep(3500); // que monte antes de buscar el botón
      await page.getByRole('button', { name: new RegExp(click, 'i') }).first().click()
        .catch((e) => console.error(`  aviso ${name}: no se pudo tocar "${click}" (${String(e.message).slice(0, 50)})`));
    }
    await sleep(11000); // asentar la escena en GPU real
    const gpu = await page.evaluate(() => {
      try { const c = document.querySelector('canvas'); const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
        const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a'; } catch { return 'err'; }
    });
    // GUARDA DURA: si el renderer es SwiftShader, la captura NO SIRVE y no se
    // guarda. SwiftShader no re-renderiza geometría instanciada nueva, así que la
    // imagen mostraría lo viejo y el gate aprobaría a ciegas — que es exactamente
    // lo que estuvo pasando mientras el script forzaba --use-gl=egl.
    // Antes esto solo se IMPRIMÍA, y nadie leía la línea. Ahora truena.
    if (/swiftshader|llvmpipe|software/i.test(gpu)) {
      console.error(`ABORTA ${name}: renderer="${gpu}" — es software, NO la GPU real.`);
      console.error('  La captura mentiría: revise los flags de chromium antes de aprobar arte.');
      process.exitCode = 1;
      continue;
    }
    // CARPETA POR CORRIDA. Antes todos escribían a /tmp/gr-<nombre>.png y con
    // varios agentes gateando a la vez se borraban las capturas entre ellos —
    // pasó el 2026-07-22: un agente perdió su antes/después y otro se quedó sin
    // la evidencia de su PR. La captura ES el entregable; perderla es perder el
    // trabajo. El nombre de la carpeta se imprime para poder ir a buscarla.
    const f = `${OUT}/gr-${name}.png`;
    await page.screenshot({ path: f, timeout: 60000 });
    console.log(`OK ${name} renderer="${gpu}" -> ${f}`);
  } catch (e) { console.log(`FAIL ${name}: ${String(e.message).slice(0, 90)}`); }
}
await browser.close(); srv.kill(); console.log('DONE');
