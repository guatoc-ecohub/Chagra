#!/usr/bin/env node
/**
 * smoke-rutas-prod.mjs — Smoke test profundo de las 128 rutas de prod.
 *
 * Playwright con chromium del sistema. Inyecta token fake en localforage
 * via page.evaluate() DESPUES del primer render (login page), recarga con
 * el token ya en IndexedDB, y prueba cada ruta una por una.
 *
 * Detecta:
 *   - ErrorBoundary ("Algo falló")
 *   - Errores de consola (console.error)
 *   - Pantalla en blanco (DOM sin contenido React)
 */
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BASE = 'http://127.0.0.1:4500';
const OUT = resolve(ROOT, 'smoke-prod');
const CHROMIUM_PATH = '/run/current-system/sw/bin/chromium';

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// ── Leer manifiesto ────────────────────────────────────────────────
const manifiestoRaw = readFileSync(resolve(ROOT, 'src/config/rutasProdChagraApp.js'), 'utf8');
function extractPaths(blockName) {
  const re = new RegExp(`${blockName}\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = manifiestoRaw.match(re);
  if (!m) return [];
  const paths = [];
  const entryRe = /path:\s*'([^']+)'/g;
  let em;
  while ((em = entryRe.exec(m[1])) !== null) {
    // Saltar entradas que no son rutas reales (prefijo _)
    if (em[1].startsWith('_')) continue;
    paths.push(em[1]);
  }
  return paths;
}

const rutas3D = extractPaths('NUCLEO_3D');
const rutasApp = extractPaths('NUCLEO_APP');
const rutasPend = extractPaths('PENDIENTE_DECISION');
const todas = [...rutas3D, ...rutasApp, ...rutasPend];
console.log(`Rutas: ${rutas3D.length} 3D + ${rutasApp.length} app + ${rutasPend.length} pend = ${todas.length} total`);

// ── Constantes para el token fake ─────────────────────────────────
const FAKE_TOKEN = 'smoke-test-token-2026-07-14';
const FAKE_EXPIRY = Date.now() + 86400_000; // mañana

// ── Resultados ──────────────────────────────────────────────────────
/** @type {Array<{path:string, status:string, errors:string[], screenshot:string}>} */
const resultados = [];

// ── Parser de errores ───────────────────────────────────────────────
const ERROR_TEXTS = [
  'Algo falló', 'error inesperado', 'Ocurrió un error',
  'Something went wrong', 'Cannot read properties',
  'is not a function', 'Cannot find module',
];

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-setuid-sandbox',
      '--enable-features=NetworkService,NetworkServiceInProcess',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });

  // ── Paso 0: Sembrar token fake en IndexedDB ──────────────────────
  console.log('\n[setup] Sembrando token fake en localforage...');
  const setupPage = await context.newPage();

  // Recolectar errores de consola
  const consoleErrors = [];
  setupPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Cargar la app una vez para inicializar IndexedDB/localforage
  await setupPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await setupPage.waitForTimeout(3000);

  // Inyectar token fake via localforage
  // Sembrar en IndexedDB (localforage store). localforage usa
  // IndexedDB con DB name = 'localforage', store = 'keyvaluepairs'.
  await setupPage.evaluate(({ token, expiry }) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('localforage');
      req.onsuccess = () => {
        const db = req.result;
        // localforage puede crear stores con nombres variables
        const tx = db.transaction('keyvaluepairs', 'readwrite');
        const store = tx.objectStore('keyvaluepairs');
        store.put({ value: token }, 'farmos_access_token');
        store.put({ value: token }, 'farmos_refresh_token');
        store.put({ value: expiry }, 'farmos_token_expiry');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => {
        // Si no existe la DB 'localforage', intentar con localStorage como fallback
        localStorage.setItem('farmos_access_token', token);
        localStorage.setItem('farmos_refresh_token', token);
        localStorage.setItem('farmos_token_expiry', String(expiry));
        resolve('localStorage-fallback');
      };
    });
  }, { token: FAKE_TOKEN, expiry: FAKE_EXPIRY }).catch((e) => {
    console.log('[setup] IndexedDB eval failed:', e.message);
  });

  await setupPage.waitForTimeout(1000);
  await setupPage.close();

  // ── Paso 1: Verificar que el token funciona ──────────────────────
  console.log('[setup] Verificando que el auth gate se salta...');
  const checkPage = await context.newPage();
  await checkPage.goto(`${BASE}/#valle3d`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await checkPage.waitForTimeout(6000);

  const checkBody = await checkPage.content();
  const hasLogin = checkBody.includes('Ingresar') || checkBody.includes('Usuario');
  const hasError = ERROR_TEXTS.some((t) => checkBody.toLowerCase().includes(t.toLowerCase()));
  console.log(`[setup] Login visible: ${hasLogin} | ErrorBoundary: ${hasError}`);
  await checkPage.close();

  // ── Paso 2: Testear cada ruta ─────────────────────────────────────
  console.log(`\n[test] Iniciando smoke test de ${todas.length} rutas...\n`);
  let i = 0;

  for (const path of todas) {
    i++;
    const page = await context.newPage();
    const errors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      errors.push(`PAGE ERROR: ${err.message}`);
    });

    try {
      // Re-sembrar token en cada página (la cookie/IDB puede no persistir entre contexts)
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      await page.evaluate(({ token, expiry }) => {
        localStorage.setItem('farmos_access_token', token);
        localStorage.setItem('farmos_refresh_token', token);
        localStorage.setItem('farmos_token_expiry', String(expiry));
      }, { token: FAKE_TOKEN, expiry: FAKE_EXPIRY });
      await page.waitForTimeout(500);

      // Navegar a la ruta
      await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(6000);

      const body = await page.content();
      const lower = body.toLowerCase();

      // Verificar error boundary
      let status = 'OK';
      for (const txt of ERROR_TEXTS) {
        if (lower.includes(txt.toLowerCase())) {
          status = 'CRASH';
          errors.push(`ErrorBoundary detectado: "${txt}"`);
          break;
        }
      }

      // Verificar pantalla en blanco (sin root o DOM muy pequeño)
      if (status === 'OK') {
        if (!body.includes('<div id="root">') || body.length < 2000) {
          status = 'BLANCO';
        }
      }

      // Screenshot
      const slug = path.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ssPath = resolve(OUT, `${slug}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });

      process.stdout.write(`\r[${String(i).padStart(3)}/${todas.length}] ${path.padEnd(35)} ${status} ${errors.length > 0 ? '(' + errors.length + ' errs)' : ''}`);

      resultados.push({
        path,
        status,
        errors,
        screenshot: `smoke-prod/${slug}.png`,
      });
    } catch (err) {
      process.stdout.write(`\r[${String(i).padStart(3)}/${todas.length}] ${path.padEnd(35)} CRASH (timeout)`);
      resultados.push({
        path,
        status: 'TIMEOUT',
        errors: [err.message],
        screenshot: '',
      });
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n');

  // ── Reporte ──────────────────────────────────────────────────────
  const ok = resultados.filter((r) => r.status === 'OK').length;
  const crash = resultados.filter((r) => r.status === 'CRASH').length;
  const blanco = resultados.filter((r) => r.status === 'BLANCO').length;
  const timeout = resultados.filter((r) => r.status === 'TIMEOUT').length;

  console.log(`OK: ${ok} | CRASH: ${crash} | BLANCO: ${blanco} | TIMEOUT: ${timeout}`);

  // Generar markdown
  let md = `# Smoke Test — prod.chagra.app (128 rutas hidratadas)\n\n`;
  md += `> Playwright + chromium. Token fake en localforage/localStorage. 6s de espera por ruta.\n\n`;
  md += `| # | Ruta | Estado | Errores de consola |\n`;
  md += `|---|---|---|---|\n`;

  resultados.forEach((r, idx) => {
    const icon = r.status === 'OK' ? '✅' : r.status === 'CRASH' ? '❌' : r.status === 'BLANCO' ? '⬜' : '⏱️';
    const errSummary = r.errors.slice(0, 2).join('; ').substring(0, 120);
    md += `| ${idx + 1} | \`${r.path}\` | ${icon} ${r.status} | ${errSummary || '—'} |\n`;
  });

  // Sección CRASH
  const problemas = resultados.filter((r) => r.status !== 'OK');
  if (problemas.length > 0) {
    md += `\n## Rutas con problemas (${problemas.length})\n\n`;
    for (const r of problemas) {
      md += `### ${r.status}: \`${r.path}\`\n\n`;
      if (r.screenshot) md += `![${r.path}](${r.screenshot})\n\n`;
      md += `**Errores:**\n`;
      for (const e of r.errors.slice(0, 5)) {
        md += `- \`${e.substring(0, 200)}\`\n`;
      }
      md += `\n---\n\n`;
    }
  }

  const reportPath = resolve(ROOT, 'SMOKE-TEST-RUTAS-PROD.md');
  writeFileSync(reportPath, md, 'utf8');
  console.log(`Reporte: ${reportPath}`);

  const jsonPath = resolve(OUT, 'resultados.json');
  writeFileSync(jsonPath, JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`JSON: ${jsonPath}`);
}

run().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
