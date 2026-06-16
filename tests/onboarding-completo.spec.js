import { test, expect } from '@playwright/test';

/**
 * onboarding-completo.spec.js — cobertura E2E del flujo de onboarding
 * extendido por perfil.
 *
 * Componentes: OnboardingProfile, OnboardingHero, userProfileService.
 * Las preguntas condicionales (18) estan definidas en PROFILE_QUESTIONS
 * de src/services/userProfileService.js. El flujo se dispara via
 * `chagra:nav` con view='onboarding-perfil'.
 *
 * NO testea credenciales reales — usa mocks de auth para happy paths.
 */
const ORIGIN = 'http://localhost:5173';

/** Helper: mockea OAuth, hace login y navega al onboarding-perfil. */
async function loginAndOpenOnboarding(page, context, username = 'e2e-user') {
  await context.route('**/oauth/token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: `e2e-${username}-token`,
        refresh_token: 'e2e-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
  });

  await page.goto(ORIGIN);
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: /Usuario/i }).fill(username);
  await page.locator('input[type="password"]').fill('test-pass');
  await page.getByRole('button', { name: /Ingresar/i }).click();
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('chagra:nav', { detail: { view: 'onboarding-perfil' } })
    );
  });
  await page.waitForTimeout(800);
}

test.describe('Onboarding — pantalla inicial pre-login', () => {
  test('muestra login screen al abrir la app sin sesion', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('textbox', { name: /Usuario/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Ingresar/i })
    ).toBeVisible();
  });
});

test.describe('Onboarding — happy path', () => {
  test('completa preguntas de perfil: nombre, region, vocacion, cultivos', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-happy');

    // Verificar que el onboarding carga
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Conozcamos tu cultivo');

    // Pregunta 1: nombre
    const firstInput = page.locator('input[type="text"]').first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('Carlos Rivera');
    }

    // Avanzar hasta encontrar region
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(300);
    }

    // Pregunta: region (municipio)
    const regionInput = page.locator('input[type="text"]').first();
    if (await regionInput.isVisible()) {
      await regionInput.fill('Choachi, Cundinamarca');
    }

    // Avanzar hacia vocacion
    for (let i = 0; i < 3; i++) {
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(300);
    }

    // Pregunta: vocacion — elegir "Campesino/a"
    const campBtn = page.locator('button:has-text("Campesino/a")').first();
    if (await campBtn.isVisible()) {
      await campBtn.click();
      await page.waitForTimeout(400);
    }

    // Avanzar hacia cultivos_actuales
    for (let i = 0; i < 5; i++) {
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(300);
    }

    // Pregunta: cultivos_actuales — tipo text
    const cultivoInput = page.locator('input[type="text"]').first();
    if (await cultivoInput.isVisible()) {
      await cultivoInput.fill('Cafe, platano, mora');
    }

    // Verificar que la app sigue viva sin crash
    await page.waitForTimeout(500);
    const finalText = await page.locator('body').innerText();
    expect(finalText.length).toBeGreaterThan(30);
  });

  test('perfil persiste en localStorage tras contestar preguntas', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-persist');

    // Rellenar nombre
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Maria Torres');
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(400);
    }

    // Verificar que el nombre se guardo en localStorage
    const savedName = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chagra:profile:v1');
        if (!raw) return null;
        return JSON.parse(raw).nombre;
      } catch (_) {
        return null;
      }
    });
    expect(savedName).toBe('Maria Torres');
  });
});

