/**
 * corpusLoader.test.js — unit tests para TIER detection runtime (#74).
 *
 * Cobertura:
 * - getTier(): default OSS, lectura case-insensitive de PRO, otros valores → OSS.
 * - resolveCatalogUrl(): OSS → /catalog.sqlite. PRO + URL set → URL override.
 *   PRO sin URL → fallback OSS + warning.
 * - loadCatalogBuffer(): fetch happy path con magic header válido. Magic
 *   header inválido → throw. HTTP non-OK → throw.
 * - assertCatalogShape(): tabla con rows OK. Tabla vacía → throw. Tabla no
 *   consultable → throw.
 *
 * Aislamiento: vitest stubEnv + mock fetch global. resetModules entre tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_TIER = 'VITE_CHAGRA_TIER';
const ENV_URL = 'VITE_CHAGRA_CATALOG_URL';

const SQLITE_MAGIC = 'SQLite format 3\0';

const importFresh = async () => {
    vi.resetModules();
    return import('../corpusLoader.js');
};

/**
 * Construye un Uint8Array que empieza con el magic header SQLite válido,
 * seguido de bytes arbitrarios para llegar a `byteLength` total.
 */
const makeSqliteBlob = (byteLength = 4096) => {
    const buf = new Uint8Array(byteLength);
    for (let i = 0; i < SQLITE_MAGIC.length; i++) {
        buf[i] = SQLITE_MAGIC.charCodeAt(i);
    }
    return buf;
};

let fetchMock;
let warnSpy;

beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
});

afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
});

describe('corpusLoader — getTier', () => {
    it('default OSS cuando VITE_CHAGRA_TIER no está set', async () => {
        vi.unstubAllEnvs();
        const { getTier } = await importFresh();
        expect(getTier()).toBe('OSS');
    });

    it('OSS cuando VITE_CHAGRA_TIER="OSS"', async () => {
        vi.stubEnv(ENV_TIER, 'OSS');
        const { getTier } = await importFresh();
        expect(getTier()).toBe('OSS');
    });

    it('PRO cuando VITE_CHAGRA_TIER="PRO" (case-insensitive)', async () => {
        vi.stubEnv(ENV_TIER, 'pro');
        const { getTier } = await importFresh();
        expect(getTier()).toBe('PRO');
    });

    it('OSS para valores desconocidos (defensive)', async () => {
        vi.stubEnv(ENV_TIER, 'enterprise');
        const { getTier } = await importFresh();
        expect(getTier()).toBe('OSS');
    });
});

describe('corpusLoader — resolveCatalogUrl', () => {
    it('OSS default → /catalog.sqlite, sin fallback', async () => {
        vi.unstubAllEnvs();
        const { resolveCatalogUrl } = await importFresh();
        const r = resolveCatalogUrl();
        expect(r).toEqual({ url: '/catalog.sqlite', tier: 'OSS', fallback: false });
    });

    it('PRO + URL set → override URL', async () => {
        vi.stubEnv(ENV_TIER, 'PRO');
        vi.stubEnv(ENV_URL, 'https://cdn.example.com/catalog/full-v3.2.sqlite');
        const { resolveCatalogUrl } = await importFresh();
        const r = resolveCatalogUrl();
        expect(r).toEqual({
            url: 'https://cdn.example.com/catalog/full-v3.2.sqlite',
            tier: 'PRO',
            fallback: false,
        });
    });

    it('PRO sin VITE_CHAGRA_CATALOG_URL → fallback OSS + warning (no rompe deploy)', async () => {
        vi.stubEnv(ENV_TIER, 'PRO');
        // VITE_CHAGRA_CATALOG_URL no set
        const { resolveCatalogUrl } = await importFresh();
        const r = resolveCatalogUrl();
        expect(r).toEqual({ url: '/catalog.sqlite', tier: 'OSS', fallback: true });
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('VITE_CHAGRA_CATALOG_URL');
    });

    it('PRO con VITE_CHAGRA_CATALOG_URL="" (vacío) → fallback OSS', async () => {
        vi.stubEnv(ENV_TIER, 'PRO');
        vi.stubEnv(ENV_URL, '   ');
        const { resolveCatalogUrl } = await importFresh();
        const r = resolveCatalogUrl();
        expect(r.tier).toBe('OSS');
        expect(r.fallback).toBe(true);
        expect(r.url).toBe('/catalog.sqlite');
    });
});

