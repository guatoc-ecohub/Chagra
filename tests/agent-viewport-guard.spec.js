import { test, expect } from '@playwright/test';

const A_LABEL = 'Abrir la mano de Chagra';

async function stubAuthIDB(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const put = (db) => {
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      store.put('e2e-agent-viewport-token', 'farmos_access_token');
      store.put('e2e-agent-viewport-refresh', 'farmos_refresh_token');
      store.put(Date.now() + 3600_000, 'farmos_token_expiry');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    };

    const open = indexedDB.open('Chagra');
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('syncQueue')) {
        open.result.createObjectStore('syncQueue');
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (db.objectStoreNames.contains('syncQueue')) {
        put(db);
        return;
      }

      const nextVersion = db.version + 1;
      db.close();
      const upgrade = indexedDB.open('Chagra', nextVersion);
      upgrade.onupgradeneeded = () => {
        if (!upgrade.result.objectStoreNames.contains('syncQueue')) {
          upgrade.result.createObjectStore('syncQueue');
        }
      };
      upgrade.onerror = () => reject(upgrade.error);
      upgrade.onsuccess = () => put(upgrade.result);
    };
  }));
}

async function rectBottom(page, locator) {
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.bottom;
  });
}

test.describe('AgentScreen viewport guard', () => {
  test('mobile #agente keeps mano button and input inside viewport and opens mano nodes', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await stubAuthIDB(page);
    await page.goto('/#agente', { waitUntil: 'domcontentloaded' });

    const manoButton = page.getByRole('button', { name: A_LABEL });
    const input = page.locator('textarea[placeholder*="pregunta" i]').first();

    await expect(manoButton).toBeVisible({ timeout: 20_000 });
    await expect(input).toBeVisible({ timeout: 20_000 });

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await expect(await rectBottom(page, manoButton), 'mano button bottom must stay inside viewport').toBeLessThanOrEqual(viewportHeight);
    await expect(await rectBottom(page, input), 'question textarea bottom must stay inside viewport').toBeLessThanOrEqual(viewportHeight);

    await manoButton.click();
    const manoNodes = page.locator('.arm-gtrunk,.arm-gcore,svg [data-arm]');
    await expect(manoNodes.first()).toBeVisible({ timeout: 8_000 });
    await expect(await manoNodes.count()).toBeGreaterThan(0);
  });
});
