import { test, expect } from '@playwright/test';

// TODO(telemetry-tests): los dos tests requieren ajustes para correr en CI.
//   1. test 'debe truncar respuesta repetitiva' — solo verifica que el panel
//      'Análisis IA' renderiza, no que el texto fue truncado. Necesita
//      assertion sobre 'Respuesta truncada por repetición' en el DOM.
//   2. test 'debe enviar repeat_penalty' — falta login flow (mismo patrón
//      que offline.spec.js: getByLabel(/usuario/i) + getByRole('button')).
//      Sin login el component nunca monta y la request a Ollama no se dispara.
//
// Marcado .skip hasta que el harness se complete. La cobertura unitaria del
// regex de repetitionGuard.js puede activarse independiente cuando se añada
// vitest/jest al proyecto (Playwright es E2E, no unit).

test.describe.skip('Repetition Guard & LLM Constraints (v0.7.2)', () => {
    test.beforeEach(async ({ context }) => {
        // Mock Home Assistant
        await context.route('**/api/ha/states/**', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ state: '25.5' })
            });
        });

        // Mock OAuth
        await context.route('**/oauth/token', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ access_token: 'fake', expires_in: 3600 })
            })
        );
    });

    test('debe truncar respuesta repetitiva de la IA', async ({ page }) => {
        // Mock Ollama with repetition
        await page.route('**/api/ollama/api/chat', (route) => {
            const chunks = [
                JSON.stringify({ message: { content: 'Excelente ' }, done: false }) + '\n',
                JSON.stringify({ message: { content: 'excelente ' }, done: false }) + '\n',
                JSON.stringify({ message: { content: 'excelente.' }, done: true }) + '\n'
            ];
            route.fulfill({
                status: 200,
                contentType: 'application/x-ndjson',
                body: chunks.join('')
            });
        });

        await page.goto('/');
        // Login bypass or simplified login... assuming dashboard is accessible or mocked

        // Buscamos el texto truncado. El componente se monta y el fetch se dispara solo.
        await expect(page.locator('div:has-text("Análisis IA")')).toBeVisible();
    });

    test('debe enviar repeat_penalty en la request a Ollama', async ({ page }) => {
        let capturedBody = null;
        await page.route('**/api/ollama/api/chat', async (route) => {
            capturedBody = JSON.parse(route.request().postData());
            route.fulfill({ status: 200, body: JSON.stringify({ done: true }) });
        });

        await page.goto('/');

        await page.waitForFunction(() => capturedBody !== null);
        expect(capturedBody.options.repeat_penalty).toBe(1.15);
        expect(capturedBody.options.num_predict).toBeLessThanOrEqual(250);
    });
});
