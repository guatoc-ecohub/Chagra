import { test, expect } from '@playwright/test';
import {
  HOME_MODULE_IDS,
  SEGUIMIENTO_KEYS,
  selectHomeModules,
} from '../src/services/homeModuleSelector.js';
import { deriveRole } from '../src/services/profileChipSelector.js';

const ORIGIN = 'http://localhost:5173';
const SCREENSHOT_DIR = 'test-results/entrega';
const KNOWN_CONSOLE_NOISE = [
  'VITE_FARMOS_CLIENT_ID',
  'Failed to load resource: the server responded with a status of 403 (Forbidden)',
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  'wasm streaming compile failed',
  'falling back to ArrayBuffer instantiation',
  'failed to asynchronously prepare wasm',
  'Aborted(both async and sync fetching of the wasm failed)',
  'Exception loading sqlite3 module',
  '[SQLite WASM] Failed to initialize catalog db',
  '[App] Catálogo no se pudo preload',
  '[RAG] No se pudo cargar el catalogo para tier-gate',
  'Ya está corriendo, ignorando start() duplicado',
];

const ROSTER = [
  {
    user: 'carlos.rivera',
    password: 'e2e-carlos-rivera-pwd',
    profile: {
      nombre: 'Carlos Rivera',
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      animales: ['gallinas'],
      cultivos_interes: 'aves',
    },
  },
  {
    user: 'karen',
    password: 'e2e-karen-pwd',
    profile: {
      nombre: 'Karen',
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      animales: ['gallinas'],
      cultivos_interes: 'aves',
    },
  },
  {
    user: 'ana.maria',
    password: 'e2e-ana-maria-pwd',
    profile: {
      nombre: 'Ana Maria',
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'rural',
    },
  },
  {
    user: 'hollman',
    password: 'e2e-hollman-pwd',
    profile: {
      nombre: 'Hollman',
      rol: 'socio',
      vocacion: 'curioso',
    },
  },
  {
    user: 'minambiente',
    password: 'e2e-minambiente-pwd',
    profile: {
      nombre: 'Minambiente',
      rol: 'socio',
      vocacion: 'curioso',
    },
  },
  {
    user: 'minagri-innovacion',
    password: 'e2e-minagri-innovacion-pwd',
    profile: {
      nombre: 'Minagri Innovacion',
      rol: 'socio',
      vocacion: 'curioso',
    },
  },
  {
    user: 'minambiente-paramos',
    password: 'e2e-minambiente-paramos-pwd',
    profile: {
      nombre: 'Minambiente Paramos',
      rol: 'socio',
      vocacion: 'curioso',
      objetivo: ['biodiversidad'],
    },
  },
  {
    user: 'david',
    password: 'e2e-david-pwd',
    profile: {
      nombre: 'David',
      rol: 'tecnico',
      vocacion: 'tecnico',
    },
  },
  {
    user: 'hpsaturn',
    password: 'e2e-hpsaturn-pwd',
    profile: {
      nombre: 'Hpsaturn',
      rol: 'tecnico',
      vocacion: 'tecnico',
    },
  },
];

const EXPECTED_ROLE_BY_USER = {
  'carlos.rivera': 'campesino',
  karen: 'campesino',
  'ana.maria': 'campesino',
  hollman: 'socio',
  minambiente: 'socio',
  'minagri-innovacion': 'socio',
  'minambiente-paramos': 'socio',
  david: 'tecnico',
  hpsaturn: 'tecnico',
};

function stripAccents(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function moduleLabelFor(id) {
  const labels = {
    [HOME_MODULE_IDS.hoyfinca]: 'Hoy en finca',
    [HOME_MODULE_IDS.clima]: 'Clima',
    [HOME_MODULE_IDS.analisis]: 'Análisis',
    [HOME_MODULE_IDS.plantas]: 'Plantas',
    [HOME_MODULE_IDS.zonas]: 'Mis zonas',
    [HOME_MODULE_IDS.insumos]: 'Insumos',
    [HOME_MODULE_IDS.bitacora]: 'Bitácora',
    [HOME_MODULE_IDS.hoy]: 'Hoy',
    [HOME_MODULE_IDS.plagas]: 'Plagas',
    [HOME_MODULE_IDS.biodiversidad]: 'Biodiversidad',
    [HOME_MODULE_IDS.informes]: 'Informes',
  };
  return labels[id] || id;
}

function seguimientoLabelFor(key) {
  const labels = {
    [SEGUIMIENTO_KEYS.reforestacion]: 'Reforestación',
    [SEGUIMIENTO_KEYS.silvopastoreo]: 'Silvopastoreo',
    [SEGUIMIENTO_KEYS.paramo]: 'Páramo',
    [SEGUIMIENTO_KEYS.cerdos]: 'Cerdos',
  };
  return labels[key] || key;
}

async function seedProfile(page, user, profile) {
  await page.addInitScript(
    ({ tenantId, profileJson }) => {
      try {
        window.localStorage.setItem('chagra:active_tenant_id', tenantId);
        window.localStorage.setItem('chagra:profile:v1', profileJson);
      } catch (_) {
        // noop
      }
    },
    { tenantId: user, profileJson: JSON.stringify(profile) },
  );
}

async function mockBackend(context, user) {
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: `${user}-token`,
        refresh_token: `${user}-refresh`,
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );

  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await context.route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }

  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate', '**/chat', '**/chat/stream']) {
    await context.route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      }),
    );
  }
}

