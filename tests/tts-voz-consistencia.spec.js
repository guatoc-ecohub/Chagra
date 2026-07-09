import { test, expect } from '@playwright/test';

/**
 * tts-voz-consistencia.spec.js — la voz de Chagra NO debe "saltar".
 *
 * Bug del operador: "a veces habla una voz y luego otra". Causa: cuando kokoro
 * (TTS neuronal) fallaba/timeouteaba, el cliente saltaba a
 * window.speechSynthesis (voz robótica del navegador) a media sesión.
 *
 * Este spec verifica, en el navegador REAL, que con kokoro MOCKEADO A FALLO el
 * cliente NO invoca window.speechSynthesis.speak (política por defecto: una
 * sola voz natural; silencio consistente ante fallo). Como control, al activar
 * explícitamente el respaldo del navegador, sí debe caer a speechSynthesis.
 *
 * Se apoya en el hook window.__ttsE2E (solo dev/?e2e, ver ttsService.js). Los
 * mocks van en context.route (el SW sombrea page.route — ver
 * feedback-sw-shadows-playwright-route). speechSynthesis se reemplaza por un
 * doble grabador vía addInitScript ANTES de que cargue la app.
 */

async function installSpeechRecorder(page) {
  await page.addInitScript(() => {
    // Neutralizar el Service Worker: en este entorno el SW re-emite los fetch y
    // context.route no siempre los alcanza, dejando colgado el fetch mockeado.
    // Sin SW, el mock de /api/kokoro/tts aplica limpio y el fallo es inmediato.
    try {
      if ('serviceWorker' in navigator) {
        // @ts-ignore — override de test
        navigator.serviceWorker.register = () => Promise.reject(new Error('SW off (test)'));
        // @ts-ignore
        navigator.serviceWorker.getRegistrations = () => Promise.resolve([]);
        // @ts-ignore
        navigator.serviceWorker.getRegistration = () => Promise.resolve(undefined);
      }
    } catch (_) { /* noop */ }

    window.__spoke = [];
    const fake = {
      speak: (u) => { window.__spoke.push(u && u.text ? u.text : true); },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
      speaking: false,
      paused: false,
      onvoiceschanged: null,
    };
    try {
      Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    } catch (_) {
      window.speechSynthesis = fake;
    }
  });
}

async function failKokoro(page) {
  // Todo POST a kokoro devuelve 500 → el cliente reintenta y termina fallando.
  await page.context().route('**/api/kokoro/tts', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"down"}' })
  );
  await page.context().route('**/api/kokoro/health', (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"status":"down"}' })
  );
}

async function waitForHook(page) {
  return page.evaluate(async () => {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      if (window.__ttsE2E && typeof window.__ttsE2E.speakKokoro === 'function') return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    return !!(window.__ttsE2E && window.__ttsE2E.speakKokoro);
  });
}

test.describe('Consistencia de voz — kokoro caído NO salta a la voz del navegador', () => {
  test('speakKokoro con kokoro caído NO invoca speechSynthesis (default)', async ({ page }) => {
    await installSpeechRecorder(page);
    await failKokoro(page);

    await page.goto('/?e2e=1');
    await page.waitForLoadState('domcontentloaded');

    const hookReady = await waitForHook(page);
    test.skip(!hookReady, 'Hook __ttsE2E no disponible en este entorno — no aplica.');

    // Confirmar que el default de la política es "no fallback al navegador".
    const fallbackDefault = await page.evaluate(() => window.__ttsE2E.getBrowserVoiceFallback());
    expect(fallbackDefault).toBe(false);

    const result = await page.evaluate(async () => {
      const r = await window.__ttsE2E.speakKokoro('Prueba de consistencia de la voz de Chagra.');
      return { r, spoke: window.__spoke.length };
    });

    // Kokoro falló → speakKokoro devuelve null y NO habló el navegador.
    expect(result.r).toBeNull();
    expect(result.spoke).toBe(0);
  });

  test('speakSentences con kokoro caído NO invoca speechSynthesis a media respuesta', async ({ page }) => {
    await installSpeechRecorder(page);
    await failKokoro(page);

    await page.goto('/?e2e=1');
    await page.waitForLoadState('domcontentloaded');
    const hookReady = await waitForHook(page);
    test.skip(!hookReady, 'Hook __ttsE2E no disponible en este entorno — no aplica.');

    const spoke = await page.evaluate(async () => {
      const texto =
        'La primera frase del agente es suficientemente larga para el pipeline. ' +
        'La segunda frase también supera el umbral de caracteres necesario.';
      await window.__ttsE2E.speakSentences(texto);
      return window.__spoke.length;
    });

    expect(spoke).toBe(0);
  });

  test('CONTROL: con el respaldo del navegador activado, sí cae a speechSynthesis', async ({ page }) => {
    await installSpeechRecorder(page);
    await failKokoro(page);

    await page.goto('/?e2e=1');
    await page.waitForLoadState('domcontentloaded');
    const hookReady = await waitForHook(page);
    test.skip(!hookReady, 'Hook __ttsE2E no disponible en este entorno — no aplica.');

    const spoke = await page.evaluate(async () => {
      window.__ttsE2E.setBrowserVoiceFallback(true);
      await window.__ttsE2E.speakKokoro('Con respaldo del navegador activado a propósito.');
      return window.__spoke.length;
    });

    // El control prueba que el recorder funciona y que el flag SÍ habilita el
    // fallback cuando el operador lo pide explícitamente.
    expect(spoke).toBeGreaterThan(0);
  });
});
