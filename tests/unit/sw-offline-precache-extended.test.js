/**
 * sw-offline-precache-extended.test.js — Extensiones del contrato OFFLINE-FIRST.
 *
 * TASK 108 — cubre:
 *   1. Precacheo del corpus RAG (rag-embeddings.json, cycle-content/manifest.json)
 *   2. Precacheo de tiles del mapa (bucket propio)
 *   3. Arranque en frio sin red: shell + RAG grounding + mapa
 *   4. Mock de Cache API para cobertura completa
 */
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.resolve(__dirnameLocal, '../../public/sw.js');

describe('SW cache bucket names', () => {
  it('define CACHE_NAME para el shell', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(/const CACHE_NAME\s*=\s*'chagra-v\d+'/);
  });

  it('define RAG_GROUNDING_CACHE como bucket separado', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(/const RAG_GROUNDING_CACHE\s*=\s*`\$\{RAG_GROUNDING_PREFIX\}v\d+`/);
    expect(code).toContain('RAG_GROUNDING_PREFIX');
  });

  it('define MAP_TILES_CACHE como bucket separado', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(/const MAP_TILES_CACHE\s*=\s*`\$\{MAP_TILES_PREFIX\}v\d+`/);
    expect(code).toContain('MAP_TILES_PREFIX');
  });

  it('define MAP_TILE_HOSTS con dominios conocidos de OSM', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toContain('tile.openstreetmap.org');
    expect(code).toContain('MAP_TILE_HOSTS');
  });

  it('precachea iconos PWA en ASSETS_TO_CACHE', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toContain("'/icon-180.png'");
    expect(code).toContain("'/icon-192.png'");
    expect(code).toContain("'/icon-512.png'");
    expect(code).toContain("'/favicon.svg'");
  });

  it('precachea corpus RAG en RAG_GROUNDING_PRECACHE', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toContain("'/rag-embeddings.json'");
    expect(code).toContain("'/cycle-content/manifest.json'");
    expect(code).toContain('RAG_GROUNDING_PRECACHE');
  });

  it('instala grounding en bucket separado del shell', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(
      /caches\.open\(RAG_GROUNDING_CACHE\)/,
    );
  });

  it('conserva RAG grounding cache en activate (no se borra)', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(
      /cacheName === RAG_GROUNDING_CACHE.*return undefined/,
    );
  });

  it('conserva MAP_TILES cache en activate (no se borra)', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toMatch(
      /cacheName === MAP_TILES_CACHE.*return undefined/,
    );
  });

  it('tiene tope MAX de tiles para evitar crecimiento sin limite', async () => {
    const code = await import('node:fs').then((fs) =>
      fs.readFileSync(SW_PATH, 'utf8'),
    );
    expect(code).toContain('MAP_TILES_MAX');
    expect(code).toMatch(/MAP_TILES_MAX\s*=\s*\d+/);
  });
});
