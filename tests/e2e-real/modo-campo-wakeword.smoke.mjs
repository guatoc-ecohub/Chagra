/**
 * modo-campo-wakeword.smoke.mjs — SMOKE de punta a punta del MODO CAMPO
 * (#2088): confirma que src/services/wakeWordService.js (el motor REAL que
 * se shippea, NO un mock) reconoce "hola chagra" en un clip de audio
 * HELD-OUT (nunca visto en el entrenamiento — tests/fixtures/wake-word/) y
 * dispara `activarEscucha({fuente:'wakeword'})` (escuchaService.js), Y que
 * NO dispara con una frase negativa "difícil" (comparte el token "chagra").
 *
 * Es Playwright "crudo" (NO en la suite *.spec.js automática vía
 * `playwright test`) porque levanta su PROPIO dev server con
 * VITE_MODO_CAMPO=true — la flag es "dark" en prod/CI y no debe
 * contaminar playwright.config.js (que comparten TODOS los demás e2e).
 * Mismo patrón que tests/e2e-real/sw-self-heal.smoke.mjs.
 *
 * NO monta el árbol de React completo (evita el flujo de login/OAuth) — el
 * contrato `chagra:escucha` → EscuchaOverlay ya está probado en
 * src/services/__tests__/escuchaService.test.js; este smoke prueba el
 * ESLABÓN NUEVO: wake-word real → activarEscucha(). La verificación VISUAL
 * de que el overlay "Escuché «hola Chagra»" aparece en pantalla queda para
 * el operador (ver PASOS DE PRUEBA en el reporte de la tarea).
 *
 * Uso:
 *   DISPLAY=:0 node tests/e2e-real/modo-campo-wakeword.smoke.mjs
 *
 * Nota: la PRIMERA activación entrena localmente (~20-40s, "warm-up" desde
 * examples.bin — ver wakeWordService.js prepareRecognizer/'ready-fresh').
 * El timeout generoso de abajo lo contempla.
 */
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '..', '..');
const PORT = Number(process.env.MODO_CAMPO_SMOKE_PORT || 5187);
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH;

const POS_FIXTURE = join(REPO_ROOT, 'tests/fixtures/wake-word/hola-chagra-holdout.wav');
const NEG_FIXTURE = join(REPO_ROOT, 'tests/fixtures/wake-word/otro-holdout.wav');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function detectChromiumPath() {
  if (CHROMIUM_PATH) return CHROMIUM_PATH;
  try {
    return execSync('which chromium', { encoding: 'utf8' }).trim() || undefined;
  } catch { return undefined; }
}

async function waitForServer(url, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return true;
    } catch { /* aún no arriba */ }
    await sleep(300);
  }
  return false;
}

function fileToBase64(path) {
  return readFileSync(path).toString('base64');
}

/* Override de getUserMedia + helper para inyectar un clip WAV loopeado como
 * "micrófono". Mismo truco que scripts/wake-word/train-model.mjs (probado). */
const INIT_SCRIPT = `(function(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const mix = ctx.createGain();
  let lastDest = null;
  let currentSrc = null;
  const md = navigator.mediaDevices || (navigator.mediaDevices = {});
  md.getUserMedia = async () => {
    await ctx.resume();
    if (lastDest) { try { mix.disconnect(lastDest); } catch(_) {} }
    const dest = ctx.createMediaStreamDestination();
    mix.connect(dest);
    lastDest = dest;
    return dest.stream;
  };
  function b64ToBuf(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  window.__setFakeMicClip = async (base64) => {
    if (currentSrc) { try { currentSrc.stop(); } catch(_) {} try { currentSrc.disconnect(); } catch(_) {} }
    const audioBuf = await ctx.decodeAudioData(b64ToBuf(base64).slice(0));
    const src = ctx.createBufferSource();
    src.buffer = audioBuf; src.loop = true;
    src.connect(mix);
    src.start();
    currentSrc = src;
  };
  // Silencio: para el clip actual sin arrancar uno nuevo — deja que la
  // ventana deslizante del extractor de espectrograma "olvide" el audio
  // anterior antes de evaluar el siguiente clip (evita falsos + por
  // residuo de la señal previa en el buffer de FFT).
  window.__setFakeMicSilence = () => {
    if (currentSrc) { try { currentSrc.stop(); } catch(_) {} try { currentSrc.disconnect(); } catch(_) {} }
    currentSrc = null;
  };
})();`;

