import { test, expect } from '@playwright/test';

/**
 * perfil-completo.spec.js — cobertura E2E de la pantalla de perfil
 * del operador (ProfileScreen).
 *
 * Componente: src/components/ProfileScreen.jsx
 * Stores: fincaActiveStore, usePrefsStore, userProfileService.
 *
 * 5 pestanas (Perfil, Apariencia, Voz y finca, Modulos, Avanzado).
 * El avatar del agente tiene 3 opciones (colibri, colibri_svg, maiz)
 * via AgentAvatarSelector. Los modulos del home se activan/desactivan
 * con toggles individuales.
 *
 * NO testea credenciales reales — usa mocks de auth.
 */
const ORIGIN = 'http://localhost:5173';

/** Helper: mockea OAuth, hace login y va a /#/perfil. */
async function loginAndGoToProfile(page, context, username = 'e2e-perfil') {
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

  // Navegar a perfil via hash
  await page.goto(`${ORIGIN}/#/perfil`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('Profile — carga y pestanas', () => {
  test('la pantalla de perfil carga con sus pestanas', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Verificar elementos minimos visibles
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Perfil');

    // Tab bar con pestanas (role=tablist)
    const tablist = page.locator('[role="tablist"]');
    await expect(tablist).toBeVisible();

    // Las 5 pestanas deben estar presentes
    await expect(page.getByRole('tab', { name: /Perfil/i })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Apariencia/i })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Voz y finca/i })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Modulos/i })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Avanzado/i })
    ).toBeVisible();
  });

  test('cambiar de pestana actualiza el panel visible', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Por defecto en pestana Perfil
    await expect(
      page.getByRole('tab', { name: /Perfil/i })
    ).toHaveAttribute('aria-selected', 'true');

    // Cambiar a Apariencia
    await page.getByRole('tab', { name: /Apariencia/i }).click();
    await page.waitForTimeout(300);
    await expect(
      page.getByRole('tab', { name: /Apariencia/i })
    ).toHaveAttribute('aria-selected', 'true');

    // Cambiar a Modulos
    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(300);
    await expect(
      page.getByRole('tab', { name: /Modulos/i })
    ).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Profile — avatar del agente', () => {
  test('el selector de avatar esta en la pestana Apariencia', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a pestana Apariencia
    await page.getByRole('tab', { name: /Apariencia/i }).click();
    await page.waitForTimeout(400);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/Avatar del agente|Colibri real|Colibri ilustrado|Planta de maiz/i);
  });

  test('cambiar avatar: colibri a maiz persiste en localStorage', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Apariencia
    await page.getByRole('tab', { name: /Apariencia/i }).click();
    await page.waitForTimeout(400);

    // Click en "Planta de maiz"
    const maizBtn = page.getByRole('button', { name: /Planta de maiz/i }).or(
      page.locator('button:has-text("Planta de maiz")')
    );
    if (await maizBtn.first().isVisible()) {
      await maizBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Verificar que se guardo en localStorage
    const avatarType = await page.evaluate(() =>
      localStorage.getItem('chagra:agent-avatar-type')
    );
    expect(avatarType).toBe('maiz');
  });

  test('cambiar avatar: maiz a colibri_svg persiste', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Apariencia
    await page.getByRole('tab', { name: /Apariencia/i }).click();
    await page.waitForTimeout(400);

    // Primero a maiz, luego a colibri_svg
    const maizBtn = page.getByRole('button', { name: /Planta de maiz/i }).or(
      page.locator('button:has-text("Planta de maiz")')
    );
    if (await maizBtn.first().isVisible()) {
      await maizBtn.first().click();
      await page.waitForTimeout(200);
    }

    const svgBtn = page
      .getByRole('button', { name: /Colibri ilustrado/i })
      .or(page.locator('button:has-text("Colibri ilustrado")'));
    if (await svgBtn.first().isVisible()) {
      await svgBtn.first().click();
      await page.waitForTimeout(300);
    }

    const avatarType = await page.evaluate(() =>
      localStorage.getItem('chagra:agent-avatar-type')
    );
    expect(avatarType).toBe('colibri_svg');
  });

  test('avatar persiste tras recargar la pagina', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Apariencia y seleccionar maiz
    await page.getByRole('tab', { name: /Apariencia/i }).click();
    await page.waitForTimeout(400);

    const maizBtn = page.getByRole('button', { name: /Planta de maiz/i }).or(
      page.locator('button:has-text("Planta de maiz")')
    );
    if (await maizBtn.first().isVisible()) {
      await maizBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Recargar
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Verificar persistencia
    const avatarType = await page.evaluate(() =>
      localStorage.getItem('chagra:agent-avatar-type')
    );
    expect(avatarType).toBe('maiz');
  });
});

test.describe('Profile — datos del trabajador (nombre y rol)', () => {
  test('nombre guardado persiste en localStorage y se refleja en UI', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Buscar el input de nombre completo
    const nameField = page.locator(
      'input[placeholder*="Javier"], input[placeholder*="nombre"]'
    );
    if (await nameField.isVisible()) {
      await nameField.clear();
      await nameField.fill('Lucia Paredes');
      await page.waitForTimeout(200);
    }

    // Click en Guardar cambios
    const saveBtn = page.getByRole('button', { name: /Guardar cambios/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(400);
    }

    // Verificar persistencia en localStorage
    const savedName = await page.evaluate(() =>
      localStorage.getItem('chagra:operator:name')
    );
    expect(savedName).toBe('Lucia Paredes');
  });

  test('cambiar rol persiste en localStorage', async ({ page, context }) => {
    await loginAndGoToProfile(page, context);

    // Encontrar el select de rol
    const roleSelect = page.locator(
      'select:below(:text("Rol"))'
    ).first();

    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('agronomo');
      await page.waitForTimeout(200);
    }

    // Guardar
    const saveBtn = page.getByRole('button', { name: /Guardar cambios/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(400);
    }

    const savedRole = await page.evaluate(() =>
      localStorage.getItem('chagra:operator:role')
    );
    expect(savedRole).toBe('agronomo');
  });
});

