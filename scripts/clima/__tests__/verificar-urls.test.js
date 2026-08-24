import assert from 'node:assert/strict';
import test from 'node:test';
import { checkUrl, extractCriticalUrls, extractUrls, verifyUrls } from '../verificar-urls.mjs';

test('extrae URLs únicas y conserva las críticas de FUENTES_VIVAS', () => {
  const source = `
    const boletin = 'https://example.test/boletin';
    export const FUENTES_VIVAS = Object.freeze({
      principal: 'https://example.test/principal',
      repetida: 'https://example.test/boletin',
    });
  `;

  assert.deepEqual(extractUrls(source), [
    'https://example.test/boletin',
    'https://example.test/principal',
  ]);
  assert.deepEqual(extractCriticalUrls(source), [
    'https://example.test/principal',
    'https://example.test/boletin',
  ]);
});

test('clasifica 200, 301 y 302 como vivas, y 404/403/000 como muertas', async () => {
  const responses = new Map([
    ['https://mock.test/ok', { status: 200 }],
    ['https://mock.test/moved', { status: 301 }],
    ['https://mock.test/redirect', { status: 302 }],
    ['https://mock.test/not-found', { status: 404 }],
    ['https://mock.test/forbidden', { status: 403 }],
  ]);
  const fetchImpl = async (url) => {
    if (url.endsWith('/network-error')) throw new Error('socket closed');
    return responses.get(url);
  };

  const report = await verifyUrls({
    sourceText: [...responses.keys(), 'https://mock.test/network-error'].map((url) => `'${url}'`).join('\n'),
    fetchImpl,
    timeoutMs: 100,
    criticalUrls: ['https://mock.test/not-found', 'https://mock.test/network-error'],
  });

  assert.equal(report.total, 6);
  assert.equal(report.live, 3);
  assert.equal(report.dead, 3);
  assert.equal(report.criticalDead, 2);
  assert.equal(report.ok, false);
  assert.equal(report.urls.find(({ status }) => status === '000').error, 'socket closed');
});

test('usa GET cuando el servidor rechaza HEAD', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(options.method);
    return { status: options.method === 'HEAD' ? 405 : 200 };
  };

  const result = await checkUrl('https://mock.test/head-no', {
    fetchImpl,
    timeoutMs: 100,
  });

  assert.deepEqual(calls, ['HEAD', 'GET']);
  assert.equal(result.state, 'live');
  assert.equal(result.status, '200');
  assert.equal(result.method, 'GET');
});
