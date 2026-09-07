import { test, expect } from '@playwright/test';

// Prueba de usuario real (headed) para la mitad que solo se ve en el
// navegador de BUG-09: el onboarding aparece SOLO al primer ingreso.
// Carril: canal-david-y-cata-cerrar-frente-20260904.
// Solo se intercepta oauth/token (mismo patrón que tests/offline.spec.js).
// La mitad complementaria (usuario que YA vio el onboarding cae al dashboard)
// la cubre tests/offline.spec.js del propio repo, que corre en CI.

const SHOTS = '/home/kortux/Workspace/chagra/_gate/capturas-canal-dc';
const USER = 'e2e-operator';

test.setTimeout(240_000);

test('BUG-09 primer ingreso sin flags => onboarding-perfil (se dispara solo al entrar)', async ({ page, context }, testInfo) => {
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`); });

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
    })
  );

  await page.goto('/#login');
  const seenBefore = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.includes('chagra:profile:done') || k.includes('chagra:profile:skipped'))
  );
  expect(seenBefore).toEqual([]);

  await expect(page.getByPlaceholder('Su usuario')).toBeVisible({ timeout: 120_000 });
  await page.getByPlaceholder('Su usuario').fill(USER);
  await page.getByPlaceholder('Su contraseña').fill('e2e-pass');
  await page.getByRole('button', { name: /ingresar/i }).click();

  // El onboarding se dispara solo (sin tocar ninguna tarjeta opt-in).
  const saltar = page.getByTestId('onb2-saltar-todo');
  await expect(saltar).toBeVisible({ timeout: 90_000 });
  const hashAlVerOnboarding = await page.evaluate(() => window.location.hash);
  await page.screenshot({ path: `${SHOTS}/bug09-primer-ingreso-onboarding.png` });

  // Saltar todo escribe el flag (no se repetirá en el siguiente ingreso).
  await saltar.click({ force: true });
  const skippedAfter = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.includes('chagra:profile:skipped'))
      .map((k) => [k, localStorage.getItem(k)])
  );
  const hashDespuesDeSaltar = await page.evaluate(() => window.location.hash);

  testInfo.attach('evidencia-textual', {
    body: [
      `flags antes del login: ${JSON.stringify(seenBefore)}`,
      `hash al ver el onboarding: ${hashAlVerOnboarding}`,
      `flags skipped tras "Saltar todo": ${JSON.stringify(skippedAfter)}`,
      `hash tras saltar: ${hashDespuesDeSaltar}`,
    ].join('\n'),
  });

  expect(skippedAfter.length).toBeGreaterThan(0);
  testInfo.attach('console-errors', { body: consoleErrors.join('\n') || 'sin errores de consola' });
});
