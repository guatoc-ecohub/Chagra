/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Fixtures visuales fijas para screenshots. */
import { Buffer } from 'node:buffer';
import { expect } from '@playwright/test';

export const FIXED_ISO = '2026-06-17T10:30:00-05:00';
export const FIXED_MS = new Date(FIXED_ISO).getTime();
export const DESKTOP = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };

export const PROFILES = {
  campesino: {
    user: 'visual-campesino',
    label: 'campesino',
    profile: {
      nombre: 'Carlos Rivera',
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      finca_altitud: '1730',
      piso_termico: 'templado',
      piso_confirmado: '1',
      cultivos_actuales: 'cafe, platano, maiz',
      animales: ['gallinas'],
      objetivo: ['producir_mas', 'reducir_quimicos'],
    },
  },
  urbano: {
    user: 'visual-urbano',
    label: 'urbano',
    profile: {
      nombre: 'Laura Gomez',
      rol: 'urbano',
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      finca_altitud: '2600',
      piso_termico: 'frio',
      piso_confirmado: '1',
      cultivos_actuales: 'aromaticas, lechuga',
      animales: [],
    },
  },
  institucional: {
    user: 'visual-institucional',
    label: 'institucional',
    profile: {
      nombre: 'Equipo tecnico',
      rol: 'institucional',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '2100',
      piso_termico: 'frio',
      piso_confirmado: '1',
      objetivo: ['biodiversidad', 'reportes'],
    },
  },
  operador: {
    user: 'op-test',
    label: 'operador',
    profile: {
      nombre: 'Operador Chagra',
      rol: 'operador',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '1900',
      piso_termico: 'templado',
      piso_confirmado: '1',
      animales: ['cerdos', 'ganado', 'gallinas'],
      objetivo: ['operacion'],
    },
  },
  porcicultor: {
    user: 'visual-porcicultor',
    label: 'porcicultor',
    profile: {
      nombre: 'Marta Porcicultora',
      rol: 'ganadero',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      finca_altitud: '1450',
      piso_termico: 'templado',
      piso_confirmado: '1',
      animales: ['cerdos'],
      objetivo: ['porcicultura'],
    },
  },
  guia_glaciar: {
    user: 'alex',
    label: 'guia_glaciar',
    profile: {
      nombre: 'Alex Guia',
      rol: 'guia_glaciar',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '4200',
      piso_termico: 'paramo',
      piso_confirmado: '1',
      restauracion_objetivo: ['paramo'],
      objetivo: ['glaciar', 'biodiversidad'],
    },
  },
};

export const MAIN_SCREENS = [
  { id: 'home', hash: '' },
  {
    id: 'agente',
    hash: 'agente',
    mask: [
      '[data-testid="agent-response"]',
      '.as-stream-panel',
      '.as-cap',
      '[class*="Agent"]',
      '[class*="agent"]',
      '[class*="Avatar"]',
      '[class*="avatar"]',
      '[class*="stream"]',
      '[class*="pulse"]',
      '[class*="glow"]',
    ],
  },
  { id: 'perfil', hash: 'perfil' },
  { id: 'mis-zonas', hash: 'inventario' },
  { id: 'insumos', view: 'bodega' },
  { id: 'informes', hash: 'informes' },
  { id: 'seguimiento-reforestacion', view: 'seguimiento_reforestacion' },
  { id: 'seguimiento-silvopastoreo', view: 'seguimiento_silvopastoreo' },
  { id: 'seguimiento-paramo', view: 'seguimiento_paramo' },
  { id: 'seguimiento-cerdos', view: 'seguimiento_cerdos' },
  { id: 'carbono', view: 'seguimiento_reforestacion', openFirstItem: true, locator: '[data-testid="carbono-psa-subvista"]', states: ['with-data', 'offline'] },
  { id: 'aprender', view: 'help' },
  { id: 'onboarding', path: '/tests/visual/onboarding-harness.html' },
  { id: 'glaciar', hash: 'glaciar', profiles: ['guia_glaciar', 'operador'] },
];

