// agent-redesign-temas.mjs — VERIFICACIÓN VISUAL del rediseño del AgentScreen
// en los 5 temas (biopunk2, biopunk, nature, verde-vivo, minimalista), en DOS
// estados por tema:
//   (1) empty  → pantalla de llegada (saludo + CTA de la mano de Chagra)
//   (2) chat   → conversación sembrada en IndexedDB (turno usuario + respuesta
//                groundeada + respuesta generativa) → burbujas, costura, badges.
// Además mide contraste WCAG del texto del compositor y del saludo (los temas
// claros no pueden lavar el chat) y verifica que los elementos BASE conservados
// existan: mano (Ⓐ + CTA), cámara, micrófono, enviar, selector de temas
// (mochila "Temas"), input.
//
// NixOS: chromium del nix-store (executablePath) — el bundled de Playwright
// falla por libs faltantes (memoria reference-playwright-nixos-setup).
//
// Uso: node tests/visual/agent-redesign-temas.mjs <baseURL> <label> [outDir]
//   baseURL sirve el dist a verificar (vite preview). label = before|after.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3011';
const LABEL = process.argv[3] || 'after';
const OUT_DIR = process.argv[4] || '/tmp/agent-redesign-temas';
fs.mkdirSync(OUT_DIR, { recursive: true });

const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch { /* sigue */ } }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROFILE = {
  nombre: 'Lili', vocacion: 'campesino', rol: 'campesino', finca_tipo: 'rural',
  finca_altitud: '1900', piso_termico: 'templado', cultivos_actuales: 'café, plátano',
  objetivo: ['producir_mas'],
};
const USER = 'lili';

// Los 5 temas del selector. biopunk y biopunk2 comparten piel base (sin
// data-theme en <html>) — la diferencia la resuelve el JS (chagra:theme).
const THEMES = [
  { id: 'biopunk2', dataTheme: null },
  { id: 'biopunk', dataTheme: null },
  { id: 'nature', dataTheme: 'nature' },
  { id: 'verde-vivo', dataTheme: 'verde-vivo' },
  { id: 'minimalista', dataTheme: 'minimalista' },
];

// Turnos sembrados (IDB conversation_memory) — un intercambio realista:
// pregunta del usuario, respuesta GROUNDEADA (costura + badges) y una segunda
// pregunta con respuesta GENERATIVA (badge ámbar). Timestamps recientes
// (< 30 min) para que loadHistory NO la trate como sesión nueva.
function seedTurns(now) {
  return [
    {
      role: 'user',
      content: '¿Qué le sirve al café para la broca?',
      offsetMs: -6 * 60 * 1000,
    },
    {
      role: 'assistant',
      content: 'Para la broca del café le sirve la avispa Cephalonomia stephanoderis y el hongo Beauveria bassiana. Aplique el hongo en la mañana, con la primera floración. También ayuda recoger los frutos brocados del suelo cada semana.',
      offsetMs: -5.5 * 60 * 1000,
      metadata: { tool_used: 'get_pest_controllers', grounded: true, confianza: 'alta' },
    },
    {
      role: 'user',
      content: '¿Y cada cuánto riego las matas nuevas?',
      offsetMs: -2 * 60 * 1000,
    },
    {
      role: 'assistant',
      content: 'Las matas nuevas de café necesitan riego cada 2 o 3 días mientras prenden, según el sol que les caiga. Si la hoja se ve caída en la mañana, riegue ese mismo día. En tierra templada como la suya, la seca de enero pide más cuidado.',
      offsetMs: -1.5 * 60 * 1000,
      metadata: { tool_used: null, grounded: false },
    },
  ].map((t, i) => ({
    id: `seed_${now}_${i}`,
    role: t.role,
    content: t.content,
    metadata: t.metadata || null,
    timestamp: now + t.offsetMs,
    created_at: new Date(now + t.offsetMs).toISOString(),
  }));
}

