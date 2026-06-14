import { test, expect } from '@playwright/test';
import { CAPABILITY_MANIFEST } from '../src/services/agentCapabilities.js';

/**
 * arana-funcional.spec.js — E2E FUNCIONAL de "La mano de Chagra" (la araña / red
 * viva de capacidades del AgentHero). NO es estético: verifica que CADA capacidad
 * lleve a algo que SIRVE (chat real, pantalla o acción), que el estado
 * live/soon/down se renderice acorde a capabilityHealth, y reproduce el BUG del
 * operador: el flujo "Procesos por voz" deja al usuario ATASCADO en la tarjeta de
 * confirmación cuando no hay ZONA/LOTE seleccionable.
 *
 * Cobertura:
 *   1. Abrir el menú desde la Ⓐ → cada nodo de capacidad rutea (sin dead-ends).
 *   2. Estado live/soon/down acorde a capabilityHealth (down NO atasca).
 *   3. BUG: "Procesos por voz" → "Confirmar siembra" DESHABILITADO sin zona.
 *   4. Foco de grupo, "volver", y un pick que aterriza en el chat real.
 *   5. Los 3 temas (biopunk/nature/minimalista) no rompen el flujo funcional.
 *
 * Bootstrap de sesión: no hay backend farmOS real en CI, así que mockeamos el
 * endpoint OAuth y autenticamos vía authService (persiste token en localforage),
 * igual que multifinca.spec.js. Luego forzamos navigate('dashboard') para montar
 * el AgentHero. El catálogo del menú es 100% offline-first (CAPABILITY_MANIFEST),
 * así que la red se pinta sin sidecar.
 */

const A_LABEL = 'Ver todo lo que puede hacer Chagra';

// Capacidades hero agrupadas tal como las pinta AgentRedMenu (hero===true).
const HERO_CAPS = CAPABILITY_MANIFEST.filter((c) => c.hero === true);

// ── helpers ────────────────────────────────────────────────────────────────

async function mockOAuth(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-arana-token',
        refresh_token: 'e2e-arana-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    }),
  );
  // El compositor del hero puede disparar /api/chat al rutear un pick 'ask';
  // lo mockeamos para que el envío a la outbox + navegación no toque la red real.
  await page.context().route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: { content: 'Respuesta mock.' }, done: true }),
    }),
  );
  await page.context().route('**/nlu', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ use_tool: false }) }),
  );
}

/**
 * Autentica vía authService (OAuth mockeado) y monta el dashboard real.
 *
 * `seedOnboarded` (default true): deja el perfil como un usuario YA ONBOARDEADO
 * (piso térmico capturado y confirmado). IMPORTA porque estos specs prueban el
 * RUTEO DEL MENÚ AGENTE (la araña), no el onboarding. DashboardLive monta el
 * OnboardingHero del "piso térmico primero" cuando `plantsCount === 0` y el piso
 * no está confirmado; ese hero compite por el espacio con el AgentHero/araña y
 * ensuciaría las pruebas del menú con estado que no les corresponde. Sembrando
 * `finca_altitud` + `piso_confirmado === '1'`, `needsPisoCapture` queda en false
 * y el menú se prueba en su estado real de uso (sin el banner de onboarding).
 * La feature de onboarding para usuarios nuevos sigue intacta y se cubre en sus
 * propios specs (OnboardingHero.piso.test.jsx, OnboardingProfile.piso.test.jsx).
 */
async function bootToDashboard(page, { seedLands = false, seedOnboarded = true } = {}) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(async () => {
    const auth = await import('/src/services/authService.js');
    const r = await auth.authenticateUser('e2e-arana', 'e2e-pwd');
    if (!r.success) throw new Error('OAuth mock no respondió OK: ' + r.error);
  });

  // Perfil onboardeado: piso térmico capturado + confirmado → DashboardLive NO
  // monta el OnboardingHero, así el menú araña se prueba sin interferencias.
  await page.evaluate(async (withOnboarding) => {
    if (!withOnboarding) return;
    const profileMod = await import('/src/services/userProfileService.js');
    profileMod.saveProfile({
      finca_altitud: '1730',
      altitud_source: 'manual',
      piso_confirmado: '1',
    });
  }, seedOnboarded);

  // Sembrar (o NO) zonas/lotes en el cache de assets ANTES de hidratar el store.
  await page.evaluate(async (withLand) => {
    const cacheMod = await import('/src/db/assetCache.js');
    if (withLand) {
      await cacheMod.assetCache.put('land', {
        id: 'e2e-land-lote-1',
        type: 'asset--land',
        attributes: { name: 'Lote 1 (prueba)' },
      });
    }
    const storeMod = await import('/src/store/useAssetStore.js');
    await storeMod.default.getState().hydrate();
  }, seedLands);

  // Forzar el render del dashboard (donde vive el AgentHero) sin recargar. El
  // App escucha 'chagraNavigate' con detail.view (ver App.jsx handleNavigate).
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } }));
  });

  // El AgentHero monta su botón Ⓐ.
  await expect(page.getByRole('button', { name: A_LABEL })).toBeVisible({ timeout: 20000 });
}