export async function installDeterminism(context, page, { profileKey = 'campesino' } = {}) {
  const profileDef = PROFILES[profileKey];
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const accept = request.headers().accept || '';

    if (url.pathname.endsWith('/oauth/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'visual-token',
          refresh_token: 'visual-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });
    }

    if (
      url.pathname.includes('/api/') ||
      url.pathname.includes('/jsonapi/') ||
      url.pathname.includes('/oauth/') ||
      url.hostname.includes('open-meteo') ||
      url.hostname.includes('ollama') ||
      (url.hostname.includes('localhost') && url.port !== '5173')
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureResponse(url.pathname)),
      });
    }

    if (url.origin !== 'http://localhost:5173' && url.origin !== 'http://127.0.0.1:5173') {
      if (accept.includes('image')) {
        return route.fulfill({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6H1JAAAAABJRU5ErkJggg==',
            'base64',
          ),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
    }

    return route.continue();
  });

  await page.addInitScript(({ fixedMs, profile, user }) => {
    const OriginalDate = Date;
    class FixedDate extends OriginalDate {
      constructor(...args) {
        super(...(args.length === 0 ? [fixedMs] : args));
      }
      static now() {
        return fixedMs;
      }
    }
    FixedDate.UTC = OriginalDate.UTC;
    FixedDate.parse = OriginalDate.parse;
    FixedDate.prototype = OriginalDate.prototype;
    window.Date = FixedDate;

    const noop = () => {};
    window.requestAnimationFrame = (cb) => window.setTimeout(() => cb(fixedMs), 16);
    window.cancelAnimationFrame = window.clearTimeout;
    window.scrollTo = noop;
    window.matchMedia = window.matchMedia || ((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }));
    window.localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    window.localStorage.setItem('chagra:profile:done:v1', '1');
    window.localStorage.setItem('chagra:onboarding:done', '1');
    window.localStorage.setItem('chagra:active_tenant_id', user);
    window.localStorage.setItem('chagra:visual-regression', '1');
  }, { fixedMs: FIXED_MS, profile: profileDef.profile, user: profileDef.user });

  page.on('console', (msg) => {
    const text = msg.text();
    if (
      msg.type() === 'error' &&
      !/sqlite|wasm|content security policy|csp|favicon|manifest|WebGL|Failed to load resource|ArrayBuffer instantiation|Error obteniendo tareas de FarmOS|Error obteniendo tareas pendientes/i.test(text)
    ) {
      throw new Error(`Console error in visual test: ${text}`);
    }
  });
}

export async function loginAndSeed(page, state = 'empty') {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await seedAuthToken(page);
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await seedIndexedDb(page, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}

export async function gotoScreen(page, screen) {
  if (screen.path) {
    await page.goto(screen.path, { waitUntil: 'domcontentloaded' });
  } else if (screen.view) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.evaluate((view) => {
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view } }));
    }, screen.view);
  } else {
    await page.goto(`/${screen.hash ? `#${screen.hash}` : ''}`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await stabilizeVisualPage(page);

  if (screen.openFirstItem) {
    const firstItem = page.locator('ul button').first();
    if (await firstItem.count()) {
      await firstItem.click();
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      await stabilizeVisualPage(page);
    }
  }
}

export async function captureScreen(page, screen, profileKey, state, viewportName, viewport) {
  await page.setViewportSize(viewport);
  await stabilizeVisualPage(page);
  const subject = screen.locator ? page.locator(screen.locator).first() : page;
  const mask = await resolveMasks(page, screen.mask || []);
  await expect(subject).toHaveScreenshot(`${screen.id}-${profileKey}-${state}-${viewportName}.png`, {
    fullPage: !screen.locator,
    mask,
    timeout: 30_000,
  });
}

export async function setOfflineState(_context, page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.localStorage.setItem('chagra:visual-offline', '1');
  });
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.localStorage.setItem('chagra:visual-offline', '1');
    window.dispatchEvent(new Event('offline'));
  });
}

