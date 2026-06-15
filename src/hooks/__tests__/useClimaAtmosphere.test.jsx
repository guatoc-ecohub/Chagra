import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../../services/atmosphereService.js', () => ({
  deriveAtmosphere: vi.fn(() => ({})),
  applyAtmosphere: vi.fn(),
  initAtmosphereCalibration: vi.fn(),
  isAtmosphereEnabled: vi.fn(() => true),
}));

vi.mock('../../services/climaService.js', () => ({
  getCachedClimaSnapshot: vi.fn(() => null),
  resolveClimaLocation: vi.fn(() => null),
}));

import useClimaAtmosphere from '../useClimaAtmosphere.js';

describe('useClimaAtmosphere', () => {
  it('monta sin lanzar excepcion', () => {
    const { result } = renderHook(() => useClimaAtmosphere());
    expect(result).toBeDefined();
  });

  it('no falla con atmosfera deshabilitada', async () => {
    const { isAtmosphereEnabled } = await import('../../services/atmosphereService.js');
    isAtmosphereEnabled.mockReturnValueOnce(false);
    const { result } = renderHook(() => useClimaAtmosphere());
    expect(result).toBeDefined();
  });
});
