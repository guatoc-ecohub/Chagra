import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { exigirPantallaViva, esperarMaquinaSola } from './herramientas/gate-pantalla.mjs';

const baseUrl = process.env.MERCADO_URL || 'http://127.0.0.1:4173/mercado.html';
const outPrefix = process.env.MERCADO_OUT || './_gate/mercado-codex';
const waitUntil = process.env.MERCADO_WAIT_UNTIL || 'networkidle';
const readySelector = process.env.MERCADO_SELECTOR || null;
const chromiumPath = process.env.SHOT3D_CHROMIUM || execFileSync('sh', ['-c', 'command -v chromium || true'], { encoding: 'utf8' }).trim();
const chromiumCount = () => {
  try {
    return execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim();
  } catch {
    return '0';
  }
};

await exigirPantallaViva({ medirFps: false });
const maquinaSola = await esperarMaquinaSola({ maxEspera: 5000 });
console.log(`maquina_sola=${maquinaSola} chromium=${chromiumCount()}`);

const browser = await chromium.launch({
  executablePath: chromiumPath || undefined,
  headless: false,
  args: ['--disable-gpu-sandbox'],
});
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    const failedResponses = [];
    page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console:${message.text()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
    });
    const response = await page.goto(baseUrl, { waitUntil, timeout: 60000 });
    if (readySelector) await page.waitForSelector(readySelector, { state: 'visible', timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outPrefix}-${viewport.name}.png`, fullPage: true });
    const title = await page.title();
    const heading = await page.locator('h1').first().textContent().catch(() => null);
    const cards = await page.locator('.mrc-card').count();
    const links = await page.locator('a').evaluateAll((nodes) => nodes.map((node) => ({ text: node.textContent.trim(), href: node.href })));
    const linkChecks = await Promise.all(links.map(async (link) => {
      const linkResponse = await page.request.get(link.href);
      return { href: link.href, status: linkResponse.status(), contentType: linkResponse.headers()['content-type'] };
    }));
    console.log(JSON.stringify({ viewport: viewport.name, status: response?.status(), url: page.url(), title, heading, cards, links, linkChecks, failedResponses, errors }));
    await page.close();
  }
} finally {
  await browser.close();
}
