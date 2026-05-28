import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Test para UX-24 (#286): bug operador 2026-05-27 — "el listado de
 * especies invasoras para reportar está desactualizado".
 *
 * Root cause: `public/catalog.sqlite` se commitea como artifact estático
 * y no se regeneraba al actualizar el seed JSON. v3.2 ya tenía 10
 * invasoras pero la sqlite bundled aún tenía 3 (v3.0 pre-corte).
 *
 * Test garantiza:
 *   1. El seed v3.2 tiene >=10 especies invasoras (catálogo fuente OK).
 *   2. No quedan caracteres CJK (chinos/japoneses/coreanos) en los
 *      nombres comunes — corruption fix para "Lirio de应用到".
 *   3. El script de build SQLite está en prebuild de package.json para
 *      que toda PR/deploy regenere la sqlite contra el seed actual.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..', '..');

describe('UX-24 — catalogo invasoras actualizado', () => {
  it('chagra-catalog-oss-subset-v3.2.json tiene >=10 especies invasoras', () => {
    const seedPath = resolve(REPO_ROOT, 'catalog', 'chagra-catalog-oss-subset-v3.2.json');
    const raw = readFileSync(seedPath, 'utf-8');
    const json = JSON.parse(raw);
    const list = Array.isArray(json.species) ? json.species : (json.data || []);
    const invasoras = list.filter((s) => s.category === 'especies_invasoras');
    expect(invasoras.length).toBeGreaterThanOrEqual(10);
  });

  it('ningun nombre_comun contiene caracteres CJK (data corruption check)', () => {
    const seedPath = resolve(REPO_ROOT, 'catalog', 'chagra-catalog-oss-subset-v3.2.json');
    const raw = readFileSync(seedPath, 'utf-8');
    const json = JSON.parse(raw);
    const list = Array.isArray(json.species) ? json.species : (json.data || []);
    const cjkRe = /[一-鿿぀-ゟ゠-ヿ가-힯]/;
    const corrupt = list
      .filter((s) => s.nombre_comun && cjkRe.test(s.nombre_comun))
      .map((s) => ({ id: s.id, nombre_comun: s.nombre_comun }));
    expect(corrupt).toEqual([]);
  });

  it('package.json prebuild incluye build-catalog-sqlite.mjs', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf-8'));
    expect(pkg.scripts?.prebuild || '').toContain('build-catalog-sqlite');
  });
});
