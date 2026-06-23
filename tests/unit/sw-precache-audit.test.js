/**
 * sw-precache-audit.test.js — verifica el contrato de precache del SW.
 *
 * Lee public/sw.js y audita:
 *   1. CACHE_NAME se deriva del SHA de build (`chagra-${SW_BUILD_SHA}`).
 *   2. RAG_GROUNDING_CACHE existe con prefijo y version correctos.
 *   3. MAP_TILES_CACHE existe con prefijo y version.
 *   4. ASSETS_TO_CACHE contiene app shell esencial.
 *   5. RAG_GROUNDING_PRECACHE contiene embeddings y manifest.
 *   6. MAP_TILE_HOSTS cubre dominios OSM esperados.
 *
 * Este test NO ejecuta el SW en un sandbox; solo valida las constantes del archivo.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));
const SW_PATH = path.resolve(__dirnameLocal, '../../public/sw.js');
const swSource = fs.readFileSync(SW_PATH, 'utf8');

function extractConst(name) {
  // Matches `const X = 'value';` or `const X = "value";`
  const re = new RegExp(`${name}\\s*=\\s*['"]([^'"]+)['"]`);
  const m = swSource.match(re);
  return m ? m[1] : null;
}

function resolveTemplate(name) {
  // For template-based constants like: const X = `${PREFIX}v1`;
  // Match everything between backticks, excluding backtick.
  const re = new RegExp(`${name}\\s*=\\s*\`([^\`]+)\`;`);
  const m = swSource.match(re);
  if (!m) return null;
  const body = m[1];
  // Replace ${VAR} references with extracted constants
  return body.replace(/\$\{([^}]+)\}/g, (_full, varName) => {
    return extractConst(varName.trim()) || '';
  });
}

function extractArray(name) {
  const re = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const m = swSource.match(re);
  if (!m) return [];
  const body = m[1];
  const strings = [];
  const strRe = /['"]([^'"]+)['"]/g;
  let s;
  while ((s = strRe.exec(body)) !== null) {
    strings.push(s[1]);
  }
  return strings;
}

describe('SW precache contract', () => {
  it('CACHE_NAME se deriva del SHA de build (chagra-${SW_BUILD_SHA})', () => {
    // Desde #1716 el shell se versiona por SHA del bundle, no por chagra-v<N>.
    // CACHE_NAME es un ternario: chagra-<sha> en prod, chagra-dev cuando el
    // placeholder no fue sustituido. Verificamos el contrato de derivacion.
    const placeholder = extractConst('SW_BUILD_SHA');
    expect(placeholder).toBe('__CHAGRA_SW_BUILD_SHA__');
    expect(swSource).toMatch(/const CACHE_NAME\s*=[\s\S]*?`chagra-\$\{SW_BUILD_SHA\}`/);
    expect(swSource).toMatch(/'chagra-dev'/);
  });

  it('RAG_GROUNDING_PREFIX y RAG_GROUNDING_CACHE tienen formato correcto', () => {
    const prefix = extractConst('RAG_GROUNDING_PREFIX');
    expect(prefix).toBe('chagra-rag-grounding-');

    const cacheName = resolveTemplate('RAG_GROUNDING_CACHE');
    expect(cacheName).toBeTruthy();
    expect(cacheName).toMatch(/^chagra-rag-grounding-v\d+$/);
  });

  it('MAP_TILES_PREFIX y MAP_TILES_CACHE tienen formato correcto', () => {
    const prefix = extractConst('MAP_TILES_PREFIX');
    expect(prefix).toBe('chagra-map-tiles-');

    const cacheName = resolveTemplate('MAP_TILES_CACHE');
    expect(cacheName).toBeTruthy();
    expect(cacheName).toMatch(/^chagra-map-tiles-v\d+$/);
  });

  it('MAP_TILES_MAX es un numero positivo', () => {
    const match = swSource.match(/MAP_TILES_MAX\s*=\s*(\d+)/);
    expect(match).toBeTruthy();
    const val = parseInt(match[1], 10);
    expect(val).toBeGreaterThan(0);
  });

  it('ASSETS_TO_CACHE contiene shell esencial (index.html, manifest, icons, catalog.sqlite)', () => {
    const assets = extractArray('ASSETS_TO_CACHE');
    expect(assets).toContain('/');
    expect(assets).toContain('/index.html');
    expect(assets).toContain('/manifest.json');
    expect(assets).toContain('/icons.svg');
    expect(assets).toContain('/favicon.svg');
    expect(assets.some((a) => a.startsWith('/icon-'))).toBe(true);
    expect(assets).toContain('/catalog.sqlite');
  });

  it('RAG_GROUNDING_PRECACHE contiene rag-embeddings.json y cycle-content/manifest.json', () => {
    const precache = extractArray('RAG_GROUNDING_PRECACHE');
    expect(precache).toContain('/rag-embeddings.json');
    expect(precache).toContain('/cycle-content/manifest.json');
  });

  it('MAP_TILE_HOSTS cubre dominios OSM (tile.openstreetmap.org, tile.osm.org)', () => {
    const hosts = extractArray('MAP_TILE_HOSTS');
    expect(hosts).toContain('tile.openstreetmap.org');
    expect(hosts).toContain('tile.osm.org');
  });

  it('sw.js exporta listeners para install, activate y fetch', () => {
    expect(swSource).toContain('self.addEventListener(\'install\'');
    expect(swSource).toContain('self.addEventListener(\'activate\'');
    expect(swSource).toContain('self.addEventListener(\'fetch\'');
  });
});
