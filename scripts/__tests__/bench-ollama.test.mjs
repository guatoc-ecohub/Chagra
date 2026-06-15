/**
 * bench-ollama.test.mjs — Tests para el módulo bench-ollama
 */

import { describe, it, expect } from 'vitest';
import {
  checkMaxwellError,
  MAXWELL_ERROR_PATTERNS,
} from '../lib/bench-ollama.mjs';

describe('bench-ollama', () => {
  describe('checkMaxwellError', () => {
    it('debería detectar error sm_5.2', () => {
      const result = checkMaxwellError('Error: unsupported architecture sm_5.2');
      expect(result).toBe(true);
    });

    it('debería detectar error maxwell', () => {
      const result = checkMaxwellError('Maxwell GPU not supported');
      expect(result).toBe(true);
    });

    it('debería detectar error compute capability', () => {
      const result = checkMaxwellError('Compute capability 5.2 not supported');
      expect(result).toBe(true);
    });

    it('no debería detectar error en mensaje normal', () => {
      const result = checkMaxwellError('HTTP 500 Internal Server Error');
      expect(result).toBe(false);
    });

    it('debería ser case-insensitive', () => {
      const result = checkMaxwellError('SM_5.2 architecture');
      expect(result).toBe(true);
    });
  });

  describe('MAXWELL_ERROR_PATTERNS', () => {
    it('debería contener los patrones esperados', () => {
      expect(MAXWELL_ERROR_PATTERNS).toContain('sm_5.2');
      expect(MAXWELL_ERROR_PATTERNS).toContain('maxwell');
      expect(MAXWELL_ERROR_PATTERNS).toContain('unsupported architecture');
      expect(MAXWELL_ERROR_PATTERNS).toContain('compute capability');
      expect(MAXWELL_ERROR_PATTERNS).toContain('sm_52');
    });
  });
});