describe('corpusLoader — loadCatalogBuffer', () => {
    it('OSS happy path: fetchea /catalog.sqlite con magic válido', async () => {
        vi.unstubAllEnvs();
        const blob = makeSqliteBlob(8192);
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            arrayBuffer: async () => blob.buffer,
        });
        const { loadCatalogBuffer } = await importFresh();
        const { buffer, source } = await loadCatalogBuffer();
        // loadCatalogBuffer pasa un AbortController propio (segundo arg { signal }).
        expect(fetchMock).toHaveBeenCalledWith('/catalog.sqlite', expect.objectContaining({ signal: expect.anything() }));
        expect(buffer.byteLength).toBe(8192);
        expect(source).toEqual({ url: '/catalog.sqlite', tier: 'OSS', fallback: false });
    });

    it('PRO + URL set: fetchea la URL override', async () => {
        vi.stubEnv(ENV_TIER, 'PRO');
        vi.stubEnv(ENV_URL, 'https://cdn.example.com/full.sqlite');
        const blob = makeSqliteBlob(4096);
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            arrayBuffer: async () => blob.buffer,
        });
        const { loadCatalogBuffer } = await importFresh();
        const { source } = await loadCatalogBuffer();
        expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/full.sqlite', expect.objectContaining({ signal: expect.anything() }));
        expect(source.tier).toBe('PRO');
        expect(source.fallback).toBe(false);
    });

    it('HTTP 404 → throw con info de la URL', async () => {
        vi.unstubAllEnvs();
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer()).rejects.toThrow(/HTTP 404/);
    });

    it('Magic header inválido (HTML de error) → throw', async () => {
        vi.unstubAllEnvs();
        // Simula que el CDN devolvió HTML "404 Not Found" en vez de SQLite.
        const html = '<!DOCTYPE html><html><body>404</body></html>';
        const buf = new Uint8Array(html.length);
        for (let i = 0; i < html.length; i++) buf[i] = html.charCodeAt(i);
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            arrayBuffer: async () => buf.buffer,
        });
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer()).rejects.toThrow(/SQLite magic header/);
    });

    it('Blob muy chico (<16 bytes) → throw', async () => {
        vi.unstubAllEnvs();
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            arrayBuffer: async () => new ArrayBuffer(8),
        });
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer()).rejects.toThrow(/too small/);
    });

    it('PRO sin URL set → fetchea /catalog.sqlite (fallback path)', async () => {
        vi.stubEnv(ENV_TIER, 'PRO');
        const blob = makeSqliteBlob(2048);
        fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            statusText: 'OK',
            arrayBuffer: async () => blob.buffer,
        });
        const { loadCatalogBuffer } = await importFresh();
        const { source } = await loadCatalogBuffer();
        expect(fetchMock).toHaveBeenCalledWith('/catalog.sqlite', expect.objectContaining({ signal: expect.anything() }));
        expect(source.fallback).toBe(true);
        expect(source.tier).toBe('OSS');
    });
});

describe('corpusLoader — isAbortLikeFetchError', () => {
    it('AbortError → true', async () => {
        const { isAbortLikeFetchError } = await importFresh();
        const err = new Error('aborted');
        err.name = 'AbortError';
        expect(isAbortLikeFetchError(err)).toBe(true);
    });

    it('TypeError "Failed to fetch" → true', async () => {
        const { isAbortLikeFetchError } = await importFresh();
        const err = new TypeError('Failed to fetch');
        expect(isAbortLikeFetchError(err)).toBe(true);
    });

    it('TypeError "NetworkError when attempting to fetch resource." (Firefox) → true', async () => {
        const { isAbortLikeFetchError } = await importFresh();
        const err = new TypeError('NetworkError when attempting to fetch resource.');
        expect(isAbortLikeFetchError(err)).toBe(true);
    });

    it('Error HTTP/magic (no abort) → false', async () => {
        const { isAbortLikeFetchError } = await importFresh();
        expect(isAbortLikeFetchError(new Error('HTTP 404 Not Found'))).toBe(false);
        expect(isAbortLikeFetchError(new Error('missing SQLite magic header'))).toBe(false);
    });

    it('valores no-Error → false (defensivo)', async () => {
        const { isAbortLikeFetchError } = await importFresh();
        expect(isAbortLikeFetchError(null)).toBe(false);
        expect(isAbortLikeFetchError(undefined)).toBe(false);
        expect(isAbortLikeFetchError('Failed to fetch')).toBe(false);
    });
});

