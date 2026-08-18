import { chromium } from 'playwright';
import fs from 'fs';

const CHROMIUM = '/nix/store/91whh0q5kgqi804ckhqmb4z1a1wx8x3j-chromium-151.0.7922.71/bin/chromium';
const URL = 'http://localhost:5199/';
const USER = 'admin';
const PASS = 'GuatocAdmin2026!';
const OUT = '/home/kortux/Workspace/chagra/_gate/compai-interino';
const VIDEO_DIR = `${OUT}/video-raw`;
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

const browser = await chromium.launch({
  executablePath: CHROMIUM,
  headless: false,
  args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--window-size=1400,1000'],
});
const ctx = await browser.newContext({
  serviceWorkers: 'block',
  deviceScaleFactor: 2,
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'no-preference',
  recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 900 } },
});
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => log('goto err:', e.message));
await page.waitForTimeout(2000);

const userSel = 'input[type="text"], input[name*="user" i], input[placeholder*="suario" i], input[autocomplete="username"]';
const passSel = 'input[type="password"]';
try {
  await page.waitForSelector(passSel, { timeout: 8000 });
  await page.fill(userSel, USER, { timeout: 5000 });
  await page.fill(passSel, PASS, { timeout: 5000 });
  await page.click('button:has-text("Ingresar"), button:has-text("Entrar"), button[type="submit"]', { timeout: 5000 });
  log('logged in');
} catch (e) { log('login note:', e.message); }
await page.waitForTimeout(4000);

await page.evaluate(() => {
  localStorage.setItem('chagra:agent-avatar-type', 'jaguar');
  localStorage.setItem('compai:companero', 'jaguar');
  localStorage.setItem('guatoc.guia', 'jaguar');
});
await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 }).catch((e) => log('reload err:', e.message));
await page.waitForTimeout(3000);

// Wiggle the mouse periodically to defeat the inactivity/idle dim overlay so the
// recording shows the compai clearly, without ever touching the compai itself.
await page.mouse.move(50, 50);

const bubble = page.locator('[data-testid="compai-bubble"]');
await bubble.first().waitFor({ state: 'visible', timeout: 12000 }).catch((e) => log('bubble wait err:', e.message));
log('bubble visible, recording ~18s (idle breathing + walking cycle)...');

// Record ~18s total: covers idle (breathing/blink/tail) + at least one full
// roam walk (ARRANQUE_MS 900ms + ~11s at 34px/s over up to 384px) + a stop
// with the burbuja. Nudge mouse every few seconds (far from the compai,
// top-left) to keep the idle-dim overlay from covering the shot.
for (let i = 0; i < 9; i++) {
  await page.waitForTimeout(2000);
  await page.mouse.move(50 + (i % 2) * 10, 50);
}

const estado = await page.evaluate(() => {
  const el = document.querySelector('[data-agt-estado]');
  return el ? el.getAttribute('data-agt-estado') : null;
});
log('last data-agt-estado seen:', estado);

await page.close();
await ctx.close();
await browser.close();

// Find the produced video file and rename it predictably.
const files = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith('.webm'));
log('video files:', files);
if (files.length) {
  const src = `${VIDEO_DIR}/${files[0]}`;
  const dst = `${OUT}/compai-jaguar-roam.webm`;
  fs.copyFileSync(src, dst);
  log('copied to', dst);
}
log('DONE');
