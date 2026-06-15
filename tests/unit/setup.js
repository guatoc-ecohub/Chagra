/**
 * tests/unit/setup.js — global setup for vitest component tests.
 *
 * Imports jest-dom matchers para assertions de DOM (toBeVisible, toHaveTextContent, etc.).
 * Auto-cleanup después de cada test para evitar leaks entre tests.
 *
 * Polyfills de ENTORNO (jsdom no es un browser real): acá vive todo lo que el
 * código de prod asume del runtime web pero jsdom NO provee fielmente. Regla:
 * estos shims NO cambian comportamiento de prod — solo cierran el gap jsdom↔browser
 * para que los tests ejerciten el código real. Cada uno documenta su porqué.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// ── Polyfill: crypto.subtle.digest con ArrayBuffer cross-realm ──────────────
// jsdom expone `crypto.subtle` (webcrypto de Node), pero el ArrayBuffer que
// devuelve `Blob.arrayBuffer()` proviene de OTRO realm de V8 que el de la
// webcrypto interna. Node valida el 2º argumento de `digest()` con un
// `instanceof ArrayBuffer` contra SU realm y lo rechaza con:
//   "2nd argument is not instance of ArrayBuffer, Buffer, TypedArray, or DataView"
// …aunque `buf instanceof ArrayBuffer` sea true en el realm del test. En un
// browser real Blob y crypto.subtle comparten realm, así que esto NO ocurre —
// es un artefacto puro de jsdom. Normalizamos el ArrayBuffer a una vista
// `Uint8Array` (las TypedArrays SÍ cruzan el chequeo), preservando los bytes.
// Prod (`visionCacheService.hashImage`) queda intacto. Verificado: produce el
// SHA-256 correcto (vector "hello" → 2cf24dba…9824).
(() => {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle || typeof subtle.digest !== 'function' || subtle.__chagraDigestPatched) {
    return;
  }
  const originalDigest = subtle.digest.bind(subtle);
  subtle.digest = (algorithm, data) => {
    // Solo el ArrayBuffer "pelado" dispara el bug de realm; las vistas
    // (TypedArray/DataView) y Buffers pasan tal cual.
    const normalized = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    return originalDigest(algorithm, normalized);
  };
  Object.defineProperty(subtle, '__chagraDigestPatched', {
    value: true,
    configurable: true,
  });
})();

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
