/**
 * sw-self-heal.smoke.mjs — SMOKE POST-DEPLOY contra PROD (cierra el loop del
 * prod-down "failed to fetch" + sesión zombi, 2026-06-18).
 *
 * Es Playwright "crudo" (NO en la suite *.spec.js automática) porque pega contra
 * producción real y lo invoca el workflow post-deploy a mano. Mirror del patrón
 * de tests/e2e-real/example-questions-real.smoke.mjs.
 *
 * Uso:
 *   node tests/e2e-real/sw-self-heal.smoke.mjs
 *   CHAGRA_URL=https://chagra.guatoc.co/ node tests/e2e-real/sw-self-heal.smoke.mjs
 *
 * Requisitos:
 *   - chromium del nix-store (memoria reference-playwright-nixos-setup): el
 *     bundled de Playwright falla en NixOS por libnspr4/libglib. Pasá
 *     PLAYWRIGHT_CHROMIUM_PATH si el hash del store cambió tras un switch.
 *
 * Qué verifica (3 chequeos, exit 1 si CUALQUIERA queda rojo):
 *   A) DESFASE SW/bundle: el SHA de /version.json (servido) == el SHA embebido
 *      en el bundle que está corriendo (window.__CHAGRA_BUILD_SHA__). Caza el
 *      caso "deploy nuevo pero el cliente quedó en bundle viejo".
 *   B) CERO "failed to fetch": carga la app, registra el SW, recarga, y asierta
 *      que NO hubo errores "failed to fetch" en consola/page-errors y que llega
 *      a un estado VÁLIDO (login o home), no a una pantalla rota.
 *   C) SESIÓN ZOMBI: con un token inválido inyectado, la app debe llevar a
 *      RE-LOGIN (no al onboarding "¿dónde está su finca?", que haría creer que
 *      el usuario perdió su finca cuando solo venció el token).
 *
 * Salida: tabla por chequeo (A/B/C, verdict, detalle) + alerta para que el
 * workflow notifique por Telegram si queda rojo.
 */
import { chromium } from 'playwright';

const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium';

const URL = process.env.CHAGRA_URL || 'https://chagra.guatoc.co/';
const NAV_TIMEOUT_MS = Number(process.env.CHAGRA_NAV_TIMEOUT_MS || 30000);

// "failed to fetch" en cualquiera de sus formas (browser EN/ES, net errors).
const FAILED_FETCH_RE =
  /(failed to fetch|net::ERR_|networkerror|error al obtener|no se pudo (cargar|obtener))/i;
// Copy del OnboardingHero "Primero: ¿dónde está su finca?" (no debe salir con
// token inválido — eso sería la sesión zombi).
const ONBOARDING_FINCA_RE = /d[oó]nde est[aá] su finca|ubicar mi finca/i;
// Estado de re-login esperado (LoginScreen). Heurística por copy estable.
const LOGIN_RE = /iniciar sesi[oó]n|ingresa|entrar|usuario|contrase[nñ]a|sesi[oó]n vencida/i;

function captureConsole(page, sink) {
  page.on('console', (m) => sink.console.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => sink.errors.push({ message: e.message }));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    sink.reqFailed.push({ url: r.url(), error: f ? f.errorText : '' });
  });
}

function newSink() {
  return { console: [], errors: [], reqFailed: [] };
}

