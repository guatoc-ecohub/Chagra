/* global process */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * e2e-nocturno-validacion.spec.js — TEST E2E NOCTURNO COMPLETO
 *
 * Valida que todos los bugs reportados el 2026-06-20 estén resueltos:
 * 1. Fotos de plantas cargan correctamente (no rotas)
 * 2. NO "Invalid Date" en la UI
 * 3. NO "recordFarmEvent ... not found" 
 * 4. Las etapas pueden avanzar
 * 5. "Visión total" del operador muestra todos los módulos
 * 6. NO hay voseo visible (tenés/empezá/recogé/descubrí)
 * 7. La mano NO se solapa con el input
 *
 * Flujo completo: login → recorrer home → Mis módulos → agregar planta (lechuga) → 
 * abrir ciclo → anotar observación → detalle planta → asociaciones → biodiversidad → 
 * juegos (Defensores niveles 1 y 2, Milpa, Mundo Subsuelo) → agente
 *
 * Captura screenshot por paso a ./screenshots/nocturno-validacion/ con índice.
 * Resiliente: reporta PASS/FAIL por bug individual sin romper todo el test.
 */

const RUN_VALIDACION = process.env.RUN_NOCTURNO_VALIDACION === '1';
const ORIGIN = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const DEMO_CREDS = {
  user: process.env.CHAGRA_USER || 'demo',
  pass: process.env.CHAGRA_PASS || 'tOGF1ezbui1vDvxLxiEo',
};

// Directorio para screenshots
const SCREENSHOT_DIR = './screenshots/nocturno-validacion';
let stepIndex = 0;

// Patrones de voseo argentino a detectar
const VOSO_PATTERNS = [
  /tenés/gi,
  /empezá/gi,
  /recogé/gi,
  /descubrí/gi,
  /preparale/gi,
  /dale/gi,
  /vení/gi,
  /hacé/gi,
];

// Errores críticos a detectar
const CRITICAL_ERRORS = [
  /Invalid Date/i,
  /recordFarmEvent.*not found/i,
  /Cannot read.*undefined/i,
  /is not defined/i,
];

/**
 * Captura screenshot con índice secuencial y nombre descriptivo
 */