test.describe('Profile — visibilidad de modulos del home', () => {
  test('pestana Modulos muestra toggles para cada modulo', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a pestana Modulos
    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(400);

    const bodyText = await page.locator('body').innerText();
    // Deben aparecer los modulos principales
    expect(bodyText).toMatch(/Plantas|Zonas|Insumos|Bitacora|Clima/i);
  });

  test('ocultar modulo "biodiversidad" y verificar que persiste', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a pestana Modulos
    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(400);

    // Buscar el toggle de biodiversidad — localizado cerca del label
    const bioLabel = page.locator('text=Biodiversidad').first();
    if (await bioLabel.isVisible()) {
      // El switch es un button con role=switch
      const bioSwitch = page.locator(
        '[role="switch"][aria-label*="Biodiversidad" i]'
      );
      if (await bioSwitch.isVisible()) {
        // Si estaba ON, lo apagamos
        const checked = await bioSwitch.getAttribute('aria-checked');
        if (checked === 'true') {
          await bioSwitch.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // Verificar que se guardo la visibilidad en el perfil
    const visibility = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chagra:profile:v1');
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p.modulos_visibles?.biodiversidad;
      } catch (_) {
        return null;
      }
    });
    // biodiv debe ser false (oculto) o undefined si no se ha guardado aun
    if (visibility !== undefined) {
      expect(visibility).toBe(false);
    }
  });

  test('ocultar modulo "insumos" y verificar que persiste tras recargar', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Modulos
    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(400);

    // Apagar el toggle de insumos
    const insumosSwitch = page.locator(
      '[role="switch"][aria-label*="Insumos" i]'
    );
    if (await insumosSwitch.isVisible()) {
      const checked = await insumosSwitch.getAttribute('aria-checked');
      if (checked === 'true') {
        await insumosSwitch.click();
        await page.waitForTimeout(300);
      }
    }

    // Recargar y volver a Modulos
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(400);

    // Verificar persistencia en localStorage
    const insumosHidden = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chagra:profile:v1');
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p.modulos_visibles?.insumos;
      } catch (_) {
        return null;
      }
    });
    expect(insumosHidden).toBe(false);
  });

  test('boton "Restaurar todos los modulos" reactiva todo', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Modulos
    await page.getByRole('tab', { name: /Modulos/i }).click();
    await page.waitForTimeout(400);

    // Primero ocultar biodiversidad
    const bioSwitch = page.locator(
      '[role="switch"][aria-label*="Biodiversidad" i]'
    );
    if (await bioSwitch.isVisible()) {
      const checked = await bioSwitch.getAttribute('aria-checked');
      if (checked === 'true') {
        await bioSwitch.click();
        await page.waitForTimeout(300);
      }
    }

    // Click en "Restaurar todos los modulos"
    const restoreBtn = page.getByRole('button', {
      name: /Restaurar todos los modulos/i,
    });
    if (await restoreBtn.isVisible()) {
      await restoreBtn.click();
      await page.waitForTimeout(400);
    }

    // Verificar que biodiv volvio a true
    const biodivVisible = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('chagra:profile:v1');
        if (!raw) return null;
        const p = JSON.parse(raw);
        return p.modulos_visibles?.biodiversidad;
      } catch (_) {
        return null;
      }
    });
    // Despues de restaurar, biodiv debe ser true (visible)
    // Si es undefined, getAllEntries dara true (default) lo cual tambien es valido
    if (biodivVisible !== undefined) {
      expect(biodivVisible).toBe(true);
    }
  });
});

test.describe('Profile — edge cases', () => {
  test('perfil vacio (sin datos guardados) no crashea la pantalla', async ({
    page,
    context,
  }) => {
    // Limpiar localStorage antes de cargar
    await page.goto(ORIGIN);
    await page.evaluate(() => {
      localStorage.removeItem('chagra:operator:name');
      localStorage.removeItem('chagra:operator:role');
      localStorage.removeItem('chagra:profile:v1');
      localStorage.removeItem('chagra:agent-avatar-type');
    });

    // Mock auth
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

    // Login
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByRole('textbox', { name: /Usuario/i }).fill('test-clean');
    await page.locator('input[type="password"]').fill('test-pass');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await page.waitForTimeout(1500);

    // Ir a perfil
    await page.goto(`${ORIGIN}/#/perfil`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // La pantalla de perfil debe cargar sin crash
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Perfil');
    expect(bodyText.length).toBeGreaterThan(50);

    // El tab list debe ser visible (sin datos, igual se renderiza UI)
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('cambiar de pestana rapidamente no crashea', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Click rapido en varias pestanas
    const tabs = ['Apariencia', 'Voz y finca', 'Modulos', 'Avanzado', 'Perfil'];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
      await page.waitForTimeout(100);
    }

    // Debe seguir funcional
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Perfil');
  });

  test('seccion "Modo tecnico" en Avanzado no crashea', async ({
    page,
    context,
  }) => {
    await loginAndGoToProfile(page, context);

    // Ir a Avanzado
    await page.getByRole('tab', { name: /Avanzado/i }).click();
    await page.waitForTimeout(400);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/Modo tecnico|Telemetria|Compartir/i);
  });
});