async function stabilizeVisualPage(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      [class*="animate-"], .animate-pulse, .animate-spin, .animate-bounce {
        animation: none !important;
      }
      canvas, .biopunk-background, [class*="Biopunk"], [class*="constel"] {
        visibility: hidden !important;
      }
      [data-visual-dynamic], time, .timestamp, .relative-time {
        visibility: hidden !important;
      }
    `,
  }).catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

async function resolveMasks(page, selectors) {
  const masks = [page.locator('time'), page.locator('[data-visual-dynamic]')];
  for (const selector of selectors) masks.push(page.locator(selector));
  return masks;
}

function fixtureResponse(pathname) {
  if (pathname.includes('/jsonapi/asset/')) return { data: [] };
  if (pathname.includes('/jsonapi/log/')) return { data: [] };
  if (pathname.includes('/forecast')) {
    return {
      current: { temperature_2m: 18.4, precipitation: 0, wind_speed_10m: 3 },
      daily: { time: ['2026-06-17'], temperature_2m_min: [11], temperature_2m_max: [22] },
    };
  }
  return { data: [] };
}

async function seedIndexedDb(page, state) {
  await page.evaluate(async ({ state, fixedMs }) => {
    const DB_NAME = 'ChagraDB';
    // Debe coincidir con DB_VERSION exportado en src/db/dbCore.js. Corre en
    // contexto de browser (page.evaluate) → no se puede importar; mantener
    // sincronizado a mano. Abrir con version < existente lanza VersionError.
    const DB_VERSION = 27;
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const tx = db.transaction([
      'assets',
      'logs',
      'inventory_stock_snapshot',
      'farm_processes',
      'farm_process_events',
      'glaciar_reportes',
    ], 'readwrite');
    for (const store of Array.from(tx.objectStoreNames)) {
      tx.objectStore(store).clear();
    }

    if (state !== 'empty') {
      const assets = fixtureAssets(fixedMs);
      assets.forEach((asset) => tx.objectStore('assets').put(asset));
      fixtureLogs(fixedMs).forEach((log) => tx.objectStore('logs').put(log));
      fixtureInventory().forEach((item) => tx.objectStore('inventory_stock_snapshot').put(item));
      fixtureProcesses(fixedMs).forEach((process) => tx.objectStore('farm_processes').put(process));
      fixtureProcessEvents(fixedMs).forEach((event) => tx.objectStore('farm_process_events').put(event));
      tx.objectStore('glaciar_reportes').put(fixtureGlaciarReport(fixedMs));
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();

    function fixtureAssets(now) {
      return [
        {
          id: 'asset-land-visual-1',
          type: 'asset--land',
          asset_type: 'land',
          _tenant_id: localStorage.getItem('chagra:active_tenant_id'),
          cached_at: now,
          attributes: {
            name: 'Lote La Esperanza',
            land_type: 'field',
            status: 'active',
            intrinsic_geometry: { value: 'POINT(-73.93 4.58)' },
          },
        },
        {
          id: 'asset-plant-visual-1',
          type: 'asset--plant',
          asset_type: 'plant',
          _tenant_id: localStorage.getItem('chagra:active_tenant_id'),
          cached_at: now,
          attributes: { name: 'Cafe Castillo', status: 'active', plant_type: 'cafe' },
          relationships: { parent: { data: { type: 'asset--land', id: 'asset-land-visual-1' } } },
        },
        {
          id: 'asset-material-visual-1',
          type: 'asset--material',
          asset_type: 'material',
          _tenant_id: localStorage.getItem('chagra:active_tenant_id'),
          cached_at: now,
          attributes: { name: 'Bocashi maduro', status: 'active', inventory_value: 42, unit: 'kg' },
        },
      ];
    }

    function fixtureLogs(now) {
      const timestamp = Math.floor(now / 1000);
      return [
        {
          id: 'log-observation-visual-1',
          type: 'log--observation',
          asset_id: 'asset-plant-visual-1',
          timestamp,
          name: 'Observacion visual de cafe',
          status: 'done',
          _tenant_id: localStorage.getItem('chagra:active_tenant_id'),
          attributes: { name: 'Observacion visual de cafe', timestamp, status: 'done', notes: 'Buen vigor, revisar sombra.' },
          relationships: { asset: { data: [{ type: 'asset--plant', id: 'asset-plant-visual-1' }] } },
        },
        {
          id: 'log-input-visual-1',
          type: 'log--input',
          asset_id: 'asset-plant-visual-1',
          timestamp: timestamp - 86400,
          name: 'Aplicacion de bocashi',
          status: 'done',
          _tenant_id: localStorage.getItem('chagra:active_tenant_id'),
          quantity: { value: 3, unit: 'kg' },
          attributes: { name: 'Aplicacion de bocashi', timestamp: timestamp - 86400, status: 'done', quantity: { value: 3, unit: 'kg' } },
          relationships: { asset: { data: [{ type: 'asset--plant', id: 'asset-plant-visual-1' }] } },
        },
      ];
    }

    function fixtureInventory() {
      return [
        { item_id: 'asset-material-visual-1', name: 'Bocashi maduro', current_stock: 42, unit: 'kg', updated_at: fixedMs },
      ];
    }

    function fixtureProcesses(now) {
      const tenant = localStorage.getItem('chagra:active_tenant_id');
      const base = {
        type: 'farm_process',
        _tenant_id: tenant,
      };
      return [
        process('visual-reforestacion-1', 'restoration', 'Roble andino', 120, 'arboles', 'prendimiento'),
        process('visual-silvopastoreo-1', 'silvopasture', 'Boton de oro en potreros', 80, 'arboles', 'mantenimiento'),
        process('visual-paramo-1', 'paramo', 'Nacimiento El Frailejon', 2, 'hectareas', 'aislamiento'),
        {
          ...process('visual-cerdos-1', 'pigs', 'Lote engorde junio', 14, 'animales', 'alimentacion'),
          attributes: {
            ...process('visual-cerdos-1', 'pigs', 'Lote engorde junio', 14, 'animales', 'alimentacion').attributes,
            pig_cochera: { nombre: 'Cochera El Mango', ubicacion: 'Costado norte', capacidad: 18, cama_profunda: true },
            pig_lotes: [{ raza: 'Duroc x Pietrain', fecha_ingreso: '2026-05-20', cantidad: 14, peso_inicial: 23 }],
          },
        },
      ];

      function process(id, processType, label, quantity, unit, stage) {
        return {
          ...base,
          process_id: id,
          attributes: {
            process_type: processType,
            subject_kind: 'aggregate',
            subject_slug: '',
            subject_label: label,
            quantity,
            unit,
            area_ha: processType === 'restoration' ? 1.2 : undefined,
            location_land_asset_id: 'asset-land-visual-1',
            status: 'active',
            current_stage: stage,
            created_at: now - 86400000 * 30,
            updated_at: now,
            notes: 'Dato visual fijo para regresion.',
          },
        };
      }
    }

    function fixtureProcessEvents(now) {
      return ['visual-reforestacion-1', 'visual-silvopastoreo-1', 'visual-paramo-1', 'visual-cerdos-1'].map((id, idx) => ({
        event_id: `visual-event-${idx + 1}`,
        type: 'farm_process_event',
        attributes: {
          process_id: id,
          event_type: 'observation',
          occurred_at: now - idx * 3600000,
          actor: 'operator',
          payload: { text: 'Avance estable observado en campo.' },
          source: 'operator',
        },
      }));
    }

    function fixtureGlaciarReport(now) {
      return {
        id: 'visual-glaciar-1',
        createdAt: now - 86400000,
        estado: 'precaucion',
        guia: 'Alex Guia',
        puntoNombre: 'Punto Laguna Norte',
        lat: 4.8123,
        lng: -75.3421,
        altitud: 4210,
        precision: 8,
        dureza: 'piolet',
        grietas: 'pequenas',
        aguaSuperficial: 'media',
        clima: 'nublado',
        notas: 'Linea de referencia visual estable.',
      };
    }
  }, { state, fixedMs: FIXED_MS });
}

async function seedAuthToken(page) {
  await page.evaluate(async ({ fixedMs }) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('Chagra');
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('syncQueue')) {
          req.result.createObjectStore('syncQueue');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!db.objectStoreNames.contains('syncQueue')) {
      const nextVersion = db.version + 1;
      db.close();
      const upgraded = await new Promise((resolve, reject) => {
        const req = indexedDB.open('Chagra', nextVersion);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('syncQueue')) {
            req.result.createObjectStore('syncQueue');
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await putTokens(upgraded);
      upgraded.close();
      return;
    }

    await putTokens(db);
    db.close();

    function putTokens(openedDb) {
      return new Promise((resolve, reject) => {
        const tx = openedDb.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        store.put('visual-token', 'farmos_access_token');
        store.put('visual-refresh', 'farmos_refresh_token');
        store.put(fixedMs + 3600_000, 'farmos_token_expiry');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }
  }, { fixedMs: FIXED_MS });
}
