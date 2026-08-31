import { describe, expect, test } from 'vitest';
import { PISOS } from '../VitrinaMaestraMundos.jsx';
import { VINETAS_GEOM } from '../../visual/mundo3d/vitrina/vinetasMundos.geom.js';

describe('VitrinaMaestraMundos', () => {
  test('asigna un angulo a cada mundo de todos los pisos termicos', () => {
    for (const piso of PISOS) {
      expect(piso.angulos, piso.id).toHaveLength(piso.mundos.length);
    }
  });

  test('tiene una vineta para cada mundo de la galeria', () => {
    for (const piso of PISOS) {
      for (const mundo of piso.mundos) {
        expect(VINETAS_GEOM[mundo.id], mundo.id).toBeTypeOf('function');
      }
    }
  });
});