async function loginViaAuthService(page, user, password) {
  await page.evaluate(
    async ({ username, pwd }) => {
      const authMod = await import('/src/services/authService.js');
      const tenantMod = await import('/src/services/tenantContext.js');
      const result = await authMod.authenticateUser(username, pwd);
      if (!result.success) {
        throw new Error(result.error || 'authentication failed');
      }
      tenantMod.setActiveTenantId(username);
    },
    { username: user, pwd: password },
  );
}

function expectedModulesFor(user, profile) {
  const opts = {
    esOperador: false,
    esGuiaGlaciar: false,
  };
  return selectHomeModules(profile, opts);
}

test.describe('entrega-pilotos', () => {
  for (const pilot of ROSTER) {
    test(`${pilot.user} ve el home correcto para su perfil`, async ({ context, page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      const seenModules = [];
      const seenSeguimiento = [];
      const profile = pilot.profile;
      const expectedRole = EXPECTED_ROLE_BY_USER[pilot.user];
      const mappedRole = deriveRole(profile);
      const screenshotPath = `${SCREENSHOT_DIR}/${pilot.user}.png`;

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      await seedProfile(page, pilot.user, profile);
      await mockBackend(context, pilot.user);
      await page.goto(ORIGIN);
      await loginViaAuthService(page, pilot.user, pilot.password);
      await page.goto(ORIGIN);
      await page.waitForLoadState('networkidle').catch(() => {});

      const agentButton = page.getByRole('button', { name: 'Ver todo lo que puede hacer Chagra' }).first();
      const homeSnapshot = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return {
          text,
          buttons: Array.from(document.querySelectorAll('button'))
            .map((node) => node.textContent || '')
            .filter(Boolean),
        };
      });

      const { visibles, seguimiento } = expectedModulesFor(pilot.user, profile);
      for (const id of visibles) {
        const label = moduleLabelFor(id);
        if (stripAccents(homeSnapshot.text).includes(stripAccents(label))) {
          seenModules.push(label);
        }
      }
      for (const key of seguimiento) {
        const label = seguimientoLabelFor(key);
        if (stripAccents(homeSnapshot.text).includes(stripAccents(label))) {
          seenSeguimiento.push(label);
        }
      }

      const result = {
        user: pilot.user,
        expectedRole,
        mappedRole,
        screenshotPath,
        hasAgentButton: await agentButton.count().then((count) => count > 0).catch(() => false),
        consoleErrors,
        pageErrors,
        seenModules,
        seenSeguimiento,
      };
      const unexpectedConsoleErrors = consoleErrors.filter(
        (line) => !KNOWN_CONSOLE_NOISE.some((needle) => line.includes(needle)),
      );

      await page.screenshot({ path: screenshotPath, fullPage: true });
      test.info().annotations.push({
        type: 'entrega-pilotos',
        description: JSON.stringify(result),
      });

      const isUrban = ['carlos.rivera', 'karen', 'ana.maria'].includes(pilot.user);
      const isOperatorLike = ['david', 'hpsaturn'].includes(pilot.user);
      const hasCerdos = stripAccents(homeSnapshot.text).includes('cerdos');
      const hasInsumos = stripAccents(homeSnapshot.text).includes('insumos');

      console.log(
        JSON.stringify(
          {
            user: pilot.user,
            mappedRole,
            expectedRole,
            modules: seenModules,
            seguimiento: seenSeguimiento,
            consoleErrors,
            unexpectedConsoleErrors,
            pageErrors,
            screenshotPath,
          },
          null,
          2,
        ),
      );

      expect.soft(result.hasAgentButton, `${pilot.user} debe mostrar el botón Ⓐ`).toBe(true);
      expect.soft(
        unexpectedConsoleErrors,
        `${pilot.user} no debe tener errores de consola fuera del ruido conocido`,
      ).toEqual([]);
      expect.soft(pageErrors, `${pilot.user} no debe tener errores de página`).toEqual([]);
      expect.soft(mappedRole, `${pilot.user} debe mapear al rol real esperado`).toBe(expectedRole);
      expect.soft(seenModules.length, `${pilot.user} debe ver módulos en el home`).toBeGreaterThan(0);

      if (isUrban) {
        expect.soft(hasCerdos, `${pilot.user} no debe ver Cerdos`).toBe(false);
      }

      if (isOperatorLike) {
        expect.soft(hasInsumos, `${pilot.user} con acceso amplio debería ver Insumos`).toBe(true);
      }
    });
  }
});
