/**
 * train-model.mjs — entrena el modelo "hola chagra" (MODO CAMPO, #2088)
 * CENTRALMENTE con el dataset sintético de generate-samples.mjs, mide
 * precisión held-out y exporta los EJEMPLOS entrenables (no el modelo
 * completo — ver nota en train-harness.html sobre por qué) a
 * public/models/hola-chagra/{examples.bin,metadata.json}.
 *
 * Corre Chromium HEADED sobre el DISPLAY real (headless throttlea audio/rAF,
 * de-riskeado en spikes/wake-word/verify-headless.mjs) contra un servidor
 * estático que sirve el repo desde la RAÍZ — así /vendor/... y /models/...
 * resuelven exactamente igual que en producción.
 *
 * Uso:  DISPLAY=:0 node scripts/wake-word/train-model.mjs
 * Requiere: scripts/wake-word/samples/manifest.json (generate-samples.mjs).
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import http from 'node:http';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '..', '..');
const SAMPLES_DIR = join(__dir, 'samples');
const OUT_DIR = join(REPO_ROOT, 'public', 'models', 'hola-chagra');

const WAKE_WORD = 'hola chagra';
const WAKE_THRESHOLD = 0.9; // debe calzar con WAKE_THRESHOLD de src/services/wakeWordService.js
const EPOCHS = 40;

const MIME = {
  '.js': 'application/javascript', '.json': 'application/json',
  '.html': 'text/html', '.wav': 'audio/wav',
};

function detectChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  try {
    const p = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (p) return p;
  } catch { /* ignore */ }
  return undefined;
}