function stubAuthIDB(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const put = (db) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const s = tx.objectStore('syncQueue');
      s.put('stub-token-for-ui-screenshot', 'farmos_access_token');
      s.put(Date.now() + 3600e3, 'farmos_token_expiry');
      tx.oncomplete = () => { db.close(); resolve('ok'); };
      tx.onerror = () => reject(tx.error);
    };
    const o = indexedDB.open('Chagra');
    o.onupgradeneeded = () => { try { o.result.createObjectStore('syncQueue'); } catch { /* ya existe */ } };
    o.onerror = () => reject(o.error);
    o.onsuccess = () => {
      const db = o.result;
      if (db.objectStoreNames.contains('syncQueue')) return put(db);
      const v = db.version + 1; db.close();
      const up = indexedDB.open('Chagra', v);
      up.onupgradeneeded = () => up.result.createObjectStore('syncQueue');
      up.onsuccess = () => put(up.result);
      up.onerror = () => reject(up.error);
    };
  }));
}

// Siembra la conversación para AMBOS operatorIds posibles (prefs store puede
// no estar hidratado en el harness → 'default-operator'). OJO: la DB de la app
// es 'ChagraDB' (dbCore.js) — 'Chagra' es SOLO el stub de auth del login gate.
function seedConversation(page, turns) {
  return page.evaluate((turns) => new Promise((resolve, reject) => {
    const o = indexedDB.open('ChagraDB');
    o.onerror = () => reject(o.error);
    o.onsuccess = () => {
      const db = o.result;
      if (!db.objectStoreNames.contains('conversation_memory')) {
        db.close();
        return reject(new Error('store conversation_memory no existe aún'));
      }
      const tx = db.transaction('conversation_memory', 'readwrite');
      const s = tx.objectStore('conversation_memory');
      for (const opId of ['default-operator', 'lili']) {
        for (const t of turns) {
          s.put({ ...t, id: `${t.id}_${opId}`, operator_id: opId });
        }
      }
      tx.oncomplete = () => { db.close(); resolve('ok'); };
      tx.onerror = () => reject(tx.error);
    };
  }), turns);
}

function seedLocalStorage(page, themeId) {
  return page.evaluate(({ profile, user, themeId }) => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    localStorage.setItem('chagra:active_tenant_id', user);
    localStorage.setItem('chagra:profile:done:v1', '1');
    localStorage.setItem('chagra:theme', themeId);
    // Silenciar tips de primera vez para capturas estables.
    try { localStorage.setItem('chagra:context-tips:v1', JSON.stringify({ 'foto-diagnostico': true })); } catch { /* opcional */ }
  }, { profile: PROFILE, user: USER, themeId });
}

function applyDataTheme(page, dataTheme) {
  return page.evaluate((dt) => {
    if (dt) document.documentElement.setAttribute('data-theme', dt);
    else document.documentElement.removeAttribute('data-theme');
  }, dataTheme);
}

