import { describe, it, expect, vi } from 'vitest';

vi.mock('../apiService.js', () => ({
  sendToFarmOS: vi.fn(),
}));

vi.mock('../syncManager.js', () => ({
  syncManager: {
    enqueuePendingTransaction: vi.fn(),
  },
}));

vi.mock('../planGeneratorService.js', () => ({
  tryGeneratePlanFromSeeding: vi.fn(),
}));

import { savePayload } from '../payloadService.js';

describe('payloadService', () => {
  describe('savePayload', () => {
    it('es una funcion exportada', () => {
      expect(typeof savePayload).toBe('function');
    });
  });
});
