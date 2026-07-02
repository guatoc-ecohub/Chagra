import { test, expect } from '@playwright/test';

/**
 * e2e-planta-ficha-ciclo.spec.js — flujo completo: agregar planta al
 * catálogo de la finca, abrir su ficha de detalle, verificar que muestra
 * imagen (o fallback) con los datos básicos y que aparece el ciclo
 * fenológico de esa planta.
 *
 * Sigue los patrones de los tests E2E existentes:
 *   - baseURL via ORIGIN (http://localhost:5173)
 *   - mock OAuth + API en context.route (antes del page load)
 *   - navegación via chagraNavigate event
 *   - operaciones de store via page.evaluate con dynamic import
 *   - data-testid como selectores primarios
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Ficha de planta — foto, datos básicos y ciclo fenológico', () => {
  test.beforeEach(async ({ context }) => {
    // Mock OAuth — no dependemos de FarmOS real.
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-planta-fake-token',
          refresh_token: 'e2e-planta-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }),
    );

    // Mock todos los endpoints API — el test es offline-first.
    for (const pattern of ['**/api/**', '**/jsonapi/**']) {
      await context.route(pattern, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        }),
      );
    }

    // Silenciar sidecar / Ollama / NLU.
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
    await context.route('**/post-validate**', (route) => route.abort('blockedbyclient'));
  });

  test('agrega una planta, abre su ficha y verifica foto/fallback, datos y ciclo fenológico', async ({ page }) => {
    // ─── Paso 1: Login ─────────────────────────────────────────────
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-planta-test');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // Esperar a que el dashboard cargue (DashboardLiveView).
    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });
    // Dar tiempo al render inicial post-login.
    await page.waitForTimeout(2000);

    // ─── Paso 2: Navegar a "activos" (AssetsDashboard) — la vista que
    // monta AssetDetailView (el panel de ficha de la planta). ──────────
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'activos' } })),
    );
    await page.waitForTimeout(2500);

    // ─── Paso 3: Agregar una planta al catálogo de la finca ─────────
    // Usamos store.addAsset via dynamic import, mismo patrón que
    // entrega-hoy-dura.spec.js. Incluimos _speciesSlug explícito y
    // metadata fenológica para que PlantMetaPanel tenga qué mostrar.
    const plantData = await page.evaluate(async () => {
      const storeMod = await import('/src/store/useAssetStore.js');
      const { newUlid } = await import('/src/utils/id.js');
      const store = storeMod.default.getState();
      await store.hydrate();

      const plantId = newUlid();
      const plantName = `Tomate Chonto E2E ${Date.now()}`;
      await store.addAsset('plant', {
        id: plantId,
        type: 'asset--plant',
        attributes: {
          name: plantName,
          status: 'active',
          _speciesSlug: 'solanum_lycopersicum',
          _chagra_plant_meta: {
            fecha_germinacion: new Date(Date.now() - 45 * 86400000).toISOString(),
            etapa_fenologica: 'vegetativo',
            altura_cm: 45,
          },
        },
        _pending: true,
      });
      return { plantId, plantName };
    });

    // Pequeña pausa para que React procese la actualización de la store
    // y el AssetsDashboard re-renderice las listas.
    await page.waitForTimeout(1000);

    // ─── Paso 4: Abrir la ficha de la planta (AssetDetailView) ──────
    // setSelectedAsset dispara la apertura del diálogo de detalle.
    await page.evaluate(async (id) => {
      const storeMod = await import('/src/store/useAssetStore.js');
      storeMod.default.getState().setSelectedAsset(id);
    }, plantData.plantId);
    // Esperar a que el diálogo se monte y SpeciesImage resuelva.
    await page.waitForTimeout(2000);

    // ─── Paso 5: Verificar que la ficha se abre ────────────────────
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // El nombre de la planta debe estar en el diálogo.
    await expect(dialog).toContainText(plantData.plantName);

    // ─── Paso 5a: Verificar imagen de la especie (o su fallback) ──
    // SpeciesImage siempre renderiza: o una <img> con foto o un fallback
    // con data-testid="species-image-fallback". Según si el catálogo o
    // photoService devuelven imagen, se muestra uno u otro.
    const photoHero = page.getByTestId('photo-hero-section');
    await expect(photoHero).toBeVisible({ timeout: 3_000 });

    // Verificar que el hero contiene o bien una foto (img) o bien el
    // fallback de SpeciesImage (emoji + nombre). Ambos son válidos.
    const hasPhoto = await photoHero.locator('img').first().isVisible().catch(() => false);
    const hasFallback = await page.getByTestId('species-image-fallback').isVisible().catch(() => false);
    expect(hasPhoto || hasFallback,
      'El hero de foto debe mostrar una imagen o un fallback de especie'
    ).toBeTruthy();

    // ─── Paso 5b: Verificar datos básicos de la ficha ──────────────
    // Encabezado con el nombre de la planta.
    const heading = dialog.getByRole('heading', { level: 2 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(plantData.plantName);

    // ID del asset en formato monospace.
    await expect(dialog.locator('text=/^ID:/')).toBeVisible();

    // Fecha de registro (usa first() porque "Registro" aparece en
    // varios elementos: la etiqueta de la tarjeta, "Registro de
    // Aplicación", y "Los registros de siembra...").
    await expect(dialog.locator('text=Registro').first()).toBeVisible();

    // Estado de la planta.
    await expect(dialog.locator('text=Estado').first()).toBeVisible();
    await expect(dialog.getByText(/active/i)).toBeVisible();

    // ─── Paso 5c: Verificar ciclo fenológico ───────────────────────
    // PlantMetaPanel muestra el estado fenológico actual de la planta
    // (etapa_fenologica) dentro del data-testid="plant-meta-panel".
    // ETAPA_FENOLOGICA_LABELS mapea 'vegetativo' → 'Creciendo (sin flores)'.
    const metaPanel = page.getByTestId('plant-meta-panel');
    await expect(metaPanel).toBeVisible({ timeout: 5_000 });

    // Título de sección "Estado actual".
    await expect(metaPanel).toContainText('Estado actual');

    // Momento fenológico con el label legible.
    // 'vegetativo' → 'Creciendo (sin flores)' (ETAPA_FENOLOGICA_LABELS).
    await expect(metaPanel).toContainText(/Momento/);
    await expect(metaPanel).toContainText(/Creciendo/);

    // Fecha de germinación calculada desde la metadata (45 días atrás).
    await expect(metaPanel).toContainText(/Sembrada hace \d+/);

    // Altura registrada en la metadata.
    await expect(metaPanel).toContainText(/Altura: 45 cm/);

    // ─── Paso 6: Cerrar la ficha y verificar que se cierra ─────────
    const closeBtn = page.getByTestId('asset-detail-close');
    await closeBtn.click();
    await page.waitForTimeout(800);

    // El diálogo debe desaparecer.
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });
});