describe('corpusLoader — loadCatalogBuffer resiliencia al abort (bug prod 2026-06-14)', () => {
    let debugSpy;
    let errorSpy;
    beforeEach(() => {
        debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        debugSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('abort en el primer fetch → degrada a console.debug (NO error) y reintenta UNA vez', async () => {
        vi.unstubAllEnvs();
        const blob = makeSqliteBlob(8192);
        // 1er intento: abort (TypeError Failed to fetch). 2do intento: OK.
        fetchMock
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                arrayBuffer: async () => blob.buffer,
            });
        const { loadCatalogBuffer } = await importFresh();
        const { buffer } = await loadCatalogBuffer();
        expect(buffer.byteLength).toBe(8192);
        // Reintentó exactamente una vez (2 llamadas totales).
        expect(fetchMock).toHaveBeenCalledTimes(2);
        // Degradó a debug, NO gritó error.
        expect(debugSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('AbortError en el primer fetch → reintenta y resuelve', async () => {
        vi.unstubAllEnvs();
        const blob = makeSqliteBlob(4096);
        const abortErr = new Error('aborted');
        abortErr.name = 'AbortError';
        fetchMock
            .mockRejectedValueOnce(abortErr)
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                arrayBuffer: async () => blob.buffer,
            });
        const { loadCatalogBuffer } = await importFresh();
        const { buffer } = await loadCatalogBuffer();
        expect(buffer.byteLength).toBe(4096);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(debugSpy).toHaveBeenCalledTimes(1);
    });

    it('fallo real (404) NO reintenta y propaga el throw', async () => {
        vi.unstubAllEnvs();
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found',
            arrayBuffer: async () => new ArrayBuffer(0),
        });
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer()).rejects.toThrow(/HTTP 404/);
        // No reintentó: un fallo real no es abort-like.
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(debugSpy).not.toHaveBeenCalled();
    });

    it('abort en AMBOS intentos → propaga el abort (no cuelga, no loop infinito)', async () => {
        vi.unstubAllEnvs();
        fetchMock
            .mockRejectedValueOnce(new TypeError('Failed to fetch'))
            .mockRejectedValueOnce(new TypeError('Failed to fetch'));
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer()).rejects.toThrow(/Failed to fetch/);
        // Exactamente 2 intentos (1 original + 1 retry), no más.
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('caller pasa un signal YA abortado → no reintenta (respeta su intención)', async () => {
        vi.unstubAllEnvs();
        const controller = new AbortController();
        controller.abort();
        // fetch con signal abortado rechaza con AbortError.
        const abortErr = new Error('aborted');
        abortErr.name = 'AbortError';
        fetchMock.mockRejectedValue(abortErr);
        const { loadCatalogBuffer } = await importFresh();
        await expect(loadCatalogBuffer({ signal: controller.signal })).rejects.toThrow();
        // No reintentó: el caller abortó a propósito.
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('corpusLoader — assertCatalogShape', () => {
    it('tabla species con rows → devuelve speciesCount', async () => {
        const { assertCatalogShape } = await importFresh();
        const fakeDb = {
            exec: ({ sql }) => {
                if (sql.includes('species')) return [{ n: 105 }];
                return [];
            },
        };
        expect(assertCatalogShape(fakeDb)).toEqual({ speciesCount: 105 });
    });

    it('tabla species vacía → throw', async () => {
        const { assertCatalogShape } = await importFresh();
        const fakeDb = { exec: () => [{ n: 0 }] };
        expect(() => assertCatalogShape(fakeDb)).toThrow(/vacía o count inválido/);
    });

    it('handle inválido → throw', async () => {
        const { assertCatalogShape } = await importFresh();
        expect(() => assertCatalogShape(null)).toThrow(/handle SQLite inválido/);
        expect(() => assertCatalogShape({})).toThrow(/handle SQLite inválido/);
    });

    it('exec throws (tabla species inexistente) → throw envuelve mensaje', async () => {
        const { assertCatalogShape } = await importFresh();
        const fakeDb = {
            exec: () => {
                throw new Error('no such table: species');
            },
        };
        expect(() => assertCatalogShape(fakeDb)).toThrow(/tabla species no consultable/);
    });
});
