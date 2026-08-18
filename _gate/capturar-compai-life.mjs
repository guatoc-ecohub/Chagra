import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { exigirPantallaViva, esperarMaquinaSola } from '/home/kortux/demos/3d/_gate/herramientas/gate-pantalla.mjs';

const root = new URL('.', import.meta.url).pathname;
const outRoot = join(root, 'compai-life');
const baseUrl = process.env.GATE_URL || 'http://127.0.0.1:5388/_gate/compai-life-gate.html';
const seeds = ['20260807', '20260808', '20260809'];
const distances = [
  { id: 'cerca', size: 420 },
  { id: 'plano-medio', size: 300 },
  { id: 'amplia', size: 180 },
];
const species = ['zariguya', 'luciernaga', 'oso', 'chivito'];

await exigirPantallaViva({ medirFps: false });
const sola = await esperarMaquinaSola({ maxEspera: 5000, umbral: 0 });
const chromiumCount = execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim();
console.log(JSON.stringify({ pantalla: 'VIVO', maquinaSola: sola, chromium: chromiumCount }));

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
    const seed = seeds[0];
    await page.goto(`${baseUrl}?species=${slug}&size=${distance.size}&seed=${seed}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1400);
    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: join(comboDir, `discard-${i}.png`) });
      await page.waitForTimeout(120);
    }
    const frames = 36;
    for (let i = 0; i < frames; i++) {
      await page.screenshot({ path: join(comboDir, `frame-${String(i).padStart(2, '0')}.png`) });
      await page.waitForTimeout(120);
    }
    execFileSync('ffmpeg', [
      '-nostdin', '-y', '-loglevel', 'error', '-framerate', '8',
      '-i', join(comboDir, 'frame-%02d.png'),
      '-vf', 'palettegen=stats_mode=diff', join(comboDir, 'palette.png'),
    ]);
    execFileSync('ffmpeg', [
      '-nostdin', '-y', '-loglevel', 'error', '-framerate', '8',
      '-i', join(comboDir, 'frame-%02d.png'), '-i', join(comboDir, 'palette.png'),
      '-lavfi', 'paletteuse=dither=sierra2_4a', '-loop', '0', join(comboDir, `${slug}-${distance.id}.gif`),
    ]);

    const seedSamples = [];
    for (const sampleSeed of seeds) {
      await page.goto(`${baseUrl}?species=${slug}&size=${distance.size}&seed=${sampleSeed}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1600);
      const path = join(comboDir, `seed-${sampleSeed}.png`);
      await page.screenshot({ path });
      seedSamples.push({ seed: sampleSeed, file: path });
    }
    summary.push({ slug, distance: distance.id, gif: join(comboDir, `${slug}-${distance.id}.gif`), seeds: seedSamples });
  }
}

await browser.close();
console.log(JSON.stringify({ summary }, null, 2));