async function main() {
  const results = { checks: [], ok: true };
  const check = (name, pass, detail) => {
    results.checks.push({ name, pass, detail });
    if (!pass) results.ok = false;
    console.log(`[${pass ? 'OK' : 'FALLO'}] ${name}${detail ? ' — ' + detail : ''}`);
  };

  console.log(`Levantando vite dev server (VITE_MODO_CAMPO=true) en :${PORT}…`);
  const vite = spawn('npx', ['vite', `--port=${PORT}`, '--strictPort'], {
    cwd: REPO_ROOT,
    env: { ...process.env, VITE_MODO_CAMPO: 'true' },
    stdio: 'ignore',
  });

  let browser;
  try {
    const up = await waitForServer(`http://localhost:${PORT}/`, 90000);
    if (!up) throw new Error('El dev server no levantó a tiempo');

    browser = await chromium.launch({
      executablePath: detectChromiumPath(),
      headless: false, // headless throttlea audio/rAF — ver spikes/wake-word/verify-headless.mjs
      args: [
        '--no-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.addInitScript(INIT_SCRIPT);
    // El primer navigate en un dev server de Vite en frío compila/transforma
    // el grafo de módulos de la SPA on-demand — puede tardar bastante más
    // que un fetch() simple de / (que ya respondía en waitForServer).
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 120000 });

    // Importa los módulos REALES de producción (no un mock) vía el module
    // graph de Vite dev, y arma el listener del contrato `chagra:escucha`.
    await page.evaluate(async () => {
      const wakeWordService = await import('/src/services/wakeWordService.js');
      const escuchaService = await import('/src/services/escuchaService.js');
      window.__wakeWordService = wakeWordService;
      window.__escuchaEvents = [];
      escuchaService.onEscucha((detail) => window.__escuchaEvents.push(detail));
    });

    const posB64 = fileToBase64(POS_FIXTURE);
    const negB64 = fileToBase64(NEG_FIXTURE);

    console.log('Reproduciendo clip HELD-OUT "hola chagra" (nunca visto en el entrenamiento)…');
    await page.evaluate((b64) => window.__setFakeMicClip(b64), posB64);

    let detectorReady = false;
    let detectorError = null;
    page.evaluate(async () => {
      const { activarEscucha } = await import('/src/services/escuchaService.js');
      try {
        window.__wakeDetector = await window.__wakeWordService.createWakeWordDetector({
          onWake: () => activarEscucha({ fuente: 'wakeword' }),
          onProgress: (phase) => { window.__wakeStatus = phase; },
          onError: (e) => { window.__wakeError = e.message; },
        });
        window.__detectorReady = true;
      } catch (e) {
        window.__wakeError = e.message;
      }
    }).catch(() => {});

    // Primera activación entrena localmente desde examples.bin — generoso
    // (medido en aislado: ~18s de train() puro; aquí se suma fetch de
    // examples.bin + transform del module graph de Vite dev + carga wasm).
    const t0 = Date.now();
    let lastStatus = null;
    let readyAt = null;
    // Una vez 'ready' (transfer.listen() ya arrancó), dar una ventana real
    // para que el loop de inferencia (~560ms/frame, overlap 0.5) capture el
    // audio loopeado — un par de frames como mínimo, generoso por el ruido
    // del sistema compartido.
    const LISTEN_WINDOW_AFTER_READY_MS = 8000;
    while (Date.now() - t0 < 180000) {
      const state = await page.evaluate(() => ({
        ready: !!window.__detectorReady,
        error: window.__wakeError || null,
        events: window.__escuchaEvents.length,
        status: window.__wakeStatus || null,
      }));
      if (state.status !== lastStatus) {
        console.log(`  [t+${Math.round((Date.now() - t0) / 1000)}s] status=${state.status} ready=${state.ready}`);
        lastStatus = state.status;
      }
      if (state.error) { detectorError = state.error; break; }
      if (state.events > 0) { detectorReady = true; break; }
      if (state.ready) {
        if (readyAt === null) readyAt = Date.now();
        if (Date.now() - readyAt > LISTEN_WINDOW_AFTER_READY_MS) break;
      }
      await sleep(500);
    }

    const finalState = await page.evaluate(() => ({ ready: !!window.__detectorReady, status: window.__wakeStatus }));
    const motorOk = !detectorError && (finalState.ready || finalState.status === 'ready');
    check(
      'motor cargó/entrenó sin error y llegó a listo',
      motorOk,
      motorOk ? `status=${finalState.status}` : (detectorError || `no llegó a listo — último status: ${finalState.status} ready=${finalState.ready}`),
    );

    const eventsAfterPos = await page.evaluate(() => window.__escuchaEvents.length);
    check(
      'detecta "hola chagra" (held-out) y dispara activarEscucha',
      eventsAfterPos > 0,
      `eventos capturados: ${eventsAfterPos}`,
    );
    if (eventsAfterPos > 0) {
      const fuente = await page.evaluate(() => window.__escuchaEvents[0].fuente);
      check('detail.fuente === "wakeword"', fuente === 'wakeword', `fuente="${fuente}"`);
    }

    // Silencio antes de cambiar de clip: deja que la ventana deslizante del
    // extractor de espectrograma "olvide" el audio positivo — sin esto, un
    // frame de transición puede mezclar cola del clip anterior con el
    // arranque del siguiente y disparar un falso + que no es real (de-riskeado
    // en vivo: sin este gap, el negativo "hard" registraba un 2do evento
    // justo en el borde del cambio de clip).
    await page.evaluate(() => window.__setFakeMicSilence());
    await sleep(2000);
    const eventsBeforeNeg = await page.evaluate(() => window.__escuchaEvents.length);

    console.log('Reproduciendo clip HELD-OUT negativo "chagra" (hard negative — comparte token)…');
    await page.evaluate((b64) => window.__setFakeMicClip(b64), negB64);
    await sleep(6000); // un par de ciclos de inferencia (~560ms/frame + cooldown 1.5s)
    const eventsAfterNeg = await page.evaluate(() => window.__escuchaEvents.length);
    check(
      'NO dispara con negativo "chagra" (sin nuevos eventos)',
      eventsAfterNeg === eventsBeforeNeg,
      `eventos antes-del-gap=${eventsAfterPos} antes-del-negativo=${eventsBeforeNeg} después=${eventsAfterNeg}`,
    );

    check('sin pageerrors', pageErrors.length === 0, pageErrors.join(' | '));

    await page.evaluate(() => window.__wakeDetector?.stop?.()).catch(() => {});
  } catch (e) {
    check('smoke corrió sin excepción fatal', false, e.message);
  } finally {
    if (browser) await browser.close();
    vite.kill('SIGTERM');
  }

  console.log(`\n${results.ok ? 'SMOKE OK' : 'SMOKE CON FALLOS'} (${results.checks.filter((c) => c.pass).length}/${results.checks.length})`);
  process.exit(results.ok ? 0 : 1);
}

main();
