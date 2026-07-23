import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const MANIFEST_PATH = resolve(ROOT, 'public/cycle-content/manifest.json');
const LOADER_URL = pathToFileURL(resolve(ROOT, 'scripts/bench-rag-retrieve.loader.mjs')).href;

function readLoaderCatalog() {
  const program = `import { getBenchCatalogSpecies } from ${JSON.stringify(LOADER_URL)}; console.log(JSON.stringify(getBenchCatalogSpecies()));`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
    cwd: ROOT,
    encoding: 'utf8',
  }));
}

describe('bench RAG loader catalog stub', () => {
  it('carga todos los slugs reales del manifest para el tier-gate', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    const species = readLoaderCatalog();

    expect(species).toHaveLength(manifest.slugs.length);
    expect(species).toHaveLength(501);
    expect(species).toEqual(manifest.slugs.map((id) => ({ id })));
  });
});
