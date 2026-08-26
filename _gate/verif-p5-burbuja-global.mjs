// Verificación P5 (ad-hoc, NO parte de la app): confirma que
// <AngelitaAvisoGlobal> pinta useAngelitaStore.mensaje en una pantalla 2D
// de PRODUCCIÓN real (no el mockup del valle), con typewriter + auto-dismiss,
// y que respeta silencio/cooldown. Contra el dev server local (sin backend
// farmOS configurado en .env/.env.local — VITE_FARMOS_URL vacío), así que
// sembramos un token falso en localforage SOLO para pasar el gate de
// isAuthenticated() (chequeo local, sin red) y aterrizar en una ruta 2D-app
// real (#directorio, catálogo offline-first).
import { chromium } from 'playwright';

const TARGET_URL = process.env.DEV_URL || 'http://localhost:5183/#directorio';
const OUT = '/home/kortux/Workspace/chagra/_gate';

async function main() {
  const browser = await chromium.launch({
    executablePath: '/home/kortux/.local/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, locale: 'es-CO' });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  // El boot effect de App.jsx llama isAuthenticated() UNA vez, muy temprano
  // (bootRoutedRef) — sembrar el token con addInitScript pierde la carrera
  // (el seed es async: import + IndexedDB; el boot effect no espera). En vez
  // de perseguir esa carrera: dejar que la 1a carga aterrice donde aterrice
  // SIN sesión (login o valle3d, según hash), sembrar YA con la página
  // cargada (sin carrera, confirmado empíricamente), y luego navegar
  // DENTRO de la app viva vía hash — el listener `hashchange`
  // (`handleHashRoute`) hace su PROPIA isAuthenticated() fresca por cada
  // cambio de hash, y esa sí la encuentra sembrada.
  const origin = new URL(TARGET_URL).origin;
  const targetHash = new URL(TARGET_URL).hash || '#directorio';

  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200); // deja correr el boot effect (sin sesión) una vez

  const authSrc = await (await fetch(`${origin}/src/services/authService.js`)).text();
  const vMatch = authSrc.match(/localforage\.js\?v=([a-f0-9]+)/);
  if (!vMatch) throw new Error('No se pudo resolver el ?v= de localforage.js desde authService.js');
  const seedCheck = await page.evaluate(async (v) => {
    const mod = await import(`/node_modules/.vite/deps/localforage.js?v=${v}`);
    const lf = mod.default;
    await lf.setItem('farmos_access_token', 'verif-p5-fake-token');
    await lf.setItem('farmos_token_expiry', Date.now() + 1000 * 60 * 60 * 24);
    const authMod = await import('/src/services/authService.js');
    return { isAuth: await authMod.isAuthenticated() };
  }, vMatch[1]);
  console.log('SEED CHECK (debe ser true):', JSON.stringify(seedCheck));

  // Disparar la navegación DENTRO de la app viva (hashchange), no un reload:
  // el handler ya sembrado hace su propio isAuthenticated() fresco.
  await page.evaluate((hash) => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, targetHash);
  await page.waitForTimeout(2500);

  const landed = await page.evaluate(() => ({
    href: location.href,
    title: document.title,
    hasLogin: !!document.querySelector('input[type="password"]'),
    bodySnippet: document.body.innerText.slice(0, 200),
  }));
  console.log('ATERRIZAJE:', JSON.stringify(landed, null, 2));

  // Forzar un mensaje REAL a través del motor completo (no un mock del
  // componente): angelitaInteligencia.resolverComportamiento vía
  // useAngelitaStore.evaluar(), como lo haría el clima vivo / agroecología.
  const forced = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    const store = mod.default;
    const decision = store.getState().evaluar({
      notificaciones: {
        hay: true,
        lead: 'Su café aguanta hasta ~-1°C y mañana marca 2°C: tápelo esta noche.',
        prioridad: 10,
        severidad: 'alta',
        prompt: null,
      },
    });
    return { decision, estadoStore: store.getState().mensaje, tipo: store.getState().tipo };
  });
  console.log('DECISION FORZADA:', JSON.stringify(forced, null, 2));

  await page.waitForTimeout(2200); // deja que el typewriter TERMINE (se lee completo, no a medias)
  await page.screenshot({ path: `${OUT}/p5-01-burbuja-leyendose.png` });

  // COOLDOWN: la MISMA notificación otra vez, de inmediato, debe ser vetada
  // (angelitaInteligencia respeta `ultimaHablaPorLlave`).
  const cooldown = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    const store = mod.default;
    const decision = store.getState().evaluar({
      notificaciones: {
        hay: true,
        lead: 'Su café aguanta hasta ~-1°C y mañana marca 2°C: tápelo esta noche.',
        prioridad: 10,
        severidad: 'alta',
        prompt: null,
      },
    });
    return decision;
  });
  console.log('COOLDOWN (misma llave, debe interrumpe:false):', JSON.stringify(cooldown, null, 2));

  // SILENCIO: silenciar(true) debe reposar YA (mensaje→null, burbuja
  // desaparece) y una notificación NUEVA (llave distinta) debe seguir vetada
  // mientras siga silenciado.
  const silencio = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    const store = mod.default;
    store.getState().silenciar(true);
    const trasSilenciar = store.getState().mensaje;
    const decisionNueva = store.getState().evaluar({
      notificaciones: {
        hay: true,
        lead: 'Mensaje NUEVO y distinto: revise el riego de su cultivo de café hoy en la tarde.',
        prioridad: 10,
        severidad: 'alta',
        prompt: null,
      },
    });
    return { trasSilenciar, decisionNueva, mensajeFinal: store.getState().mensaje };
  });
  console.log('SILENCIO:', JSON.stringify(silencio, null, 2));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/p5-02-tras-silenciar.png` });

  // Quitar el silencio y confirmar que un mensaje nuevo SÍ vuelve a pasar.
  const reactivado = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    const store = mod.default;
    store.getState().silenciar(false);
    const decision = store.getState().evaluar({
      notificaciones: {
        hay: true,
        lead: 'Ya sin silencio: revise el riego de su cultivo de café hoy en la tarde.',
        prioridad: 10,
        severidad: 'alta',
        prompt: null,
      },
    });
    return { decision, mensaje: store.getState().mensaje };
  });
  console.log('REACTIVADO:', JSON.stringify(reactivado, null, 2));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/p5-03-reactivado.png` });

  // AUTO-DISMISS: sin tocar nada, el aviso debe cerrarse solo tras
  // duracionAviso(mensaje) — para el mensaje de REACTIVADO (72 caracteres)
  // eso es ~7.4s (piso 7000ms). Se espera pasado ese punto y se confirma
  // mensaje→null (reposar) SIN intervención manual.
  await page.waitForTimeout(7800);
  const autoDismiss = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    return { mensaje: mod.default.getState().mensaje };
  });
  console.log('AUTO-DISMISS (debe ser null):', JSON.stringify(autoDismiss));
  await page.screenshot({ path: `${OUT}/p5-04-auto-dismiss.png` });

  await browser.close();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
