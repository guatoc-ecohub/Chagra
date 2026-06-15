import { describe, it, expect } from 'vitest';
import { captureAndCompress, getPhotoUrl } from '../photoService.js';

describe('photoService', () => {
  describe('captureAndCompress', () => {
    it('es una funcion exportada', () => {
      expect(typeof captureAndCompress).toBe('function');
    });

    it('lanza error si el archivo no es imagen', async () => {
      const fakeFile = new File(['not-an-image'], 'test.txt', { type: 'text/plain' });
      await expect(captureAndCompress(fakeFile)).rejects.toThrow('no es imagen');
    });

    it('lanza error si file es null', async () => {
      await expect(captureAndCompress(null)).rejects.toThrow();
    });
  });

  describe('getPhotoUrl', () => {
    it('es una funcion exportada', () => {
      expect(typeof getPhotoUrl).toBe('function');
    });
  });
});
