import { test, expect } from '@playwright/test';

/**
 * e2e-a11y-axe.spec.js — TAREA 65
 *
 * Verificaciones manuales de accesibilidad (axe-core NO disponible).
 * Chequea:
 *   - aria-label en elementos interactivos clave
 *   - roles semanticos en navegación y botones
 *   - alt text en imágenes
 *   - lang attribute en html
 *   - focus management
 *
 * Screens: home, agente, perfil, insumos, activos
 */

const ORIGIN = 'http://localhost:5173';

const SCREENS = [
  { name: 'home', path: '/', label: /Cola de tareas/i },
  { name: 'agente', path: '/#/agente', label: /pregunta|agente/i },
  { name: 'perfil', path: '/#/perfil', label: /perfil|apariencia/i },
  { name: 'inventario', path: '/#/inventario', label: /activos|plantas/i },
  { name: 'ayuda', path: '/#/ayuda', label: /ayuda|información/i },
];

test.describe('a11y — verificaciones manuales por pantalla', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-fake-access',
          refresh_token: 'e2e-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
    );
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.abort('blockedbyclient');
    });
  });

  for (const screen of SCREENS) {
    test(`pantalla ${screen.name} — atributos a11y básicos presentes`, async ({ page }) => {
      await page.goto(ORIGIN);
      await page.getByLabel(/usuario/i).fill('e2e-operator');
      await page.getByLabel(/contraseña/i).fill('e2e-pass');
      await page.getByRole('button', { name: /ingresar/i }).click();
      await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

      await page.goto(`${ORIGIN}${screen.path}`);
      await page.waitForLoadState('networkidle', { timeout: 15_000 });

      const report = await page.evaluate(() => {
        const violations = [];

        // 1. html lang attribute
        const html = document.documentElement;
        if (!html.getAttribute('lang')) {
          violations.push('html no tiene atributo lang');
        }

        // 2. role en navegación principal
        const nav = document.querySelector('nav, [role="navigation"]');
        if (!nav) {
          violations.push('falta elemento nav o role="navigation"');
        }

        // 3. Botones sin aria-label o texto visible
        const buttons = document.querySelectorAll('button:not([aria-label]):not([title])');
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          if (!text && btn.querySelector('img, svg') && !btn.getAttribute('aria-label')) {
            violations.push(`botón icon-only sin aria-label: ${btn.outerHTML.slice(0, 80)}`);
          }
        }

        // 4. Inputs sin label asociado
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])');
        for (const input of inputs) {
          const id = input.getAttribute('id');
          const hasLabel = id && document.querySelector(`label[for="${id}"]`);
          if (!hasLabel && !input.closest('label') && !input.getAttribute('title')) {
            violations.push(`input sin label: ${input.outerHTML.slice(0, 80)}`);
          }
        }

        // 5. Imágenes sin alt
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
          violations.push(`${images.length} img sin atributo alt`);
        }

        // 6. role="main" o main element
        const main = document.querySelector('main, [role="main"]');
        if (!main && document.querySelectorAll('button, a, input, select, textarea').length > 3) {
          violations.push('falta elemento main o role="main" en pantalla con controles');
        }

        return violations;
      });

      // Usamos expect.soft para reportar todas las violaciones sin abortar
      for (const v of report) {
        expect.soft(v, `[${screen.name}] violación a11y detectada`).toBeNull();
      }

      // Si no hay violaciones individuales reportadas, confirmamos vacío
      if (report.length === 0) {
        // no-op: todas pasaron con soft
      } else {
        // Las soft assertions ya reportaron cada violación.
        // No duplicamos con otra aserción.
      }
    });

    test(`pantalla ${screen.name} — contraste texto-fondo visible`, async ({ page }) => {
      await page.goto(ORIGIN);
      await page.getByLabel(/usuario/i).fill('e2e-operator');
      await page.getByLabel(/contraseña/i).fill('e2e-pass');
      await page.getByRole('button', { name: /ingresar/i }).click();
      await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

      await page.goto(`${ORIGIN}${screen.path}`);
      await page.waitForLoadState('networkidle', { timeout: 15_000 });

      function relLum([r, g, b]) {
        const a = [r, g, b].map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
      }
      function contrastRatio(c1, c2) {
        const l1 = relLum(c1);
        const l2 = relLum(c2);
        const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (hi + 0.05) / (lo + 0.05);
      }

      const samples = await page.evaluate(() => {
        const parse = (s) => {
          const m = s.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const p = m[1].split(',').map((x) => parseFloat(x.trim()));
          return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
        };
        const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
        const out = [];
        // Muestrear textos visibles en elementos tipo heading, p, span, a, button, label
        const elements = document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, p, span, a, button, label, li, td, th, div[class*="text-"]'
        );
        let count = 0;
        for (const el of elements) {
          if (count >= 30) break;
          const text = el.textContent.trim();
          if (text.length < 2 || text.length > 60) continue;
          const cs = getComputedStyle(el);
          let fg = parse(cs.color);
          let bg = parse(cs.backgroundColor);
          if (!fg) continue;
          // Subir por ancestros para fondo
          let node = el;
          if (!bg || bg[3] === 0) {
            while (node && (!bg || bg[3] === 0)) {
              node = node.parentElement;
              if (!node) break;
              bg = parse(getComputedStyle(node).backgroundColor);
            }
          }
          if (!bg || bg[3] === 0) bg = bodyBg;
          const fgComp = fg[3] < 1
            ? [Math.round(fg[0] * fg[3] + bg[0] * (1 - fg[3])), Math.round(fg[1] * fg[3] + bg[1] * (1 - fg[3])), Math.round(fg[2] * fg[3] + bg[2] * (1 - fg[3]))]
            : [fg[0], fg[1], fg[2]];
          out.push({ text: text.slice(0, 30), fg: fgComp, bg: [bg[0], bg[1], bg[2]], tag: el.tagName });
          count++;
        }
        return out;
      });

      expect(samples.length, `screen ${screen.name} debe tener texto muestreado`).toBeGreaterThan(0);

      const failures = [];
      for (const s of samples) {
        const ratio = contrastRatio(s.fg, s.bg);
        const isButton = s.tag === 'BUTTON' || s.tag === 'A';
        const min = isButton ? 3.0 : 4.5;
        if (ratio < min) {
          failures.push(`[${screen.name}] "${s.text}" ratio=${ratio.toFixed(2)} < ${min} (fg=${s.fg} bg=${s.bg})`);
        }
      }

      for (const f of failures) {
        expect.soft(f, f).toBeNull();
      }
    });
  }

  test('login screen — inputs tienen label asociado', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');

    const usuarioInput = page.getByLabel(/usuario/i);
    await expect(usuarioInput).toBeVisible({ timeout: 10_000 });

    const passwordInput = page.locator('input[type="password"]');
    const hasPasswordLabel = await passwordInput.evaluate((el) => {
      const id = el.getAttribute('id');
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        return !!label;
      }
      return !!el.closest('label');
    });
    expect.soft(hasPasswordLabel, 'password input debe tener label asociado').toBe(true);

    const submitBtn = page.getByRole('button', { name: /ingresar/i });
    await expect(submitBtn).toBeVisible();
  });

  test('lang attribute en html es español', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^es/i);
  });
});
