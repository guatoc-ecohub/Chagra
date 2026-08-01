import { describe, expect, it } from 'vitest';
import { buildSpatialAgentInitialContext, buildSpatialContextPin } from '../spatialAgentContext';

describe('buildSpatialContextPin', () => {
  it('fija el mundo, hotspot, clima y estado de finca como contexto de sistema', () => {
    const pin = buildSpatialContextPin({
      mundoId: 'agua',
      hotspotActivo: 'quebrada-viva',
      clima: 'lluvia',
      estadoFinca: {
        clima: 'lluvia',
        enso: 'nina',
        saludFinca: { matasVivas: 12, matasTotal: 14, agua: 0.8 },
        cosechaReciente: { cultivo: 'cafe', mundoId: null },
      },
    });

    expect(pin).toContain('CONTEXTO ESPACIAL FIJADO (TURNO 0)');
    expect(pin).toContain('"mundoId": "agua"');
    expect(pin).toContain('"hotspotActivo": "quebrada-viva"');
    expect(pin).toContain('"clima": "lluvia"');
    expect(pin).toContain('"matasVivas": 12');
  });

  it('degrada sin pin cuando no recibe contexto espacial válido', () => {
    expect(buildSpatialContextPin(null)).toBe('');
    expect(buildSpatialContextPin({})).toBe('');
  });

  it('conserva el contexto actual al navegar desde el valle', () => {
    expect(buildSpatialAgentInitialContext({
      mundoId: 'suelo',
      hotspotActivo: 'lombrices',
      clima: 'niebla',
      estadoFinca: { animo: 'sereno', energia: 0.7 },
    })).toEqual({
      spatialContext: {
        mundoId: 'suelo',
        hotspotActivo: 'lombrices',
        clima: 'niebla',
        estadoFinca: { animo: 'sereno', energia: 0.7 },
      },
    });
  });
});
