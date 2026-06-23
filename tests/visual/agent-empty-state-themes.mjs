// agent-empty-state-themes.mjs — VERIFICACIÓN VISUAL del empty-state del
// AgentScreen en los 3 temas: nature (claro), minimalista (claro) y biopunk
// (oscuro). Para cada tema:
//   (a) mide el COLOR computado + el fondo efectivo del saludo proactivo bajo
//       el colibrí y calcula el contraste WCAG real (legibilidad del BUG 1).
//   (b) inspecciona el contenido del botón Ⓐ del compositor (el redondo, no el
//       CTA "Toca la mano") para confirmar que renderiza el ICONO DEL TEMA y no
//       la mano de Chagra (BUG 2). nature → frailejón; biopunk → Ⓐ forja;
//       minimalista → brote monoline.
//   Captura /tmp/agent-empty-<label>-<tema>.png.
//
// NixOS: chromium del nix-store (executablePath). El bundled de Playwright
// falla por libs faltantes (memoria reference-playwright-nixos-setup).
//
// Uso: node tests/visual/agent-empty-state-themes.mjs <baseURL> <label>
//   baseURL sirve el dist DEL WORKTREE (vite preview). label = before|after.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:3011';
const LABEL = process.argv[3] || 'after';
const KNOWN_CHROMIUM = [
  '/nix/store/r7ifk1v95jfl02775kgbrd61dyr1rfsx-chromium-148.0.7778.178/bin/chromium',
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium',
];
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of KNOWN_CHROMIUM) { try { if (fs.existsSync(p)) return p; } catch {} }
  return execSync('nix-shell -p chromium --run "which chromium"', { encoding: 'utf8', timeout: 120000 })
    .trim().split('\n').pop().trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Perfil semilla SIN pendientes ni alertas → el saludo cae a state 'idea'
// (lead contextual), que es justo el copy "pálido" que el operador reporta.
const PROFILE = {
  nombre: 'Lili', vocacion: 'campesino', rol: 'campesino', finca_tipo: 'rural',
  finca_altitud: '1900', piso_termico: 'templado', cultivos_actuales: 'café, plátano',
  objetivo: ['producir_mas'],
};
const USER = 'lili';

const THEMES = [
  { id: 'nature', label: 'nature (claro)' },
  { id: 'minimalista', label: 'minimalista (claro)' },
  { id: 'biopunk', label: 'biopunk (oscuro)' },
];

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
    o.onupgradeneeded = () => { try { o.result.createObjectStore('syncQueue'); } catch {} };
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

function seed(page, themeId) {
  return page.evaluate(({ profile, user, themeId }) => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    localStorage.setItem('chagra:active_tenant_id', user);
    localStorage.setItem('chagra:profile:done:v1', '1');
    localStorage.setItem('chagra:theme', themeId);
  }, { profile: PROFILE, user: USER, themeId });
}

