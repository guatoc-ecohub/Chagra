import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const archivo = 'src/mockups/MundoMicrofauna3D.jsx';

describe('MundoMicrofauna3D, corte con aire', () => {
  test('amplia el corte y conserva el elenco separado por sus estratos', async () => {
    const fuente = await readFile(archivo, 'utf8');

    expect(fuente).toContain('const ANCHO = 6.8;');
    expect(fuente).toContain('const PROF = 2.8;');
    expect(fuente).toContain("anchor: [-2.55, 0.98, 1.46]");
    expect(fuente).toContain("anchor: [-0.55, 0.2, 1.43]");
    expect(fuente).toContain("anchor: [-1.8, -0.6, 0.82]");
    expect(fuente).toContain("anchor: [0.45, -0.82, 0.9]");
  });

  test('mantiene las ocho patas del tardigrado y del acaro visibles', async () => {
    const fuente = await readFile(archivo, 'utf8');

    expect(fuente).toContain('const xs = [-0.05, 0.08, 0.21, 0.34];');
    expect(fuente).toContain('Array.from({ length: 8 }');
    expect(fuente).toContain('cylinderGeometry args={[0.008, 0.004, 0.15, 4]}');
  });
});
