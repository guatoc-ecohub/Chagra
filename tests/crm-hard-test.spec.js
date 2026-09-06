/* global process */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTACT_TYPE,
  INTERACTION_TYPE,
} from '../src/constants/crmConstants.js';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const OUTDIR = process.env.CRM_HARD_TEST_OUTDIR
  || path.resolve(process.cwd(), '_gate/crm-hard-test');
const CRM_URL = `${BASE_URL}/#/mockups/crm-agroecologico`;

fs.mkdirSync(OUTDIR, { recursive: true });

const waitForApp = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(1200);
};

const dumpIndexedDb = async (page) => page.evaluate(async () => {
  const openDb = (name) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const readStore = (db, storeName) => new Promise((resolve) => {
    const values = [];
    let request;
    try {
      request = db.transaction(storeName, 'readonly').objectStore(storeName).openCursor();
    } catch (error) {
      resolve({ count: 0, error: String(error) });
      return;
    }
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        resolve({ count: values.length, records: values.slice(0, 25) });
        return;
      }
      const value = cursor.value || {};
      const attrs = value.attributes || {};
      values.push({
        id: value.id || null,
        type: value.type || null,
        asset_type: value.asset_type || null,
        asset_id: value.asset_id || null,
        crm_contact_type: attrs.crm_contact_type || null,
        crm_interaction_type: attrs.crm_interaction_type || null,
        timestamp: value.timestamp || attrs.timestamp || null,
        pending: value._pending === true,
      });
      cursor.continue();
    };
    request.onerror = () => resolve({ count: values.length, records: values });
  });

  const result = {};
  const databases = indexedDB.databases
    ? await indexedDB.databases()
    : [{ name: 'ChagraDB' }];
  for (const database of databases) {
    if (!database.name) continue;
    try {
      const db = await openDb(database.name);
      const stores = {};
      for (const storeName of [...db.objectStoreNames]) {
        stores[storeName] = await readStore(db, storeName);
      }
      result[database.name] = { stores };
      db.close();
    } catch (error) {
      result[database.name] = { error: String(error) };
    }
  }
  return result;
});

const relevantCounts = (dump) => Object.fromEntries(
  Object.entries(dump).flatMap(([dbName, db]) => Object.entries(db.stores || {})
    .filter(([storeName]) => ['assets', 'logs', 'pending_transactions'].includes(storeName))
    .map(([storeName, value]) => [`${dbName}.${storeName}`, value.count])),
);