function failedFetchHits(sink) {
  const fromConsole = sink.console.filter((m) => FAILED_FETCH_RE.test(m.text));
  const fromErrors = sink.errors.filter((e) => FAILED_FETCH_RE.test(e.message));
  // requestfailed de assets/api del propio origen (no tiles cross-origin, que
  // pueden fallar offline sin romper la app).
  const fromReq = sink.reqFailed.filter(
    (r) => r.url.includes(new URL(URL).host) && FAILED_FETCH_RE.test(r.error),
  );
  return [...fromConsole, ...fromErrors, ...fromReq];
}

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  const results = [];

  // ── A + B: carga limpia, SW, recarga, sin "failed to fetch" ──────────────
  const ctxAB = await browser.newContext();
  const pageAB = await ctxAB.newPage();
  const sinkAB = newSink();
  captureConsole(pageAB, sinkAB);

  let deployedSha = null;
  let runningSha = null;
  try {
    // Leer /version.json servido (no-store) directo del origen.
    const resp = await pageAB.request.get(new URL('/version.json', URL).href, {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (resp.ok()) {
      const j = await resp.json().catch(() => ({}));
      deployedSha = j.sha || j.commit || j.build || null;
    }
  } catch (e) {
    results.push({ id: 'A', verdict: 'MAL', detail: `no se pudo leer /version.json: ${e.message}` });
  }

  await pageAB.goto(URL, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS }).catch((e) => {
    results.push({ id: 'B', verdict: 'MAL', detail: `goto falló: ${e.message}` });
  });
  // Esperar a que el SW registre y la app monte.
  await pageAB.waitForTimeout(4000);
  // Recargar UNA vez (ejercita el camino post-deploy: SW activo + bundle).
  await pageAB.reload({ waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS }).catch(() => {});
  await pageAB.waitForTimeout(3000);

  runningSha = await pageAB.evaluate(() => window.__CHAGRA_BUILD_SHA__ || null).catch(() => null);

  // Chequeo A: SHA servido == SHA corriendo.
  if (!results.some((r) => r.id === 'A')) {
    const norm = (s) => (s || '').toString().trim().toLowerCase();
    const a = norm(deployedSha);
    const b = norm(runningSha);
    const match = a && b && (a === b || a.startsWith(b) || b.startsWith(a));
    results.push({
      id: 'A',
      verdict: match ? 'BIEN' : 'MAL',
      detail: `deployed=${deployedSha ?? '—'} running=${runningSha ?? '—'}`,
    });
  }

  // Chequeo B: cero "failed to fetch" + estado válido (no pantalla rota).
  const bodyAB = await pageAB.locator('body').innerText().catch(() => '');
  const reachedValid = bodyAB.trim().length > 0 && !/vista no disponible|algo fall[oó]/i.test(bodyAB);
  const ffHits = failedFetchHits(sinkAB);
  results.push({
    id: 'B',
    verdict: ffHits.length === 0 && reachedValid ? 'BIEN' : 'MAL',
    detail: `failed-to-fetch=${ffHits.length} estadoValido=${reachedValid}` +
      (ffHits.length ? ` | ${JSON.stringify(ffHits.slice(0, 3))}` : ''),
  });
  await pageAB.screenshot({ path: '/tmp/sw-self-heal-AB.png' }).catch(() => {});
  await ctxAB.close();

  // ── C: sesión zombi → re-login, no onboarding ────────────────────────────
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  const sinkC = newSink();
  captureConsole(pageC, sinkC);
  // Cargar primero para tener origen, luego inyectar token inválido en
  // localforage (IndexedDB store 'Chagra') y recargar.
  await pageC.goto(URL, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS }).catch(() => {});
  await pageC.waitForTimeout(2000);
  await pageC.evaluate(async () => {
    // localforage usa IndexedDB; setear las claves de authService directo.
    // Un access token basura + expiry en el futuro fuerza al cliente a usarlo
    // (no refresca por expiración) → la primera API call da 401 → debe ir a
    // re-login, NO mostrar onboarding.
    try {
      const lf = window.localforage;
      if (lf) {
        await lf.setItem('farmos_access_token', 'tkn-invalido-smoke');
        await lf.setItem('farmos_token_expiry', Date.now() + 3600_000);
        await lf.removeItem('farmos_refresh_token');
      }
    } catch (_) { /* si no expone localforage, el chequeo igual valida el render */ }
  }).catch(() => {});
  await pageC.reload({ waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS }).catch(() => {});
  await pageC.waitForTimeout(5000);

  const bodyC = await pageC.locator('body').innerText().catch(() => '');
  const showsOnboarding = ONBOARDING_FINCA_RE.test(bodyC);
  const showsLogin = LOGIN_RE.test(bodyC) || (await pageC.evaluate(() => location.hash === '#login').catch(() => false));
  results.push({
    id: 'C',
    verdict: !showsOnboarding && showsLogin ? 'BIEN' : 'MAL',
    detail: `onboardingVisible=${showsOnboarding} loginVisible=${showsLogin}`,
  });
  await pageC.screenshot({ path: '/tmp/sw-self-heal-C.png' }).catch(() => {});
  await ctxC.close();

  await browser.close();

  // ── Reporte ──────────────────────────────────────────────────────────────
  console.log('\n=== SMOKE POST-DEPLOY: self-heal + sesión ===');
  console.log(`URL: ${URL}`);
  for (const r of results) {
    console.log(`[${r.id}] ${r.verdict} — ${r.detail}`);
  }
  console.log('screenshots: /tmp/sw-self-heal-AB.png, /tmp/sw-self-heal-C.png');

  const anyBad = results.some((r) => r.verdict !== 'BIEN');
  if (anyBad) {
    // Marcador legible para que el workflow lo capture y alerte por Telegram.
    console.log('\nSMOKE_RESULT=RED');
    console.error('Smoke post-deploy ROJO: revisar checks arriba.');
  } else {
    console.log('\nSMOKE_RESULT=GREEN');
  }
  process.exit(anyBad ? 1 : 0);
}

main().catch((e) => {
  console.error('smoke fatal:', e);
  console.log('\nSMOKE_RESULT=RED');
  process.exit(1);
});
