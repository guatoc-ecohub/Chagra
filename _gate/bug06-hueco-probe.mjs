import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import {
  ENTORNO_X,
  exigirPantallaViva,
  esperarMaquinaSola,
} from '/home/kortux/Workspace/Chagra-strategy/ops/herramientas/gate-pantalla.mjs';

const URL = process.env.PROBE_URL || 'https://chagra-dev.guatoc.co/';
const OUT = process.env.PROBE_OUT || '_gate/bug06-runs.json';
const CREDS = process.env.PROBE_CREDS || '/home/kortux/.config/chagra-demo-creds.env';
const RUNS = Number(process.env.PROBE_RUNS || 3);
const ANSWER_TIMEOUT = Number(process.env.PROBE_ANSWER_TIMEOUT || 180000);
const QUERY = process.env.PROBE_QUERY || '¿Cómo manejo la roya del café de forma agroecológica?';
const CONTROL_QUERY = 'control conocido de tomate';
const CHROMIUM = process.env.PROBE_CHROMIUM || '/home/kortux/.local/bin/chromium';

function parseEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) out[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
  return out;
}

function chromiumCount() {
  try {
    return Number(execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim());
  } catch {
    return 0;
  }
}

function now() {
  return Date.now();
}

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return String(raw).slice(0, 240);
  }
}

