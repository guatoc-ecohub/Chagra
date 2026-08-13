import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
function detectChromiumPath() { try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {} return undefined; }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: detectChromiumPath() });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
await page.goto('http://localhost:5173/valle/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
const info = await page.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas'));
  return {
    title: document.title,
    canvasCount: canvases.length,
    canvases: canvases.map((c) => {
      let gl = null;
      try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) {}
      return { id: c.id, width: c.width, height: c.height, hasGL: !!gl, renderer: gl ? gl.getParameter(gl.RENDERER) : null };
    }),
  };
});
console.log('--- info ---', JSON.stringify(info, null, 2));
console.log('--- logs ---');
for (const l of logs) console.log(l);
await page.screenshot({ path: '/tmp/claude-1000/-home-kortux-Workspace/4b9d3c03-8459-4d1f-80fb-d673d10ad19a/scratchpad/valle-standalone.png' });
await browser.close();
