import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

/**
 * finca-viva-temas.spec.js — regresión visual del home F2 "Finca Viva" POR TEMA.
 * =============================================================================
 * GO-LIVE split biopunk/biopunk2 (2026-07-04): verifica que el home finca viva
 * renderiza CORRECTO bajo cada uno de los 5 temas seleccionables, con la escena
 * de autor que le corresponde a cada uno:
 *
 *   · biopunk2 (DEFAULT) → "Finca Organismo"        (fvo-escena)  sin data-theme
 *   · biopunk (respaldo) → isométrica clásica       (fvh-escena-finca) sin data-theme
 *   · nature             → "El Árbol de la Vida"    (fvn-escena)  data-theme=nature
 *   · verde-vivo         → "Huerto Exuberante"      (fvv-escena)  data-theme=verde-vivo
 *   · minimalista        → "Un solo trazo"          (fvm-escena)  data-theme=minimalista
 *
 * Por tema asserta: (1) el SPA montó (hero visible, nada de pantalla negra),
 * (2) la escena del tema correcta está presente (y NINGUNA otra), (3) el header
 * trae los 4 botones (A del agente + campana + ayuda + perfil), (4) cero
 * errores JS de consola (filtro estándar del repo), (5) sin overflow
 * horizontal. Además vuelca una captura full-page por tema (evidencia para el
 * operador) en FVH_CAPTURAS_DIR (default: test-results/capturas-temas).
 *
 * REQUIERE la flag F2 ON en el server bajo prueba:
 *     VITE_FINCA_VIVA_HOME_PERFIL=true npx vite --port 5173
 * Con la flag OFF (el CI de hoy) el spec se SKIPPEA solo, con mensaje claro —
 * no rompe el gate visual; es el harness del go-live.
 *
 * Backend mockeado (patrón de e2e-integral-logueado.spec.js): oauth + JSON:API
 * vacíos + sidecar NLU. Offline-first real: la escena sale del perfil sembrado.
 */

const USER = 'e2e-temas';
const CAPTURAS_DIR = process.env.FVH_CAPTURAS_DIR || 'test-results/capturas-temas';

/** Los 5 temas del selector y su escena de autor esperada en el home. */
const TEMAS = [
  { id: 'biopunk2', escena: 'fvo-escena', dataTheme: null, nombre: 'Finca Organismo (DEFAULT)' },
  { id: 'biopunk', escena: 'fvh-escena-finca', dataTheme: null, nombre: 'isométrica clásica (respaldo)' },
  { id: 'nature', escena: 'fvn-escena', dataTheme: 'nature', nombre: 'El Árbol de la Vida' },
  { id: 'verde-vivo', escena: 'fvv-escena', dataTheme: 'verde-vivo', nombre: 'Huerto Exuberante' },
  { id: 'minimalista', escena: 'fvm-escena', dataTheme: 'minimalista', nombre: 'Un solo trazo' },
];
const ESCENAS_TESTIDS = TEMAS.map((t) => t.escena);

/** Filtro estándar del repo para errores de consola no-críticos. */
function filtrarCriticos(errors) {
  return errors.filter(
    (e) =>
      !e.includes('manifest') &&
      !e.includes('favicon') &&
      !e.includes('ServiceWorker') &&
      !e.toLowerCase().includes('preload') &&
      !e.toLowerCase().includes('mixed content') &&
      !e.includes('401') &&
      !e.includes('403') &&
      // Recursos que el mock JSON:API vacío no cubre (imágenes/tiles ausentes).
      !e.includes('Failed to load resource'),
  );
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-temas-token',
        refresh_token: 'e2e-temas-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );
  const emptyJsonApi = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: emptyJsonApi }),
    );
  }
  await page.context().route('**/fincas-publicas.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  for (const endpoint of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(endpoint, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
  }
}

/**
 * Siembra sesión + PERFIL de finca (rol campesino, finca integral con
 * ubicación) + el TEMA bajo prueba, ANTES de cargar la app. El perfil integral
 * garantiza escala 'finca' en selectSceneVariant (la escena de autor del tema).
 */