function parseRGB(str) {
  const m = String(str).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
}
function lum({ r, g, b }) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(fg, bg) {
  const L1 = lum(fg), L2 = lum(bg);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// Contraste de un elemento contra su primer ancestro con fondo sólido.
function measureContrast(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    let node = el, bg = null;
    while (node && node !== document.documentElement) {
      const b = getComputedStyle(node).backgroundColor;
      const m = b.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const a = m[1].split(',')[3];
        if (a === undefined || parseFloat(a) > 0.5) { bg = b; break; }
      }
      node = node.parentElement;
    }
    return { color: cs.color, bg: bg || 'rgb(10,14,20)' };
  }, selector);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  let anyFail = false;
  const summary = [];

  for (const t of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true,
    });
    // SIN route-stub de farmOS: el preview local responde 502 a la API y la
    // app degrada limpio (igual que offline). Con el stub 200-vacío, la
    // identidad del operador cambiaba y el history sembrado no se cargaba
    // (verificado empíricamente 2026-07-04: sin stub hasCard=true).
    const page = await ctx.newPage();
    page.setDefaultTimeout(45000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));

    try {
      // ── (1) EMPTY STATE ──────────────────────────────────────────────────
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await stubAuthIDB(page);
      await seedLocalStorage(page, t.id);
      await applyDataTheme(page, t.dataTheme);
      await page.goto(BASE + '/#agente', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(1200);
      await page.evaluate(() => { window.location.hash = '#agente'; });
      await applyDataTheme(page, t.dataTheme);
      await page.waitForSelector('[data-testid="agent-mano-trigger"]', { timeout: 30000 });
      await sleep(2200);

      // Elementos base conservados (mano, cámara, mic, enviar, temas, input).
      const conserved = await page.evaluate(() => ({
        manoCta: !!document.querySelector('[data-testid="agent-mano-trigger"]'),
        aBtn: !!document.querySelector('button.as-tool'),
        camara: !!document.querySelector('button[aria-label="Tomar o elegir foto"]'),
        mic: !!document.querySelector('[data-testid="agent-mic-btn"]'),
        enviar: !!document.querySelector('[data-testid="agent-submit"]'),
        temas: !!document.querySelector('[data-testid="agent-modos-trigger"]'),
        input: !!document.querySelector('[data-testid="agent-input"]'),
      }));
      const missing = Object.entries(conserved).filter(([, v]) => !v).map(([k]) => k);

      const emptyShot = `${OUT_DIR}/${LABEL}-${t.id}-empty.png`;
      await page.screenshot({ path: emptyShot, fullPage: false });

      // Contraste del saludo del empty-state.
      const greet = await measureContrast(
        page,
        '[data-testid="proactive-greeting-lead"], [data-testid="chat-scroll"] p, .relative.z-10 p',
      );
      let greetContrast = null;
      if (greet) {
        const fg = parseRGB(greet.color), bg = parseRGB(greet.bg);
        if (fg && bg) greetContrast = contrast(fg, bg).toFixed(2);
      }

      // ── (2) CHAT SEMBRADO ───────────────────────────────────────────────
      // OJO: goto al MISMO /#agente NO recarga (hash-only) → reload explícito
      // para que loadHistory hidrate los turnos sembrados.
      await seedConversation(page, seedTurns(Date.now()));
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(1200);
      await page.evaluate(() => { window.location.hash = '#agente'; });
      await applyDataTheme(page, t.dataTheme);
      await page.waitForSelector('.v3-card, .v3-bubble-user', { timeout: 30000 });
      await sleep(2000);

      const chatShot = `${OUT_DIR}/${LABEL}-${t.id}-chat.png`;
      await page.screenshot({ path: chatShot, fullPage: false });

      // Contraste del texto de la tarjeta del agente.
      const card = await measureContrast(page, '.v3-card p');
      let cardContrast = null;
      if (card) {
        const fg = parseRGB(card.color), bg = parseRGB(card.bg);
        if (fg && bg) cardContrast = contrast(fg, bg).toFixed(2);
      }
      const costura = await page.evaluate(() => !!document.querySelector('.v3-card[data-grounded="true"]'));

      const ok = missing.length === 0
        && (greetContrast === null || parseFloat(greetContrast) >= 4.5)
        && (cardContrast === null || parseFloat(cardContrast) >= 4.5);
      if (!ok) anyFail = true;

      summary.push({ tema: t.id, ok, missing, greetContrast, cardContrast, costura, emptyShot, chatShot, errs: errs.slice(0, 2) });
      console.log(`\n══════ ${LABEL} · ${t.id} ══════`);
      console.log(`  conservados: ${missing.length === 0 ? '✓ todos' : `✗ FALTAN ${missing.join(',')}`}`);
      console.log(`  contraste saludo=${greetContrast ?? 'n/a'}  tarjeta=${cardContrast ?? 'n/a'}  costura-grounded=${costura ? '✓' : '✗'}`);
      console.log(`  capturas -> ${emptyShot} | ${chatShot}`);
      if (errs.length) console.log('  pageerrors:', errs.slice(0, 3));
    } catch (e) {
      console.error(`[${t.id}] FAIL:`, e.message);
      try { await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${t.id}-FAIL.png` }); } catch { /* mejor esfuerzo */ }
      anyFail = true;
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  console.log('\n══════ RESUMEN ══════');
  for (const s of summary) console.log(JSON.stringify(s));
  process.exitCode = anyFail ? 1 : 0;
})();
