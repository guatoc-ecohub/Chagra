import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'evt-' + e.event_type })),
}));

vi.mock('../observationService', () => ({
  registerObservation: vi.fn(({ processId: _processId, text }) =>
    Promise.resolve({ event_id: 'obs-evt', payload: { text, stage_suggestion: null } })
  ),
}));

import { registerObservation } from '../observationService';
import { suggestStageFromText, suggestStageFromObservation } from '../stageSuggestionService';

describe('suggestStageFromText', () => {
  it('retorna null para texto vacio', () => {
    expect(suggestStageFromText('')).toBeNull();
    expect(suggestStageFromText(null)).toBeNull();
  });

  it('detecta floración por palabra clave', () => {
    const r = suggestStageFromText('vi las primeras flores en el cafetal');
    expect(r.suggestedStage).toBe('flowering');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(0.7);
  });

  it('detecta cosecha', () => {
    const r = suggestStageFromText('los frutos ya están maduros para cosechar');
    expect(r.suggestedStage).toBe('harvest_window');
  });

  it('detecta vegetativo', () => {
    const r = suggestStageFromText('las hojas están grandes y el tallo creció');
    expect(r.suggestedStage).toBe('vegetative');
  });

  it('retorna null si no hay match', () => {
    const r = suggestStageFromText('hoy hizo mucho sol');
    expect(r).toBeNull();
  });
});

describe('suggestStageFromObservation', () => {
  it('crea observacion con stage_suggestion si hay match', async () => {
    await suggestStageFromObservation(/** @type {any} */ ({ processId: 'p1', text: 'salió el brote' }));
    expect(registerObservation).toHaveBeenCalledWith(
      expect.objectContaining({ processId: 'p1' })
    );
  });

  it('crea observacion sin stage_suggestion si no hay match', async () => {
    await suggestStageFromObservation(/** @type {any} */ ({ processId: 'p1', text: 'hoy hace buen clima' }));
    expect(registerObservation).toHaveBeenCalled();
  });
});
