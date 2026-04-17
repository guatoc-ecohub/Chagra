/**
 * E2E: flujo completo contra Docker real — zona → siembra → cosecha
 *
 * Requiere:
 *   - docker compose up -d (FarmOS en :8081)
 *   - npm run dev (Vite en :5173)
 */
import { test, expect } from '@playwright/test';

const DB_NAME = 'ChagraDB';

const idbGetAll = (page, storeName) =>
  page.evaluate(
    ({ dbName, storeName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) { db.close(); return resolve([]); }
          const tx = db.transaction(storeName, 'readonly');
          const r = tx.objectStore(storeName).getAll();
          r.onsuccess = () => { db.close(); resolve(r.result); };
          r.onerror   = () => { db.close(); reject(r.error); };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, storeName }
  );

test.describe('Flujo real Docker: zona → siembra → cosecha', () => {

  test('crea zona, registra siembra y cosecha contra FarmOS real', async ({ page }) => {
    test.setTimeout(90_000);
    const run = Date.now();
    const ZONA_NAME  = `Zona E2E ${run}`;
    const FRESA_NAME = 'Fresa'; // especie real de la taxonomía

    // ── 1. LOGIN (si aplica) ──────────────────────────────────────────────
    await page.goto('/');
    await page.waitForTimeout(2_500); // dejar que el spinner de auth resuelva

    const isLogin = await page.getByText('Usuario').isVisible().catch(() => false);
    if (isLogin) {
      await page.getByLabel('Usuario').fill('admin');
      await page.getByLabel('Contraseña').fill('admin');
      await page.getByRole('button', { name: 'Ingresar' }).click();
    }

    // Dashboard — aria-label exacto del tile de Activos
    const activosBtn = page.getByRole('button', { name: 'Activos: Cultivos, zonas e infraestructura' });
    await expect(activosBtn).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: 'test-results/step-1-dashboard.png' });

    // ── 2. ABRIR ACTIVOS ──────────────────────────────────────────────────
    await activosBtn.click();
    await expect(page.getByRole('tab', { name: 'Zonas' })).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: 'test-results/step-2-activos.png' });

    // ── 3. CREAR ZONA ─────────────────────────────────────────────────────
    await page.getByRole('tab', { name: 'Zonas' }).click();

    // FAB: "Agregar Zona" (TAB_LABELS['land'] = 'Zona', singular)
    await page.getByRole('button', { name: 'Agregar Zona' }).click();
    await page.screenshot({ path: 'test-results/step-3-form-zona.png' });

    // Placeholder en renderGenericForm para el tab land cae al default
    await page.locator('input:focus').fill(ZONA_NAME);
    // Tipo de zona
    await page.locator('select').first().selectOption('bed');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText(ZONA_NAME).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/step-4-zona-creada.png' });

    // ── 4. CREAR SIEMBRA ──────────────────────────────────────────────────
    await page.getByRole('tab', { name: 'Siembras' }).click();

    // FAB: "Registrar Siembra"
    await page.getByRole('button', { name: 'Registrar Siembra' }).click();
    await page.screenshot({ path: 'test-results/step-5-form-siembra.png' });

    // Zona contenedora — buscar la opción que contiene "Zona E2E" en el select
    const zonaValue = await page.locator('select option').filter({ hasText: ZONA_NAME }).getAttribute('value');
    await page.locator('select').first().selectOption(zonaValue);

    // SpeciesSelect: abrir → buscar → click primer resultado de la lista
    await page.getByText('Seleccionar especie…').click();
    await page.getByPlaceholder(/Buscar especie/i).fill(FRESA_NAME);
    // Esperar dropdown con resultados y clickear el primero
    await page.locator('[class*="absolute"]').locator('button').first().click();

    await page.getByRole('button', { name: 'Guardar' }).click();

    await page.screenshot({ path: 'test-results/step-6-siembra-creada.png' });

    // Esperar que syncManager envíe a FarmOS y luego refrescar desde servidor
    await page.waitForTimeout(4_000);
    await page.getByRole('button', { name: /sincronizar activos/i }).click();
    await page.waitForTimeout(3_000);

    const assets = await idbGetAll(page, 'assets');
    const planted = assets.find((a) => (a.name ?? a.attributes?.name ?? '').includes('Fresa'));
    expect(planted, 'El asset Fresa debe existir en IDB').toBeTruthy();

    // Entrar a la zona donde se sembró para ver la planta
    await page.getByRole('button', { name: new RegExp(ZONA_NAME) }).click();

    // La planta Fresa aparece en la lista de la zona
    await expect(page.getByText(FRESA_NAME, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/step-6b-zona-plants.png' });

    // ── 5. REGISTRAR COSECHA ──────────────────────────────────────────────
    const fresaRow = page.locator('[class*="rounded"]').filter({ hasText: FRESA_NAME }).first();
    await fresaRow.getByRole('button', { name: 'Registrar Cosecha' }).click();
    await page.screenshot({ path: 'test-results/step-7-form-cosecha.png' });

    await page.getByPlaceholder('Cantidad').fill('3');
    await page.getByRole('button', { name: 'Guardar Registro' }).click();

    await expect(fresaRow.getByRole('button', { name: 'Registrar Cosecha' })).toBeVisible({
      timeout: 10_000,
    });

    await page.waitForTimeout(3_000);
    await page.screenshot({ path: 'test-results/step-8-cosecha-guardada.png' });

    await expect(page.locator('[role="alert"]').filter({ hasText: /error|fallo|504/i })).toHaveCount(0);
  });
});