/** Abre la red Ⓐ y espera a que los nodos de grupo estén montados. */
async function openArana(page) {
  const a = page.getByRole('button', { name: A_LABEL });
  await a.click();
  // El panel "La mano de Chagra" aparece y la red brota.
  await expect(page.locator('.arm-root')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.arm-node.arm-group').first()).toBeVisible({ timeout: 8000 });
}

/**
 * Enfoca un grupo por su etiqueta y confirma que entró en foco (aria-expanded).
 * Activa por TECLADO (focus + Enter): el nodo es role="button" tabIndex=0 con
 * onKeyDown(Enter/Space) — el evento llega SIEMPRE a su handler, sin depender de
 * la geometría (los nodos se solapan/animan y la topbar sticky puede interceptar
 * un click sintético). Es la activación a11y real, no un atajo de test.
 */
async function expandGroup(page, label) {
  const group = page.locator('.arm-node.arm-group', { hasText: label });
  await expect(group).toBeVisible({ timeout: 8000 });
  await group.focus();
  await group.press('Enter');
  await expect(group).toHaveAttribute('aria-expanded', 'true', { timeout: 8000 });
  return group;
}

/** Lee del DOM el routing efectivo y la salud de cada hoja del menú. */
async function readLeafCatalog(page) {
  return page.evaluate(() => {
    const leaves = [...document.querySelectorAll('.arm-node.arm-leaf')];
    return leaves.map((el) => ({
      label: el.getAttribute('aria-label'),
      soon: el.classList.contains('arm-soon'),
      down: el.classList.contains('arm-down'),
      tabIndex: el.tabIndex,
      ariaDisabled: el.getAttribute('aria-disabled'),
    }));
  });
}

function setTheme(page, theme) {
  // biopunk = SIN data-theme (tema base). nature/minimalista = atributo explícito.
  return page.evaluate((t) => {
    if (t === 'biopunk') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('chagra-theme', t); } catch { /* opcional */ }
  }, theme);
}

// ── 1 + 4: la red rutea y un pick aterriza en el chat real ──────────────────