// Relative luminance + contrast WCAG a partir de un "rgb(r, g, b)".
function parseRGB(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
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

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveChromium(), headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  });
  let anyFail = false;

  for (const t of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 915 }, locale: 'es-CO', deviceScaleFactor: 2, isMobile: true,
    });
    // Stub farmOS/red para que el agente monte sin backend.
    await ctx.route('**/*', (route) => {
      const u = route.request().url().replace(BASE, '');
      if (/\/(jsonapi|api|sites|oauth|fincas)(\/|$|\?)/.test(u)) {
        const isJsonApi = /jsonapi/.test(u);
        return route.fulfill({
          status: 200,
          contentType: isJsonApi ? 'application/vnd.api+json' : 'application/json',
          body: JSON.stringify(isJsonApi ? { data: [], meta: {}, links: {} } : {}),
        });
      }
      return route.continue();
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(45000);
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));

    try {
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await stubAuthIDB(page);
      await seed(page, t.id);
      // Aplicar el tema explícitamente (data-theme) ANTES de entrar al agente,
      // por si el hook tarda en hidratar desde localStorage.
      await page.evaluate((id) => {
        if (id === 'biopunk') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', id);
      }, t.id);
      await page.goto(BASE + '/#agente', { waitUntil: 'domcontentloaded', timeout: 40000 });
      await sleep(1500);
      await page.evaluate(() => { window.location.hash = '#agente'; });
      // Re-aplicar el tema tras la navegación (App puede re-render).
      await page.evaluate((id) => {
        if (id === 'biopunk') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', id);
      }, t.id);

      // Empty-state: esperar el CTA "Toca la mano" (data-testid) o el saludo.
      await page.waitForSelector('[data-testid="agent-mano-trigger"]', { timeout: 30000 });
      // Dar tiempo a que el saludo proactivo resuelva (async) y a que termine la
      // animación de entrada (opacity 0→1) para medir el color FINAL, no el
      // intermedio.
      await sleep(2500);

      const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || '(none=biopunk)');

      // ── (a) BUG 1: legibilidad del saludo ──────────────────────────────
      const greet = await page.evaluate(() => {
        // El saludo proactivo (state=idea) → data-testid proactive-greeting;
        // si no resolvió, cae al copy estático (primer <p> del empty-state).
        let el = document.querySelector('[data-testid="proactive-greeting-lead"]')
          || document.querySelector('[data-testid="proactive-greeting"] p')
          || document.querySelector('[data-testid="proactive-greeting"]');
        if (!el) {
          // copy estático
          const center = document.querySelector('[data-testid="chat-scroll"]') || document.body;
          el = center.querySelector('p');
        }
        if (!el) return null;
        const cs = getComputedStyle(el);
        // Subir buscando el primer ancestro con background no transparente.
        let node = el, bg = 'rgba(0, 0, 0, 0)';
        while (node && node !== document.documentElement) {
          const b = getComputedStyle(node).backgroundColor;
          const m = b.match(/rgba?\(([^)]+)\)/);
          if (m) {
            const a = m[1].split(',')[3];
            if (a === undefined || parseFloat(a) > 0.5) { bg = b; break; }
          }
          node = node.parentElement;
        }
        const rect = el.getBoundingClientRect();
        return {
          text: el.textContent.trim().slice(0, 70),
          color: cs.color,
          opacity: cs.opacity,
          bg,
          visible: rect.width > 0 && rect.height > 0,
          // opacidad efectiva de la cadena de ancestros
          ancestorOpacity: (() => {
            let o = 1, n = el;
            while (n && n !== document.documentElement) {
              const v = parseFloat(getComputedStyle(n).opacity);
              if (!Number.isNaN(v)) o *= v;
              n = n.parentElement;
            }
            return o.toFixed(3);
          })(),
        };
      });

      let contrastRatio = null;
      if (greet?.color && greet?.bg) {
        const fg = parseRGB(greet.color), bg = parseRGB(greet.bg);
        if (fg && bg) contrastRatio = contrast(fg, bg).toFixed(2);
      }
      const legible = contrastRatio !== null && parseFloat(contrastRatio) >= 4.5
        && parseFloat(greet?.ancestorOpacity ?? '1') >= 0.6;

      // ── (b) BUG 2: contenido del botón Ⓐ del compositor ────────────────
      // Hay DOS botones con aria-label "Abrir la mano de Chagra":
      //   - el CTA grande (data-testid agent-mano-trigger) → mano CORRECTA
      //   - el redondo del compositor (as-iconbtn as-tool) → debe ser el ICONO
      //     del tema. Lo identificamos por la clase as-tool.
      const compositorIcon = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button[aria-label="Abrir la mano de Chagra"]'));
        const round = btns.find((b) => b.className.includes('as-tool'))
          || btns.find((b) => !b.dataset.testid);
        if (!round) return { found: false };
        const svg = round.querySelector('svg');
        const viewBox = svg?.getAttribute('viewBox') || '';
        const fills = svg ? Array.from(svg.querySelectorAll('[fill],[stroke]'))
          .map((n) => n.getAttribute('fill') || n.getAttribute('stroke')).filter(Boolean) : [];
        return {
          found: true,
          hasSvg: !!svg,
          viewBox,
          fills: fills.slice(0, 8),
          // Heurística de identidad:
          //   mano de Chagra: viewBox suele ser "0 0 64 64"/cuadrado de ManoChagraGlyph
          //   tema nature:   viewBox "0 0 120 120" + frailejón ocre/salvia
          //   tema biopunk:  viewBox "0 0 100 108" + rojo #c0392b (forja)
          //   tema minim.:   monoline verde
          innerHTML: (svg?.innerHTML || '').slice(0, 120),
        };
      });

      // Capturas: compositor (recorte inferior) + saludo (vista completa empty-state)
      const fullOut = `/tmp/agent-empty-${LABEL}-${t.id}.png`;
      await page.screenshot({ path: fullOut, fullPage: false });

      console.log(`\n══════ TEMA ${t.label} | data-theme=${dataTheme} ══════`);
      console.log(`  [BUG1 saludo] "${greet?.text ?? '(no encontrado)'}"`);
      console.log(`     color=${greet?.color}  bg=${greet?.bg}  opacity-cadena=${greet?.ancestorOpacity}`);
      console.log(`     contraste WCAG = ${contrastRatio ?? 'n/a'}  →  ${legible ? '✓ LEGIBLE (≥4.5)' : '✗ ILEGIBLE'}`);
      console.log(`  [BUG2 botón Ⓐ compositor] svg=${compositorIcon.hasSvg} viewBox="${compositorIcon.viewBox}"`);
      console.log(`     fills/strokes=${JSON.stringify(compositorIcon.fills)}`);
      console.log(`  captura -> ${fullOut}`);
      if (errs.length) console.log('  pageerrors:', errs.slice(0, 3));

      if (!legible) anyFail = true;
    } catch (e) {
      console.error(`[${t.id}] FAIL:`, e.message);
      try { await page.screenshot({ path: `/tmp/agent-empty-${LABEL}-${t.id}-FAIL.png` }); } catch {}
      anyFail = true;
    } finally {
      await ctx.close();
    }
  }
  await browser.close();
  process.exitCode = anyFail ? 1 : 0;
})();