function sseBody(text = 'Control conocido') {
  const one = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }], model: 'control-known' })}\n\n`;
  return `${one}data: ${JSON.stringify({ choices: [{ delta: {} }], model: 'control-known', choices2: [] })}\n\ndata: [DONE]\n\n`;
}

async function main() {
  const screenKnown = await exigirPantallaViva({ medirFps: false });
  const machineAlone = await esperarMaquinaSola({ maxEspera: 1000, umbral: 0 });
  const env = parseEnv(CREDS);
  if (!env.CHAGRA_USER || !env.CHAGRA_PASS) throw new Error('Credenciales de sonda ausentes');

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fetchInit = `
    (() => {
      const originalFetch = window.fetch.bind(window);
      window.__bug06 = { fetches: [], marks: [] };
      const mark = (name, detail = {}) => {
        const item = { name, t: performance.now(), ...detail };
        window.__bug06.marks.push(item);
        performance.mark('bug06:' + name);
      };
      window.__bug06.mark = mark;
      window.fetch = async (...args) => {
        const input = args[0];
        const rawUrl = typeof input === 'string' ? input : (input?.url || String(input));
        const item = { url: rawUrl.split('?')[0], start: performance.now() };
        window.__bug06.fetches.push(item);
        try {
          const response = await originalFetch(...args);
          item.headers = performance.now();
          item.status = response.status;
          return response;
        } catch (error) {
          item.error = String(error?.message || error);
          item.headers = performance.now();
          throw error;
        }
      };
    })();
  `;
  await context.addInitScript({ content: fetchInit });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  const trace = [];
  const requests = new Map();
  const consoleLines = [];
  const pageErrors = [];
  const requestFailures = [];
  const cdpT0 = now();
  const record = (item) => trace.push({ wall: now() - cdpT0, ...item });

  cdp.on('Network.requestWillBeSent', (event) => {
    const item = { id: event.requestId, url: safeUrl(event.request.url), method: event.request.method, start: now() - cdpT0 };
    requests.set(event.requestId, item);
    if (/oauth|ollama|embeddings|chat\/completions|\/nlu|resolve-entities|guard|subgrafo|multihop|cycle-content|rag-embeddings/.test(event.request.url)) record({ kind: 'request', ...item });
  });
  cdp.on('Network.responseReceived', (event) => {
    const item = requests.get(event.requestId);
    if (!item) return;
    item.headers = now() - cdpT0;
    item.status = event.response.status;
    if (/oauth|ollama|embeddings|chat\/completions|\/nlu|resolve-entities|guard|subgrafo|multihop|cycle-content|rag-embeddings/.test(item.url)) record({ kind: 'headers', id: item.id, url: item.url, status: item.status, t: item.headers });
  });
  cdp.on('Network.dataReceived', (event) => {
    const item = requests.get(event.requestId);
    if (!item) return;
    if (item.firstData == null) {
      item.firstData = now() - cdpT0;
      if (/ollama|chat\/completions|\/nlu|resolve-entities|guard|subgrafo|multihop/.test(item.url)) record({ kind: 'firstData', id: item.id, url: item.url, t: item.firstData });
    }
  });
  cdp.on('Network.loadingFailed', (event) => {
    const item = requests.get(event.requestId);
    requestFailures.push({ url: item?.url || '', error: event.errorText, blocked: event.blockedReason || null });
  });
  page.on('console', (message) => {
    const text = message.text();
    if (/\[Agent\]|\[sidecar\]|\[RAG\]|\[Auth\]|login|grounding|ollama/i.test(text)) {
      consoleLines.push({ t: now() - cdpT0, type: message.type(), text: text.slice(0, 500) });
    }
  });
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error).slice(0, 500)));

  const browserStart = now();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#login-username', { timeout: 60000 });
  await page.fill('#login-username', env.CHAGRA_USER);
  await page.fill('#login-password', env.CHAGRA_PASS);
  await page.click('button[type="submit"]');
  const loginOk = await page.waitForFunction(() => !document.querySelector('#login-username'), { timeout: 90000 }).then(() => true).catch(() => false);
  record({ kind: 'login.ok', ok: loginOk, t: now() - browserStart });
  if (!loginOk) throw new Error('login.ok=false');

  const onboarding = await page.locator('[data-testid="onb2-saltar-todo"]').first().isVisible().catch(() => false);
  if (onboarding) {
    await page.locator('[data-testid="onb2-saltar-todo"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  await page.goto(`${URL}#agente`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const agentOpened = await page.waitForSelector('[data-testid="agent-submit"]', { timeout: 90000 }).then(() => true).catch(() => false);
  record({ kind: 'agentOpened', ok: agentOpened, t: now() - browserStart });
  if (!agentOpened) throw new Error('agentOpened=false');

  const submitAndCollect = async (query, kind) => {
    const startWall = now();
    await page.locator('textarea').fill(query).catch(async () => {
      await page.locator('input[type="text"]').last().fill(query);
    });
    const before = await page.evaluate(() => ({
      marks: window.__bug06?.marks?.length || 0,
      fetches: window.__bug06?.fetches?.length || 0,
    }));
    await page.locator('[data-testid="agent-submit"]').click();
    const submitAt = now();
    const responseOk = await page.waitForFunction(() => {
      const nodes = Array.from(document.querySelectorAll('[class*="whitespace-pre-wrap"]'));
      return nodes.some((node) => (node.textContent || '').trim().length > 20);
    }, { timeout: ANSWER_TIMEOUT }).then(() => true).catch(() => false);
    const after = await page.evaluate(() => ({
      marks: window.__bug06?.marks || [],
      fetches: window.__bug06?.fetches || [],
      body: (document.body?.innerText || '').slice(-800),
    }));
    const recentFetches = after.fetches.slice(before.fetches);
    const recentMarks = after.marks.slice(before.marks);
    return {
      kind,
      query: kind === 'control' ? query : '<redacted>',
      responseOk,
      submitMs: submitAt - startWall,
      firstFetch: recentFetches[0] || null,
      fetches: recentFetches.map((f) => ({ url: f.url, start: Math.round(f.start), headers: f.headers == null ? null : Math.round(f.headers), status: f.status || null, error: f.error || null })),
      marks: recentMarks.map((m) => ({ name: m.name, t: Math.round(m.t), detail: m.detail || null })),
      bodyTail: kind === 'control' ? after.body : '',
      traceStart: startWall - cdpT0,
      traceEnd: now() - cdpT0,
    };
  };

  const controlRoute = await page.route('**/api/ollama/v1/chat/completions', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody() });
  });
  void controlRoute;
  const control = await submitAndCollect(CONTROL_QUERY, 'control');
  await page.unroute('**/api/ollama/v1/chat/completions');

  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    if (i > 0) await page.waitForTimeout(3000);
    runs.push(await submitAndCollect(QUERY, `real-${i + 1}`));
  }

  const browserState = await page.evaluate(() => ({ url: location.href, title: document.title }));
  mkdirSync(OUT.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  const output = {
    task: 'DC-BUG06-hueco-primer-token-20260906',
    url: URL,
    startedAt: new Date(cdpT0).toISOString(),
    gate: { screenKnown, machineAlone, chromiumBefore: chromiumCount(), entornoX: ENTORNO_X },
    login: { ok: loginOk },
    agentOpened,
    control,
    runs,
    browserState,
    trace: trace.slice(0, 1000),
    consoleLines: consoleLines.slice(-200),
    pageErrors,
    requestFailures,
  };
  writeFileSync(OUT, JSON.stringify(output, null, 2));
  console.log(JSON.stringify({
    wrote: OUT,
    login: { ok: loginOk },
    agentOpened,
    gate: output.gate,
    control: { responseOk: control.responseOk, fetches: control.fetches.length },
    runs: runs.map((run) => ({ kind: run.kind, responseOk: run.responseOk, fetches: run.fetches.length })),
    pageErrors: pageErrors.length,
    requestFailures: requestFailures.length,
  }));
  await browser.close();
}

main().catch((error) => {
  console.error(JSON.stringify({ fatal: String(error?.message || error), login: 'not verified', agentOpened: 'not verified' }));
  process.exitCode = 1;
});
