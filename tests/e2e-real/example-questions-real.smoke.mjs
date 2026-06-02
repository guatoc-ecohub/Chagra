/**
 * example-questions-real.smoke.mjs — SMOKE @real del PUNTO DE ACCESO #1.
 *
 * Corre 1-2 PREGUNTAS-EJEMPLO (chips) contra el agente Chagra REAL (GPU,
 * sidecar NLU, Ollama). Es GPU-pesado y depende de prod → se corre A MANO, NO
 * en cada CI. Por eso vive fuera de la suite vitest/playwright automática:
 *   - NO es `*.test.jsx` (vitest lo ignora),
 *   - NO es `*.spec.js` (playwright lo ignora),
 *   - es un script .mjs autónomo que se invoca explícitamente.
 *
 * Uso (en alpha, NixOS):
 *   node tests/e2e-real/example-questions-real.smoke.mjs
 *
 * Requisitos:
 *   - chromium del nix-store (memoria reference-playwright-nixos-setup): el
 *     bundled de Playwright falla en NixOS por libnspr4/libglib.
 *   - El agente real respondiendo (cold start puede tardar hasta ~60s incluso
 *     con pre-warm; NO bajar los timeouts de espera de respuesta <5s).
 *
 * Qué verifica por cada chip clickeado:
 *   - el click pinta una respuesta del agente (burbuja assistant no vacía),
 *   - la respuesta NO es la burbuja de error/fallback,
 *   - 0 errores de página / 0 warnings SVG NaN en consola.
 *
 * Salida: tabla por chip (#, chip, lat 1er token aprox, lat total, verdict,
 * snippet) + errores de consola observados.
 */
import { chromium } from 'playwright';

// Resolución del chromium del nix-store. Si el hash cambió tras un switch,
// pasá PLAYWRIGHT_CHROMIUM_PATH o ajustá esta constante.
const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  '/nix/store/9fjg59mab9j8c5r61dx2k5gcbd2f5mpm-chromium-148.0.7778.96/bin/chromium';

const URL = process.env.CHAGRA_URL || 'https://chagra.guatoc.co/';
const ANSWER_TIMEOUT_MS = Number(process.env.CHAGRA_ANSWER_TIMEOUT_MS || 90000);

// Subconjunto de chips para el smoke (1-2 basta — esto es GPU-pesado). Deben
// existir como chips visibles del home/agente. La lista canónica está en
// src/data/exampleQuestions.js (la consume la UI y el test unitario).
//
// IMPORTANTE: los chips del home (AgentHero) solo aparecen tras login +
// onboarding. Este smoke asume una SESIÓN AUTENTICADA — corre con un
// storageState ya logueado (CHAGRA_STORAGE_STATE) o tras un login manual. Sin
// sesión, los chips no se renderizan y el smoke reporta "no encontrado" en vez
// de un falso BIEN. Credenciales válidas en /run/secrets/oracle-lab-env (no se
// hardcodean acá — repo público).
const SMOKE_CHIPS = ['¿Qué siembro?', '¿Cómo controlo plagas sin químicos?'];

const ERROR_BUBBLE_RE = /(No recibí respuesta del asistente|No pude conectarme al asistente)/i;

async function main() {
  const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true });
  // Reusa una sesión autenticada si se pasa CHAGRA_STORAGE_STATE (json de
  // storageState exportado tras login). Sin él, arranca sesión limpia (los
  // chips del home no aparecerán hasta loguear).
  const ctx = await browser.newContext(
    process.env.CHAGRA_STORAGE_STATE ? { storageState: process.env.CHAGRA_STORAGE_STATE } : {},
  );
  const page = await ctx.newPage();

  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', (m) => consoleMessages.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => pageErrors.push({ message: e.message }));

  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => {
    console.log('goto err:', e.message);
  });
  await page.waitForTimeout(4000);

  const results = [];
  for (const chip of SMOKE_CHIPS) {
    const verdict = { chip, verdict: 'MAL', latTotalMs: null, snippet: '', note: '' };
    try {
      const chipLocator = page.getByText(chip, { exact: true }).first();
      await chipLocator.waitFor({ state: 'visible', timeout: 15000 });
      const t0 = Date.now();
      await chipLocator.click();

      // Espera a que aparezca una burbuja de respuesta del asistente con texto.
      // El selector exacto depende del DOM de ChatBubble; usamos el texto de la
      // burbuja assistant. Ajustá el selector si el markup cambia.
      await page.waitForFunction(
        () => {
          const bubbles = Array.from(document.querySelectorAll('[class*="whitespace-pre-wrap"]'));
          // La última burbuja con texto sustancial que NO sea el del chip.
          return bubbles.some((b) => (b.textContent || '').trim().length > 30);
        },
        { timeout: ANSWER_TIMEOUT_MS },
      );
      verdict.latTotalMs = Date.now() - t0;

      const bodyText = await page.locator('body').innerText();
      verdict.snippet = bodyText.slice(0, 200).replace(/\s+/g, ' ');

      if (ERROR_BUBBLE_RE.test(bodyText)) {
        verdict.verdict = 'MAL';
        verdict.note = 'burbuja de error/fallback visible';
      } else {
        verdict.verdict = 'BIEN';
      }
    } catch (e) {
      verdict.note = `timeout/err esperando respuesta: ${e.message}`;
    }
    results.push(verdict);
    await page.screenshot({ path: `/tmp/example-chip-${results.length}.png` }).catch(() => {});
  }

  const svgNaNWarnings = consoleMessages.filter((m) => /NaN/.test(m.text) && /path|svg|d=/.test(m.text));

  console.log('\n=== SMOKE @real preguntas-ejemplo ===');
  for (const [i, r] of results.entries()) {
    console.log(
      `#${i + 1} | "${r.chip}" | lat ${r.latTotalMs ?? '—'}ms | ${r.verdict}${r.note ? ' (' + r.note + ')' : ''}\n     ${r.snippet}`,
    );
  }
  console.log('\npageErrors:', pageErrors.length, JSON.stringify(pageErrors.slice(0, 3)));
  console.log('SVG NaN warnings:', svgNaNWarnings.length);
  console.log('screenshots: /tmp/example-chip-*.png');

  await browser.close();

  const anyBad = results.some((r) => r.verdict !== 'BIEN');
  process.exit(anyBad || pageErrors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('smoke fatal:', e);
  process.exit(1);
});