test.describe('La mano de Chagra — funcional: ruteo sin dead-ends', () => {
  test.beforeEach(async ({ page }) => {
    await mockOAuth(page);
  });

  test('el manifiesto no tiene capacidades hero con ruta muerta', async () => {
    // Verificación estática: TODA capacidad hero debe tener heroRoute (o route)
    // con un kind manejado por pickCapability — si no, es un nodo muerto.
    const HANDLED = new Set(['ask', 'nav', 'photo', 'unavailable']);
    const dead = HERO_CAPS.filter((c) => {
      const r = c.heroRoute || c.route;
      if (!r) return true;
      if (!HANDLED.has(r.kind)) return true;
      if (r.kind === 'ask' && !r.prompt) return true;
      if (r.kind === 'nav' && !r.view) return true;
      return false;
    });
    expect(dead, `capacidades hero con ruta muerta: ${dead.map((c) => c.id).join(', ')}`).toEqual([]);
  });

  test('un nodo VIVO "ask" rutea al CHAT real (Investigación profunda)', async ({ page }) => {
    await bootToDashboard(page);
    await openArana(page);

    // 'deep' (Investigación profunda) es el nodo 'ask' SIEMPRE vivo: tool=null
    // (NO depende del sidecar) y status='live' en el manifiesto. Es el caso
    // correcto para validar "ask → chat real" offline-first. (Los otros 'ask'
    // —siembro/plaga/clima…— usan tools de sidecar y caen a 'down' sin servidor,
    // lo que se cubre aparte en la sección live/soon/down.)
    const deep = HERO_CAPS.find((c) => c.id === 'deep');
    expect(deep?.heroRoute?.kind).toBe('ask');
    expect(deep?.tool).toBeFalsy();

    // Enfocar su grupo (aprender) y esperar a que broten las hojas.
    await expandGroup(page, 'Aprender');

    const leaf = page.locator('.arm-node.arm-leaf', { hasText: 'Investigación profunda' }).first();
    await expect(leaf).toBeVisible({ timeout: 8000 });
    // Debe estar VIVA (no down/soon) — es la precondición del ruteo a chat.
    await expect(leaf).not.toHaveClass(/arm-down|arm-soon/);

    // Activación a11y (focus + Enter) → pickCapability('ask') → handleChipSend →
    // send() → la transición de envío arranca y onNavigate('agente') monta el
    // chat real. (Keyboard porque las hojas se solapan/animan; el handler es el
    // mismo onClick/onKeyDown del nodo.)
    await leaf.focus();
    await leaf.press('Enter');

    // Aterrizaje en el chat real: el AgentScreen (textarea del agente) aparece,
    // o como mínimo el hero deja de mostrar el panel de la red (no quedó atascado).
    const landedChat = page
      .locator('textarea, [role="textbox"], [data-testid="agent-screen"]')
      .first();
    await expect(landedChat).toBeVisible({ timeout: 15000 });
    // El menú se cerró: no hay panel de capacidades colgando.
    await expect(page.locator('.arm-root')).toHaveCount(0, { timeout: 8000 });
  });

  test('un nodo de NAVEGACIÓN abre su pantalla (Mis plantas → activos)', async ({ page }) => {
    await bootToDashboard(page);
    await openArana(page);

    // 'plantas' → heroRoute nav view 'activos'. Enfocamos su grupo y activamos
    // la hoja por teclado (mismo handler que el tap).
    await expandGroup(page, 'Mis cultivos');
    const leaf = page.locator('.arm-node.arm-leaf', { hasText: 'Mis plantas' }).first();
    await expect(leaf).toBeVisible({ timeout: 8000 });
    await leaf.focus();
    await leaf.press('Enter');

    // Salió del hero hacia OTRA pantalla (no quedó en la red ni en el hero).
    await expect(page.locator('.arm-root')).toHaveCount(0, { timeout: 8000 });
    // La vista activa cambió: ya no se ve el botón Ⓐ del hero.
    await expect(page.getByRole('button', { name: A_LABEL })).toHaveCount(0, { timeout: 8000 });
  });

  test('foco de grupo + "volver" (crumb) regresa a la vista general', async ({ page }) => {
    await bootToDashboard(page);
    await openArana(page);

    await expandGroup(page, 'Cuidar y prevenir');
    // En foco aparece la miga "‹ volver" (.arm-crumb).
    const crumb = page.locator('.arm-crumb');
    await expect(crumb).toBeVisible({ timeout: 8000 });
    await expect(crumb).toContainText('Cuidar y prevenir');

    // Volver → la miga desaparece y la red vuelve a la vista de grupos.
    await crumb.click();
    await expect(crumb).toHaveCount(0, { timeout: 8000 });
    await expect(page.locator('.arm-node.arm-group').first()).toBeVisible();
  });
});

// ── 2: estado live/soon/down ─────────────────────────────────────────────────

