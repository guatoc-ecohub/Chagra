import { test, expect } from '@playwright/test';

/**
 * e2e-agregar-planta-ciclo.spec.js — flujo "agregar planta" + ciclo fenológico
 * + enfermedad por bitácora + agente proactivo, offline-first.
 *
 * Escenario que cubre (pedido directo del operador):
 *   1. Lechuga sembrada HOY → queda como plántula (etapa inicial). Se valida que
 *      la pantalla del ciclo renderiza su ficha (foto del catálogo si el
 *      componente de imagen por especie ya existe — RESILIENTE: ver nota FOTO).
 *   2. Lechuga con ~1 mes post-trasplante → su ciclo fenológico arranca a MITAD
 *      (etapa estimada > inicial), derivada de la fecha de siembra REAL.
 *   3. En ambas se muestra la FECHA ESPERADA DE FIN DE CICLO / muerte natural
 *      (senescencia) calculada desde la siembra + duración de la especie.
 *   4. Se registra una ENFERMEDAD por bitácora (mildeo/Bremia lactucae) en una
 *      de las lechugas.
 *   5. El agente la conoce PROACTIVAMENTE: surge como alerta (cropAlertEngine →
 *      'alertTriggered' crop_disease) y entra al contexto de grounding del agente
 *      (buildFincaContext) SIN que el usuario tenga que preguntar.
 *
 * ── Patrón (idéntico a e2e-ciclo-completo.spec.js, ya en el repo) ────────────
 *
 * NAVEGACIÓN: el evento interno `chagraNavigate` (la API de navegación real del
 * app, escuchada en App.jsx). `view: 'ciclo'` → CicloCultivoScreen.
 *
 * SEMBRADO DEL CICLO: la siembra manual NO auto-crea el FarmProcess (el
 * formulario no captura un asset--land y el validador lo exige). Sembramos el
 * agregado por la vía AUTORIZADA `createFarmProcess` (que también emite
 * sowing_confirmed), exactamente como el app cuando hay ubicación. Es la forma
 * en que "Procesos por voz" crea los ciclos — solo que aquí fijamos fechas
 * deterministas (hoy / hace 1 mes) para validar la fenología.
 *
 * BITÁCORA / ENFERMEDAD: `recordFarmEvent` (puerta de escritura autorizada),
 * event_type 'observation' con el texto campesino. Es lo MISMO que hace
 * CicloObservacion al guardar una nota.
 *
 * AGENTE PROACTIVO (sin LLM): no invocamos al modelo (el sidecar/Ollama está
 * bloqueado en este test offline). Validamos las DOS capas que hacen que el
 * agente "conozca" la enfermedad sin que el usuario pregunte:
 *   (a) cropAlertEngine.runCropAlerts() emite 'alertTriggered' crop_disease →
 *       chip de alerta del home.
 *   (b) buildFincaContext (el grounding que AgentScreen inyecta al system prompt)
 *       incluye la enfermedad + la instrucción "menciónala PROACTIVAMENTE".
 *
 * FOTO DEL CATÁLOGO (codex construye SpeciesImage/speciesImageService en
 * paralelo): el test es RESILIENTE — si hay un contenedor de imagen por especie
 * lo verifica; si no existe aún, NO falla (deja TODO). No duplicamos ese trabajo.
 */

const DB_NAME = 'ChagraDB';
const LECHUGA_SLUG = 'lactuca_sativa';
const LAND_ASSET_ID = 'e2e-land-lechuga-1';
const DAY_MS = 86400000;

/** Abre ChagraDB y retorna todos los FarmProcesses. */
const getAllFarmProcesses = async (page) =>
  page.evaluate(
    ({ dbName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('farm_processes')) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction('farm_processes', 'readonly');
          const all = tx.objectStore('farm_processes').getAll();
          all.onsuccess = () => { db.close(); resolve(all.result); };
          all.onerror = () => { db.close(); reject(all.error); };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME },
  );

