import { describe, it, expect } from 'vitest';
import { sanitizeBlobUrl } from '../blobUrl.js';

/**
 * Tests de sanitizeBlobUrl: sanitizer anti-XSS para src de <img> (CodeQL
 * js/xss-through-dom). Solo deja pasar blob: URLs same-origin; cualquier otro
 * protocolo/origen o input no-string devuelve ''. jsdom expone
 * window.location.origin = http://localhost:3000.
 */

describe('sanitizeBlobUrl', () => {
  it('devuelve "" para entradas que no son string', () => {
    expect(sanitizeBlobUrl(null)).toBe('');
    expect(sanitizeBlobUrl(undefined)).toBe('');
    expect(sanitizeBlobUrl(123)).toBe('');
    expect(sanitizeBlobUrl({})).toBe('');
  });

  it('devuelve "" para string vacío', () => {
    expect(sanitizeBlobUrl('')).toBe('');
  });

  it('acepta un blob: URL same-origin', () => {
    const url = `blob:${window.location.origin}/abc-123`;
    expect(sanitizeBlobUrl(url)).toBe(url);
  });

  it('rechaza protocolos que no sean blob:', () => {
    expect(sanitizeBlobUrl('https://evil.com/x.png')).toBe('');
    expect(sanitizeBlobUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeBlobUrl('data:image/svg+xml,<svg/>')).toBe('');
  });

  it('rechaza un blob: URL de otro origen', () => {
    expect(sanitizeBlobUrl('blob:https://otro-host.com/abc')).toBe('');
  });

  it('devuelve "" para strings que no son URLs válidas', () => {
    expect(sanitizeBlobUrl('no-es-una-url')).toBe('');
  });
});
