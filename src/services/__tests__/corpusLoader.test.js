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
        expect(fetchMock).toHaveBeenCalledWith('/catalog.sqlite');
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
        expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/full.sqlite');
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
        expect(fetchMock).toHaveBeenCalledWith('/catalog.sqlite');
        expect(source.fallback).toBe(true);
        expect(source.tier).toBe('OSS');
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