/** Cuenta eventos de un proceso por attributes.process_id (robusto al schema). */
const countEventsByProcessId = async (page, processId) =>
  page.evaluate(
    ({ dbName, processId }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('farm_process_events')) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction('farm_process_events', 'readonly');
          const all = tx.objectStore('farm_process_events').getAll();
          all.onsuccess = () => {
            db.close();
            resolve((all.result || []).filter((e) => e.attributes?.process_id === processId).length);
          };
          all.onerror = () => { db.close(); reject(all.error); };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, processId },
  );

/** Siembra un ciclo de lechuga por la vía autorizada, con fecha controlada. */
const seedLechuga = async (page, { label, sowedDaysAgo, landAssetId }) =>
  page.evaluate(
    async ({ slug, label, sowedDaysAgo, landAssetId, dayMs }) => {
      const { createFarmProcess } = await import('/src/services/farmEventService.js');
      const { newUlid } = await import('/src/utils/id.js');
      const now = Date.now();
      const created = now - sowedDaysAgo * dayMs;
      const processId = newUlid();
      await createFarmProcess({
        process_id: processId,
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: 'individual',
          subject_slug: slug,
          subject_label: label,
          quantity: 6,
          unit: 'plantas',
          location_land_asset_id: landAssetId,
          status: 'active',
          current_stage: 'sowing_confirmed',
          created_at: created,
          updated_at: created,
        },
      });
      return processId;
    },
    { slug: LECHUGA_SLUG, label, sowedDaysAgo, landAssetId, dayMs: DAY_MS },
  );