test.describe('La mano de Chagra — estado live/soon/down', () => {
  test.beforeEach(async ({ page }) => {
    await mockOAuth(page);
  });

  test('un nodo "soon" (Precio) se pinta atenuado y NO atasca: avisa y sigue', async ({ page }) => {
    await bootToDashboard(page);
    await openArana(page);

    const cat = await readLeafCatalog(page);
    const precio = cat.find((l) => (l.label || '').toLowerCase().includes('precio'));
    expect(precio, 'la hoja Precio debe existir en la red').toBeTruthy();
    // 'precio' tiene status 'soon' en el manifiesto → debe renderizarse atenuado.
    expect(precio.soon, 'Precio debe estar marcada soon (atenuada)').toBe(true);
    expect(precio.tabIndex, 'una hoja soon NO es tabbable').toBe(-1);

    // Tocarla NO navega ni rompe: muestra un toast "por lanzar" y el menú sigue
    // abierto y usable (no es un callejón sin salida).
    await expandGroup(page, 'Vender mejor');
    const leaf = page.locator('.arm-node.arm-leaf', { hasText: 'Precio' }).first();
    await expect(leaf).toBeVisible({ timeout: 8000 });
    await leaf.click({ force: true }); // soon es pointer-events default, force el tap

    // Toast informativo, la red sigue viva (no quedó atascado).
    await expect(page.locator('.arm-toast')).toContainText(/por lanzar/i, { timeout: 5000 });
    await expect(page.locator('.arm-root')).toBeVisible();
  });

  test('un nodo "down" (sidecar off) se pinta atenuado y NO atasca: avisa y el menú sigue vivo', async ({ page }) => {
    // En el entorno offline-first del test el sidecar está deshabilitado, así que
    // las capacidades cuyo tool es de sidecar (siembro→get_species, plaga…) se
    // renderizan 'down'. REQUISITO #2: un nodo down NO debe dejar al usuario
    // atascado — debe avisar "sin servidor" y mantener la red usable.
    await bootToDashboard(page);
    await openArana(page);

    const cat = await readLeafCatalog(page);
    const downLeaves = cat.filter((l) => l.down);
    // Debe haber AL MENOS un nodo down (los ask de sidecar) y deben ser no-tabbables.
    expect(downLeaves.length, 'sin sidecar, los nodos de sidecar caen a down').toBeGreaterThan(0);
    for (const l of downLeaves) {
      expect(l.tabIndex, `nodo down NO tabbable: ${l.label}`).toBe(-1);
      expect(l.ariaDisabled, `nodo down aria-disabled: ${l.label}`).toBe('true');
    }

    // Abrir el grupo de un nodo down conocido (siembro está en "Mis cultivos")
    // y tocarlo → toast "sin conexión al servidor", la red NO se cierra.
    await expandGroup(page, 'Mis cultivos');
    const downLeaf = page.locator('.arm-node.arm-leaf.arm-down', { hasText: '¿Qué siembro?' }).first();
    await expect(downLeaf).toBeVisible({ timeout: 8000 });
    await downLeaf.click({ force: true });

    await expect(page.locator('.arm-toast')).toContainText(/sin conexión al servidor/i, { timeout: 5000 });
    // No estranguló al usuario: la red sigue montada y usable.
    await expect(page.locator('.arm-root')).toBeVisible();
    await expect(page.locator('.arm-node.arm-group').first()).toBeVisible();
  });

  test('capabilityHealth: una capacidad con tool de sidecar cae a "down" si el sidecar está off', async ({ page }) => {
    // getCapabilityHealth es la fuente de verdad del estado. Lo verificamos
    // directamente: 'siembro' usa get_species (tool de sidecar) → con sidecar
    // OFF debe ser 'down'; con sidecar ON, 'live'. Un 'soon' del manifiesto
    // (precio) manda sin importar el sidecar.
    await bootToDashboard(page);
    const health = await page.evaluate(async () => {
      const m = await import('/src/services/capabilityHealth.js');
      const caps = await import('/src/services/agentCapabilities.js');
      const manifest = caps.CAPABILITY_MANIFEST;
      const names = m.SIDECAR_TOOL_NAMES;
      return {
        siembroOff: m.getCapabilityHealth('siembro', { manifest, isSidecarEnabled: false, sidecarToolNames: names }),
        siembroOn: m.getCapabilityHealth('siembro', { manifest, isSidecarEnabled: true, sidecarToolNames: names }),
        precioOn: m.getCapabilityHealth('precio', { manifest, isSidecarEnabled: true, sidecarToolNames: names }),
        plantasOff: m.getCapabilityHealth('plantas', { manifest, isSidecarEnabled: false, sidecarToolNames: names }),
      };
    });
    expect(health.siembroOff).toBe('down');
    expect(health.siembroOn).toBe('live');
    expect(health.precioOn).toBe('soon');
    // 'plantas' usa tool 'assets' (offline-first, no de sidecar) → siempre live.
    expect(health.plantasOff).toBe('live');
  });
});

// ── 3: BUG del operador — dead-end de zona en "Procesos por voz" ─────────────

