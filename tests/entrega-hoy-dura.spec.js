import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

/* eslint-disable chagra-i18n/no-hardcoded-spanish -- Este E2E verifica copy visible existente. */

const require = createRequire(import.meta.url);

const ORIGIN = 'http://localhost:5173';
const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const VIEWPORTS = [
  { name: 'movil-390x844', width: 390, height: 844 },
  { name: 'movil-360x640', width: 360, height: 640 },
];

const USERS = [
  {
    username: 'david',
    displayName: 'David',
    role: 'socio',
    access: 'amplio',
    profile: {
      nombre: 'David',
      rol: 'tecnico',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '1800',
      piso_confirmado: '1',
      objetivo: ['produccion', 'seguimiento'],
      animales: ['cerdos', 'ganado'],
      modulos_visibles: {},
    },
    mustSee: ['Mis plantas', 'Mis zonas', 'Insumos', 'Informes'],
  },
  {
    username: 'steve',
    displayName: 'Steve Cruz',
    role: 'socio',
    access: 'amplio',
    profile: {
      nombre: 'Steve Cruz',
      rol: 'tecnico',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '1700',
      piso_confirmado: '1',
      objetivo: ['produccion', 'seguimiento'],
      animales: ['ganado'],
      modulos_visibles: {},
    },
    mustSee: ['Mis plantas', 'Mis zonas', 'Insumos', 'Informes'],
  },
  {
    username: 'ana.maria',
    displayName: 'Ana Maria',
    role: 'funcionaria_ungrd',
    access: 'institucional',
    profile: {
      nombre: 'Ana Maria',
      rol: 'restaurador',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '3200',
      piso_termico: 'paramo',
      piso_confirmado: '1',
      objetivo: ['biodiversidad', 'restauracion', 'gestion_riesgo'],
      restauracion_objetivo: ['paramo', 'bosque', 'ribera'],
      modulos_visibles: {
        hoyfinca: true,
        clima: true,
        biodiversidad: true,
        analisis: true,
        plantas: false,
        zonas: false,
        insumos: false,
        bitacora: true,
        hoy: true,
        plagas: true,
        informes: true,
      },
    },
    mustSee: ['Clima', 'Alertas', 'ENSO', 'Páramo', 'Restauración'],
    mustNotSee: ['Cerdos', 'Biofábrica / Bodega'],
  },
  {
    username: 'alex',
    displayName: 'Alex',
    role: 'guia_glaciar',
    access: 'la_cordada',
    profile: {
      nombre: 'Alex',
      rol: 'guia_glaciar',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '4200',
      piso_termico: 'paramo',
      piso_confirmado: '1',
      restauracion_objetivo: ['paramo'],
      modulos_visibles: {},
    },
    mustSee: ['Reporte de Punto Glaciar', 'Clima'],
  },
];

function json(data) {
  return JSON.stringify(data);
}

function sseForPrompt(prompt) {
  const text = [
    `Respuesta para ${prompt.slice(0, 42)}.`,
    'Mantengo el mismo hilo y uso el contexto anterior.',
    /planta|tomate|gulupa|cafe/i.test(prompt)
      ? 'La planta registrada queda en seguimiento con riego y observacion semanal.'
      : 'No hay error ni respuesta vacia.',
  ].join(' ');
  return [
    `data: ${json({ choices: [{ delta: { content: text } }] })}\n\n`,
    'data: [DONE]\n\n',
  ].join('');
}