test.describe('Agregar planta: ciclo fenológico + enfermedad por bitácora + agente proactivo', () => {
  test.beforeEach(async ({ context }) => {
    // Mock OAuth — nunca tocamos FarmOS real.
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
      }),
    );
    // Test offline: bloquear API externo, sidecar/Ollama.
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
    await context.route('**/post-validate**', (route) => route.abort('blockedbyclient'));
  });

  test('lechuga hoy=plántula + lechuga 1 mes=ciclo a mitad + fin de ciclo + enfermedad proactiva', async ({ page }) => {
    // ─── Paso 0: Login ───────────────────────────────────────────
    await page.goto('/');
    await page.getByLabel(/usuario/i).fill('e2e-hortelano');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    // ─── Paso 1: Sembrar dos lechugas (vía autorizada, fechas deterministas) ──
    // (1) Lechuga sembrada HOY → debe quedar como plántula (etapa inicial).
    const lechugaHoyId = await seedLechuga(page, {
      label: 'Lechuga (hoy)',
      sowedDaysAgo: 0,
      landAssetId: LAND_ASSET_ID,
    });
    // (2) Lechuga con ~1 mes post-trasplante → ciclo a mitad.
    const lechugaMesId = await seedLechuga(page, {
      label: 'Lechuga (1 mes)',
      sowedDaysAgo: 30,
      landAssetId: `${LAND_ASSET_ID}-2`,
    });

    const processes = await getAllFarmProcesses(page);
    expect(processes.length).toBeGreaterThanOrEqual(2);
    const pHoy = processes.find((p) => p.process_id === lechugaHoyId);
    const pMes = processes.find((p) => p.process_id === lechugaMesId);
    expect(pHoy).toBeTruthy();
    expect(pMes).toBeTruthy();
    expect(pHoy.attributes.subject_slug).toBe(LECHUGA_SLUG);
    expect(pHoy.attributes.current_stage).toBe('sowing_confirmed');
    // sowing_confirmed emitido por createFarmProcess.
    expect(await countEventsByProcessId(page, lechugaHoyId)).toBeGreaterThanOrEqual(1);

    // ─── Paso 2: ETAPA ESTIMADA — plántula hoy vs ciclo a mitad al mes ────────
    // Validamos la lógica fenológica desde la fecha de siembra REAL (no día 0),
    // usando los MISMOS servicios que la UI (phenologyCalculator) en la página.
    const stages = await page.evaluate(
      async ({ slug, hoyId, mesId }) => {
        const { getCurrentStage } = await import('/src/services/phenologyCalculator.js');
        const { getFarmProcess } = await import('/src/db/farmProcessCache.js');
        const hoy = await getFarmProcess(hoyId);
        const mes = await getFarmProcess(mesId);
        const sHoy = getCurrentStage({ speciesSlug: slug, sowingDate: hoy.attributes.created_at });
        const sMes = getCurrentStage({ speciesSlug: slug, sowingDate: mes.attributes.created_at });
        return {
          hoy: { code: sHoy.stage.code, idx: sHoy.stageIndex, days: sHoy.daysElapsed },
          mes: { code: sMes.stage.code, idx: sMes.stageIndex, days: sMes.daysElapsed },
        };
      },
      { slug: LECHUGA_SLUG, hoyId: lechugaHoyId, mesId: lechugaMesId },
    );
    // Lechuga de HOY → etapa inicial (plántula): stageIndex 0, día 0.
    expect(stages.hoy.idx).toBe(0);
    expect(stages.hoy.code).toBe('sowing');
    expect(stages.hoy.days).toBe(0);
    // Lechuga de 1 mes → ciclo a MITAD: NO arranca en cero.
    expect(stages.mes.idx).toBeGreaterThan(0);
    expect(stages.mes.code).not.toBe('sowing');
    expect(stages.mes.days).toBeGreaterThanOrEqual(29);

    // ─── Paso 3: FECHA DE FIN DE CICLO / muerte natural (ambas lechugas) ──────
    const lifecycle = await page.evaluate(
      async ({ slug, hoyId, mesId }) => {
        const { calculateLifecycleEnd, formatLifecycleEnd } = await import('/src/services/phenologyCalculator.js');
        const { getFarmProcess } = await import('/src/db/farmProcessCache.js');
        const hoy = await getFarmProcess(hoyId);
        const mes = await getFarmProcess(mesId);
        const lcHoy = calculateLifecycleEnd({ speciesSlug: slug, sowingDate: hoy.attributes.created_at });
        const lcMes = calculateLifecycleEnd({ speciesSlug: slug, sowingDate: mes.attributes.created_at });
        return {
          hoy: { death: lcHoy.naturalDeath, source: lcHoy.source, fmt: formatLifecycleEnd(lcHoy) },
          mes: { death: lcMes.naturalDeath, source: lcMes.source, fmt: formatLifecycleEnd(lcMes) },
        };
      },
      { slug: LECHUGA_SLUG, hoyId: lechugaHoyId, mesId: lechugaMesId },
    );
    expect(lifecycle.hoy.source).toBe('lifecycle_block');
    expect(lifecycle.hoy.death).toBeGreaterThan(0);
    expect(lifecycle.hoy.fmt).toMatch(/Se espera fin de ciclo/);
    // La lechuga sembrada hoy muere más tarde que la sembrada hace un mes.
    expect(lifecycle.hoy.death).toBeGreaterThan(lifecycle.mes.death);

    // ─── Paso 4: ver el ciclo en la UI REAL (CicloCultivoScreen → detalle) ────
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'ciclo' } })),
    );
    await expect(page.getByRole('heading', { name: /Ciclo del cultivo/i })).toBeVisible({ timeout: 10_000 });

    // Abrir el detalle de la lechuga de 1 mes (botón de la lista).
    await page.getByRole('button', { name: /Lechuga \(1 mes\)/ }).first().click();

    // La línea de tiempo fenológica de la especie se renderiza (hay 2: el
    // resumen compacto + la sección "Línea de tiempo" del detalle).
    await expect(page.getByText(/Timeline fenológica/i).first()).toBeVisible({ timeout: 10_000 });

    // FIN DE CICLO / muerte natural visible en el resumen del ciclo.
    await expect(page.getByTestId('ciclo-fin-de-ciclo')).toBeVisible();
    await expect(page.getByTestId('ciclo-fin-de-ciclo')).toContainText(/Se espera fin de ciclo/);

    // ETAPA ESTIMADA (ciclo a mitad) visible en el resumen.
    await expect(page.getByTestId('ciclo-etapa-estimada')).toBeVisible();
    await expect(page.getByTestId('ciclo-etapa-estimada')).toContainText(/Según la fecha de siembra/);

    // FOTO DEL CATÁLOGO (codex en paralelo) — RESILIENTE: verificar SI existe,
    // sin hard-fail mientras el componente SpeciesImage no esté en main.
    // TODO(codex): cuando SpeciesImage/speciesImageService aterricen, endurecer
    // este assert a un expect().toBeVisible() del contenedor de imagen.
    const speciesImg = page.locator(
      '[data-testid="species-image"], img[alt*="Lechuga" i], img[data-species]',
    );
    if (await speciesImg.count() > 0) {
      await expect(speciesImg.first()).toBeVisible();
    }

    // ─── Paso 5: registrar ENFERMEDAD por bitácora (mildeo / Bremia lactucae) ─
    // Vía autorizada (recordFarmEvent), igual que CicloObservacion al guardar.
    await page.evaluate(
      async ({ processId }) => {
        const { recordFarmEvent } = await import('/src/services/farmEventService.js');
        await recordFarmEvent({
          process_id: processId,
          event_type: 'observation',
          actor: 'operator',
          source: 'text',
          idempotency_key: `e2e:disease:${processId}`,
          payload: { text: 'a la lechuga le salió un polvillo blanco / mildeo en las hojas de abajo' },
          confidence: 1,
        });
      },
      { processId: lechugaMesId },
    );
    expect(await countEventsByProcessId(page, lechugaMesId)).toBeGreaterThanOrEqual(2);

    // El detector reconoce la enfermedad en la bitácora del ciclo.
    const detected = await page.evaluate(
      async ({ slug, processId }) => {
        const { getActiveDiseaseForCycle } = await import('/src/services/diseaseObservationService.js');
        const d = await getActiveDiseaseForCycle(processId, slug);
        return d ? { pathogen: d.pathogen, severity: d.severity, isDisease: d.isDisease } : null;
      },
      { slug: LECHUGA_SLUG, processId: lechugaMesId },
    );
    expect(detected).not.toBeNull();
    expect(detected.isDisease).toBe(true);
    expect(detected.pathogen).toMatch(/Bremia lactucae/);

    // ─── Paso 6: el AGENTE la conoce PROACTIVAMENTE ──────────────────────────
    // (a) cropAlertEngine emite una alerta de enfermedad (chip del home), SIN
    //     que el usuario pregunte. Capturamos los eventos 'alertTriggered'.
    const alert = await page.evaluate(
      async ({ processId }) => {
        const captured = [];
        const handler = (ev) => captured.push(ev.detail);
        window.addEventListener('alertTriggered', handler);
        const { runCropAlerts } = await import('/src/services/cropAlertEngine.js');
        await runCropAlerts();
        window.removeEventListener('alertTriggered', handler);
        return captured.find((a) => a.type === `crop_disease_${processId}`) || null;
      },
      { processId: lechugaMesId },
    );
    expect(alert).not.toBeNull();
    expect(alert.title).toMatch(/Posible enfermedad/i);
    expect(alert.message).toMatch(/Bremia lactucae/);

    // (b) el GROUNDING del agente (buildFincaContext, lo que AgentScreen inyecta
    //     al system prompt) incluye la enfermedad + la instrucción de
    //     mencionarla PROACTIVAMENTE — replicamos cómo AgentScreen arma
    //     activeCycles desde los ciclos + la bitácora.
    const grounding = await page.evaluate(
      async ({ slug }) => {
        const { listFarmProcesses } = await import('/src/db/farmProcessCache.js');
        const { getActiveDiseaseForCycle } = await import('/src/services/diseaseObservationService.js');
        const { buildFincaContext } = await import('/src/services/agentService.js');
        const cycles = (await listFarmProcesses({ status: 'active' })) || [];
        const activeCycles = await Promise.all(cycles.slice(0, 5).map(async (c) => {
          const at = c.attributes || {};
          const id = c.process_id || c.id;
          const d = await getActiveDiseaseForCycle(id, at.subject_slug);
          return {
            label: at.subject_label,
            stage: at.current_stage,
            days: 30,
            topRisk: null,
            disease: d && d.isDisease ? (d.pathogen || 'síntoma sin identificar') : null,
          };
        }));
        return buildFincaContext({ activeCycles });
      },
      { slug: LECHUGA_SLUG },
    );
    expect(grounding).toMatch(/ALERTA SANITARIA/);
    expect(grounding).toMatch(/Bremia lactucae/);
    expect(grounding).toMatch(/PROACTIVAMENTE/);
  });
});