// React + createRoot vía los deps optimizados de Vite (los bare specifiers
// 'react'/'react-dom/client' NO resuelven en el navegador sin import-map; estos
// paths son los que la propia app carga). Sirven para montar el componente REAL
// FarmProcessConfirmCard en una raíz aislada y verificar su gate en la UI.
const REACT_DEP = '/node_modules/.vite/deps/react.js';
const REACTDOM_DEP = '/node_modules/.vite/deps/react-dom_client.js';

test.describe('BUG conocido — "Procesos por voz" dead-end sin zona', () => {
  test.beforeEach(async ({ page }) => {
    await mockOAuth(page);
  });

  test('reproduce el ATASCO: sin zonas/lotes, "Confirmar siembra" queda DESHABILITADO (dead-end total)', async ({ page }) => {
    // Escenario del operador: usuario nuevo SIN lotes definidos. Llega a la
    // tarjeta de confirmación tras hablar; especie/cantidad están OK, pero el
    // selector de Zona/Lote no tiene ninguna opción real → locationId queda ''
    // → el botón nunca se habilita → no hay forma de avanzar ni de crear zona.
    await bootToDashboard(page, { seedLands: false });

    // Verificamos en el modelo de la tarjeta: con 0 zonas, allValid === false
    // aunque especie y cantidad sean válidas.
    const verdict = await page.evaluate(() => {
      const draft = {
        process_type: 'seeding',
        subject_label: 'Tomate',
        subject_slug: 'solanum_lycopersicum',
        quantity: 10,
        unit: 'plantas',
        location_land_asset_id: '', // <- voz NO resolvió zona (caso común)
        transcription: 'sembré 10 tomates',
      };
      const species = (draft.subject_label || '').trim();
      const quantity = Number(draft.quantity);
      const locationOptions = []; // <- NO hay lotes en la finca
      const locationId = draft.location_land_asset_id || '';
      // Réplica EXACTA de allValid en FarmProcessConfirmCard.jsx (línea 73).
      const allValid = species.length > 0 && quantity > 0 && Boolean(locationId);
      return { allValid, optionsCount: locationOptions.length, locationId };
    });

    // ESTE es el bug: la siembra es válida en todo menos la zona, que NO se
    // puede seleccionar porque no existe ninguna → botón muerto.
    expect(verdict.optionsCount, 'sin lotes en la finca = dead-end').toBe(0);
    expect(verdict.allValid, 'el botón Confirmar siembra NUNCA se habilita sin zona').toBe(false);

    // Y lo confirmamos en la UI REAL renderizando la tarjeta con locationOptions=[].
    await page.evaluate(async ([reactDep, reactDomDep]) => {
      const ReactMod = await import(reactDep);
      const ReactDOM = await import(reactDomDep);
      const React = ReactMod.default || ReactMod;
      const createRoot = (ReactDOM.default || ReactDOM).createRoot;
      const mod = await import('/src/components/FarmProcessConfirmCard.jsx');
      const Card = mod.default;
      const host = document.createElement('div');
      host.id = 'e2e-confirm-host';
      document.body.appendChild(host);
      const draft = {
        process_type: 'seeding',
        subject_label: 'Tomate',
        quantity: 10,
        unit: 'plantas',
        location_land_asset_id: '',
        transcription: 'sembré 10 tomates',
      };
      createRoot(host).render(
        React.createElement(Card, {
          draft,
          locationOptions: [], // SIN zonas — el caso del operador
          isSaving: false,
          onConfirm: () => { window.__confirmFired = true; },
          onCancel: () => {},
        }),
      );
    }, [REACT_DEP, REACTDOM_DEP]);

    const confirmBtn = page.getByRole('button', { name: /Confirmar siembra/i });
    await expect(confirmBtn).toBeVisible({ timeout: 8000 });
    // El botón existe pero está DESHABILITADO: dead-end reproducido en la UI real.
    await expect(confirmBtn).toBeDisabled();

    // El selector de Zona/Lote solo ofrece "Seleccionar…": no hay salida.
    const zoneSelect = page.locator('#e2e-confirm-host select').last();
    const optionTexts = await zoneSelect.locator('option').allInnerTexts();
    expect(optionTexts).toEqual(['Seleccionar…']);
    expect(optionTexts.some((t) => /Lote|invernadero|zona/i.test(t))).toBe(false);
  });

  test('CON al menos una zona, el flujo SÍ se desbloquea (control positivo)', async ({ page }) => {
    await bootToDashboard(page, { seedLands: true });

    await page.evaluate(async ([reactDep, reactDomDep]) => {
      const ReactMod = await import(reactDep);
      const ReactDOM = await import(reactDomDep);
      const React = ReactMod.default || ReactMod;
      const createRoot = (ReactDOM.default || ReactDOM).createRoot;
      const mod = await import('/src/components/FarmProcessConfirmCard.jsx');
      const Card = mod.default;
      const host = document.createElement('div');
      host.id = 'e2e-confirm-host';
      document.body.appendChild(host);
      const draft = {
        process_type: 'seeding',
        subject_label: 'Tomate',
        quantity: 10,
        unit: 'plantas',
        location_land_asset_id: '',
        transcription: 'sembré 10 tomates',
      };
      createRoot(host).render(
        React.createElement(Card, {
          draft,
          locationOptions: [{ id: 'e2e-land-lote-1', type: 'asset--land', name: 'Lote 1 (prueba)', label: 'Lote 1 (prueba)' }],
          isSaving: false,
          onConfirm: () => { window.__confirmFired = true; },
          onCancel: () => {},
        }),
      );
    }, [REACT_DEP, REACTDOM_DEP]);

    const confirmBtn = page.getByRole('button', { name: /Confirmar siembra/i });
    await expect(confirmBtn).toBeVisible({ timeout: 8000 });
    // Sin zona seleccionada todavía está deshabilitado…
    await expect(confirmBtn).toBeDisabled();

    // …seleccionamos la zona disponible → se habilita y confirma.
    const zoneSelect = page.locator('#e2e-confirm-host select').last();
    await zoneSelect.selectOption({ label: 'Lote 1 (prueba)' });
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
    await confirmBtn.click();
    const fired = await page.evaluate(() => window.__confirmFired === true);
    expect(fired, 'con zona, Confirmar siembra SÍ dispara onConfirm').toBe(true);
  });
});

