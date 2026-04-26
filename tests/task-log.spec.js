import { test, expect } from '@playwright/test';

const DB_NAME = 'ChagraDB';
const LOGS_STORE = 'logs';
const PENDING_TASKS_STORE = 'pending_tasks';

// Helper para interactuar con IndexedDB
const runOnDB = (page, storeName, action, data = null) =>
    page.evaluate(
        ({ dbName, storeName, action, data }) =>
            new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.close();
                        resolve(null);
                        return;
                    }
                    const tx = db.transaction(storeName, action === 'get' ? 'readonly' : 'readwrite');
                    const store = tx.objectStore(storeName);
                    let request;
                    if (action === 'get') request = store.get(data);
                    else if (action === 'getAll') request = store.getAll();
                    else if (action === 'put') request = store.put(data);
                    else if (action === 'count') request = store.count();

                    request.onsuccess = () => {
                        db.close();
                        resolve(request.result);
                    };
                    request.onerror = () => {
                        db.close();
                        reject(request.error);
                    };
                };
                req.onerror = () => reject(req.error);
            }),
        { dbName: DB_NAME, storeName, action, data }
    );

test.describe('ADR-019 Fase 5: log--task & Inmutabilidad', () => {
    test.beforeEach(async ({ context, page }) => {
        // Mock Auth
        await context.route('**/oauth/token', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ access_token: 'e2e-token' }),
            })
        );
        await context.route('**/api/**', (route) => route.abort('blockedbyclient'));

        await page.goto('/');
        await page.getByLabel(/usuario/i).fill('operator');
        await page.getByLabel(/contraseña/i).fill('pass');
        await page.getByRole('button', { name: /ingresar/i }).click();
        await expect(page.getByText(/chagra/i).first()).toBeVisible();
    });

    test('crea tarea con ULID y verifica inmutabilidad al completar', async ({ page }) => {
        // 1. Navegar a nueva tarea — usar aria-label exacto del tile (no regex /tareas/i
        // que matchea 3 botones: refresh, Campo, Cola). Tile dashboard "Tareas: Cola
        // de pendientes" es el que abre TaskLogScreen donde vive el botón "+".
        await page.getByLabel('Tareas: Cola de pendientes').click();
        await page.getByRole('button', { name: '+' }).click();

        // 2. Llenar formulario — TaskScreen.jsx:83 usa placeholder
        // "Ej: Riego fertiorgánico". El label "Título de la Operación"
        // es un <span> dentro del <label>, no asociado vía htmlFor →
        // getByLabel(/título/) no lo resuelve. Usamos getByRole('textbox')
        // del primer input.
        const taskTitle = `E2E-Task-${Date.now()}`;
        await page.getByRole('textbox').first().fill(taskTitle);
        await page.getByRole('button', { name: /programar/i }).click();

        // 3. Verificar creación en IndexedDB y formato ULID (26 chars)
        const allLogs = await runOnDB(page, LOGS_STORE, 'getAll');
        const taskLog = allLogs.find(l => l.name === taskTitle);

        expect(taskLog).toBeDefined();
        expect(taskLog.id.length).toBe(26); // ULID length
        expect(taskLog.type).toBe('log--task');
        expect(taskLog.status).toBe('pending');

        // 4. Completar tarea via store (la UI tras Programar auto-redirige a
        // TaskLogScreen vía setTimeout(onBack, 500); no hace falta navegar a
        // Campo. Disparamos completeTaskLog directo por consola — el assert
        // de inmutabilidad no depende de la UI de operario).
        await page.evaluate(async (taskId) => {
            const useAssetStore = (await import('/src/store/useAssetStore.js')).default;
            await useAssetStore.getState().completeTaskLog(taskId, 'completed', 'Test finalizado');
        }, taskLog.id);

        // 5. ASSERT INMUTABILIDAD: El log original NO debe haber cambiado
        const originalLogAfter = await runOnDB(page, LOGS_STORE, 'get', taskLog.id);
        expect(originalLogAfter.status).toBe('pending');
        expect(originalLogAfter.attributes.status).toBe('pending');

        // 6. ASSERT APPEND-ONLY: Debe existir un SEGUNDO log con el marker de completado
        const allLogsAfter = await runOnDB(page, LOGS_STORE, 'getAll');
        const completionLog = allLogsAfter.find(l =>
            l.attributes?.notes?.value?.includes('[TASK_COMPLETION]') &&
            l.attributes?.notes?.value?.includes(taskLog.id)
        );

        expect(completionLog).toBeDefined();
        expect(completionLog.id).not.toBe(taskLog.id);
        expect(completionLog.status).toBe('done');
    });

    test('migra datos de pending_tasks legacy a logs inmutables con [MIGRATION]', async ({ page }) => {
        // 1. Inyectar tarea legacy ANTES de que la app inicialice la migración (o forzar re-run)
        const legacyId = 'legacy-uuid-123';
        await runOnDB(page, PENDING_TASKS_STORE, 'put', {
            id: legacyId,
            title: 'Tarea Antigua Legacy',
            description: 'Esta tarea viene del modelo snapshot',
            status: 'pending',
            timestamp: 1600000000
        });

        // 2. Limpiar flag de migración para forzar ejecución
        await page.evaluate(() => localStorage.removeItem('chagra:migration:taskLogV1'));

        // 3. Recargar para disparar migrateLegacyTasks en initDB
        await page.reload();
        await expect(page.getByText(/chagra/i).first()).toBeVisible();

        // 4. Verificar migración
        const migratedLog = await runOnDB(page, LOGS_STORE, 'get', legacyId);
        expect(migratedLog).toBeDefined();
        expect(migratedLog.type).toBe('log--task');
        expect(migratedLog.attributes.notes.value).toContain('[MIGRATION]');
        expect(migratedLog.attributes.notes.value).toContain('Esta tarea viene del modelo snapshot');

        // 5. Verificar que el flag de localStorage se marcó
        const flag = await page.evaluate(() => localStorage.getItem('chagra:migration:taskLogV1'));
        expect(flag).toBe('completed');
    });
});
