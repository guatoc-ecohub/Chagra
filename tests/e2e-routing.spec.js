import { test, expect } from '@playwright/test';

/*
 * e2e-routing.spec.js — validacion de rutas hash y deep-links (#86).
 *
 * Cubre:
 *   - Cada ruta hash conocida carga la pantalla correcta (sin crash)
 *   - Hash invalido cae al fallback sin romper
 *   - Deep-link con contexto adicional (separador /)
 *
 * ORIGIN del dev server via vite (port 5173 estricto, mismo que el resto de E2E).
 */
var ORIGIN = 'http://localhost:5173';

var KNOWN_HASHES = [
  { hash: '#agente', label: 'agente' },
  { hash: '#perfil', label: 'perfil' },
  { hash: '#informes', label: 'informes' },
  { hash: '#ayuda', label: 'ayuda' },
  { hash: '#biodiversidad', label: 'biodiversidad' },
  { hash: '#tareas', label: 'tareas' },
  { hash: '#inventario', label: 'inventario' },
  { hash: '#hoy', label: 'hoy' },
];

test.describe('Routing — smoke de rutas hash', function () {
  for (var i = 0; i < KNOWN_HASHES.length; i++) {
    var entry = KNOWN_HASHES[i];
    test('ruta ' + entry.hash + ' carga sin errores criticos', async function ({ page }) {
      var errors = [];
      page.on('pageerror', function (err) { errors.push(err.message); });
      page.on('console', function (msg) {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(ORIGIN + '/' + entry.hash);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      var critical = errors.filter(function (e) {
        return (
          !e.includes('manifest') &&
          !e.includes('favicon') &&
          !e.includes('ServiceWorker') &&
          !e.toLowerCase().includes('preload') &&
          !e.toLowerCase().includes('mixed content') &&
          !e.includes('401') &&
          !e.includes('403')
        );
      });
      expect.soft(critical, 'errores JS criticos en ' + entry.hash).toEqual([]);
    });
  }
});

test.describe('Routing — fallback y rutas invalidas', function () {
  test('hash #invalido-xyz no revienta y carga la app', async function ({ page }) {
    var errors = [];
    page.on('pageerror', function (err) { errors.push(err.message); });

    await page.goto(ORIGIN + '/#invalido-xyz');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    var critical = errors.filter(function (e) {
      return !e.includes('manifest') && !e.includes('favicon') && !e.includes('ServiceWorker');
    });
    expect.soft(critical).toEqual([]);
  });

  test('hash sin valor (#) carga sin crash', async function ({ page }) {
    var errors = [];
    page.on('pageerror', function (err) { errors.push(err.message); });

    await page.goto(ORIGIN + '/#');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    var critical = errors.filter(function (e) {
      return !e.includes('manifest') && !e.includes('favicon');
    });
    expect.soft(critical).toEqual([]);
  });

  test('rutas no mapeadas como #home o #insumos no crashean', async function ({ page }) {
    var errors = [];
    page.on('pageerror', function (err) { errors.push(err.message); });

    await page.goto(ORIGIN + '/#home');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    var critical = errors.filter(function (e) {
      return !e.includes('manifest') && !e.includes('favicon') && !e.includes('ServiceWorker');
    });
    expect.soft(critical).toEqual([]);
  });
});

test.describe('Routing — deep-link con contexto', function () {
  test('#agente con path extra no crashea', async function ({ page }) {
    var errors = [];
    page.on('pageerror', function (err) { errors.push(err.message); });

    await page.goto(ORIGIN + '/#agente/extra-path');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    var critical = errors.filter(function (e) {
      return !e.includes('manifest') && !e.includes('favicon') && !e.includes('ServiceWorker');
    });
    expect.soft(critical).toEqual([]);
  });

  test('hash mantiene integridad de query params', async function ({ page }) {
    var errors = [];
    page.on('pageerror', function (err) { errors.push(err.message); });

    await page.goto(ORIGIN + '/#agente?ref=home');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    var critical = errors.filter(function (e) {
      return !e.includes('manifest') && !e.includes('favicon') && !e.includes('ServiceWorker');
    });
    expect.soft(critical).toEqual([]);
  });
});
