// Verificación R4 (menú compacto) + R2 (peek/idle-gating) del FAB del compai
// (`ops/COMPAI-MENU-DISENO-2026-08-25.md` §1.2 + §4, `AUDITORIA-COMPAI-...` §7
// P2/P7). Contra el dev server local, mismo patrón que
// `_gate/verif-p5-burbuja-global.mjs` (localforage seed + navegación por hash
// dentro de la app viva).
import { chromium } from 'playwright';

const TARGET_URL = process.env.DEV_URL || 'http://localhost:5190/#directorio';
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

  const origin = new URL(TARGET_URL).origin;
  const targetHash = new URL(TARGET_URL).hash || '#directorio';

  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  const authSrc = await (await fetch(`${origin}/src/services/authService.js`)).text();
  const vMatch = authSrc.match(/localforage\.js\?v=([a-f0-9]+)/);
  if (!vMatch) throw new Error('No se pudo resolver el ?v= de localforage.js desde authService.js');
  const seedCheck = await page.evaluate(async (v) => {
    const mod = await import(`/node_modules/.vite/deps/localforage.js?v=${v}`);
    const lf = mod.default;
    await lf.setItem('farmos_access_token', 'verif-r4r2-fake-token');
    await lf.setItem('farmos_token_expiry', Date.now() + 1000 * 60 * 60 * 24);
    const authMod = await import('/src/services/authService.js');
    return { isAuth: await authMod.isAuthenticated() };
  }, vMatch[1]);
  console.log('SEED CHECK (debe ser true):', JSON.stringify(seedCheck));

  await page.evaluate((hash) => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, targetHash);
  await page.waitForTimeout(2500);

  const landed = await page.evaluate(() => ({
    href: location.href,
    hasFab: !!document.querySelector('button[aria-label*="Chagra IA" i]'),
    bodySnippet: document.body.innerText.slice(0, 120),
  }));
  console.log('ATERRIZAJE:', JSON.stringify(landed, null, 2));
  if (!landed.hasFab) throw new Error('El FAB no se montó — abortando (revisar ruta/gates de App.jsx)');

  const fab = page.locator('button[aria-label*="Chagra IA" i]');

  // ── 01. Estado inicial (reposo, sin menú) ──────────────────────────────
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/r4r2-01-reposo.png` });

  // ── 02. R4 — toque abre el menú compacto (Ver/Escuchar/Foto/Callar) ────
  await fab.click();
  await page.waitForTimeout(300);
  const menuItems = await page.locator('[role="menuitem"]').allTextContents();
  console.log('MENU ITEMS:', JSON.stringify(menuItems));
  await page.screenshot({ path: `${OUT}/r4r2-02-menu-abierto.png` });

  // ── 03. "Ver" abre el panel con el aviso/fallback (sin salto de pantalla) ──
  await page.getByRole('menuitem', { name: /^Ver$/i }).click();
  await page.waitForTimeout(600);
  const panelTexto = await page.locator('[role="dialog"]').innerText().catch(() => null);
  console.log('PANEL "VER" TEXTO:', JSON.stringify(panelTexto));
  const urlTrasVer = page.url();
  console.log('URL TRAS "VER" (debe seguir en #directorio, sin salto):', urlTrasVer);
  await page.screenshot({ path: `${OUT}/r4r2-03-panel-ver.png` });
  // Cerrar el panel (×)
  await page.getByRole('button', { name: /Cerrar el mensaje de Angelita/i }).click();
  await page.waitForTimeout(200);

  // ── 04. Callar hoy / 🔔 — un solo toggle sobre silenciar() ─────────────
  await fab.click();
  await page.waitForTimeout(200);
  await page.getByRole('menuitem', { name: /Que se quede callada hoy/i }).click();
  await page.waitForTimeout(200);
  const silenciadoState = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    return mod.default.getState().silenciado;
  });
  console.log('SILENCIADO tras "Callar hoy" (debe ser true):', silenciadoState);
  const ariaTrasSilenciar = await fab.getAttribute('aria-label');
  console.log('ARIA-LABEL tras silenciar:', ariaTrasSilenciar);
  await page.screenshot({ path: `${OUT}/r4r2-04-silenciado.png` });
  // Reabrir el menú: debe ofrecer "Reactivar los avisos" (mismo control)
  await fab.click();
  await page.waitForTimeout(200);
  const itemReactivar = await page.getByRole('menuitem', { name: /Reactivar los avisos/i }).count();
  console.log('Ítem "Reactivar los avisos" presente tras silenciar:', itemReactivar > 0);
  await page.getByRole('menuitem', { name: /Reactivar los avisos/i }).click();
  await page.waitForTimeout(200);
  const silenciadoTrasReactivar = await page.evaluate(async () => {
    const mod = await import('/src/store/useAngelitaStore.js');
    return mod.default.getState().silenciado;
  });
  console.log('SILENCIADO tras "Reactivar" (debe ser false):', silenciadoTrasReactivar);

  // ── 05. R2 — atenuado al "usar el contenido" (scroll/touch fuera del FAB) ──
  // Simulamos scroll/mousemove REPETIDOS lejos del FAB — la señal que
  // `useIdleDetection` escucha a nivel window. El FAB debe encogerse/atenuarse
  // (opacity ~0.5, scale ~0.82) SIN desaparecer (política v2, nunca oculto).
  const opacityAntes = await fab.evaluate((el) => getComputedStyle(el).opacity);
  console.log('OPACITY antes de interactuar con el contenido:', opacityAntes);
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.move(50 + i * 10, 300 + i * 5);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(200);
  const opacityDurante = await fab.evaluate((el) => getComputedStyle(el).opacity);
  const transformDurante = await fab.evaluate((el) => getComputedStyle(el).transform);
  const pointerEventsDurante = await fab.evaluate((el) => getComputedStyle(el).pointerEvents);
  console.log('OPACITY atenuado (debe ser ~0.5, NUNCA 0):', opacityDurante);
  console.log('TRANSFORM atenuado (debe encoger, ~0.82 scale):', transformDurante);
  console.log('POINTER-EVENTS atenuado (debe seguir "auto", nunca "none" — sigue tocable):', pointerEventsDurante);
  await page.screenshot({ path: `${OUT}/r4r2-05-atenuado.png` });

  // ── 06. Cesa la interacción → reaparece tras ~2.5s idle ────────────────
  await page.waitForTimeout(3200);
  const opacityIdle = await fab.evaluate((el) => getComputedStyle(el).opacity);
  console.log('OPACITY tras idle (debe volver a 1):', opacityIdle);
  await page.screenshot({ path: `${OUT}/r4r2-06-reaparecido.png` });

  await browser.close();
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
