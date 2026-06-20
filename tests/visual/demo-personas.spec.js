/**
 * demo-personas.spec.js — Pruebas visuales de perfiles demo.
 *
 * Captura screenshots de cada perfil para verificar que se vean
 * visiblemente distintos y ricos en contenido.
 */

import { test, expect } from '@playwright/test';

test.describe('Demo Personas — Perfiles Visiblemente Distintos', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la app
    await page.goto('http://localhost:5173');
    
    // Esperar que la app cargue
    await page.waitForLoadState('networkidle');
  });

  test('CAMPESINO: finca diversa pequeña', async ({ page }) => {
    // Navegar al perfil
    await page.click('[data-testid="nav-perfil"]');
    await page.waitForSelector('[data-testid="profile-preset-campesino"]');
    
    // Capturar antes del cambio
    await page.screenshot({ path: 'screenshots/demo-personas/before-campesino.png' });
    
    // Seleccionar perfil campesino
    await page.click('[data-testid="profile-preset-campesino"]');
    
    // Esperar a que cargue el spinner y desaparezca
    await page.waitForSelector('button[aria-busy="true"]', { state: 'visible' });
    await page.waitForSelector('button[aria-busy="true"]', { state: 'hidden', timeout: 10000 });
    
    // Esperar a que aparezca el check de "Cambiado"
    await page.waitForSelector('text=Cambiado', { state: 'visible', timeout: 5000 });
    
    // Capturar después del cambio
    await page.screenshot({ path: 'screenshots/demo-personas/after-campesino.png' });
    
    // Volver al home para ver las diferencias
    await page.click('[data-testid="nav-home"]');
    await page.waitForLoadState('networkidle');
    
    // Capturar el home con el contexto de campesino
    await page.screenshot({ path: 'screenshots/demo-personas/home-campesino.png', fullPage: true });
  });

  test('CAFETERO: SAF café + sombra + plátano', async ({ page }) => {
    await page.click('[data-testid="nav-perfil"]');
    await page.waitForSelector('[data-testid="profile-preset-cafetero"]');
    
    await page.screenshot({ path: 'screenshots/demo-personas/before-cafetero.png' });
    
    await page.click('[data-testid="profile-preset-cafetero"]');
    await page.waitForSelector('button[aria-busy="true"]', { state: 'visible' });
    await page.waitForSelector('button[aria-busy="true"]', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Cambiado', { state: 'visible', timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots/demo-personas/after-cafetero.png' });
    
    await page.click('[data-testid="nav-home"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/demo-personas/home-cafetero.png', fullPage: true });
  });

  test('CACAOTERO: cacao + matarratón + plátano', async ({ page }) => {
    await page.click('[data-testid="nav-perfil"]');
    await page.waitForSelector('[data-testid="profile-preset-cacaotero"]');
    
    await page.screenshot({ path: 'screenshots/demo-personas/before-cacaotero.png' });
    
    await page.click('[data-testid="profile-preset-cacaotero"]');
    await page.waitForSelector('button[aria-busy="true"]', { state: 'visible' });
    await page.waitForSelector('button[aria-busy="true"]', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Cambiado', { state: 'visible', timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots/demo-personas/after-cacaotero.png' });
    
    await page.click('[data-testid="nav-home"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/demo-personas/home-cacaotero.png', fullPage: true });
  });

  test('CORPORATIVO: multi-finca con indicadores', async ({ page }) => {
    await page.click('[data-testid="nav-perfil"]');
    await page.waitForSelector('[data-testid="profile-preset-corporativo"]');
    
    await page.screenshot({ path: 'screenshots/demo-personas/before-corporativo.png' });
    
    await page.click('[data-testid="profile-preset-corporativo"]');
    await page.waitForSelector('button[aria-busy="true"]', { state: 'visible' });
    await page.waitForSelector('button[aria-busy="true"]', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Cambiado', { state: 'visible', timeout: 5000 });
    
    await page.screenshot({ path: 'screenshots/demo-personas/after-corporativo.png' });
    
    await page.click('[data-testid="nav-home"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/demo-personas/home-corporativo.png', fullPage: true });
  });

  test('Verificar que Visión total se desactiva al cambiar perfil', async ({ page }) => {
    // Primero activar "Visión total" manualmente
    await page.click('[data-testid="nav-perfil"]');
    await page.click('text=Avanzado');
    
    // Buscar el toggle de "Visión total" y activarlo
    const visionTotalToggle = page.locator('[data-testid="operator-override-toggle"]');
    const initialState = await visionTotalToggle.getAttribute('aria-checked');
    
    if (initialState === 'false') {
      await visionTotalToggle.click();
      await expect(visionTotalToggle).toHaveAttribute('aria-checked', 'true');
    }
    
    // Ahora cambiar a un perfil demo
    await page.click('[data-testid="profile-preset-campesino"]');
    await page.waitForSelector('button[aria-busy="true"]', { state: 'visible' });
    await page.waitForSelector('button[aria-busy="true"]', { state: 'hidden', timeout: 10000 });
    
    // Verificar que el toggle de "Visión total" está desactivado
    await page.click('text=Avanzado');
    await expect(visionTotalToggle).toHaveAttribute('aria-checked', 'false');
    
    await page.screenshot({ path: 'screenshots/demo-personas/vision-total-desactivada.png' });
  });
});