async function mockFarmOS(context) {
  const memory = {
    asset: { plant: [], land: [], material: [], structure: [] },
    log: { observation: [], seeding: [], input: [], activity: [] },
    taxonomy_term: { plant_type: [], material_type: [] },
    user: [],
  };

  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: json({
        access_token: 'e2e-entrega-token',
        refresh_token: 'e2e-entrega-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    }),
  );

  await context.route('**/api/chat', async (route) => {
    const body = route.request().postDataJSON?.() || {};
    const prompt = body.message || body.prompt || body.text || 'consulta';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: json({ message: { content: `Respuesta contextual: ${prompt}` }, done: true }),
    });
  });

  await context.route('**/v1/chat/completions', (route) => {
    const body = route.request().postDataJSON?.() || {};
    const prompt = (body.messages || []).map((m) => m.content).join(' ').slice(-240) || 'consulta';
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sseForPrompt(prompt),
    });
  });

  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await context.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: json({ use_tool: false }) }),
    );
  }

  await context.route('**/api/ollama/api/tags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: json({ models: [{ name: 'granite3.1-dense:8b' }] }),
    }),
  );

  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const match = url.pathname.match(/\/api\/(asset|log|taxonomy_term|user)\/?([^/]*)?/);
    if (!match) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: json({ data: [] }) });
      return;
    }

    const [, root, bundle = ''] = match;
    const rootStore = memory[root] || {};
    const key = bundle || 'default';
    rootStore[key] = rootStore[key] || [];

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: json({ data: rootStore[key], jsonapi: { version: '1.0' } }),
      });
      return;
    }

    if (method === 'POST' || method === 'PATCH') {
      const payload = request.postDataJSON?.() || {};
      const item = payload.data || payload;
      if (item?.id) {
        const existing = rootStore[key].findIndex((row) => row.id === item.id);
        if (existing >= 0) rootStore[key][existing] = item;
        else rootStore[key].push(item);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: json({ data: item || {}, jsonapi: { version: '1.0' } }),
      });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: json({ data: [] }) });
  });
}

async function installHardFailCollectors(page) {
  const state = {
    console: [],
    pageErrors: [],
    badRequests: [],
    requestFailures: [],
  };
  page.__entregaState = state;

  page.on('console', (msg) => {
    if (['warning', 'error'].includes(msg.type())) {
      state.console.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => state.pageErrors.push(err.message));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      state.badRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    state.requestFailures.push(`${request.failure()?.errorText || 'failed'} ${request.url()}`);
  });
}

function takeNewProblems(page) {
  const state = page.__entregaState;
  const out = [
    ...state.console.map((detail) => ({ check: 'console', detail })),
    ...state.pageErrors.map((detail) => ({ check: 'pageerror', detail })),
    ...state.badRequests.map((detail) => ({ check: 'request>=400', detail })),
    ...state.requestFailures.map((detail) => ({ check: 'requestfailed', detail })),
  ];
  state.console = [];
  state.pageErrors = [];
  state.badRequests = [];
  state.requestFailures = [];
  return out;
}

