import { test, expect } from '@playwright/test';

/**
 * e2e-planta-eventos.spec.js — eventos de planta: muerte natural,
 * enfermedad en bitacora y proactividad del agente.
 *
 * Casos:
 *   (a) Planta marcada como muerta por muerte natural muestra estado
 *       correcto en ficha (status 'dead', acciones restringidas).
 *   (b) Registrar una enfermedad en la bitacora de la planta deja
 *       rastro consultable (log--observation persistido, queryable).
 *   (c) Tras ese evento, el agente ofrece una sugerencia proactiva.
 *
 * Sigue los patrones de tests E2E existentes:
 *   - baseURL via ORIGIN (http://localhost:5173)
 *   - mock OAuth + API en context.route (antes del page load)
 *   - navegacion via chagraNavigate event
 *   - operaciones de store via page.evaluate con dynamic import
 *   - data-testid como selectores primarios
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Eventos de planta — muerte, enfermedad y proactividad', () => {
  test.beforeEach(async ({ context }) => {
    // Mock OAuth — no dependemos de FarmOS real.
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-planta-eventos-fake-token',
          refresh_token: 'e2e-planta-eventos-fake-refresh',
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

    // Silenciar sidecar / Ollama / NLU / RAG.
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
    await context.route('**/post-validate**', (route) => route.abort('blockedbyclient'));
  });

  test('(a) planta muerta por muerte natural muestra estado correcto en ficha', async ({ page }) => {
    // ─── Paso 1: Login ─────────────────────────────────────────────
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-planta-eventos');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // ─── Paso 2: Navegar a activos ─────────────────────────────────
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'activos' } })),
    );
    await page.waitForTimeout(2500);

    // ─── Paso 3: Agregar una planta con status 'dead' (muerta por muerte natural)
    const plantData = await page.evaluate(async () => {
      const storeMod = await import('/src/store/useAssetStore.js');
      const { newUlid } = await import('/src/utils/id.js');
      const store = storeMod.default.getState();
      await store.hydrate();

      const plantId = newUlid();
      const plantName = `Aguacate Lorena Muerto E2E ${Date.now()}`;
      await store.addAsset('plant', {
        id: plantId,
        type: 'asset--plant',
        attributes: {
          name: plantName,
          status: 'dead',
          _speciesSlug: 'persea_americana',
          _chagra_plant_meta: {
            fecha_germinacion: new Date(Date.now() - 120 * 86400000).toISOString(),
            etapa_fenologica: 'muerto',
            altura_cm: 0,
          },
        },
        _pending: true,
      });
      return { plantId, plantName };
    });

    await page.waitForTimeout(1000);

    // ─── Paso 4: Abrir la ficha de la planta ───────────────────────
    await page.evaluate(async (id) => {
      const storeMod = await import('/src/store/useAssetStore.js');
      storeMod.default.getState().setSelectedAsset(id);
    }, plantData.plantId);
    await page.waitForTimeout(2000);

    // ─── Paso 5: Verificar que la ficha se abre ────────────────────
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog).toContainText(plantData.plantName);

    // ─── Paso 5a: Verificar estado "Muerta/Baja" o "Dead" ──────────
    // AssetDetailView renderiza el status como texto capitalizado en
    // la tarjeta de Estado. CSS capitaliza 'dead' → 'Dead'. Ademas
    // PLANT_STATUSES mapea 'dead' → 'Muerta/Baja'.
    await expect(dialog.locator('text=Estado').first()).toBeVisible();

    // El valor raw es 'dead' (CSS capitalize → 'Dead').
    // Tambien puede aparecer el label 'Muerta/Baja' si se renderiza
    // via StatusBadge en algun contexto. Verificamos cualquiera.
    const hasDeadRaw = await dialog.getByText(/Dead/i).isVisible().catch(() => false);
    const hasMuertaBaja = await dialog.getByText(/Muerta/i).isVisible().catch(() => false);
    expect(hasDeadRaw || hasMuertaBaja,
      'La ficha debe mostrar el estado muerta (Dead o Muerta/Baja)'
    ).toBeTruthy();

    // ─── Paso 5b: Acciones restringidas para planta muerta ─────────
    // AssetDetailView oculta "Marcar muerte" y "Dividir / Juntar"
    // cuando status === 'dead' (linea 749: {status !== 'dead' && (...)}).
    // "Ayuda IA" sigue visible para todas las plantas.
    await expect(page.getByRole('button', { name: /marcar muerte/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: /dividir .* juntar/i })).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: /ayuda ia/i })).toBeVisible({ timeout: 3_000 });

    // ─── Paso 6: Cerrar la ficha ───────────────────────────────────
    const closeBtn = page.getByTestId('asset-detail-close');
    await closeBtn.click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test('(b) registrar enfermedad en la bitacora deja rastro consultable', async ({ page }) => {
    // ─── Paso 1: Login ─────────────────────────────────────────────
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-planta-eventos');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.locator('#root')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);

    // ─── Paso 2: Navegar a activos ─────────────────────────────────
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'activos' } })),
    );
    await page.waitForTimeout(2500);

    // ─── Paso 3: Agregar una planta sana al catalogo ───────────────
    const plantData = await page.evaluate(async () => {
      const storeMod = await import('/src/store/useAssetStore.js');
      const { newUlid } = await import('/src/utils/id.js');
      const store = storeMod.default.getState();
      await store.hydrate();

      const plantId = newUlid();
      const plantName = `Tomate Chonto E2E Enfermo ${Date.now()}`;
      await store.addAsset('plant', {
        id: plantId,
        type: 'asset--plant',
        attributes: {
          name: plantName,
          status: 'active',
          _speciesSlug: 'solanum_lycopersicum',
        },
        _pending: true,
      });
      return { plantId, plantName };
    });

    await page.waitForTimeout(800);

    // ─── Paso 4: Registrar observacion de enfermedad en la bitacora
    // Usamos logCache.put() para escribir un log--observation directamente
    // en IndexedDB, simulando lo que hace ObservationScreen / farmEventService.
    await page.evaluate(async (plantId) => {
      const logCacheMod = await import('/src/db/logCache.js');
      const logId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);

      const observationLog = {
        id: logId,
        type: 'log--observation',
        asset_id: plantId,
        timestamp: now,
        name: 'Enfermedad: Tizon tardio (Phytophthora infestans)',
        status: 'done',
        attributes: {
          name: 'Tizon tardio detectado en hojas inferiores',
          timestamp: now,
          status: 'done',
          notes: {
            value: 'Manchas necroticas marron oscuro en hojas bajeras con halo amarillo. Humedad relativa > 85% ultimos 5 dias.',
            format: 'plain_text',
          },
          severity: 'high',
        },
        relationships: {
          asset: { data: [{ type: 'asset--plant', id: plantId }] },
        },
      };

      await logCacheMod.logCache.put(observationLog);
    }, plantData.plantId);

    // ─── Paso 5: Verificar que el log quedo persistido y es queryable
    const retrieved = await page.evaluate(async (plantId) => {
      const logCacheMod = await import('/src/db/logCache.js');
      const logs = await logCacheMod.logCache.getLogsByAsset(plantId);
      const diseaseLogs = logs.filter(
        (l) => l.type === 'log--observation' && l.attributes?.severity === 'high'
      );
      return diseaseLogs.length > 0
        ? { found: true, name: diseaseLogs[0].name, severity: diseaseLogs[0].attributes?.severity }
        : { found: false, totalLogs: logs.length, types: logs.map((l) => l.type) };
    }, plantData.plantId);

    expect(retrieved.found,
      `El log de enfermedad debe ser consultable en la bitacora. Logs totales: ${retrieved.totalLogs ?? 'N/A'}, tipos: ${JSON.stringify(retrieved.types ?? [])}`
    ).toBe(true);
    expect(retrieved.name).toContain('Tizon');
    expect(retrieved.severity).toBe('high');

    // ─── Paso 6 (UI): Verificar que el log de enfermedad aparece en
    // la linea de tiempo de la ficha de la planta ─────────────────
    await page.evaluate(async (id) => {
      const storeMod = await import('/src/store/useAssetStore.js');
      storeMod.default.getState().setSelectedAsset(id);
    }, plantData.plantId);
    await page.waitForTimeout(2000);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // La linea de tiempo (AssetTimeline) debe contener el texto de la
    // observacion de enfermedad. Verificamos dentro del dialogo.
    await expect(dialog).toContainText('Tizon tardio');

    // Cerrar ficha.
    const closeBtn = page.getByTestId('asset-detail-close');
    await closeBtn.click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 });
  });

  test.skip('(c) el agente ofrece sugerencia proactiva tras registrar enfermedad', async () => {
    // TODO (2026-06-20): Implementar cuando exista un elemento UI que
    // represente la sugerencia proactiva del agente tras registrar un
    // evento de enfermedad en la bitacora de una planta.
    //
    // Contexto: Actualmente NO existe un mecanismo reactivo en
    // AssetDetailView que observe la creacion de log--observation y
    // dispare sugerencias de tratamiento. Los unicos mecanismos de
    // proactividad existentes son:
    //
    //   1. ObservationScreen — data-testid="rag-treatment-suggestions"
    //      (panel RAG colapsable DURANTE el registro de observacion,
    //      no reactivo post-creacion).
    //   2. AgentHero (dashboard) — data-testid="agentport-suggestion"
    //      (sugerencias agronomicas rotativas basadas en cultivos del
    //      operador, no reactivas a eventos de enfermedad).
    //   3. AnalisisProactivoIA (dashboard) — data-testid="analisis-proactivo-ia"
    //      (analisis template local, no reactivo a observaciones).
    //
    // Cuando se implemente un flujo de sugerencia proactiva post-evento
    // (ej: un toast "Se detecto tizon tardio, ¿quieres ver tratamientos?",
    // o un banner en AssetDetailView con data-testid="disease-suggestion"),
    // reemplazar este test.skip por:
    //
    //   test('(c) ...', async ({ page }) => {
    //     // repetir setup de login + planta + observacion (test b)
    //     // verificar que el elemento de sugerencia proactiva aparece:
    //     // await expect(page.getByTestId('disease-suggestion')).toBeVisible();
    //     // await expect(page.getByTestId('disease-suggestion')).toContainText('tratamiento');
    //   });
  });
});
