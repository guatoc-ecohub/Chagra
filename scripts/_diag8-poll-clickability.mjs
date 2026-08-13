import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
function detectChromiumPath() { try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {} return undefined; }

const ORIGIN = 'http://localhost:5173';
const USER = 'diag8-poll';

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
    const result = await authMod.authenticateUser(username, 'diag8-pwd');
    if (!result.success) throw new Error('login mock failed');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: detectChromiumPath() });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await seedSession(page, true);
await mockBackend(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await login(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="valle-marco-screen"]', { timeout: 20000 });

for (let i = 0; i < 40; i++) {
  const state = await page.evaluate(() => {
    const el = document.elementFromPoint(30, 25);
    return {
      at: el ? el.tagName + (el.dataset?.testid ? `[${el.dataset.testid}]` : '') : null,
      fs: document.fullscreenElement ? document.fullscreenElement.tagName : null,
    };
  }).catch((e) => ({ error: String(e) }));
  console.log(`t=${i * 500}ms`, JSON.stringify(state));
  await page.waitForTimeout(500);
}

await context.close();
await browser.close();
