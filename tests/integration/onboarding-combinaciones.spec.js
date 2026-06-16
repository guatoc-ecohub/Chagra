import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var __dirname = dirname(fileURLToPath(import.meta.url));
var SCREENSHOTS_DIR = join(__dirname, 'screenshots');
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });
var ORIGIN = 'http://localhost:5173';

async function mockOAuth(page) {
  await page.context().route('**/oauth/token', function (route) {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access_token: 'fake', refresh_token: 'fake', token_type: 'Bearer', expires_in: 3600 }),
    });
  });
}

async function saveScreenshot(page, name) {
  writeFileSync(join(SCREENSHOTS_DIR, name + '.png'), await page.screenshot({ fullPage: true }));
}

async function setOnboardingProfile(page, profile) {
  await page.evaluate(function (p) {
    window.localStorage.setItem('chagra_user_profile', JSON.stringify(p));
    window.dispatchEvent(new StorageEvent('storage', { key: 'chagra_user_profile', newValue: JSON.stringify(p) }));
  }, profile);
}

var COMBOS = [
  { name: 'urbano-balcon', profile: { vocacion: 'urbano', finca_tipo: 'balcon', cultivo: 'urbano' },
    expectedModules: ['plantas', 'plagas', 'bitacora', 'clima', 'hoyfinca'],
    notExpectedSeguimiento: ['cerdos', 'silvopastoreo', 'reforestacion', 'paramo'] },
  { name: 'rural-gallinas', profile: { vocacion: 'campesino', cultivo: 'rural', animales: ['gallinas'] },
    expectedModules: ['plantas', 'plagas', 'bitacora', 'clima', 'hoyfinca', 'insumos', 'zonas', 'informes', 'analisis'],
    expectedSeguimiento: ['silvopastoreo'] },
  { name: 'rural-cerdos', profile: { vocacion: 'campesino', cultivo: 'rural', animales: ['cerdos'] },
    expectedModules: ['plantas', 'plagas', 'bitacora', 'clima', 'hoyfinca', 'insumos', 'zonas', 'informes', 'analisis'],
    expectedSeguimiento: ['silvopastoreo', 'cerdos'] },
  { name: 'biodiversidad-restaurador', profile: { rol: 'restaurador', vocacion: 'campesino', objetivo: ['biodiversidad'], restauracion_objetivo: ['bosque', 'paramo'] },
    expectedModules: ['plantas', 'plagas', 'bitacora', 'clima', 'hoyfinca', 'insumos', 'zonas', 'informes', 'analisis', 'biodiversidad'],
    expectedSeguimiento: ['reforestacion', 'paramo', 'silvopastoreo', 'cerdos'] },
];

test.describe('Onboarding combinaciones', function () {
  test.beforeEach(async function ({ page }) { await mockOAuth(page); await page.goto(ORIGIN); await page.waitForLoadState('networkidle'); });
  for (var i = 0; i < COMBOS.length; i++) {
    var c = COMBOS[i];
    test('combo ' + c.name, async function ({ page }) {
      await setOnboardingProfile(page, c.profile);
      var t = await page.locator('body').innerText();
      var m = { plantas: /Plantas/i, plagas: /Plagas/i, bitacora: /Bit[aá]cora/i, clima: /Clima/i, hoyfinca: /Hoy en/i, insumos: /Insumos/i, zonas: /Zonas/i, informes: /Informes/i, analisis: /An[aá]lisis/i, biodiversidad: /Biodiversidad/i };
      for (var j = 0; j < c.expectedModules.length; j++) { var p = m[c.expectedModules[j]]; if (p) expect(t).toMatch(p); }
      var n = c.notExpectedSeguimiento; if (n) { var s = { cerdos: /Cerdos/i, silvopastoreo: /Silvopastoreo/i, reforestacion: /Reforestaci/i, paramo: /P[aá]ramo/i }; for (var k = 0; k < n.length; k++) if (s[n[k]]) expect(t).not.toMatch(s[n[k]]); }
      var e = c.expectedSeguimiento; if (e) { var s2 = { cerdos: /Cerdos/i, silvopastoreo: /Silvopastoreo/i, reforestacion: /Reforestaci/i, paramo: /P[aá]ramo/i }; for (var l = 0; l < e.length; l++) if (s2[e[l]]) expect(t).toMatch(s2[e[l]]); }
      await saveScreenshot(page, 'onboarding-' + c.name);
    });
  }
});

test.describe('Onboarding smoke', function () {
  test('urbano no muestra cerdos', async function ({ page }) {
    await mockOAuth(page); await page.goto(ORIGIN); await page.waitForLoadState('networkidle');
    await setOnboardingProfile(page, { vocacion: 'urbano', finca_tipo: 'balcon', cultivo: 'urbano' });
    expect(await page.locator('body').innerText()).not.toMatch(/Cerdos/i);
  });
  test('rural-cerdos muestra cerdos', async function ({ page }) {
    await mockOAuth(page); await page.goto(ORIGIN); await page.waitForLoadState('networkidle');
    await setOnboardingProfile(page, { vocacion: 'campesino', cultivo: 'rural', animales: ['cerdos'] });
    expect(await page.locator('body').innerText()).toMatch(/Cerdos/i);
  });
});
