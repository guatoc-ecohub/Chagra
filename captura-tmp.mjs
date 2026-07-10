// Verificación EN VIVO de la pasada 2 (móvil 390x844, chromium del nix-store).
import { chromium } from 'playwright';

const BASE = 'http://localhost:4823/#/mockups/montana-mundos-cine';
const OUT = '/tmp/claude-1000/-home-kortux-Workspace-chagra/93695a3d-dc16-45f5-8c0e-608e6e767ffd/scratchpad';

const browser = await chromium.launch({ executablePath: '/run/current-system/sw/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
// Anti falso-pass: el mockup debe montar de verdad.
await page.waitForSelector('.mm2', { timeout: 15000 });
await page.waitForSelector('[data-testid="mm2-mundo-agente"]', { timeout: 15000 });
console.log('MONTADO: .mm2 presente');

const capas = await page.$$eval('.mm2-capa', (els) => els.map((e) => e.className.replace('mm2-capa ', '')));
console.log('CAPAS:', capas.join(' | '));

await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/p2-1-naturalista-finca.png` });

await page.click('[data-testid="mm2-dir-biopunk"]');
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/p2-2-biopunk-finca.png` });

await page.click('[data-testid="mm2-dir-verde"]');
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/p2-3-verde-finca.png` });

// Zoom-out a la montaña completa (naturalista)
await page.click('[data-testid="mm2-dir-naturalista"]');
await page.waitForTimeout(600);
await page.click('[data-testid="mm2-zoom-toggle"]');
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/p2-4-naturalista-montana.png` });

// Volver a la finca y caminar al páramo (grade + parallax)
await page.click('[data-testid="mm2-zoom-toggle"]');
await page.waitForTimeout(1200);
await page.click('[data-testid="mm2-paso-arriba"]');
await page.waitForTimeout(500);
await page.click('[data-testid="mm2-paso-arriba"]');
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/p2-5-naturalista-paramo.png` });

// Bajar al río (extremo inferior del viaje)
for (let i = 0; i < 4; i++) { await page.click('[data-testid="mm2-paso-abajo"]'); await page.waitForTimeout(420); }
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/p2-6-naturalista-rio.png` });

const brujula = await page.textContent('[data-testid="mm2-brujula"]');
console.log('BRUJULA-FINAL:', brujula);

await browser.close();
console.log('OK capturas');