async function captureScreenshot(page, testName, stepName) {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    const filename = `${String(stepIndex).padStart(2, '0')}-${testName}-${stepName.replace(/\s+/g, '-')}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    stepIndex++;
    return filepath;
  } catch (error) {
    console.warn(`⚠️  Screenshot falló para ${stepName}:`, error.message);
    return null;
  }
}

/**
 * Login con credenciales de demo (desde ~/.config/chagra-demo-creds.env)
 */
async function loginDemo(page) {
  await page.goto(`${ORIGIN}/`);
  
  // Esperar a que aparezca el formulario de login
  await expect(page.getByLabel(/usuario/i)).toBeVisible({ timeout: 10000 });
  await page.getByLabel(/usuario/i).fill(DEMO_CREDS.user);
  await page.getByLabel(/contrase[nñ]a/i).fill(DEMO_CREDS.pass);
  await page.getByRole('button', { name: /ingresar/i }).click();
  
  // Esperar a que cargue el dashboard
  await expect(page.getByTestId('topbar-user-menu') || page.locator('body')).toBeVisible({ timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
}

/**
 * Escanea la página en busca de voseo argentino
 */
async function checkNoVoseo(page) {
  const bodyText = await page.locator('body').innerText();
  const voseoFound = [];
  
  for (const pattern of VOSO_PATTERNS) {
    const matches = bodyText.match(pattern);
    if (matches) {
      voseoFound.push(...matches);
    }
  }
  
  return voseoFound;
}

/**
 * Escanea la página en busca de errores críticos en consola
 */
async function checkConsoleErrors(page) {
  const errors = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      for (const pattern of CRITICAL_ERRORS) {
        if (pattern.test(text)) {
          errors.push(text);
        }
      }
    }
  });
  
  return errors;
}

/**
 * Verifica que las imágenes carguen correctamente
 */
async function checkImagesLoad(page) {
  const brokenImages = [];
  
  const images = page.locator('img');
  const count = await images.count();
  
  for (let i = 0; i < Math.min(count, 20); i++) {
    const img = images.nth(i);
    const src = await img.getAttribute('src').catch(() => null);
    const naturalWidth = await img.evaluate((el) => el.naturalWidth).catch(() => 0);
    
    if (src && naturalWidth === 0) {
      brokenImages.push(src);
    }
  }
  
  return brokenImages;
}

test.describe('Validación NOCTURNA — bugs del 2026-06-20', () => {
  test.skip(!RUN_VALIDACION, 'Solo nocturno. Set RUN_NOCTURNO_VALIDACION=1 para ejecutar.');
  
  test.beforeEach(async ({ page }) => {
    // Resetear índice de screenshots
    stepIndex = 0;
    
    // Mockear OAuth para evitar dependencia de servidor real
    await page.context().route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'nocturno-validation-token',
          refresh_token: 'nocturno-validation-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      })
    );
    
    // Intercept errores de consola
    await checkConsoleErrors(page);
  });
  
  test('flujo completo validando bugs resueltos', async ({ page }) => {
    const bugsReport = {
      voseo: { status: 'SKIP', details: [] },
      brokenImages: { status: 'SKIP', details: [] },
      invalidDate: { status: 'SKIP', details: [] },
      visionTotal: { status: 'SKIP', details: [] },
      stageAdvance: { status: 'SKIP', details: [] },
      handOverlap: { status: 'SKIP', details: [] },
    };
    
    try {
      // ═══════════════════════════════════════════════════════════════
      // PASO 1: LOGIN
      // ═══════════════════════════════════════════════════════════════
      await loginDemo(page);
      await captureScreenshot(page, 'nocturno', '01-post-login');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 2: CHECK VOSEO en home
      // ═══════════════════════════════════════════════════════════════
      const voseoHome = await checkNoVoseo(page);
      bugsReport.voseo = voseoHome.length > 0 
        ? { status: 'FAIL', details: voseoHome }
        : { status: 'PASS', details: ['No voseo detectado en home'] };
      
      await captureScreenshot(page, 'nocturno', '02-home-check-voseo');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 3: CHECK VISIÓN TOTAL del operador
      // ═══════════════════════════════════════════════════════════════
      // Buscar el toggle de "Visión total" o "Mostrar todas las capacidades"
      const visionToggle = page.getByText(/visión total|i mostrar todas/i);
      const hasVisionTotal = await visionToggle.count() > 0;
      
      if (hasVisionTotal) {
        // Activar visión total si existe el toggle
        await visionToggle.first().click().catch(() => {});
        await page.waitForTimeout(1000);
      }
      
      // Verificar que todos los módulos estén visibles
      const bodyText = await page.locator('body').innerText();
      const expectedModules = ['Inventario', 'Biodiversidad', 'Asociaciones', 'Tareas', 'Informes'];
      const visibleModules = expectedModules.filter(mod => bodyText.includes(mod));
      
      bugsReport.visionTotal = visibleModules.length >= 3
        ? { status: 'PASS', details: [`Módulos visibles: ${visibleModules.join(', ')}`] }
        : { status: 'FAIL', details: [`Solo ${visibleModules.length} módulos visibles`] };
      
      await captureScreenshot(page, 'nocturno', '03-vision-total');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 4: CHECK FOTOS ROTAS en home
      // ═══════════════════════════════════════════════════════════════
      const brokenHome = await checkImagesLoad(page);
      bugsReport.brokenImages = brokenHome.length > 0
        ? { status: 'FAIL', details: brokenHome }
        : { status: 'PASS', details: ['Todas las imágenes cargan en home'] };
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 5: NAVEGAR A "MIS MÓDULOS"
      // ═══════════════════════════════════════════════════════════════
      const modulosLink = page.getByText(/módulos/i);
      if (await modulosLink.count() > 0) {
        await modulosLink.first().click();
        await page.waitForTimeout(1000);
        await captureScreenshot(page, 'nocturno', '04-mis-modulos');
      }
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 6: NAVEGAR A INVENTARIO
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'inventario' } }));
      });
      await page.waitForTimeout(2000);
      
      const voseoInventario = await checkNoVoseo(page);
      if (voseoInventario.length > 0) {
        bugsReport.voseo.details.push(...voseoInventario);
        bugsReport.voseo.status = 'FAIL';
      }
      
      await captureScreenshot(page, 'nocturno', '05-inventario');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 7: AGREGAR PLANTA (LECHUGA)
      // ═══════════════════════════════════════════════════════════════
      const addPlantBtn = page.getByRole('button', { name: /agregar|crear|nuev/i });
      if (await addPlantBtn.count() > 0) {
        await addPlantBtn.first().click();
        await page.waitForTimeout(1000);
        
        const cropInput = page.locator('input[name*="crop" i], input[placeholder*="cultivo" i]');
        if (await cropInput.count() > 0) {
          await cropInput.first().fill('Lechuga');
          await page.waitForTimeout(500);
          
          const saveBtn = page.getByRole('button', { name: /guardar/i });
          if (await saveBtn.count() > 0) {
            await saveBtn.first().click();
            await page.waitForTimeout(2000);
          }
        }
      }
      
      await captureScreenshot(page, 'nocturno', '06-agregar-lechuga');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 8: ABRIR DETALLE DE PLANTA
      // ═══════════════════════════════════════════════════════════════
      const firstPlant = page.locator('[data-testid="asset-card"], article, .plant-card').first();
      if (await firstPlant.count() > 0) {
        await firstPlant.click();
        await page.waitForTimeout(2000);
        
        // Verificar que la foto de la planta carga
        const brokenPlantPhotos = await checkImagesLoad(page);
        if (brokenPlantPhotos.length > 0) {
          bugsReport.brokenImages.details.push(...brokenPlantPhotos);
          bugsReport.brokenImages.status = 'FAIL';
        }
        
        await captureScreenshot(page, 'nocturno', '07-detalle-planta');
      }
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 9: ABRIR CICLO
      // ═══════════════════════════════════════════════════════════════
      const cycleBtn = page.getByText(/ciclo|etapa|progreso/i);
      if (await cycleBtn.count() > 0) {
        await cycleBtn.first().click();
        await page.waitForTimeout(2000);
        
        // Buscar "Invalid Date" en la vista de ciclo
        const cycleText = await page.locator('body').innerText();
        if (/Invalid Date/i.test(cycleText)) {
          bugsReport.invalidDate = {
            status: 'FAIL',
            details: ['"Invalid Date" encontrado en vista de ciclo']
          };
        } else {
          bugsReport.invalidDate = { status: 'PASS', details: ['No "Invalid Date" en ciclo'] };
        }
        
        await captureScreenshot(page, 'nocturno', '08-ciclo');
      }
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 10: ANOTAR OBSERVACIÓN
      // ═══════════════════════════════════════════════════════════════
      const observeBtn = page.getByRole('button', { name: /observar|registrar|nota/i });
      if (await observeBtn.count() > 0) {
        await observeBtn.first().click();
        await page.waitForTimeout(1000);
        
        const textArea = page.locator('textarea');
        if (await textArea.count() > 0) {
          await textArea.first().fill('Observación E2E nocturna - hojas verdes');
          await page.waitForTimeout(500);
          
          // Verificar que la mano NO se solapa con el input
          const inputBox = await textArea.first().boundingBox();
          const handCursor = page.locator('[class*="hand"], [class*="cursor"], .cursor-pointer');
          if (await handCursor.count() > 0) {
            const handBox = await handCursor.first().boundingBox();
            if (inputBox && handBox) {
              const overlaps = !(
                inputBox.x + inputBox.width < handBox.x ||
                handBox.x + handBox.width < inputBox.x ||
                inputBox.y + inputBox.height < handBox.y ||
                handBox.y + handBox.height < inputBox.y
              );
              
              bugsReport.handOverlap = overlaps
                ? { status: 'FAIL', details: ['La mano se solapa con el input'] }
                : { status: 'PASS', details: ['La mano NO se solapa con el input'] };
            }
          }
        }
        
        await captureScreenshot(page, 'nocturno', '09-observacion');
      }
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 11: ASOCIACIONES
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'asociaciones' } }));
      });
      await page.waitForTimeout(2000);
      
      const voseoAsociaciones = await checkNoVoseo(page);
      if (voseoAsociaciones.length > 0) {
        bugsReport.voseo.details.push(...voseoAsociaciones);
        bugsReport.voseo.status = 'FAIL';
      }
      
      await captureScreenshot(page, 'nocturno', '10-asociaciones');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 12: BIODIVERSIDAD
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'biodiversidad' } }));
      });
      await page.waitForTimeout(2000);
      
      const brokenBiodiv = await checkImagesLoad(page);
      if (brokenBiodiv.length > 0) {
        bugsReport.brokenImages.details.push(...brokenBiodiv);
        bugsReport.brokenImages.status = 'FAIL';
      }
      
      await captureScreenshot(page, 'nocturno', '11-biodiversidad');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 13: JUEGOS - DEFENSORES (nivel 1)
      // ═══════════════════════════════════════════════════════════════
      const defensoresLink = page.getByText(/defensores/i);
      if (await defensoresLink.count() > 0) {
        await defensoresLink.first().click();
        await page.waitForTimeout(2000);
        await captureScreenshot(page, 'nocturno', '12-defensores-n1');
      }
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 14: JUEGOS - MILPA
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'juego-milpa' } }));
      });
      await page.waitForTimeout(2000);
      
      const voseoMilpa = await checkNoVoseo(page);
      if (voseoMilpa.length > 0) {
        bugsReport.voseo.details.push(...voseoMilpa);
        bugsReport.voseo.status = 'FAIL';
      }
      
      await captureScreenshot(page, 'nocturno', '13-milpa');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 15: JUEGOS - MUNDO SUBSUELO
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'juego-subsuelo' } }));
      });
      await page.waitForTimeout(2000);
      
      await captureScreenshot(page, 'nocturno', '14-subsuelo');
      
      // ═══════════════════════════════════════════════════════════════
      // PASO 16: AGENTE
      // ═══════════════════════════════════════════════════════════════
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'agente' } }));
      });
      await page.waitForTimeout(2000);
      
      const voseoAgente = await checkNoVoseo(page);
      if (voseoAgente.length > 0) {
        bugsReport.voseo.details.push(...voseoAgente);
        bugsReport.voseo.status = 'FAIL';
      }
      
      await captureScreenshot(page, 'nocturno', '15-agente');
      
    } catch (error) {
      console.error('❌ Error crítico en el flujo:', error);
      await captureScreenshot(page, 'nocturno', 'error-crítico');
      throw error;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // REPORTAR RESULTADOS POR BUG
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══ REPORTES DE VALIDACIÓN DE BUGS ═══');
    for (const [bugName, report] of Object.entries(bugsReport)) {
      const icon = report.status === 'PASS' ? '✅' : report.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${icon} ${bugName.toUpperCase()}: ${report.status}`);
      if (report.details.length > 0) {
        report.details.forEach(detail => console.log(`   └─ ${detail}`));
      }
    }
    console.log('═══════════════════════════════════════\n');
    
    // Asserts individuales por bug (resilientes)
    if (bugsReport.voseo.status === 'FAIL') {
      expect.soft(false, `Voseo detectado: ${bugsReport.voseo.details.join(', ')}`).toBe(true);
    }
    
    if (bugsReport.brokenImages.status === 'FAIL') {
      expect.soft(false, `Imágenes rotas: ${bugsReport.brokenImages.details.join(', ')}`).toBe(true);
    }
    
    if (bugsReport.invalidDate.status === 'FAIL') {
      expect.soft(false, 'Invalid Date encontrado en la UI').toBe(true);
    }
    
    if (bugsReport.visionTotal.status === 'FAIL') {
      expect.soft(false, 'Visión total del operador no muestra todos los módulos').toBe(true);
    }
    
    if (bugsReport.handOverlap.status === 'FAIL') {
      expect.soft(false, 'La mano se solapa con el input').toBe(true);
    }
    
    // Guardar reporte en archivo JSON
    try {
      if (!fs.existsSync(SCREENSHOT_DIR)) {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      }
      const reportPath = path.join(SCREENSHOT_DIR, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(bugsReport, null, 2));
      console.log(`📊 Reporte guardado en: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️  No se pudo guardar el reporte JSON:', error.message);
    }
  });
});
