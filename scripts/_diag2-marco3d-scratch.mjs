import { chromium } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';
const USER = 'diag2-valle-marco';

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
    const result = await authMod.authenticateUser(username, 'diag2-pwd');
    if (!result.success) throw new Error('login mock failed');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

import { execSync } from 'node:child_process';
function detectChromiumPath() { try { const w = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim(); if (w) return w; } catch {} return undefined; }
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: detectChromiumPath() });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const failedReqs = [];
page.on('requestfailed', (req) => failedReqs.push(`${req.url()} :: ${req.failure()?.errorText}`));
page.on('response', (res) => {
  if (res.url().includes('/valle/') && res.status() >= 400) failedReqs.push(`${res.status()} ${res.url()}`);
});

await seedSession(page, true);
await mockBackend(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await login(page);
await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle').catch(() => {});
const iframeHandle = await page.waitForSelector('[data-testid="valle-marco-screen"] iframe', { timeout: 10000 });
const frame = await iframeHandle.contentFrame();
await page.waitForTimeout(8000);

const state = await frame.evaluate(() => ({
  readyState: document.readyState,
  title: document.title,
  bodyLen: document.body ? document.body.innerHTML.length : -1,
  bodyPreview: document.body ? document.body.innerHTML.slice(0, 500) : '',
  scripts: Array.from(document.querySelectorAll('script')).map((s) => s.src || '(inline)'),
})).catch((e) => ({ error: String(e) }));
console.log('--- frame state ---', JSON.stringify(state, null, 2));
console.log('--- failed/4xx/5xx requests touching /valle/ ---');
for (const f of failedReqs) console.log(f);

await context.close();
await browser.close();
