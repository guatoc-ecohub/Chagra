import { test, expect } from '@playwright/test';

test('control negativo: un asset inexistente responde 404 y no HTML', async ({ request }) => {
  const response = await request.get('/assets/NO-EXISTE-carga-perezosa.js');

  expect(response.status()).toBe(404);
  expect(response.headers()['content-type'] || '').not.toMatch(/text\/html/i);
});
