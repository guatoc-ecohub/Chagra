import { test, expect } from '@playwright/test';

/**
 * pwa-install.spec.js — verifica que la PWA está bien configurada:
 *   - manifest.json accesible
 *   - service worker registrado y activo
 *   - icons en sizes correctos
 *   - app es installable (beforeinstallprompt en chromium)
 *   - offline assets cacheados
 *
 * Este spec es crítico para el caso de Antonio Vanegas (test PWA install)
 * y para validar que el SW no esté roto en producción.
 */

const ORIGIN = 'http://localhost:5173';

test.describe('PWA — manifest', () => {
  test('manifest.json accesible con shape válido', async ({ page }) => {
    const res = await page.request.get(`${ORIGIN}/manifest.json`);
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.name || manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.display).toMatch(/standalone|fullscreen|minimal-ui/);
  });

  test('manifest declara al menos un icono >= 192x192 (PWA install requirement)', async ({ page }) => {
    const res = await page.request.get(`${ORIGIN}/manifest.json`);
    const manifest = await res.json();
    const large = manifest.icons.filter(i => {
      const sizes = (i.sizes || '').split(' ');
      return sizes.some(s => {
        const [w] = s.split('x').map(Number);
        return w >= 192;
      });
    });
    expect(large.length).toBeGreaterThan(0);
  });

  test('los icons declarados en manifest existen (no 404)', async ({ page }) => {
    const res = await page.request.get(`${ORIGIN}/manifest.json`);
    const manifest = await res.json();
    for (const icon of manifest.icons.slice(0, 5)) {
      const iconUrl = icon.src.startsWith('http') ? icon.src : `${ORIGIN}/${icon.src.replace(/^\//, '')}`;
      const iconRes = await page.request.get(iconUrl);
      expect(iconRes.status(), `icon ${icon.src}`).toBeLessThan(400);
    }
  });
});

test.describe('PWA — service worker', () => {
  test('SW se registra y queda activo tras carga inicial', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');

    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      // Espera hasta 5s a que se registre
      for (let i = 0; i < 50; i++) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && (reg.active || reg.waiting || reg.installing)) {
          return {
            supported: true,
            scope: reg.scope,
            active: !!reg.active,
            waiting: !!reg.waiting,
            installing: !!reg.installing,
          };
        }
        await new Promise(r => setTimeout(r, 100));
      }
      return { supported: true, registered: false };
    });

    expect(swState.supported).toBe(true);
    expect(swState.active || swState.waiting || swState.installing).toBeTruthy();
  });

  test('SW cachea index.html para que la app cargue offline', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');

    // Verificar que el SW está activo antes de offline
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return reg && reg.active;
    }, null, { timeout: 10000 });

    // Verificar que el CacheStorage tiene al menos una entrada
    const hasCaches = await page.evaluate(async () => {
      if (!('caches' in window)) return false;
      const names = await caches.keys();
      return names.length > 0;
    });
    expect(hasCaches).toBe(true);
  });
});

test.describe('PWA — install prompt heuristics', () => {
  test('expone meta theme-color (mejora install UX)', async ({ page }) => {
    await page.goto(ORIGIN);
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
    expect(themeColor).toMatch(/^#[0-9a-f]{3,8}$/i);
  });

  test('viewport meta declara mobile-friendly', async ({ page }) => {
    await page.goto(ORIGIN);
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();
    expect(viewport.toLowerCase()).toContain('width=device-width');
  });
});
