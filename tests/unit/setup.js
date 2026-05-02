/**
 * tests/unit/setup.js — global setup for vitest component tests.
 *
 * Imports jest-dom matchers para assertions de DOM (toBeVisible, toHaveTextContent, etc.).
 * Auto-cleanup después de cada test para evitar leaks entre tests.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom no implementa matchMedia — mock global mínimo. Tests específicos
// pueden override con setStandalone() helpers si necesitan.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
});
