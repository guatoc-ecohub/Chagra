import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
function detectChromiumPath() { try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {} return undefined; }

const ORIGIN = 'http://localhost:5173';
const USER = 'diag7-after-exit';

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
    const result = await authMod.authenticateUser(username, 'diag7-pwd');
    if (!result.success) throw new Error('login mock failed');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: detectChromiumPath() });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const events = [];
page.on('console', (msg) => events.push(`[console:${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => events.push(`[pageerror] ${err.message}\n${err.stack || ''}`));
page.on('requestfailed', (req) => events.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`));

await seedSession(page, true);
await mockBackend(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await login(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="valle-marco-screen"]', { timeout: 20000 });
await page.waitForTimeout(3000);

console.log('=== clicking exit ===');
const markerIdx = events.length;
await page.getByTestId('valle-marco-salir').click();
await page.waitForTimeout(25000);

console.log('=== events since click ===');
for (const e of events.slice(markerIdx)) console.log(e);

const pendingReqs = await page.evaluate(() => performance.getEntriesByType('resource')
  .filter((r) => !r.responseEnd || r.responseEnd === 0)
  .map((r) => r.name));
console.log('=== possibly pending (no responseEnd) ===', JSON.stringify(pendingReqs.slice(-30), null, 2));

const marcoCount = await page.getByTestId('valle-marco-screen').count();
console.log('=== marco count after 25s ===', marcoCount);

await context.close();
await browser.close();
