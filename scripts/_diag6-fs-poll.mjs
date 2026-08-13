import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
function detectChromiumPath() { try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {} return undefined; }

const ORIGIN = 'http://localhost:5173';
const USER = 'diag6-fs-poll';

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 't', refresh_token: 'r', token_type: 'Bearer', expires_in: 3600 }) }));
  const emptyJsonApi = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) => route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: emptyJsonApi }));
  }
  await page.context().route('**/fincas-publicas.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
}
async function seedSession(page, marco3d) {
  await page.addInitScript(({ username, marco3dPref }) => {
    window.localStorage.setItem('chagra:active_tenant_id', username);
    const profile = { rol: 'operador', vocacion: 'mixta', finca_tipo: 'integral', nivel_respuestas: 'detallado', marco3d: marco3dPref };
    window.localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    window.localStorage.setItem(`chagra:profile:v1:${username}`, JSON.stringify(profile));
  }, { username: USER, marco3dPref: marco3d });
}
async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'diag6-pwd');
    if (!result.success) throw new Error('login mock failed');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: detectChromiumPath() });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const fsEvents = [];
await page.exposeFunction('__reportFs', (v) => fsEvents.push(`${Date.now()}: fullscreenElement=${v}`));
await page.addInitScript(() => {
  document.addEventListener('fullscreenchange', () => {
    window.__reportFs(document.fullscreenElement ? document.fullscreenElement.tagName : 'null');
  });
});

await seedSession(page, true);
await mockBackend(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await login(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="valle-marco-screen"]', { timeout: 20000 });
await page.waitForTimeout(20000);

console.log('--- fullscreenchange events over 20s ---');
for (const e of fsEvents) console.log(e);
console.log('--- total events:', fsEvents.length);

const at = await page.evaluate(() => {
  const el = document.elementFromPoint(30, 25);
  return el ? el.tagName + (el.dataset?.testid ? `[${el.dataset.testid}]` : '') : null;
});
console.log('--- elementAtPoint(30,25) after 20s ---', at);

await context.close();
await browser.close();
