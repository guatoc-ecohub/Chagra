import { test, expect } from '@playwright/test';

// eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- Test suite description
test.describe('Themes - Perfil de usuario y persistencia', () => {
    test.beforeEach(async ({ context }) => {
        // Mock de auth para entrar directo al dashboard
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
        await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
    });

    async function openAppearance(page) {
        await page.getByTestId('topbar-user-menu').click();
        await page.getByTestId('topbar-user-settings').click();
        await page.getByRole('tab', { name: /apariencia/i }).click();
    }

    test('cambia tema a Nature y persiste tras recarga', async ({ page }) => {
        await page.goto('/');

        // Login
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Entrar a Perfil > Apariencia desde el menú de usuario.
        await openAppearance(page);
        // El switcher muestra los 3 temas curados.
        await expect(page.getByRole('button', { name: /^Nature/i })).toBeVisible();

        // Seleccionar tema "Nature"
        await page.getByRole('button', { name: /^Nature/i }).click();

        // Verificar atributo en <html>
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nature');

        // Recargar y verificar persistencia
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nature');

        // Volver a Bio-Punk (default = sin data-theme)
        await openAppearance(page);
        await page.getByRole('button', { name: /^Bio-Punk/i }).click();
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    });

    test('tema Minimalista aplica el atributo correcto', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        await openAppearance(page);
        await page.getByRole('button', { name: /^Minimalista/i }).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'minimalista');
    });

    test('tema Minimalista oculta el colibrí (#72 regression)', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Navegar al home para ver el AgentHero
        await page.waitForURL('/');

        // Aplicar tema minimalista
        await page.evaluate(() => {
            document.documentElement.setAttribute('data-theme', 'minimalista');
        });

        // Verificar que el colibrí esté oculto
        const hummer = page.locator('.agentport-hummer');
        await expect(hummer).toHaveCSS('display', 'none');

        // Verificar que los elementos de nature estén ocultos
        await expect(page.locator('.agentport-sun')).toHaveCSS('display', 'none');
        await expect(page.locator('.agentport-mtn')).toHaveCSS('display', 'none');
        await expect(page.locator('.agentport-pollen')).toHaveCSS('display', 'none');

        // Verificar que los elementos de biopunk estén ocultos
        await expect(page.locator('.agentport-bp')).toHaveCSS('display', 'none');
        await expect(page.locator('.agentport-net')).toHaveCSS('display', 'none');
        await expect(page.locator('.agentport-spore')).toHaveCSS('display', 'none');
        await expect(page.locator('.agentport-roots')).toHaveCSS('display', 'none');

        // Verificar que la escena minimalista esté visible
        const minScene = page.locator('.agentport-min');
        await expect(minScene).toBeVisible();
    });
});

/**
 * INVARIANTE DE CONTRASTE — guard de regresión del "repeye" (2026-06-04).
 *
 * Los temas claros (nature/minimalista) se rompían porque clases NO theme-aware
 * (text-white ≈300 usos, bg-white/<α>, border-white/*, ámbar-texto, números del
 * impacto) quedaban con su valor literal sobre crema → ILEGIBLE. Esta prueba NO
 * necesita login: inyecta un fixture con las MISMAS clases Tailwind que usan las
 * superficies logueadas (cards/chips/compositor/impacto/botones), aplica cada
 * `data-theme`, y exige que CADA par texto↔fondo COMPUTADO pase WCAG AA (≥4.5,
 * o ≥3.0 para botones/acentos de texto grande). Si alguien vuelve a meter
 * text-white sin theming en un tema claro, esta prueba falla.
 */
// eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- Contrast test fixture with intentional Spanish labels
const FIXTURE = `
  <div id="contrast-fixture" style="max-width:412px;padding:16px">
    <div class="bg-slate-900/60 border border-white/10 rounded-2xl p-4">
      <h2 class="text-white text-lg font-bold" data-fg="aa">Título</h2>
      <p class="text-slate-200 text-sm" data-fg="aa">Subtítulo</p>
      <p class="text-slate-300 text-sm" data-fg="aa">Cuerpo</p>
    </div>
    <div class="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-4">
      <div class="text-4xl font-extrabold text-cyan-300" data-fg="large">45.000</div>
    </div>
    <div class="bg-violet-950/40 rounded-lg p-2">
      <div class="text-xl font-bold text-violet-300" data-fg="large">100</div>
    </div>
    <div class="bg-white/10 border border-white/10 rounded-2xl p-4">
      <span class="bg-slate-800/80 text-white text-sm rounded-full px-3 py-1" data-fg="aa">Chip</span>
      <span class="bg-slate-800/80 text-amber-300 text-sm rounded-full px-3 py-1" data-fg="aa">Clima</span>
    </div>
    <button class="bg-emerald-500 text-white rounded-lg px-3 py-2 text-sm font-semibold" data-fg="large">Guardar</button>
    <p class="text-white" data-fg="aa">Texto suelto</p>
  </div>
`;

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

for (const theme of ['minimalista', 'nature']) {
    test(`invariante de contraste AA — tema ${theme} (texto legible sobre superficies claras)`, async ({ page }) => {
        await page.goto('/');
        // App-bg activo + tema aplicado, sin necesidad de login.
        await page.evaluate(
            ({ html, theme }) => {
                document.documentElement.setAttribute('data-theme', theme);
                document.body.classList.add('app-bg-biodiversidad');
                const host = document.createElement('div');
                host.innerHTML = html;
                document.body.appendChild(host);
            },
            { html: FIXTURE, theme }
        );

        // Recolectar color+fondo computado (compositando alpha sobre el fondo
        // de la app) de cada nodo con data-fg.
        const samples = await page.evaluate(() => {
            const parse = (s) => {
                const m = s.match(/rgba?\(([^)]+)\)/);
                if (!m) return null;
                const p = m[1].split(',').map((x) => parseFloat(x.trim()));
                return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
            };
            // Fondo base efectivo de la app (lo que hay detrás de las cards).
            const appBase = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
            const composite = (fg, base) => {
                const a = fg[3];
                return [0, 1, 2].map((i) => Math.round(fg[i] * a + base[i] * (1 - a)));
            };
            const out = [];
            for (const el of document.querySelectorAll('[data-fg]')) {
                const cs = getComputedStyle(el);
                const fg = parse(cs.color);
                let bg = parse(cs.backgroundColor);
                // Subir por ancestros hasta el primer fondo sólido/visible.
                let node = el;
                if (!bg || bg[3] === 0) {
                    while (node && (!bg || bg[3] === 0)) {
                        node = node.parentElement;
                        if (!node) break;
                        bg = parse(getComputedStyle(node).backgroundColor);
                    }
                }
                if (!bg || bg[3] === 0) bg = [appBase[0], appBase[1], appBase[2], 1];
                const bgComp = composite(bg, [appBase[0], appBase[1], appBase[2]]);
                const fgComp = fg[3] < 1 ? composite(fg, bgComp) : [fg[0], fg[1], fg[2]];
                out.push({ tag: el.tagName, kind: el.getAttribute('data-fg'), text: el.textContent.slice(0, 20), fg: fgComp, bg: bgComp });
            }
            return out;
        });

        expect(samples.length, 'el fixture no inyectó nodos').toBeGreaterThan(5);
        const failures = [];
        for (const s of samples) {
            const ratio = contrastRatio(s.fg, s.bg);
            const min = s.kind === 'large' ? 3.0 : 4.5;
            if (ratio < min) {
                failures.push(`"${s.text}" ratio=${ratio.toFixed(2)} < ${min} (fg=${s.fg} bg=${s.bg})`);
            }
        }
        expect(failures, `Contraste insuficiente en tema ${theme}:\n${failures.join('\n')}`).toEqual([]);
    });
}
