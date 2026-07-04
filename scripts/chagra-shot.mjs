#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import {
  installDeterminism,
  loginAndSeed,
  gotoScreen,
  MAIN_SCREENS,
} from '../tests/visual/visualTestUtils.js';

export const CHAGRA_SHOT_VIEWPORT = { width: 390, height: 844 };
export const DEFAULT_PROFILE_KEY = 'operador';
export const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';
export const DEFAULT_SERVER_CMD = 'dev';
export const DEFAULT_THEME = null;

const KNOWN_CHROMIUM_PATHS = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];

function resolveChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  }
  if (process.env.CI) {
    return undefined;
  }
  try {
    const which = execSync('which chromium 2>/dev/null', { encoding: 'utf8' }).trim();
    if (which) return which;
  } catch {
    // Fall through to nix-shell lookup.
  }
  for (const candidate of KNOWN_CHROMIUM_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  try {
    const nixResult = execSync("nix-shell -p chromium --run 'which chromium' 2>/dev/null | tail -1", {
      encoding: 'utf8',
      timeout: 120_000,
    }).trim();
    if (nixResult && nixResult.startsWith('/nix/store')) return nixResult;
  } catch {
    // Leave undefined and let Playwright use its bundled browser.
  }
  return undefined;
}

export function parseShotArgs(argv) {
  const out = {
    branch: null,
    screen: null,
    out: null,
    theme: DEFAULT_THEME,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--branch') {
      out.branch = argv[++i] || null;
      continue;
    }
    if (arg.startsWith('--branch=')) {
      out.branch = arg.slice('--branch='.length) || null;
      continue;
    }
    if (arg === '--screen') {
      out.screen = argv[++i] || null;
      continue;
    }
    if (arg.startsWith('--screen=')) {
      out.screen = arg.slice('--screen='.length) || null;
      continue;
    }
    if (arg === '--out') {
      out.out = argv[++i] || null;
      continue;
    }
    if (arg.startsWith('--out=')) {
      out.out = arg.slice('--out='.length) || null;
      continue;
    }
    if (arg === '--theme') {
      out.theme = argv[++i] || null;
      continue;
    }
    if (arg.startsWith('--theme=')) {
      out.theme = arg.slice('--theme='.length) || null;
      continue;
    }
    throw new Error(`Argumento no reconocido: ${arg}`);
  }

  if (out.help) return out;
  if (!out.branch || !out.screen || !out.out) {
    throw new Error('Uso: node scripts/chagra-shot.mjs --branch <rama|main> --screen <id> --out <archivo.png> [--theme <tema>]');
  }

  return out;
}

export function resolveShotScreen(screenId) {
  const screen = MAIN_SCREENS.find((entry) => entry.id === screenId);
  if (!screen) {
    const known = MAIN_SCREENS.map((entry) => entry.id).join(', ');
    throw new Error(`Pantalla desconocida: ${screenId}. Disponibles: ${known}`);
  }
  return screen;
}

export function sanitizeBranchName(branch) {
  return branch
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    || 'branch';
}

function isTruthyValue(value) {
  return value === '1' || value === 'true' || value === 'yes';
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null) {
      throw new Error(`El servidor termino antes de estar listo, code=${child.exitCode}`);
    }
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2_000) });
      if (response.ok || response.status >= 400) return;
    } catch {
      // Retry until the dev server is listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timeout esperando servidor en ${url}`);
}

async function ensureServer(baseUrl, cwd) {
  try {
    const response = await fetch(baseUrl, { method: 'GET', signal: AbortSignal.timeout(1_500) });
    if (response.ok || response.status >= 400) {
      return { started: false, child: null };
    }
  } catch {
    // Start a local server when nothing is already listening on 5173.
  }

  const serverMode = process.env.CHAGRA_SHOT_SERVER || DEFAULT_SERVER_CMD;
  const args = serverMode === 'preview'
    ? ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort']
    : ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'];
  const child = spawn('npm', args, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_FARMOS_URL: process.env.VITE_FARMOS_URL || '',
      VITE_FARMOS_CLIENT_ID: process.env.VITE_FARMOS_CLIENT_ID || 'farm',
      VITE_OPERATOR_USERNAME: process.env.VITE_OPERATOR_USERNAME || 'op-test',
      FORCE_COLOR: process.env.FORCE_COLOR || '1',
    },
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  await waitForServer(baseUrl, child);
  return { started: true, child };
}

async function runShot() {
  const args = parseShotArgs(process.argv);
  if (args.help) {
    console.log('Uso: node scripts/chagra-shot.mjs --branch <rama|main> --screen <id> --out <archivo.png> [--theme <tema>]');
    return;
  }

  const screen = resolveShotScreen(args.screen);
  const branchLabel = sanitizeBranchName(args.branch);
  mkdirSync(dirname(resolve(args.out)), { recursive: true });

  const server = await ensureServer(DEFAULT_BASE_URL, process.cwd());
  const chromiumPath = resolveChromiumPath();
  const browser = await chromium.launch({
    ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    baseURL: DEFAULT_BASE_URL,
    viewport: CHAGRA_SHOT_VIEWPORT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    locale: 'es-CO',
    reducedMotion: 'reduce',
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const pageErrors = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!/sqlite|wasm|favicon|manifest|WebGL|Failed to load resource|content security policy|CSP|ArrayBuffer instantiation|outside of Vite serving allow list/i.test(text)) {
        pageErrors.push(text);
      }
    }
  });

  try {
    await installDeterminism(context, page, { profileKey: DEFAULT_PROFILE_KEY });
    if (args.theme) {
      await page.addInitScript((theme) => {
        localStorage.setItem('chagra:theme', theme);
        if (document.documentElement) {
          if (theme === 'biopunk') {
            document.documentElement.removeAttribute('data-theme');
          } else {
            document.documentElement.setAttribute('data-theme', theme);
          }
        }
      }, args.theme);
    }

    await loginAndSeed(page, 'with-data');

    await gotoScreen(page, screen);
    await page.screenshot({ path: args.out, fullPage: true });

    if (pageErrors.length > 0) {
      throw new Error(`Errores inesperados durante la captura: ${pageErrors[0]}`);
    }

    console.log(`[chagra-shot] branch=${branchLabel} screen=${screen.id} out=${args.out}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (server.started && server.child && !isTruthyValue(process.env.CHAGRA_SHOT_KEEP_SERVER)) {
      server.child.kill('SIGTERM');
    }
  }
}

const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === resolve(entry);
})();

if (isDirectRun) {
  runShot().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
