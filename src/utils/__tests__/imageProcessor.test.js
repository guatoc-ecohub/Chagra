import { describe, test, expect } from 'vitest';
import { optimizeImage, blobToDataUrl } from '../imageProcessor';

describe('imageProcessor', () => {
  test('optimizeImage is a function', () => {
    expect(typeof optimizeImage).toBe('function');
  });

  test('blobToDataUrl is a function', () => {
    expect(typeof blobToDataUrl).toBe('function');
  });

  test('blobToDataUrl converts blob to data URL', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url = await blobToDataUrl(blob);
    expect(typeof url).toBe('string');
    expect(url.startsWith('data:')).toBe(true);
  });

  test('blobToDataUrl rejects on invalid input', async () => {
    await expect(blobToDataUrl(null)).rejects.toThrow();
  });
});
