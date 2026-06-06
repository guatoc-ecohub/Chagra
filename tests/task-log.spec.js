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
        // 1. Crear tarea directamente vía store (evitamos navegación UI rota)
        // Post-rediseño home #1339: la navegación a "Cola de tareas" ya no
        // funciona como antes. Crear la tarea directamente es más robusto.
        const taskTitle = `E2E-Task-${Date.now()}`;
        const addResult = await page.evaluate(async (title) => {
            const useAssetStore = (await import('/src/store/useAssetStore.js')).default;
            const store = useAssetStore.getState();
            // addTaskLog retorna { success, message } de savePayload
            const result = await store.addTaskLog({
                name: title,
                notes: 'E2E test task',
            });
            return result;
        }, taskTitle);

        // 2. Leer la tarea creada desde IndexedDB para obtener su ULID
        const allLogs = await runOnDB(page, LOGS_STORE, 'getAll');
        const taskLog = allLogs.find(l => l.name === taskTitle);

        expect(taskLog).toBeDefined();
        expect(taskLog.id.length).toBe(26); // ULID length
        expect(taskLog.type).toBe('log--task');
        expect(taskLog.status).toBe('pending');
        // addResult.success es false offline (por route abort), pero la tarea
        // sí se guardó en IDB vía logCache.put() optimista.
        expect(addResult.message).toContain('Guardado local');

        // 3. Completar tarea via store (sin UI)
        await page.evaluate(async (taskId) => {
            const useAssetStore = (await import('/src/store/useAssetStore.js')).default;
            await useAssetStore.getState().completeTaskLog(taskId, 'completed', 'Test finalizado');
        }, taskLog.id);

        // 4. ASSERT INMUTABILIDAD: El log original NO debe haber cambiado
        const originalLogAfter = await runOnDB(page, LOGS_STORE, 'get', taskLog.id);
        expect(originalLogAfter.status).toBe('pending');
        expect(originalLogAfter.attributes.status).toBe('pending');

        // 5. ASSERT APPEND-ONLY: Debe existir un SEGUNDO log con el marker de completado
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