// El harness vive en scripts/ (fuera del build, no se shippea); los assets
// self-hosted (/vendor/*, /models/*) viven en public/ (raíz real de Vite en
// prod). Servimos AMBOS bajo el mismo puerto para que las rutas relativas
// del harness (/vendor/..., /models/...) resuelvan EXACTAMENTE igual que en
// producción, sin mover el harness dentro de public/.
function startStaticServer(repoRoot) {
  const publicRoot = join(repoRoot, 'public');
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        // Sanitizar URL: prevenir path traversal y log injection
        const rawUrl = req.url.split('?')[0];
        const sanitizedUrl = rawUrl.replace(/[^\w\-./~]/g, ''); // Solo caracteres seguros
        const urlPath = decodeURIComponent(sanitizedUrl);

        // Validar que no contenga path traversal
        if (urlPath.includes('..')) {
          console.error('[static 403] Potencial path traversal:', urlPath.replace(/[^\w\-./]/g, '_'));
          res.writeHead(403);
          res.end('forbidden');
          return;
        }

        const roots = urlPath.startsWith('/scripts/') ? [repoRoot] : [publicRoot, repoRoot];
        for (const root of roots) {
          try {
            const filePath = join(root, urlPath);
            // Validación adicional: asegurar que el archivo está dentro del root
            const resolvedPath = filePath;
            if (!resolvedPath.startsWith(root)) continue;

            // Validar extensión del archivo (solo servir tipos seguros)
            const ext = extname(filePath);
            if (!MIME[ext]) {
              console.error('[static 403] Extensión no permitida:', ext);
              res.writeHead(403);
              res.end('forbidden');
              return;
            }

            const data = readFileSync(filePath);
            const ct = MIME[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
            res.end(data);
            return;
          } catch { /* probar el siguiente root */ }
        }
        // Log seguro - sanitizar la URL antes de logear
        console.error('[static 404]', urlPath.replace(/[^\w\-./]/g, '_'));
        res.writeHead(404);
        res.end('not found');
      } catch (error) {
        console.error('[static server error]', error.message);
        res.writeHead(500);
        res.end('server error');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT tras ${ms}ms: ${label}`)), ms)),
  ]);
}

function wavToBase64(relPath) {
  const buf = readFileSync(join(SAMPLES_DIR, relPath));
  return buf.toString('base64');
}

async function main() {
  if (!existsSync(join(SAMPLES_DIR, 'manifest.json'))) {
    console.error('Falta scripts/wake-word/samples/manifest.json — corre generate-samples.mjs primero.');
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(join(SAMPLES_DIR, 'manifest.json'), 'utf8'));
  const training = manifest.filter((m) => !m.holdout);
  const holdout = manifest.filter((m) => m.holdout);
  console.log(`Dataset: ${manifest.length} muestras (${training.length} train / ${holdout.length} held-out)`);

  const server = await startStaticServer(REPO_ROOT);
  const port = server.address().port;
  console.log(`Servidor estático en http://127.0.0.1:${port} (raíz: ${REPO_ROOT})`);

  const chromiumPath = detectChromiumPath();
  const browser = await chromium.launch({
    executablePath: chromiumPath,
    headless: false, // headless throttlea audio/rAF — correr HEADED sobre Xvfb/DISPLAY real
    args: [
      '--no-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console.error]', m.text()); });

  const report = {
    ts: new Date().toISOString(),
    dataset: { total: manifest.length, train: training.length, holdout: holdout.length },
    caveat: 'Dataset 100% SINTÉTICO (Kokoro TTS + variaciones ffmpeg de velocidad/tono + ruido ' +
      'sintético). Valida el PIPELINE end-to-end y da una cota honesta de precisión sobre voces ' +
      'de máquina; NO reemplaza la validación con voz real de campo — ver "Enséñale tu voz" ' +
      '(enrollment) como fallback/ajuste fino cuando el modelo base sintético no calza con el ' +
      'acento/tono real del operador.',
  };

  try {
    await page.goto(`http://127.0.0.1:${port}/scripts/wake-word/train-harness.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.tf && window.speechCommands, { timeout: 20000 });

    console.log('Cargando modelo base…');
    const tLoad0 = Date.now();
    await page.evaluate(() => window.trainAPI.loadBase());
    report.load_ms = Date.now() - tLoad0;
    console.log(`  base cargado en ${report.load_ms} ms`);

    console.log(`Recolectando ${training.length} ejemplos de entrenamiento…`);
    const tCol0 = Date.now();
    let i = 0;
    for (const m of training) {
      i++;
      const tSample0 = Date.now();
      const b64 = wavToBase64(m.file);

      // Sanitizar label para prevenir XSS - solo permitir caracteres alfanuméricos básicos
      const sanitizedLabel = String(m.label).replace(/[^\w\s-áéíóúñü]/g, '').slice(0, 50);

      await withTimeout(
        page.evaluate(({ label, b64 }) => window.trainAPI.collectFromBase64(label, b64), {
          label: sanitizedLabel,
          b64
        }),
        20000,
        `collectFromBase64(${sanitizedLabel} / ${m.file})`,
      );
      console.log(`  [${i}/${training.length}] ${m.label.padEnd(16)} ${m.file} — ${Date.now() - tSample0}ms`);
    }
    report.collect_ms = Date.now() - tCol0;
    report.counts = await page.evaluate(() => window.trainAPI.counts());
    console.log(`  recolectado en ${report.collect_ms} ms:`, report.counts);

    console.log(`Entrenando (${EPOCHS} epochs)…`);
    const tTr0 = Date.now();
    const trainResult = await page.evaluate((epochs) => window.trainAPI.train(epochs), EPOCHS);
    report.train_ms = Date.now() - tTr0;
    report.epochs = EPOCHS;
    report.wordLabels = trainResult.words;
    report.finalLoss = trainResult.history.loss.at(-1);
    report.finalAcc = trainResult.history.acc.at(-1);
    console.log(`  entrenado en ${report.train_ms} ms — loss=${report.finalLoss?.toFixed(4)} acc=${report.finalAcc?.toFixed(4)}`);
    console.log('  wordLabels (orden real, alfabético):', trainResult.words);

    console.log(`Evaluando ${holdout.length} muestras HELD-OUT (no vistas en el entrenamiento)…`);
    const evalRows = [];
    for (const m of holdout) {
      const b64 = wavToBase64(m.file);
      // Ventana generosa (4s, loopeada): un clip de ~1s cabe varias veces con
      // distintas fases de alineación contra las ventanas de inferencia
      // (~560ms/frame, overlap 0.5) — 2.2s de-riskeó falsos NEGATIVOS por
      // desalineación de fase del loop, no por calidad real del modelo.
      const r = await page.evaluate(
        ({ b64, label }) => window.trainAPI.evalClip(b64, label, 4000),
        { b64, label: WAKE_WORD },
      );
      const isPos = m.label === WAKE_WORD;
      const predictedWake = r.maxScore >= WAKE_THRESHOLD;
      const correct = isPos ? predictedWake : !predictedWake;
      evalRows.push({ file: m.file, trueLabel: m.label, maxWakeScore: r.maxScore, predictedWake, correct });
      console.log(`  [${correct ? 'OK' : 'FALLO'}] ${m.label.padEnd(20)} score=${r.maxScore.toFixed(3)} → ${predictedWake ? 'WAKE' : 'no-wake'}`);
    }
    const tp = evalRows.filter((r) => r.trueLabel === WAKE_WORD && r.predictedWake).length;
    const fn = evalRows.filter((r) => r.trueLabel === WAKE_WORD && !r.predictedWake).length;
    const fp = evalRows.filter((r) => r.trueLabel !== WAKE_WORD && r.predictedWake).length;
    const tn = evalRows.filter((r) => r.trueLabel !== WAKE_WORD && !r.predictedWake).length;
    const accuracy = (tp + tn) / evalRows.length;
    report.heldOutEval = {
      threshold: WAKE_THRESHOLD, tp, fn, fp, tn, accuracy,
      precision: tp + fp > 0 ? tp / (tp + fp) : null,
      recall: tp + fn > 0 ? tp / (tp + fn) : null,
      rows: evalRows,
    };
    console.log(`Held-out: accuracy=${(accuracy * 100).toFixed(1)}% (tp=${tp} fn=${fn} fp=${fp} tn=${tn})`);

    console.log('Serializando ejemplos entrenables para shippear…');
    const examplesBase64 = await page.evaluate(() => window.trainAPI.serializeExamplesBase64());
    mkdirSync(OUT_DIR, { recursive: true });
    const examplesBuf = Buffer.from(examplesBase64, 'base64');
    writeFileSync(join(OUT_DIR, 'examples.bin'), examplesBuf);
    report.examplesBytesTotal = examplesBuf.length;
    report.examplesBytesTrainOnly = examplesBuf.length; // (todas las labels entrenadas; sin held-out)
    console.log(`  examples.bin: ${(examplesBuf.length / 1024).toFixed(1)} KB`);

    report.ok = report.heldOutEval.accuracy >= 0.7; // umbral mínimo honesto para el pipeline sintético
  } catch (e) {
    report.error = e.message;
    report.ok = false;
    console.error('ERROR:', e);
  } finally {
    await browser.close();
    server.close();
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'metadata.json'), JSON.stringify(report, null, 2));
  console.log(`\nmetadata.json escrito en ${join(OUT_DIR, 'metadata.json')}`);
  console.log(report.ok ? 'ENTRENAMIENTO OK' : 'ENTRENAMIENTO CON PROBLEMAS — revisar metadata.json');
  process.exit(report.ok ? 0 : 1);
}

main();
