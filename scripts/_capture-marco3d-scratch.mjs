import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';

function detectChromiumPath() {
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {}
  try {
    const nixResult = execSync(
      "nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1",
      { encoding: 'utf8' },
    ).trim();
    if (nixResult && nixResult.startsWith('/nix/store')) return nixResult;
  } catch {}
  return undefined;
}

const ORIGIN = 'http://localhost:5173';
const USER = 'shot-valle-marco';

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'shot-token',
        refresh_token: 'shot-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );
  const emptyJsonApi = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: emptyJsonApi }),
    );
  }
  await page.context().route('**/fincas-publicas.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );
}

async function seedSession(page, marco3d) {
  await page.addInitScript(
    ({ username, marco3dPref }) => {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      const profile = {
        rol: 'operador', vocacion: 'mixta', finca_tipo: 'integral', nivel_respuestas: 'detallado',
        marco3d: marco3dPref,
      };
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
      window.localStorage.setItem(`chagra:profile:v1:${username}`, JSON.stringify(profile));
    },
    { username: USER, marco3dPref: marco3d },
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'shot-pwd');
    if (!result.success) throw new Error('login mock failed');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  executablePath: detectChromiumPath(),
});

// 1. marco3d=false -> entrada simple
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await seedSession(page, false);
  await mockBackend(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await login(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/claude-1000/-home-kortux-Workspace/4b9d3c03-8459-4d1f-80fb-d673d10ad19a/scratchpad/marco3d-off-entrada-simple.png' });
  console.log('marco3d=false screenshot OK');
  await context.close();
}

// 2. marco3d=true -> iframe valle
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await seedSession(page, true);
  await mockBackend(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await login(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  // Espera a que el iframe cargue contenido real del valle (no solo el DOM host).
  const iframeEl = page.locator('[data-testid="valle-marco-screen"] iframe');
  await iframeEl.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/claude-1000/-home-kortux-Workspace/4b9d3c03-8459-4d1f-80fb-d673d10ad19a/scratchpad/marco3d-on-iframe-valle.png' });
  console.log('marco3d=true screenshot OK');
  await context.close();
}

await browser.close();

// Diagnóstico: ¿el iframe realmente monta three.js / crea un canvas WebGL,
// o el negro es un error silencioso? (chromium.launch() sin --headed cae a
// SwiftShader software — no es GPU real, pero sirve para diagnóstico
// funcional: JS ejecuta, canvas se crea, no hay excepción).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (msg) => logs.push(`[console:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
  page.on('frameattached', (frame) => {
    frame.on('console', (msg) => logs.push(`[iframe-console:${msg.type()}] ${msg.text()}`));
  });
  await seedSession(page, true);
  await mockBackend(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await login(page);
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const iframeHandle = await page.waitForSelector('[data-testid="valle-marco-screen"] iframe', { timeout: 10000 });
  const frame = await iframeHandle.contentFrame();
  await page.waitForTimeout(4000);
  console.log('--- iframe URL ---', frame.url());
  const canvasInfo = await frame.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    return canvases.map((c) => {
      let gl = null;
      try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { /* noop */ }
      return {
        width: c.width, height: c.height,
        hasGL: !!gl,
        glRenderer: gl ? gl.getParameter(gl.RENDERER) : null,
        glError: gl ? gl.getError() : null,
      };
    });
  }).catch((e) => ({ error: String(e) }));
  console.log('--- canvas info ---', JSON.stringify(canvasInfo, null, 2));
  console.log('--- logs (last 40) ---');
  for (const l of logs.slice(-40)) console.log(l);
  await context.close();
}