const writeEvidence = (evidence) => {
  fs.writeFileSync(
    path.join(OUTDIR, 'crm-hard-test-evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
};

test.describe('CRM agroecológico, hard-test de integración', () => {
  test('GIVEN una finca sin red, WHEN se abre la puerta natural y la ruta CRM, THEN evidencia alcance, offline y persistencia real', async ({ page, context }) => {
    const evidence = {
      baseUrl: BASE_URL,
      crmUrl: CRM_URL,
      startedAt: new Date().toISOString(),
      screenshots: [],
      networkWrites: [],
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
    };

    page.on('console', (message) => {
      if (message.type() === 'error') evidence.consoleErrors.push(message.text().slice(0, 300));
    });
    page.on('pageerror', (error) => evidence.pageErrors.push(error.message.slice(0, 300)));
    page.on('requestfailed', (request) => evidence.requestFailures.push({
      url: request.url().slice(0, 180),
      error: request.failure()?.errorText || null,
    }));
    page.on('request', (request) => {
      if (/\/(api|oauth)\//i.test(request.url()) && !/^(GET|HEAD)$/i.test(request.method())) {
        evidence.networkWrites.push({
          method: request.method(),
          url: request.url().replace(BASE_URL, ''),
        });
      }
    });

    await test.step('GIVEN el usuario entra por la interfaz pública', async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      evidence.naturalDoor = {
        url: page.url(),
        crmTextCount: await page.getByText(/CRM agroecológico|Contactos/i).count(),
        crmActionCount: await page.getByRole('button', { name: /CRM|Nuevo Contacto|Nueva Interacción/i }).count(),
      };
      const naturalPath = path.join(OUTDIR, 'crm-natural-door.png');
      await page.screenshot({ path: naturalPath, fullPage: true });
      evidence.screenshots.push(naturalPath);
    });

    await test.step('WHEN se abre la ruta CRM publicada por hash', async () => {
      await page.goto(CRM_URL, { waitUntil: 'domcontentloaded' });
      await waitForApp(page);
      await expect(page.getByRole('heading', { name: 'CRM agroecológico' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Contactos', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Tu Red de Contactos' })).toBeVisible();

      const headerShot = path.join(OUTDIR, 'crm-route-header.png');
      await page.locator('main > div > header').screenshot({ path: headerShot });
      evidence.screenshots.push(headerShot);
      const networkShot = path.join(OUTDIR, 'crm-network-overview.png');
      await page.locator('[aria-label="Resumen de la red"]').screenshot({ path: networkShot });
      evidence.screenshots.push(networkShot);

      evidence.route = {
        headingVisible: true,
        contactCountTextVisible: await page.getByText(/Mostrando \d+ de \d+ contactos/).count() > 0,
        createContactButtonCount: await page.getByRole('button', { name: /Nuevo Contacto/i }).count(),
        createInteractionButtonCount: await page.getByRole('button', { name: /Nueva Interacción/i }).count(),
        editContactControlCount: await page.getByRole('button', { name: /Editar|Guardar/i }).count(),
      };
    });

    const before = await dumpIndexedDb(page);
    evidence.indexedDbBefore = before;
    evidence.indexedDbBeforeCounts = relevantCounts(before);

    await test.step('AND la UI conserva lectura y filtros sin conectividad', async () => {
      await context.setOffline(true);
      const search = page.getByRole('textbox', { name: 'Buscar contactos' });
      await search.fill('ZZZ_CONTACTO_FICTICIO_NO_EXISTE');
      await expect(page.getByText('No hay contactos que coincidan con los filtros')).toBeVisible();
      await search.fill('');
      await page.getByRole('combobox', { name: 'Filtrar contactos por tipo' })
        .selectOption(CONTACT_TYPE.TECNICO);
      await expect(page.getByText('Mostrando 1 de 3 contactos')).toBeVisible();
      evidence.offline = {
        pageStillVisible: await page.getByRole('heading', { name: 'CRM agroecológico' }).isVisible(),
        filteredReadStillWorks: true,
      };
      const offlineShot = path.join(OUTDIR, 'crm-offline-read.png');
      await page.locator('main > div > header').screenshot({ path: offlineShot });
      evidence.screenshots.push(offlineShot);
      await context.setOffline(false);
    });

    const after = await dumpIndexedDb(page);
    evidence.indexedDbAfter = after;
    evidence.indexedDbAfterCounts = relevantCounts(after);
    evidence.persistence = {
      crmAssetsBefore: before.ChagraDB?.stores?.assets?.records?.filter((record) => record.crm_contact_type) || [],
      crmAssetsAfter: after.ChagraDB?.stores?.assets?.records?.filter((record) => record.crm_contact_type) || [],
      crmLogsBefore: before.ChagraDB?.stores?.logs?.records?.filter((record) => record.crm_interaction_type) || [],
      crmLogsAfter: after.ChagraDB?.stores?.logs?.records?.filter((record) => record.crm_interaction_type) || [],
      backendWritesObserved: evidence.networkWrites,
      result: 'La ruta no expone una acción de escritura, por lo tanto no se puede demostrar una persistencia CRM desde la puerta natural.',
    };
    evidence.enums = {
      contactTypeValues: Object.values(CONTACT_TYPE),
      interactionTypeValues: Object.values(INTERACTION_TYPE),
      pluralEnumValuesFound: Object.values({ ...CONTACT_TYPE, ...INTERACTION_TYPE })
        .filter((value) => /s$/.test(value)),
    };

    writeEvidence(evidence);

    expect(evidence.route.createContactButtonCount, 'El contrato CRM requiere alta de contacto desde la ruta real').toBeGreaterThan(0);
    expect(evidence.route.createInteractionButtonCount, 'El contrato CRM requiere alta de interacción desde la ruta real').toBeGreaterThan(0);
    expect(evidence.persistence.crmAssetsAfter.length, 'El alta debe dejar un asset CRM verificable en IndexedDB').toBeGreaterThan(evidence.persistence.crmAssetsBefore.length);
    expect(evidence.persistence.crmLogsAfter.length, 'La interacción debe dejar un log CRM verificable en IndexedDB').toBeGreaterThan(evidence.persistence.crmLogsBefore.length);
  });
});
