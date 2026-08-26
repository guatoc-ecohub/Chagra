import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { exigirPantallaViva, esperarMaquinaSola } from './herramientas/gate-pantalla.mjs';

const root = new URL('.', import.meta.url).pathname;
const outRoot = join(root, 'compai-life');
const baseUrl = process.env.GATE_URL || 'http://127.0.0.1:5388/_gate/compai-life-gate.html';
const seeds = ['20260807', '20260808', '20260809'];
const distances = [
  { id: 'cerca', size: 420 },
  { id: 'plano-medio', size: 300 },
  { id: 'amplia', size: 180 },
];
const species = ['zariguya', 'luciernaga', 'oso', 'chivito', 'jaguar', 'guacamaya', 'maiz'];
let colorMethod = 'identify';

try {
  execFileSync('identify', ['-version'], { stdio: 'ignore' });
} catch {
  colorMethod = 'sharp-fallback';
  console.warn('[compai-life] identify no está disponible; cuento colores RGBA con sharp como fallback explícito.');
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contarChromium() {
  try {
    return Number(execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim());
  } catch (error) {
    if (error.status === 1 && String(error.stdout).trim() === '0') return 0;
    throw error;
  }
}

async function contarColores(path) {
  if (colorMethod === 'identify') {
    try {
      return Number(execFileSync('identify', ['-format', '%k', path], { encoding: 'utf8' }).trim());
    } catch (error) {
      console.error(`[compai-life] NO PUDE MEDIR con identify en ${path}: ${error.message}`);
      return null;
    }
  }

  try {
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const colores = new Set();
    for (let offset = 0; offset < data.length; offset += info.channels) {
      colores.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`);
    }
    return colores.size;
  } catch (error) {
    console.error(`[compai-life] NO PUDE MEDIR colores con sharp en ${path}: ${error.message}`);
    return null;
  }
}

async function calentarVite() {
  const estados = [];
  for (let intento = 0; intento < 3; intento += 1) {
    try {
      const respuesta = await fetch(baseUrl);
      estados.push(respuesta.status);
    } catch (error) {
      estados.push(`error:${error.code || error.message}`);
    }
    if (intento < 2) await esperar(2000);
  }
  console.log(JSON.stringify({ viteWarmup: estados }));
}

async function abrirGate(page, slug, size, seed) {
  const url = `${baseUrl}?species=${slug}&size=${size}&seed=${seed}`;
  let respuesta;
  for (let intento = 0; intento < 3; intento += 1) {
    respuesta = await page.goto(url, { waitUntil: 'networkidle' });
    if (respuesta && respuesta.status() !== 504) break;
    await esperar(2000);
  }
  if (!respuesta || respuesta.status() >= 400) {
    throw new Error(`La página no cargó para ${slug}/${size}/${seed}: HTTP ${respuesta?.status() ?? 'sin respuesta'}`);
  }
  await esperar(1400);
}

async function capturaEstable(page, path) {
  if (process.env.GATE_REUSE === '1' && existsSync(path)) return contarColores(path);
  for (let i = 0; i < 3; i += 1) {
    await page.screenshot({ path: `${path}.discard-${i}.png` });
    await esperar(120);
  }
  await page.screenshot({ path });
  return contarColores(path);
}

async function diagnosticarImagenes(page) {
  return page.locator('img').evaluateAll((images) => images
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.getAttribute('src') || '(img sin src)'));
}

await exigirPantallaViva({ medirFps: false });
const maquinaSola = await esperarMaquinaSola({ maxEspera: 5000, umbral: 0 });
const chromiumCount = contarChromium();
console.log(JSON.stringify({ pantalla: 'VIVO_O_NO_MEDIBLE', maquinaSola, chromium: chromiumCount, colorMethod }));

await calentarVite();
const browser = await chromium.launch({
  headless: false,
  executablePath: '/home/kortux/.local/bin/chromium',
});
const page = await browser.newPage({ viewport: { width: 560, height: 560 }, deviceScaleFactor: 1 });
const summary = [];

for (const slug of species) {
  for (const distance of distances) {
    const comboDir = join(outRoot, slug, distance.id);
    mkdirSync(comboDir, { recursive: true });
    await abrirGate(page, slug, distance.size, seeds[0]);
    const capture = join(comboDir, `${slug}-${distance.id}.png`);
    const colors = await capturaEstable(page, capture);
    const brokenImages = await diagnosticarImagenes(page);
    const seedSamples = [];
    for (const seed of seeds) {
      await abrirGate(page, slug, distance.size, seed);
      const path = join(comboDir, `seed-${seed}.png`);
      const seedColors = await capturaEstable(page, path);
      const seedBrokenImages = await diagnosticarImagenes(page);
      seedSamples.push({
        seed,
        file: path,
        colors: seedColors,
        brokenImages: seedBrokenImages,
        pass: seedColors !== null && seedColors > 100 && seedBrokenImages.length === 0,
      });
    }
    summary.push({
      slug,
      distance: distance.id,
      size: distance.size,
      colors,
      brokenImages,
      pass: colors !== null && colors > 100 && brokenImages.length === 0,
      seedSamples,
    });
  }
}

await browser.close();
const flat = summary.filter((row) => !row.pass || row.seedSamples.some((sample) => !sample.pass));
console.log(JSON.stringify({ summary, flat }, null, 2));
if (flat.length > 0) process.exitCode = 3;
