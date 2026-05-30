import { describe, it, expect } from 'vitest';

/**
 * Tests para UX-15 (#286): copy de Capa del cultivo (antes "Estrato")
 * sin jerga forestal técnica.
 *
 * Verificamos el contenido literal del módulo AssetsDashboard a través
 * de un re-import + introspección de strings, porque ESTRATO_OPTIONS no
 * está exportado (vive como const local del componente). En vez de
 * tocar el archivo para exportarlo (lo cual reactivaría
 * react-refresh/only-export-components), validamos a través del bundled
 * source via fs (lectura sincrónica del archivo .jsx).
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DASHBOARD = resolve(__dirname, '..', 'AssetsDashboard.jsx');
const source = readFileSync(ASSETS_DASHBOARD, 'utf-8');

describe('UX-15 — copy de "Capa del cultivo" sin dosel', () => {
  it('NO usa la palabra "dosel" en ningún copy visible al usuario', () => {
    // Las únicas menciones permitidas son en comentarios de código que
    // documentan la decisión histórica de removerlo. Buscamos la palabra
    // fuera de comentarios.
    // Estrategia: buscar "label:" / "desc:" / "height:" con "dosel" cerca.
    const labelLines = source
      .split('\n')
      .filter((line) =>
        line.includes('label:') ||
        line.includes('desc:') ||
        line.includes('height:') ||
        line.includes('placeholder=') ||
        line.includes('>Capa') ||
        line.includes('>Estrato')
      );
    for (const line of labelLines) {
      expect(line.toLowerCase()).not.toContain('dosel');
    }
  });

  it('label visible es "Capa del cultivo" — NO "Estrato en el sistema"', () => {
    expect(source).toContain('Capa del cultivo');
    expect(source).not.toMatch(/>Estrato en el sistema</);
  });

  it('opciones usan lenguaje accesible (sin "Emergente >25m" / "Alto 10-25m" técnicos)', () => {
    // Las nuevas etiquetas debe ser todas presentes:
    expect(source).toContain('Árboles muy altos');
    expect(source).toContain('Árboles altos');
    expect(source).toContain('Arbustos');
    expect(source).toContain('Plantas bajas');
    // Las viejas labels técnicas en español ya NO deben aparecer como label:
    expect(source).not.toMatch(/label:\s*'Emergente \(/);
    expect(source).not.toMatch(/label:\s*'Alto \(/);
    expect(source).not.toMatch(/label:\s*'Medio \(/);
    expect(source).not.toMatch(/label:\s*'Bajo \(/);
  });

  it('declara los 5 tipos urbanos en URBAN_LAND_TYPES (utils/landTypes)', () => {
    // UX-13 (#286): el set urbano se extrajo de AssetsDashboard.jsx a
    // utils/landTypes.js (regla react-refresh/only-export-components).
    // La fuente de verdad ahora es URBAN_LAND_TYPES, derivado de LAND_TYPES.
    const landTypesSource = readFileSync(
      resolve(__dirname, '..', '..', 'utils', 'landTypes.js'),
      'utf-8'
    );
    expect(landTypesSource).toMatch(/URBAN_LAND_TYPES\s*=\s*new Set\(/);
    for (const v of ['balcony', 'terrace', 'window_sill', 'indoor_pot', 'urban_garden']) {
      expect(landTypesSource).toContain(`'${v}'`);
    }
  });

  it('renderiza fallback urbano "Zona urbana: no necesitas indicar capa"', () => {
    expect(source).toContain('Zona urbana: no necesitas indicar capa del cultivo');
    expect(source).toContain('data-testid="estrato-hidden-urban"');
  });

  it('mantiene los 4 values técnicos legacy (emergente/alto/medio/bajo) para compat backend', () => {
    // El value persistido en FarmOS no cambia para no romper datos previos.
    for (const v of ['emergente', 'alto', 'medio', 'bajo']) {
      expect(source).toContain(`value: '${v}'`);
    }
  });
});