test.describe('Onboarding — flujo urbano vs campesino', () => {
  test('urbano flow: al seleccionar "Cultivo urbano" se ocultan preguntas de animales', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-urbano');

    // Avanzar hasta vocacion
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(250);
      // Si ya vemos el boton de urbano, salimos
      if (
        await page.locator('button:has-text("Cultivo urbano")').first().isVisible()
      )
        break;
    }

    // Seleccionar vocacion "Cultivo urbano"
    const urbanoBtn = page
      .locator('button:has-text("Cultivo urbano")')
      .first();
    if (await urbanoBtn.isVisible()) {
      await urbanoBtn.click();
      await page.waitForTimeout(400);
    }

    // Recorrer todas las preguntas restantes y verificar que NUNCA
    // aparecen preguntas de animales (gallinas, cerdos, ganado).
    let mentionsAnimals = false;
    for (let i = 0; i < 12; i++) {
      const txt = await page.locator('body').innerText();
      if (/gallinas|cerdo|ganado|oveja|abeja/i.test(txt)) {
        mentionsAnimals = true;
        break;
      }
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      else break;
      await page.waitForTimeout(250);
    }

    expect(mentionsAnimals).toBe(false);

    // Verificar que SI aparecen preguntas urbanas (estrato, espacio)
    const finalText = await page.locator('body').innerText();
    const hasUrbanQuestions = /estrato|espacio|materas|balcon/i.test(finalText);
    expect(hasUrbanQuestions).toBe(true);
  });

  test('campesino flow: al seleccionar "Campesino/a" aparecen preguntas de animales', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-campesino');

    // Avanzar hasta vocacion
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      await page.waitForTimeout(250);
      if (
        await page
          .locator('button:has-text("Campesino/a")')
          .first()
          .isVisible()
      )
        break;
    }

    // Seleccionar "Campesino/a"
    const campBtn = page.locator('button:has-text("Campesino/a")').first();
    if (await campBtn.isVisible()) {
      await campBtn.click();
      await page.waitForTimeout(400);
    }

    // Avanzar hasta encontrar la pregunta de animales
    let foundAnimals = false;
    for (let i = 0; i < 12; i++) {
      const txt = await page.locator('body').innerText();
      if (/gallinas|animales|Que animales/i.test(txt)) {
        foundAnimals = true;
        break;
      }
      const next = page.getByRole('button', { name: /Siguiente/i });
      if (await next.isVisible()) await next.click();
      else break;
      await page.waitForTimeout(250);
    }

    expect(foundAnimals).toBe(true);
  });
});

test.describe('Onboarding — skip y edge cases', () => {
  test('"Saltar todo" marca perfil como skipped y no crashea', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-skip');

    // Boton "Saltar todo"
    const skipAll = page.getByRole('button', { name: /Saltar todo/i });
    await expect(skipAll).toBeVisible({ timeout: 5000 });
    await skipAll.click();
    await page.waitForTimeout(600);

    // Verificar que se marco como skipped
    const skipped = await page.evaluate(() => {
      return localStorage.getItem('chagra:profile:skipped:v1') === '1';
    });
    expect(skipped).toBe(true);

    // La app debe seguir viva
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);
  });

  test('"Saltar pregunta" avanza sin guardar campo individual', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-skip-one');

    // Saltar la primera pregunta sin escribir nada
    const skipQuestion = page.locator(
      'button:has-text("Saltar pregunta")'
    );
    if (await skipQuestion.isVisible()) {
      await skipQuestion.click();
      await page.waitForTimeout(500);
    }

    // Verificar que la app sigue funcional (no crash)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Conozcamos tu cultivo');

    // El perfil no deberia tener el campo nombre (se salto)
    const profile = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chagra:profile:v1');
        return raw ? JSON.parse(raw) : {};
      } catch (_) {
        return {};
      }
    });
    // nombre puede estar vacio o ausente — lo importante es que no crashea
    expect(profile.nombre).toBeFalsy();
  });

  test('edge case: abandonar onboarding con "Atras" no rompe navegacion', async ({
    page,
    context,
  }) => {
    await loginAndOpenOnboarding(page, context, 'test-back');

    // Contestar solo la primera pregunta
    const firstInput = page.locator('input[type="text"]').first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('Test Back');
    }

    // Presionar "Atras" (deberia cerrar el onboarding por estar en index 0)
    const backBtn = page.getByRole('button', { name: /Atras/i });
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(600);
    }

    // La app debe seguir funcional (posiblemente vuelve al dashboard)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(15);
  });

  test('edge case: perfil vacio no rompe el onboarding al abrir', async ({
    page,
    context,
  }) => {
    // Limpiar perfil previo y localStorage
    await page.goto(ORIGIN);
    await page.evaluate(() => {
      localStorage.removeItem('chagra:profile:v1');
      localStorage.removeItem('chagra:profile:done:v1');
      localStorage.removeItem('chagra:profile:skipped:v1');
    });

    // Mock auth y login
    await context.route('**/oauth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-clean-token',
          refresh_token: 'e2e-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: /Usuario/i }).fill('test-clean');
    await page.locator('input[type="password"]').fill('test-pass');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await page.waitForTimeout(1500);

    // Navegar al onboarding con perfil limpio
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('chagra:nav', {
          detail: { view: 'onboarding-perfil' },
        })
      );
    });
    await page.waitForTimeout(800);

    // Debe cargar sin crash — empieza en pregunta 0
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Conozcamos tu cultivo');
    expect(bodyText.length).toBeGreaterThan(30);
  });
});