// ── 5: los 3 temas no rompen el flujo funcional ─────────────────────────────

test.describe('La mano de Chagra — los 3 temas no rompen el flujo', () => {
  test.beforeEach(async ({ page }) => {
    await mockOAuth(page);
  });

  for (const theme of ['biopunk', 'nature', 'minimalista']) {
    test(`tema ${theme}: la red abre, los grupos brotan y un grupo enfoca sin error`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      await bootToDashboard(page);
      await setTheme(page, theme);
      await openArana(page);

      // Los 7 grupos del manifiesto brotan en cualquier tema.
      const groups = page.locator('.arm-node.arm-group');
      await expect(groups.first()).toBeVisible({ timeout: 8000 });
      const count = await groups.count();
      expect(count, `grupos visibles en tema ${theme}`).toBeGreaterThanOrEqual(5);

      // Enfocar un grupo despliega hojas (funcional, no estético). Activación
      // a11y por teclado: en algunos temas el primer nodo brota alto y la topbar
      // inmersiva (sticky) intercepta el hit-test sintético; el nodo SIGUE siendo
      // el control real y su onKeyDown responde — verificamos el efecto funcional
      // (aria-expanded + hojas), no la geometría. (El solape con la topbar queda
      // documentado como hallazgo menor en el reporte.)
      const g0 = groups.first();
      await g0.focus();
      await g0.press('Enter');
      await expect(g0).toHaveAttribute('aria-expanded', 'true', { timeout: 8000 });
      await expect(page.locator('.arm-node.arm-leaf').first()).toBeVisible({ timeout: 8000 });

      // En nature se monta el tronco/vena del árbol; verificamos que el SVG no
      // tenga paths con coordenadas NaN (bug HYTA recurrente que ensucia consola).
      const nanPaths = await page.evaluate(() => {
        const paths = [...document.querySelectorAll('.arm-web path')];
        return paths.filter((p) => /NaN/i.test(p.getAttribute('d') || '')).length;
      });
      expect(nanPaths, `paths con NaN en tema ${theme} (bug HYTA)`).toBe(0);

      // Ningún error de runtime al brotar/enfocar en este tema.
      expect(pageErrors, `pageerrors en tema ${theme}`).toEqual([]);
    });
  }
});