async function seedSession(page, temaId) {
  await page.addInitScript(
    ({ username, tema }) => {
      try {
        window.localStorage.setItem('chagra:active_tenant_id', username);
        window.localStorage.setItem('chagra:theme', tema);
        // La bienvenida de primera vez (BienvenidaFinca, "PASO 1 DE 3") tapa
        // el home entero: se marca VISTA para fotografiar el hero de verdad
        // (sin esto la captura sale del wizard, no del home por tema).
        window.localStorage.setItem('chagra:bienvenida-vista:v1', '1');
        window.localStorage.setItem(
          'chagra:profile:v1',
          JSON.stringify({
            rol: 'campesino',
            vocacion: 'mixta',
            finca_tipo: 'integral',
            nivel_respuestas: 'simple',
            vereda: 'El Volador',
            municipio: 'Guatavita',
            departamento: 'Cundinamarca',
            finca_altitud: 2680,
            piso_termico: 'frio',
          }),
        );
      } catch (_) {
        /* noop */
      }
    },
    { username: USER, tema: temaId },
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-temas-pwd');
    if (!result.success) {
      throw new Error(`Login mock falló: ${result.error || 'sin detalle'}`);
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

/** ¿La build bajo prueba tiene la flag F2 ON? (solo dev server con /src). */
async function flagF2Activa(page) {
  try {
    return await page.evaluate(async () => {
      const mod = await import('/src/config/fincaVivaHomeFlag.js');
      return mod.fincaVivaHomePerfilActivo();
    });
  } catch (_) {
    return false;
  }
}

test.describe('Home finca viva — regresión por tema (5 temas)', () => {
  // Las escenas de autor son SVG pesados y en local (NixOS, chromium
  // single-process) el ciclo login+render+captura full-page no cabe en los
  // 30s default. 120s da holgura sin ocultar cuelgues reales.
  test.describe.configure({ timeout: 120_000 });

  for (const tema of TEMAS) {
    test(`tema "${tema.id}" (${tema.nombre}): monta, escena correcta, header completo, sin errores ni overflow`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await seedSession(page, tema.id);
      await mockBackend(page);

      await page.goto('/', { waitUntil: 'domcontentloaded' });

      test.skip(
        !(await flagF2Activa(page)),
        'Flag VITE_FINCA_VIVA_HOME_PERFIL OFF: este harness es del home F2 (correr con la flag ON).',
      );

      await login(page);
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      // (1) El SPA montó: el hero F2 está visible (no pantalla negra/login) y
      // NINGÚN overlay de primera vez lo tapa (la bienvenida "PASO 1 DE 3"
      // dejaba el hero "visible" para Playwright pero la foto salía del wizard).
      const hero = page.getByTestId('finca-viva-hero');
      await expect(hero, `el home F2 no montó bajo el tema ${tema.id}`).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText(/PASO 1 DE/i),
        'la bienvenida de primera vez no debería tapar el home (siembra chagra:bienvenida-vista:v1)',
      ).toHaveCount(0);

      // El tema aplicó al DOM como corresponde: biopunk/biopunk2 = piel base
      // SIN data-theme; los demás escriben su id.
      const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(dataTheme, `data-theme inesperado con tema ${tema.id}`).toBe(tema.dataTheme);

      // (2) La escena de autor del tema está presente… y es LA ÚNICA.
      await expect(
        page.getByTestId(tema.escena),
        `la escena ${tema.escena} del tema ${tema.id} no está en el DOM`,
      ).toBeVisible({ timeout: 10000 });
      for (const otra of ESCENAS_TESTIDS) {
        if (otra === tema.escena) continue;
        await expect(
          page.getByTestId(otra),
          `bajo el tema ${tema.id} NO debería montarse la escena ${otra}`,
        ).toHaveCount(0);
      }
      // El wrap "organismo" (compat histórica) vive SOLO en biopunk2.
      const organismoCount = await page.locator('.fvh-escena-wrap--organismo').count();
      expect(organismoCount).toBe(tema.id === 'biopunk2' ? 1 : 0);

      // (3) Header con los 4 botones: A del agente + campana + ayuda + perfil.
      await expect(page.getByTestId('fvh-brand-agente')).toBeVisible();
      await expect(page.locator('.fvh-top-pills').getByRole('button', { name: /Notificaciones/ })).toBeVisible();
      await expect(page.locator('.fvh-top-pills').getByRole('button', { name: 'Ayuda' })).toBeVisible();
      await expect(page.getByTestId('finca-viva-perfil')).toBeVisible();

      // (5) Sin overflow horizontal (el body nunca scrollea de lado).
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          bodyScroll: document.body.scrollWidth,
        };
      });
      expect(
        overflow.scrollWidth,
        `overflow horizontal con tema ${tema.id}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // Captura de evidencia para el operador (full page, una por tema).
      mkdirSync(CAPTURAS_DIR, { recursive: true });
      await page.screenshot({
        path: join(CAPTURAS_DIR, `home-tema-${tema.id}.png`),
        fullPage: true,
      });

      // (4) Cero errores JS críticos de consola.
      expect(filtrarCriticos(errors), `errores JS críticos bajo el tema ${tema.id}`).toEqual([]);
    });
  }
});
