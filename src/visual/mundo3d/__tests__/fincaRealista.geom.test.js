import { describe, expect, it } from 'vitest';
import { RAZAS_CERDO } from '../finca/fincaRealista.geom.js';

describe('razas de cerdo', () => {
  it('resuelve ambas grafías de San Pedreño a la misma ficha', () => {
    expect(RAZAS_CERDO.sanpedreno).toBeDefined();
    expect(RAZAS_CERDO['sanpedreño']).toBe(RAZAS_CERDO.sanpedreno);
  });
});