async function assertScreenLimpia(page, nombre) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
  await page.addScriptTag({ content: AXE_SOURCE });

  const problems = takeNewProblems(page);

  const domProblems = await page.evaluate(async () => {
    const visible = (el) => {
      if (!(el instanceof HTMLElement)) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    const out = [];
    const bodyText = document.body?.innerText || '';
    const garbage = [
      /\bundefined\b/i,
      /\bnull\b/i,
      /\bNaN\b/,
      /\[object Object\]/,
      /\bInvalid Date\b/i,
      /(?:^|\s)[a-z][a-z0-9_-]+\.[a-z][a-z0-9_.-]+(?:\s|$)/,
    ];
    for (const pattern of garbage) {
      if (pattern.test(bodyText)) out.push({ check: 'texto basura visible', detail: String(pattern) });
    }

    for (const img of [...document.images].filter(visible)) {
      if (img.complete && img.naturalWidth === 0) {
        out.push({ check: 'imagen rota', detail: img.currentSrc || img.src || img.alt || 'img sin src' });
      }
    }

    const root = document.documentElement;
    if (root.scrollWidth > window.innerWidth + 2) {
      out.push({
        check: 'overflow horizontal',
        detail: `scrollWidth=${root.scrollWidth}, viewport=${window.innerWidth}`,
      });
    }

    const selectors = 'button,a,input,select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])';
    for (const el of [...document.querySelectorAll(selectors)].filter(visible)) {
      const rect = el.getBoundingClientRect();
      const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.value || '').trim();
      if (!name && !el.closest('[aria-hidden="true"]')) {
        out.push({ check: 'interactivo sin nombre accesible', detail: el.outerHTML.slice(0, 180) });
      }
      if ((rect.width < 40 || rect.height < 40) && el.tagName !== 'A') {
        out.push({
          check: 'tap target menor a 40px',
          detail: `${name || el.tagName}: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
      const position = getComputedStyle(el).position;
      const fixedLike = position === 'fixed' || position === 'sticky';
      const isHorizontallyOutside = rect.left < -2 || rect.right > window.innerWidth + 2;
      const isHiddenAboveViewport = rect.bottom < -2;
      const fixedEscapesViewport = fixedLike && (rect.top < -2 || rect.bottom > window.innerHeight + 2);
      if (isHorizontallyOutside || isHiddenAboveViewport || fixedEscapesViewport) {
        out.push({
          check: 'contenido fuera del viewport',
          detail: `${name || el.tagName}: ${JSON.stringify({
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
          })}`,
        });
      }
    }

    const unresolvedLoading = [...document.querySelectorAll('body *')]
      .filter(visible)
      .filter((el) => /cargando|guardando|procesando/i.test(el.innerText || '') || el.className?.toString().includes('animate-spin'))
      .map((el) => (el.innerText || el.getAttribute('aria-label') || el.className?.toString() || el.tagName).trim().slice(0, 120));
    if (unresolvedLoading.length > 0) {
      out.push({ check: 'spinner o cargando no resuelto', detail: unresolvedLoading.slice(0, 5).join(' | ') });
    }

    const blankCards = [...document.querySelectorAll('button, [role="button"], section, article, .rounded-2xl, .rounded-xl')]
      .filter(visible)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 60) return false;
        const text = (el.innerText || '').trim();
        const bg = getComputedStyle(el).backgroundColor;
        return text.length === 0 && (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 0)');
      });
    if (blankCards.length > 0) {
      out.push({ check: 'tarjeta/flash blanco sin estilo', detail: `${blankCards.length} elementos vacios grandes` });
    }

    const axe = await window.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    for (const violation of axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact))) {
      out.push({
        check: `axe ${violation.impact}`,
        detail: `${violation.id}: ${violation.help} (${violation.nodes.length} nodos)`,
      });
    }

    return out;
  });

  problems.push(...domProblems);
  if (problems.length > 0) {
    const report = problems.map((p) => `- pantalla=${nombre}; check=${p.check}; detalle=${p.detail}`).join('\n');
    throw new Error(`Pantalla sucia: ${nombre}\n${report}`);
  }
}

async function seedProfile(page, user) {
  await page.evaluate(async ({ username, profile }) => {
    const profileMod = await import('/src/services/userProfileService.js');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
    profileMod.saveProfile(profile);
    localStorage.setItem('chagra:onboarding:done', '1');
  }, { username: user.username, profile: user.profile });
}

async function login(page, user) {
  await page.goto(ORIGIN);
  await expect(page.getByRole('textbox', { name: /usuario/i })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('textbox', { name: /usuario/i }).fill(user.username);
  await page.locator('input[type="password"]').fill('e2e-pass');
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByText(/Soy Chagra|Cola de tareas|Mis plantas/i).first()).toBeVisible({ timeout: 25_000 });
}

async function navigate(page, view) {
  await page.evaluate((target) => {
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: target } }));
  }, view);
}

async function expectHomeModules(page, user) {
  await navigate(page, 'dashboard');
  for (const label of user.mustSee || []) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  }
  for (const label of user.mustNotSee || []) {
    await expect(page.getByText(label, { exact: false })).toHaveCount(0);
  }
}

async function sendAgentQuestion(page, text) {
  await navigate(page, 'agente');
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible({ timeout: 20_000 });
  await textarea.fill(text);
  await textarea.press('Enter');
  const chat = page.locator('[data-testid="chat-scroll"]');
  await expect(chat).toBeVisible({ timeout: 20_000 });
  await expect(chat).toContainText(/Respuesta|contexto|seguimiento|planta/i, { timeout: 30_000 });
  const chatText = await chat.innerText();
  expect(chatText).not.toMatch(/^\s*$/);
  expect(chatText).not.toMatch(/Tiempo agotado|error|fall[oó]/i);
}

async function addAssetsThroughAppStore(page, user) {
  const stamp = `${user.username}-${Date.now()}`;
  const data = {
    zoneName: `Zona entrega ${stamp}`,
    plantName: `Tomate entrega ${stamp}`,
    materialName: `Bokashi entrega ${stamp}`,
    profileName: `${user.displayName} entrega`,
  };

  await page.evaluate(async ({ data }) => {
    const storeMod = await import('/src/store/useAssetStore.js');
    const profileMod = await import('/src/services/userProfileService.js');
    const { newUlid } = await import('/src/utils/id.js');
    const store = storeMod.default.getState();
    await store.hydrate();

    const landId = newUlid();
    const plantId = newUlid();
    const materialId = newUlid();
    await store.addAsset('land', {
      id: landId,
      type: 'asset--land',
      attributes: { name: data.zoneName, land_type: 'field', status: 'active' },
      _pending: true,
    });
    await store.addAsset('plant', {
      id: plantId,
      type: 'asset--plant',
      attributes: { name: data.plantName, status: 'active' },
      relationships: {
        parent: { data: [{ type: 'asset--land', id: landId }] },
        location: { data: [{ type: 'asset--land', id: landId }] },
      },
      _pending: true,
    });
    await store.addAsset('material', {
      id: materialId,
      type: 'asset--material',
      attributes: { name: data.materialName, inventory_value: '12', inventory_unit: 'kg', status: 'active' },
      _pending: true,
    });
    profileMod.saveProfile({ nombre: data.profileName, seguimiento_entrega: 'verificado' });
  }, { data });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const storeMod = await import('/src/store/useAssetStore.js');
    await storeMod.default.getState().hydrate();
  });

  const persisted = await page.evaluate(({ data }) => {
    const rawProfile = JSON.parse(localStorage.getItem('chagra:profile:v1') || '{}');
    const state = window.__CHAGRA_ENTREGA_READ_STATE__ || null;
    return import('/src/store/useAssetStore.js').then((storeMod) => {
      const s = storeMod.default.getState();
      return {
        state,
        hasZone: s.lands.some((x) => x.attributes?.name === data.zoneName),
        hasPlant: s.plants.some((x) => x.attributes?.name === data.plantName),
        hasMaterial: s.materials.some((x) => x.attributes?.name === data.materialName),
        hasProfile: rawProfile.nombre === data.profileName && rawProfile.seguimiento_entrega === 'verificado',
      };
    });
  }, { data });

  expect(persisted.hasZone, 'zona guardada reaparece tras recargar').toBe(true);
  expect(persisted.hasPlant, 'planta guardada reaparece tras recargar').toBe(true);
  expect(persisted.hasMaterial, 'insumo guardado reaparece tras recargar').toBe(true);
  expect(persisted.hasProfile, 'perfil/seguimiento guardado reaparece tras recargar').toBe(true);
  return data;
}

async function runEntregaFlow(page, context, user, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await mockFarmOS(context);
  await installHardFailCollectors(page);

  await login(page, user);
  await assertScreenLimpia(page, `${user.username}/${viewport.name}/login`);

  await seedProfile(page, user);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectHomeModules(page, user);
  await assertScreenLimpia(page, `${user.username}/${viewport.name}/onboarding-y-home`);

  const questions = [
    `Soy ${user.displayName}. Dame el resumen de mi contexto.`,
    'Sigue con el mismo hilo: dime el riesgo principal para hoy.',
    'Conserva el contexto: dame una accion prioritaria.',
    'Cierra este hilo con una verificacion breve.',
    user.username === 'ana.maria'
      ? 'Otro tema: clima, alertas, ENSO, incendios, paramo y restauracion.'
      : 'Otro tema: inventario y seguimiento de finca.',
  ];
  for (const [idx, question] of questions.entries()) {
    await sendAgentQuestion(page, question);
    await assertScreenLimpia(page, `${user.username}/${viewport.name}/agente-consulta-${idx + 1}`);
  }

  const saved = await addAssetsThroughAppStore(page, user);
  await assertScreenLimpia(page, `${user.username}/${viewport.name}/guardar-planta-zona-insumo-perfil`);

  await sendAgentQuestion(page, `Consulta sobre la planta ${saved.plantName}: que hago esta semana?`);
  await assertScreenLimpia(page, `${user.username}/${viewport.name}/agente-planta`);

  await navigate(page, 'dashboard');
  await expectHomeModules(page, user);
  await page.screenshot({
    path: path.join('/tmp', `entrega-${user.username}-${viewport.name}-final.png`),
    fullPage: false,
  });
  await assertScreenLimpia(page, `${user.username}/${viewport.name}/home-final`);
}

test.describe('Entrega hoy dura', () => {
  for (const viewport of VIEWPORTS) {
    for (const user of USERS) {
      test(`${user.username} - ${viewport.name}`, async ({ page, context }) => {
        await runEntregaFlow(page, context, user, viewport);
      });
    }
  }
});
