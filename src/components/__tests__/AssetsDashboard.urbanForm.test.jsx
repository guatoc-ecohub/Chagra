import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Tests para UX-16 (#286): form planta condicional cuando la zona parent
 * es URBANA (balcón/terraza/ventana/matera/jardín urbano).
 *
 * UX-15 ya ocultó "Capa del cultivo" en contexto urbano. UX-16 extiende
 * el patrón a "Gremio / Función ecológica" — jerga agroecológica que no
 * aplica a balcón / matera.
 *
 * Como AssetsDashboard es un componente gigante con muchos stores y mocks
 * complejos, validamos via source introspection (mismo patrón que
 * estratoCopy.test.jsx para UX-15) que las dos condicionales urbanas
 * existan: estrato + gremio.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(
  resolve(__dirname, '..', 'AssetsDashboard.jsx'),
  'utf-8',
);

describe('UX-16 — gremio condicional urbano', () => {
  it('source declara data-testid="gremio-hidden-urban" (fallback urbano)', () => {
    expect(SOURCE).toContain('data-testid="gremio-hidden-urban"');
  });

  it('source declara data-testid="gremio-field" (campo normal)', () => {
    expect(SOURCE).toContain('data-testid="gremio-field"');
  });

  it('copy del fallback urbano dice "no necesitas indicar función ecológica"', () => {
    expect(SOURCE).toMatch(/Zona urbana:\s*no necesitas indicar función ecológica/);
  });

  it('mantiene el patrón análogo a UX-15 (estrato condicional urbano)', () => {
    // Las dos guardas urbanas deben coexistir.
    expect(SOURCE).toContain('data-testid="estrato-hidden-urban"');
    expect(SOURCE).toContain('data-testid="gremio-hidden-urban"');
  });

  it('helper isUrbanLandType viene del módulo canónico utils/landTypes', () => {
    expect(SOURCE).toMatch(/import\s*\{[^}]*isUrbanLandType[^}]*\}\s*from\s*'\.\.\/utils\/landTypes'/);
  });
});
