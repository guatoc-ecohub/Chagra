import { test, expect } from '@playwright/test';

/*
 * juego-jugable.spec.js — E2E gate para juegos de Chagra.
 *
 * Valida que un juego sea JUGABLE antes de entrar al código:
 *   - Carga sin errores críticos
 *   - Tiene un canvas renderizado (no pantalla estática)
 *   - Responde a input (teclas de flecha y espacio)
 *   - No hay errores de consola ni requests fallidos
 *
 * Uso:
 *   JUEGO_SLUG=angelita-bros npx playwright test --config=playwright.juegos.config.js
 *   # o con el script npm run test:juego
 *
 * Variables de entorno:
 *   - JUEGO_SLUG: slug del juego (default: angelita-bros)
 *   - JUEGO_BASE_URL: URL base del servidor de juegos (default: http://127.0.0.1:8800)
 *   - JUEGO_INPUT_SECONDS: segundos de input simulado (default: 3)
 */

const JUEGO_SLUG = process.env.JUEGO_SLUG || 'angelita-bros';
const JUEGO_BASE_URL = process.env.JUEGO_BASE_URL || 'http://127.0.0.1:8800';
const JUEGO_INPUT_SECONDS = parseInt(process.env.JUEGO_INPUT_SECONDS || '3', 10);
const JUEGO_URL = `${JUEGO_BASE_URL}/juegos/${JUEGO_SLUG}/`;

test.describe(`Juego jugable: ${JUEGO_SLUG}`, () => {
  test('debe cargar sin errores críticos y responder a input', async ({ page }) => {
    // Colección de errores durante la carga
    const erroresCriticos = [];
    const requestsFallidos = [];

    // Capturar errores de página (JS runtime errors)
    page.on('pageerror', (err) => {
      erroresCriticos.push({
        tipo: 'pageerror',
        mensaje: err.message,
        stack: err.stack,
      });
    });

    // Capturar errores de consola
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const texto = msg.text();
        // La URL del recurso NO viene en el texto del mensaje: para un 404 el
        // texto es "Failed to load resource: the server responded with a
        // status of 404". Hay que mirar msg.location().url, o el filtro de
        // favicon nunca matchea y TODO juego sin favicon reprueba el gate
        // (falso positivo real, visto 2026-08-05 con angelita-bros).
        const urlRecurso = msg.location()?.url || '';
        const ruido = `${texto} ${urlRecurso}`.toLowerCase();
        const noCritico =
          ruido.includes('favicon') ||
          ruido.includes('manifest') ||
          texto.includes('401') ||
          texto.includes('403') ||
          ruido.includes('mixed content') ||
          ruido.includes('preload');

        if (!noCritico) {
          erroresCriticos.push({
            tipo: 'console',
            mensaje: texto,
          });
        }
      }
    });

    // Capturar requests fallidos (network errors)
    page.on('requestfailed', (request) => {
      const url = request.url();
      // Ignorar errores comunes de dev (favicon, analytics, etc.)
      const noCritico =
        url.includes('favicon') ||
        url.includes('analytics') ||
        url.includes('telemetry') ||
        url.includes('tracking');

      if (!noCritico) {
        requestsFallidos.push({
          url,
          error: request.failure()?.errorText,
        });
      }
    });

    // Navegar a la URL del juego
    await page.goto(JUEGO_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Esperar a que el canvas esté presente y tenga tamaño > 0
    // Prioridad: canvas con id="game", fallback al primer canvas
    const canvasGame = page.locator('canvas#game');
    const canvasCount = await page.locator('canvas').count();
    const canvas = canvasCount > 0 && (await canvasGame.count()) > 0 ? canvasGame : page.locator('canvas').first();
    await expect(canvas, 'El juego debe tener un elemento canvas').toBeVisible({ timeout: 15000 });

    // Validar que el canvas tenga dimensiones reales (no 0x0)
    const box = await canvas.boundingBox();
    expect(box, 'El canvas debe tener dimensiones > 0').toBeTruthy();
    if (box) {
      expect(box.width, 'El ancho del canvas debe ser > 0').toBeGreaterThan(0);
      expect(box.height, 'El alto del canvas debe ser > 0').toBeGreaterThan(0);
    }

    // Tomar captura inicial del canvas para comparar después del input
    const snapshotInicial = await canvas.screenshot();

    // Verificar que NO hubo errores críticos durante la carga
    expect(
      erroresCriticos,
      `No debe haber errores críticos durante la carga. Encontrados: ${JSON.stringify(erroresCriticos)}`
    ).toEqual([]);

    expect(
      requestsFallidos,
      `No debe haber requests fallidos. Encontrados: ${JSON.stringify(requestsFallidos)}`
    ).toEqual([]);

    // Simular input de juego (flechas y espacio) durante N segundos
    const teclas = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    const startTime = Date.now();
    const duracion = JUEGO_INPUT_SECONDS * 1000;

    test.info().annotations.push({
      type: 'input_simulado',
      description: `Simulando input de juego durante ${JUEGO_INPUT_SECONDS}s`,
    });

    while (Date.now() - startTime < duracion) {
      // Presionar una tecla aleatoria
      const tecla = teclas[Math.floor(Math.random() * teclas.length)];
      await page.keyboard.press(tecla);
      // Pequeña pausa entre keystrokes
      await page.waitForTimeout(100);
    }

    // Esperar un momento para que el juego procese el input
    await page.waitForTimeout(500);

    // Tomar captura después del input
    const snapshotFinal = await canvas.screenshot();

    // Validar que el canvas cambió (el juego responde a input)
    // Si las imágenes son idénticas, el juego no está respondiendo
    const buffersIguales = snapshotInicial.equals(snapshotFinal);
    expect(
      buffersIguales,
      'El canvas debe cambiar después de simular input (juego responde a input, no pantalla estática)'
    ).toBeFalsy();

    // Guardar screenshots para debugging
    await page.screenshot({
      path: `test-results/juego-${JUEGO_SLUG}-final.png`,
      fullPage: true,
    });

    test.info().attachments.push({
      name: `juego-${JUEGO_SLUG}-inicial`,
      contentType: 'image/png',
      body: snapshotInicial,
    });

    test.info().attachments.push({
      name: `juego-${JUEGO_SLUG}-final`,
      contentType: 'image/png',
      body: snapshotFinal,
    });
  });

  test('debe tener metadata básica accesible', async ({ page }) => {
    // Validar que la página tenga título y metadata básica
    await page.goto(JUEGO_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(page, 'La página debe cargar').toHaveTitle(/./); // Cualquier título no vacío

    // Verificar que haya un canvas visible
    // Prioridad: canvas con id="game", fallback al primer canvas
    const canvasGame = page.locator('canvas#game');
    const canvasCount = await page.locator('canvas').count();
    const canvas = canvasCount > 0 && (await canvasGame.count()) > 0 ? canvasGame : page.locator('canvas').first();
    await expect(canvas, 'Debe haber un canvas visible').toBeVisible({ timeout: 15000 });

    // Validar que el canvas esté en el viewport y sea interactuable
    const box = await canvas.boundingBox();
    expect(box, 'El canvas debe estar en el viewport').toBeTruthy();
  });
});
